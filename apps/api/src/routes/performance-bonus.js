// ============================================================
// PERFORMANCE BONUS API ROUTES
// External site performance scores drive employee bonus payouts
// Formula: payout = employee.bonus_amount × (location_score / 100)
// ============================================================

import { Router } from 'express';
import { db } from '../lib/database.js';
import { authMiddleware, requireRole } from '../middleware/index.js';
import multer from 'multer';
import { parse } from 'csv-parse/sync';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// All routes require authentication
router.use(authMiddleware);

// ==================== PERFORMANCE SCORES ====================

// Upload performance scores (single or bulk CSV)
router.post('/performance-scores', requireRole(['admin', 'hr']), async (req, res) => {
  try {
    const { organizationId, userId } = req.user;
    const { location_id, period, score_percentage, source = 'manual', notes } = req.body;

    if (!location_id || !period || score_percentage === undefined) {
      return res.status(400).json({ error: 'location_id, period, and score_percentage are required' });
    }

    if (score_percentage < 0 || score_percentage > 100) {
      return res.status(400).json({ error: 'score_percentage must be between 0 and 100' });
    }

    // Verify location belongs to organization
    const location = await db.query(
      'SELECT id FROM locations WHERE id = $1 AND organization_id = $2',
      [location_id, organizationId]
    );

    if (location.rows.length === 0) {
      return res.status(404).json({ error: 'Location not found' });
    }

    // Upsert performance score
    const result = await db.query(`
      INSERT INTO performance_scores (organization_id, location_id, period, score_percentage, uploaded_by, source, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (organization_id, location_id, period)
      DO UPDATE SET score_percentage = $4, uploaded_by = $5, uploaded_at = NOW(), source = $6, notes = $7, updated_at = NOW()
      RETURNING *
    `, [organizationId, location_id, period, score_percentage, userId, source, notes]);

    res.json({ score: result.rows[0] });
  } catch (error) {
    console.error('Failed to upload performance score:', error);
    res.status(500).json({ error: 'Failed to upload performance score' });
  }
});

// Bulk upload performance scores via CSV
router.post('/performance-scores/csv', requireRole(['admin', 'hr']), upload.single('file'), async (req, res) => {
  try {
    const { organizationId, userId } = req.user;
    const { period } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'CSV file is required' });
    }

    if (!period) {
      return res.status(400).json({ error: 'period is required' });
    }

    const csvContent = req.file.buffer.toString('utf-8');
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    const results = [];
    const errors = [];

    for (const record of records) {
      const locationCode = record.location_code || record.location_id;
      const scorePercentage = parseFloat(record.score_percentage || record.score);

      if (!locationCode || isNaN(scorePercentage)) {
        errors.push({ record, error: 'Invalid location_code or score_percentage' });
        continue;
      }

      if (scorePercentage < 0 || scorePercentage > 100) {
        errors.push({ record, error: 'score_percentage must be between 0 and 100' });
        continue;
      }

      // Find location by code or id
      const location = await db.query(
        'SELECT id FROM locations WHERE (code = $1 OR id::text = $1) AND organization_id = $2',
        [locationCode, organizationId]
      );

      if (location.rows.length === 0) {
        errors.push({ record, error: `Location not found: ${locationCode}` });
        continue;
      }

      const locationId = location.rows[0].id;

      const result = await db.query(`
        INSERT INTO performance_scores (organization_id, location_id, period, score_percentage, uploaded_by, source, notes)
        VALUES ($1, $2, $3, $4, $5, 'csv', $6)
        ON CONFLICT (organization_id, location_id, period)
        DO UPDATE SET score_percentage = $4, uploaded_by = $5, uploaded_at = NOW(), source = 'csv', notes = $6, updated_at = NOW()
        RETURNING *
      `, [organizationId, locationId, period, scorePercentage, userId, record.notes || null]);

      results.push(result.rows[0]);
    }

    res.json({
      message: `Uploaded ${results.length} scores`,
      uploaded: results.length,
      errors: errors.length,
      errorDetails: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Failed to upload CSV:', error);
    res.status(500).json({ error: 'Failed to process CSV file' });
  }
});

// Get performance scores for a period
router.get('/performance-scores', requireRole(['admin', 'hr', 'manager']), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { period, location_id } = req.query;

    let query = `
      SELECT ps.*,
             l.name as location_name,
             l.code as location_code,
             u.first_name || ' ' || u.last_name as uploaded_by_name
      FROM performance_scores ps
      JOIN locations l ON l.id = ps.location_id
      LEFT JOIN users u ON u.id = ps.uploaded_by
      WHERE ps.organization_id = $1
    `;
    const params = [organizationId];

    if (period) {
      params.push(period);
      query += ` AND ps.period = $${params.length}`;
    }

    if (location_id) {
      params.push(location_id);
      query += ` AND ps.location_id = $${params.length}`;
    }

    query += ' ORDER BY l.name, ps.period DESC';

    const scores = await db.query(query, params);

    res.json({ scores: scores.rows });
  } catch (error) {
    console.error('Failed to get performance scores:', error);
    res.status(500).json({ error: 'Failed to get performance scores' });
  }
});

// Get available periods
router.get('/performance-scores/periods', requireRole(['admin', 'hr', 'manager']), async (req, res) => {
  try {
    const { organizationId } = req.user;

    const periods = await db.query(`
      SELECT DISTINCT period,
             MIN(uploaded_at) as first_uploaded,
             MAX(uploaded_at) as last_updated,
             COUNT(*) as location_count
      FROM performance_scores
      WHERE organization_id = $1
      GROUP BY period
      ORDER BY period DESC
    `, [organizationId]);

    res.json({ periods: periods.rows });
  } catch (error) {
    console.error('Failed to get periods:', error);
    res.status(500).json({ error: 'Failed to get periods' });
  }
});

// ==================== BONUS CALCULATIONS ====================

// Calculate bonuses for a period (preview or execute)
router.post('/performance-scores/calculate', requireRole(['admin', 'hr']), async (req, res) => {
  try {
    const { organizationId, userId } = req.user;
    const { period, preview = false } = req.body;

    if (!period) {
      return res.status(400).json({ error: 'period is required' });
    }

    // Get all performance scores for the period
    const scores = await db.query(`
      SELECT ps.*, l.name as location_name
      FROM performance_scores ps
      JOIN locations l ON l.id = ps.location_id
      WHERE ps.organization_id = $1 AND ps.period = $2
    `, [organizationId, period]);

    if (scores.rows.length === 0) {
      return res.status(400).json({ error: 'No performance scores found for this period' });
    }

    // Get all employees with bonus amounts at scored locations
    const employees = await db.query(`
      SELECT e.id, e.first_name, e.last_name, e.bonus_amount, e.location_id,
             l.name as location_name, ps.score_percentage, ps.id as performance_score_id
      FROM employees e
      JOIN locations l ON l.id = e.location_id
      JOIN performance_scores ps ON ps.location_id = e.location_id AND ps.period = $2
      WHERE e.organization_id = $1
        AND e.status = 'active'
        AND e.bonus_amount IS NOT NULL
        AND e.bonus_amount > 0
    `, [organizationId, period]);

    const calculations = employees.rows.map(emp => ({
      employee_id: emp.id,
      employee_name: `${emp.first_name} ${emp.last_name}`,
      location_id: emp.location_id,
      location_name: emp.location_name,
      performance_score_id: emp.performance_score_id,
      bonus_amount: parseFloat(emp.bonus_amount),
      score_percentage: parseFloat(emp.score_percentage),
      payout_amount: Math.round(parseFloat(emp.bonus_amount) * (parseFloat(emp.score_percentage) / 100) * 100) / 100,
    }));

    if (preview) {
      // Return preview without saving
      const totalBonus = calculations.reduce((sum, c) => sum + c.bonus_amount, 0);
      const totalPayout = calculations.reduce((sum, c) => sum + c.payout_amount, 0);

      return res.json({
        preview: true,
        period,
        calculations,
        summary: {
          employee_count: calculations.length,
          total_eligible_bonus: totalBonus,
          total_payout: totalPayout,
          average_score: calculations.length > 0
            ? Math.round(calculations.reduce((sum, c) => sum + c.score_percentage, 0) / calculations.length * 100) / 100
            : 0,
        },
      });
    }

    // Execute - create bonus payout records
    const payouts = [];
    for (const calc of calculations) {
      const result = await db.query(`
        INSERT INTO bonus_payouts (
          organization_id, employee_id, location_id, performance_score_id,
          period, bonus_amount, score_percentage, payout_amount, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
        ON CONFLICT (organization_id, employee_id, period)
        DO UPDATE SET
          location_id = $3,
          performance_score_id = $4,
          bonus_amount = $6,
          score_percentage = $7,
          payout_amount = $8,
          status = 'pending',
          calculated_at = NOW(),
          updated_at = NOW()
        RETURNING *
      `, [organizationId, calc.employee_id, calc.location_id, calc.performance_score_id,
          period, calc.bonus_amount, calc.score_percentage, calc.payout_amount]);

      payouts.push({
        ...result.rows[0],
        employee_name: calc.employee_name,
        location_name: calc.location_name,
      });
    }

    const totalBonus = payouts.reduce((sum, p) => sum + parseFloat(p.bonus_amount), 0);
    const totalPayout = payouts.reduce((sum, p) => sum + parseFloat(p.payout_amount), 0);

    res.json({
      message: `Calculated ${payouts.length} bonus payouts`,
      period,
      payouts,
      summary: {
        employee_count: payouts.length,
        total_eligible_bonus: totalBonus,
        total_payout: totalPayout,
      },
    });
  } catch (error) {
    console.error('Failed to calculate bonuses:', error);
    res.status(500).json({ error: 'Failed to calculate bonuses' });
  }
});

// ==================== BONUS PAYOUTS ====================

// Get bonus payouts for a period
router.get('/bonus-payouts', requireRole(['admin', 'hr', 'manager']), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { period, status, employee_id, location_id } = req.query;

    let query = `
      SELECT bp.*,
             e.first_name, e.last_name, e.employee_number,
             l.name as location_name,
             u.first_name || ' ' || u.last_name as approved_by_name
      FROM bonus_payouts bp
      JOIN employees e ON e.id = bp.employee_id
      JOIN locations l ON l.id = bp.location_id
      LEFT JOIN users u ON u.id = bp.approved_by
      WHERE bp.organization_id = $1
    `;
    const params = [organizationId];

    if (period) {
      params.push(period);
      query += ` AND bp.period = $${params.length}`;
    }

    if (status) {
      params.push(status);
      query += ` AND bp.status = $${params.length}`;
    }

    if (employee_id) {
      params.push(employee_id);
      query += ` AND bp.employee_id = $${params.length}`;
    }

    if (location_id) {
      params.push(location_id);
      query += ` AND bp.location_id = $${params.length}`;
    }

    query += ' ORDER BY e.last_name, e.first_name';

    const payouts = await db.query(query, params);

    // Calculate summary
    const summary = {
      total_count: payouts.rows.length,
      pending: payouts.rows.filter(p => p.status === 'pending').length,
      approved: payouts.rows.filter(p => p.status === 'approved').length,
      paid: payouts.rows.filter(p => p.status === 'paid').length,
      total_payout: payouts.rows.reduce((sum, p) => sum + parseFloat(p.payout_amount), 0),
    };

    res.json({ payouts: payouts.rows, summary });
  } catch (error) {
    console.error('Failed to get bonus payouts:', error);
    res.status(500).json({ error: 'Failed to get bonus payouts' });
  }
});

// Approve bonus payouts (single or bulk)
router.post('/bonus-payouts/approve', requireRole(['admin', 'hr']), async (req, res) => {
  try {
    const { organizationId, userId } = req.user;
    const { payout_ids, period } = req.body;

    if (!payout_ids && !period) {
      return res.status(400).json({ error: 'Either payout_ids or period is required' });
    }

    let query, params;

    if (payout_ids && Array.isArray(payout_ids) && payout_ids.length > 0) {
      // Approve specific payouts
      query = `
        UPDATE bonus_payouts
        SET status = 'approved', approved_by = $1, approved_at = NOW(), updated_at = NOW()
        WHERE organization_id = $2 AND id = ANY($3) AND status = 'pending'
        RETURNING *
      `;
      params = [userId, organizationId, payout_ids];
    } else if (period) {
      // Approve all pending payouts for a period
      query = `
        UPDATE bonus_payouts
        SET status = 'approved', approved_by = $1, approved_at = NOW(), updated_at = NOW()
        WHERE organization_id = $2 AND period = $3 AND status = 'pending'
        RETURNING *
      `;
      params = [userId, organizationId, period];
    }

    const result = await db.query(query, params);

    res.json({
      message: `Approved ${result.rows.length} bonus payouts`,
      approved_count: result.rows.length,
      payouts: result.rows,
    });
  } catch (error) {
    console.error('Failed to approve bonus payouts:', error);
    res.status(500).json({ error: 'Failed to approve bonus payouts' });
  }
});

// Cancel bonus payout
router.post('/bonus-payouts/:id/cancel', requireRole(['admin', 'hr']), async (req, res) => {
  try {
    const { organizationId, userId } = req.user;
    const { id } = req.params;
    const { notes } = req.body;

    const result = await db.query(`
      UPDATE bonus_payouts
      SET status = 'cancelled', notes = $3, updated_at = NOW()
      WHERE id = $1 AND organization_id = $2 AND status IN ('pending', 'approved')
      RETURNING *
    `, [id, organizationId, notes]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Bonus payout not found or cannot be cancelled' });
    }

    res.json({ payout: result.rows[0] });
  } catch (error) {
    console.error('Failed to cancel bonus payout:', error);
    res.status(500).json({ error: 'Failed to cancel bonus payout' });
  }
});

// ==================== EMPLOYEE VIEW ====================

// Get my bonus information
router.get('/my-bonus', async (req, res) => {
  try {
    const { userId, organizationId } = req.user;

    // Get employee
    const employee = await db.query(`
      SELECT e.id, e.bonus_amount, e.location_id, l.name as location_name
      FROM employees e
      LEFT JOIN locations l ON l.id = e.location_id
      WHERE e.user_id = $1 AND e.organization_id = $2
    `, [userId, organizationId]);

    if (employee.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const emp = employee.rows[0];

    // Get latest performance score for their location
    const latestScore = await db.query(`
      SELECT * FROM performance_scores
      WHERE organization_id = $1 AND location_id = $2
      ORDER BY period DESC
      LIMIT 1
    `, [organizationId, emp.location_id]);

    // Get bonus payout history
    const payouts = await db.query(`
      SELECT bp.*, l.name as location_name
      FROM bonus_payouts bp
      JOIN locations l ON l.id = bp.location_id
      WHERE bp.organization_id = $1 AND bp.employee_id = $2
      ORDER BY bp.period DESC
      LIMIT 10
    `, [organizationId, emp.id]);

    res.json({
      bonus_amount: emp.bonus_amount,
      location_name: emp.location_name,
      latest_score: latestScore.rows[0] || null,
      payouts: payouts.rows,
      current_period_payout: payouts.rows.find(p => p.status !== 'paid') || null,
    });
  } catch (error) {
    console.error('Failed to get bonus info:', error);
    res.status(500).json({ error: 'Failed to get bonus information' });
  }
});

export default router;
