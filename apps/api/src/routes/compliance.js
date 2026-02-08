// ============================================================
// COMPLIANCE API ROUTES
// Training, certifications, and compliance management
// ============================================================

import { Router } from 'express';
import { db } from '../lib/database.js';
import { authMiddleware, requireRole } from '../middleware/index.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// ==================== EMPLOYEE VIEW ====================

// Get my compliance items
router.get('/my-compliance', async (req, res) => {
  try {
    const { userId, organizationId } = req.user;

    // First get employee ID
    const employee = await db.query(`
      SELECT id, primary_role_id, primary_location_id, department_id
      FROM employees WHERE user_id = $1 AND organization_id = $2
    `, [userId, organizationId]);

    if (employee.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const employeeId = employee.rows[0].id;

    const items = await db.query(`
      SELECT ci.*,
             ec.status,
             ec.completed_at,
             ec.expires_at,
             ec.progress_percent,
             ec.score,
             ec.certificate_url,
             ec.verified_at,
             CASE
               WHEN ec.status = 'completed' AND ec.expires_at < NOW() THEN 'expired'
               WHEN ec.status = 'completed' AND ec.expires_at < NOW() + INTERVAL '30 days' THEN 'expiring_soon'
               WHEN ec.status IS NULL THEN 'pending'
               ELSE ec.status
             END as effective_status
      FROM compliance_items ci
      LEFT JOIN employee_compliance ec ON ec.compliance_item_id = ci.id AND ec.employee_id = $1
      WHERE ci.organization_id = $2
        AND ci.is_active = true
      ORDER BY
        CASE
          WHEN ec.status IS NULL OR ec.status = 'pending' THEN 0
          WHEN ec.expires_at < NOW() THEN 1
          WHEN ec.expires_at < NOW() + INTERVAL '30 days' THEN 2
          WHEN ec.status = 'in_progress' THEN 3
          ELSE 4
        END,
        ci.is_mandatory DESC,
        ci.name
    `, [employeeId, organizationId]);

    // Calculate summary
    const summary = {
      total: items.rows.length,
      completed: items.rows.filter(i => i.effective_status === 'completed').length,
      pending: items.rows.filter(i => i.effective_status === 'pending').length,
      inProgress: items.rows.filter(i => i.effective_status === 'in_progress').length,
      expired: items.rows.filter(i => i.effective_status === 'expired').length,
      expiringSoon: items.rows.filter(i => i.effective_status === 'expiring_soon').length,
    };

    res.json({ items: items.rows, summary });
  } catch (error) {
    console.error('Failed to get compliance items:', error);
    res.status(500).json({ error: 'Failed to get compliance items' });
  }
});

// Get single compliance item details
router.get('/my-compliance/:itemId', async (req, res) => {
  try {
    const { userId, organizationId } = req.user;

    const employee = await db.query(`
      SELECT id FROM employees WHERE user_id = $1 AND organization_id = $2
    `, [userId, organizationId]);

    if (employee.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const item = await db.query(`
      SELECT ci.*,
             ec.status,
             ec.completed_at,
             ec.expires_at,
             ec.progress_percent,
             ec.score,
             ec.certificate_url,
             ec.verified_at,
             ec.notes,
             ec.last_activity_at,
             vu.first_name || ' ' || vu.last_name as verified_by_name
      FROM compliance_items ci
      LEFT JOIN employee_compliance ec ON ec.compliance_item_id = ci.id AND ec.employee_id = $1
      LEFT JOIN users vu ON vu.id = ec.verified_by
      WHERE ci.id = $2 AND ci.organization_id = $3
    `, [employee.rows[0].id, req.params.itemId, organizationId]);

    if (item.rows.length === 0) {
      return res.status(404).json({ error: 'Compliance item not found' });
    }

    res.json({ item: item.rows[0] });
  } catch (error) {
    console.error('Failed to get compliance item:', error);
    res.status(500).json({ error: 'Failed to get compliance item' });
  }
});

// Start or update compliance item progress
router.post('/my-compliance/:itemId/progress', async (req, res) => {
  try {
    const { userId, organizationId } = req.user;
    const { progress, score } = req.body;

    const employee = await db.query(`
      SELECT id FROM employees WHERE user_id = $1 AND organization_id = $2
    `, [userId, organizationId]);

    if (employee.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const employeeId = employee.rows[0].id;
    const progressValue = Math.min(100, Math.max(0, progress || 0));
    const isComplete = progressValue >= 100;

    // Upsert compliance record
    const result = await db.query(`
      INSERT INTO employee_compliance (employee_id, compliance_item_id, status, progress_percent, score, last_activity_at, completed_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), $6)
      ON CONFLICT (employee_id, compliance_item_id)
      DO UPDATE SET
        progress_percent = $4,
        score = COALESCE($5, employee_compliance.score),
        status = $3,
        completed_at = CASE WHEN $3 = 'completed' THEN NOW() ELSE employee_compliance.completed_at END,
        last_activity_at = NOW(),
        updated_at = NOW()
      RETURNING *
    `, [
      employeeId,
      req.params.itemId,
      isComplete ? 'completed' : 'in_progress',
      progressValue,
      score,
      isComplete ? new Date() : null
    ]);

    // If completed, set expiry based on item's valid_for_days
    if (isComplete) {
      await db.query(`
        UPDATE employee_compliance ec
        SET expires_at = CASE
          WHEN ci.valid_for_days IS NOT NULL
          THEN NOW() + (ci.valid_for_days || ' days')::INTERVAL
          ELSE NULL
        END
        FROM compliance_items ci
        WHERE ec.id = $1 AND ci.id = ec.compliance_item_id
      `, [result.rows[0].id]);
    }

    res.json({ record: result.rows[0] });
  } catch (error) {
    console.error('Failed to update progress:', error);
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

// ==================== ADMIN VIEW ====================

// Get all compliance items (admin)
router.get('/items', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { category, active } = req.query;

    let query = `
      SELECT ci.*,
             COUNT(DISTINCT ec.employee_id) FILTER (WHERE ec.status = 'completed' AND (ec.expires_at IS NULL OR ec.expires_at > NOW())) as completed_count,
             COUNT(DISTINCT ec.employee_id) FILTER (WHERE ec.status = 'in_progress') as in_progress_count,
             COUNT(DISTINCT e.id) - COUNT(DISTINCT ec.employee_id) as pending_count,
             COUNT(DISTINCT ec.employee_id) FILTER (WHERE ec.expires_at < NOW()) as expired_count
      FROM compliance_items ci
      CROSS JOIN employees e
      LEFT JOIN employee_compliance ec ON ec.compliance_item_id = ci.id AND ec.employee_id = e.id
      WHERE ci.organization_id = $1
        AND e.organization_id = $1
        AND e.status = 'active'
    `;
    const params = [organizationId];

    if (category) {
      query += ` AND ci.category = $${params.length + 1}`;
      params.push(category);
    }

    if (active !== undefined) {
      query += ` AND ci.is_active = $${params.length + 1}`;
      params.push(active === 'true');
    }

    query += ` GROUP BY ci.id ORDER BY ci.category, ci.name`;

    const items = await db.query(query, params);

    res.json({ items: items.rows });
  } catch (error) {
    console.error('Failed to get compliance items:', error);
    res.status(500).json({ error: 'Failed to get compliance items' });
  }
});

// Create compliance item
router.post('/items', requireRole(['admin']), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const {
      name,
      description,
      category,
      isMandatory,
      validForDays,
      renewalReminderDays,
      contentUrl,
      contentType,
      estimatedDurationMinutes,
      appliesToRoles,
      appliesToLocations,
      appliesToDepartments
    } = req.body;

    if (!name || !category) {
      return res.status(400).json({ error: 'Name and category are required' });
    }

    const item = await db.query(`
      INSERT INTO compliance_items (
        organization_id, name, description, category, is_mandatory,
        valid_for_days, renewal_reminder_days, content_url, content_type,
        estimated_duration_minutes, applies_to_roles, applies_to_locations, applies_to_departments
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [
      organizationId, name, description, category, isMandatory !== false,
      validForDays, renewalReminderDays || 30, contentUrl, contentType || 'external',
      estimatedDurationMinutes, appliesToRoles, appliesToLocations, appliesToDepartments
    ]);

    res.status(201).json({ item: item.rows[0] });
  } catch (error) {
    console.error('Failed to create compliance item:', error);
    res.status(500).json({ error: 'Failed to create compliance item' });
  }
});

// Update compliance item
router.patch('/items/:id', requireRole(['admin']), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const updates = req.body;

    const allowed = [
      'name', 'description', 'category', 'is_mandatory', 'valid_for_days',
      'renewal_reminder_days', 'content_url', 'content_type', 'estimated_duration_minutes',
      'applies_to_roles', 'applies_to_locations', 'applies_to_departments', 'is_active'
    ];

    const setClauses = [];
    const values = [req.params.id, organizationId];
    let i = 3;

    for (const [key, value] of Object.entries(updates)) {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      if (allowed.includes(snakeKey)) {
        setClauses.push(`${snakeKey} = $${i++}`);
        values.push(Array.isArray(value) ? value : value);
      }
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    setClauses.push('updated_at = NOW()');

    const result = await db.query(`
      UPDATE compliance_items
      SET ${setClauses.join(', ')}
      WHERE id = $1 AND organization_id = $2
      RETURNING *
    `, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Compliance item not found' });
    }

    res.json({ item: result.rows[0] });
  } catch (error) {
    console.error('Failed to update compliance item:', error);
    res.status(500).json({ error: 'Failed to update compliance item' });
  }
});

// Get compliance status for all employees
router.get('/status', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { departmentId, locationId } = req.query;

    let query = `
      SELECT e.id, e.first_name, e.last_name, e.avatar_url, e.role,
             d.name as department_name,
             l.name as location_name,
             (SELECT COUNT(*) FROM compliance_items ci WHERE ci.organization_id = e.organization_id AND ci.is_active = true) as total_items,
             COUNT(ec.id) FILTER (WHERE ec.status = 'completed' AND (ec.expires_at IS NULL OR ec.expires_at > NOW())) as completed,
             COUNT(ec.id) FILTER (WHERE ec.status = 'in_progress') as in_progress,
             COUNT(ec.id) FILTER (WHERE ec.expires_at < NOW()) as expired,
             ROUND(
               100.0 * COUNT(ec.id) FILTER (WHERE ec.status = 'completed' AND (ec.expires_at IS NULL OR ec.expires_at > NOW()))
               / NULLIF((SELECT COUNT(*) FROM compliance_items ci WHERE ci.organization_id = e.organization_id AND ci.is_active = true AND ci.is_mandatory = true), 0)
             ) as compliance_percent
      FROM employees e
      LEFT JOIN departments d ON d.id = e.department_id
      LEFT JOIN locations l ON l.id = e.primary_location_id
      LEFT JOIN employee_compliance ec ON ec.employee_id = e.id
      WHERE e.organization_id = $1
        AND e.status = 'active'
    `;
    const params = [organizationId];

    if (departmentId) {
      query += ` AND e.department_id = $${params.length + 1}`;
      params.push(departmentId);
    }

    if (locationId) {
      query += ` AND e.primary_location_id = $${params.length + 1}`;
      params.push(locationId);
    }

    query += ` GROUP BY e.id, d.name, l.name ORDER BY compliance_percent ASC NULLS FIRST, e.last_name`;

    const employees = await db.query(query, params);

    res.json({ employees: employees.rows });
  } catch (error) {
    console.error('Failed to get compliance status:', error);
    res.status(500).json({ error: 'Failed to get compliance status' });
  }
});

// Get employee's compliance details
router.get('/employees/:employeeId', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { organizationId } = req.user;

    const items = await db.query(`
      SELECT ci.*,
             ec.status,
             ec.completed_at,
             ec.expires_at,
             ec.progress_percent,
             ec.score,
             ec.verified_at,
             vu.first_name || ' ' || vu.last_name as verified_by_name,
             CASE
               WHEN ec.status = 'completed' AND ec.expires_at < NOW() THEN 'expired'
               WHEN ec.status = 'completed' AND ec.expires_at < NOW() + INTERVAL '30 days' THEN 'expiring_soon'
               WHEN ec.status IS NULL THEN 'pending'
               ELSE ec.status
             END as effective_status
      FROM compliance_items ci
      LEFT JOIN employee_compliance ec ON ec.compliance_item_id = ci.id AND ec.employee_id = $1
      LEFT JOIN users vu ON vu.id = ec.verified_by
      WHERE ci.organization_id = $2 AND ci.is_active = true
      ORDER BY ci.is_mandatory DESC, ci.name
    `, [req.params.employeeId, organizationId]);

    res.json({ items: items.rows });
  } catch (error) {
    console.error('Failed to get employee compliance:', error);
    res.status(500).json({ error: 'Failed to get employee compliance' });
  }
});

// Verify employee compliance
router.post('/verify/:recordId', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { userId } = req.user;
    const { notes } = req.body;

    const result = await db.query(`
      UPDATE employee_compliance
      SET verified_by = $1, verified_at = NOW(), notes = $2, updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `, [userId, notes, req.params.recordId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Compliance record not found' });
    }

    res.json({ record: result.rows[0] });
  } catch (error) {
    console.error('Failed to verify compliance:', error);
    res.status(500).json({ error: 'Failed to verify compliance' });
  }
});

// Waive compliance requirement for employee
router.post('/waive', requireRole(['admin']), async (req, res) => {
  try {
    const { userId } = req.user;
    const { employeeId, complianceItemId, reason } = req.body;

    const result = await db.query(`
      INSERT INTO employee_compliance (employee_id, compliance_item_id, status, verified_by, verified_at, notes)
      VALUES ($1, $2, 'waived', $3, NOW(), $4)
      ON CONFLICT (employee_id, compliance_item_id)
      DO UPDATE SET status = 'waived', verified_by = $3, verified_at = NOW(), notes = $4, updated_at = NOW()
      RETURNING *
    `, [employeeId, complianceItemId, userId, reason]);

    res.json({ record: result.rows[0] });
  } catch (error) {
    console.error('Failed to waive compliance:', error);
    res.status(500).json({ error: 'Failed to waive compliance' });
  }
});

export default router;
