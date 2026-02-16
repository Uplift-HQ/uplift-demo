// ============================================================
// MOMENTUM SCORE API ROUTES
// Real-time workforce engagement scores
// ============================================================

import { Router } from 'express';
import { authMiddleware, requireRole } from '../middleware/index.js';
import momentum from '../services/momentum.js';
import { db } from '../lib/database.js';

const router = Router();
router.use(authMiddleware);

/**
 * GET /api/momentum/me
 * Get current user's momentum score
 */
router.get('/me', async (req, res) => {
  try {
    const { employeeId, organizationId } = req.user;

    if (!employeeId) {
      return res.status(400).json({ error: 'No employee linked to user' });
    }

    // Check for cached score first
    const cached = await momentum.getCachedScore(employeeId);
    if (cached) {
      return res.json({
        score: Math.round(parseFloat(cached.score)),
        breakdown: {
          attendance: { score: Math.round(parseFloat(cached.attendance_score)), weight: 20 },
          punctuality: { score: Math.round(parseFloat(cached.punctuality_score)), weight: 15 },
          shiftCompletion: { score: Math.round(parseFloat(cached.shift_completion_score)), weight: 15 },
          skillsGrowth: { score: Math.round(parseFloat(cached.skills_growth_score)), weight: 15 },
          recognition: { score: Math.round(parseFloat(cached.recognition_score)), weight: 15 },
          engagement: { score: Math.round(parseFloat(cached.engagement_score)), weight: 20 },
        },
        trend: {
          direction: cached.trend,
          previousScore: cached.previous_score ? Math.round(parseFloat(cached.previous_score)) : null,
        },
        periodStart: cached.period_start,
        periodEnd: cached.period_end,
        calculatedAt: cached.calculated_at,
        cached: true,
      });
    }

    // Calculate fresh score
    const result = await momentum.calculateMomentumScore(employeeId, organizationId);

    res.json({
      ...result,
      cached: false,
    });
  } catch (error) {
    console.error('Get my momentum error:', error);
    res.status(500).json({ error: 'Failed to get momentum score' });
  }
});

/**
 * GET /api/momentum/employees/:id
 * Get momentum score for a specific employee (manager/admin)
 */
router.get('/employees/:id', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { id: employeeId } = req.params;

    // Verify employee belongs to org
    const empCheck = await db.query(
      `SELECT id FROM employees WHERE id = $1 AND organization_id = $2`,
      [employeeId, organizationId]
    );
    if (empCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Check cache
    const cached = await momentum.getCachedScore(employeeId);
    if (cached) {
      return res.json({
        employeeId,
        score: Math.round(parseFloat(cached.score)),
        breakdown: {
          attendance: { score: Math.round(parseFloat(cached.attendance_score)), weight: 20 },
          punctuality: { score: Math.round(parseFloat(cached.punctuality_score)), weight: 15 },
          shiftCompletion: { score: Math.round(parseFloat(cached.shift_completion_score)), weight: 15 },
          skillsGrowth: { score: Math.round(parseFloat(cached.skills_growth_score)), weight: 15 },
          recognition: { score: Math.round(parseFloat(cached.recognition_score)), weight: 15 },
          engagement: { score: Math.round(parseFloat(cached.engagement_score)), weight: 20 },
        },
        trend: {
          direction: cached.trend,
          previousScore: cached.previous_score ? Math.round(parseFloat(cached.previous_score)) : null,
        },
        periodStart: cached.period_start,
        periodEnd: cached.period_end,
        calculatedAt: cached.calculated_at,
        cached: true,
      });
    }

    const result = await momentum.calculateMomentumScore(employeeId, organizationId);
    res.json({ employeeId, ...result, cached: false });
  } catch (error) {
    console.error('Get employee momentum error:', error);
    res.status(500).json({ error: 'Failed to get momentum score' });
  }
});

/**
 * GET /api/momentum/dashboard
 * Get organization-wide momentum dashboard (manager/admin)
 */
router.get('/dashboard', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const dashboard = await momentum.getOrgMomentumDashboard(organizationId);
    res.json(dashboard);
  } catch (error) {
    console.error('Get momentum dashboard error:', error);
    res.status(500).json({ error: 'Failed to get momentum dashboard' });
  }
});

/**
 * GET /api/momentum/leaderboard
 * Get momentum leaderboard
 */
router.get('/leaderboard', async (req, res) => {
  try {
    const { organizationId, role } = req.user;
    const { limit = 20 } = req.query;

    const leaderboard = await momentum.getMomentumLeaderboard(
      organizationId,
      Math.min(parseInt(limit) || 20, 100)
    );

    res.json({ leaderboard });
  } catch (error) {
    console.error('Get momentum leaderboard error:', error);
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

/**
 * POST /api/momentum/calculate
 * Trigger momentum calculation for all employees (admin only)
 */
router.post('/calculate', requireRole(['admin']), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const results = await momentum.calculateOrgMomentumScores(organizationId);

    res.json({
      message: `Calculated momentum scores for ${results.successful} of ${results.total} employees`,
      ...results,
    });
  } catch (error) {
    console.error('Calculate org momentum error:', error);
    res.status(500).json({ error: 'Failed to calculate momentum scores' });
  }
});

/**
 * GET /api/momentum/history/:employeeId
 * Get momentum history for an employee (admin/manager)
 */
router.get('/history/:employeeId', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { employeeId } = req.params;
    const { days = 30 } = req.query;

    // Verify employee belongs to org
    const empCheck = await db.query(
      `SELECT id FROM employees WHERE id = $1 AND organization_id = $2`,
      [employeeId, organizationId]
    );
    if (empCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const history = await db.query(`
      SELECT score, recorded_at
      FROM momentum_history
      WHERE employee_id = $1
        AND recorded_at >= CURRENT_DATE - INTERVAL '${parseInt(days)} days'
      ORDER BY recorded_at ASC
    `, [employeeId]);

    res.json({
      employeeId,
      history: history.rows.map(h => ({
        date: h.recorded_at,
        score: Math.round(parseFloat(h.score)),
      })),
    });
  } catch (error) {
    console.error('Get momentum history error:', error);
    res.status(500).json({ error: 'Failed to get momentum history' });
  }
});

export default router;
