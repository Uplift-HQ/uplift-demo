// ============================================================
// ACTIVITY REVIEW API
// Task completions, proof uploads, form submissions
// ============================================================

import express from 'express';
import { db } from '../lib/database.js';
import { authMiddleware, requireRole } from '../middleware/index.js';

const router = express.Router();

// Apply auth to all routes
router.use(authMiddleware);

/**
 * GET /api/activity
 * List activity submissions for review
 */
router.get('/', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const { status, type, limit = 50 } = req.query;

    // Return empty array if no activity_submissions table exists
    // This prevents 404 errors while allowing the page to render
    let submissions = [];

    try {
      let query = `
        SELECT
          a.id,
          a.type,
          a.title,
          a.description,
          a.status,
          a.submitted_at,
          a.reviewed_at,
          a.reviewed_by,
          e.first_name || ' ' || e.last_name as employee_name,
          e.id as employee_id,
          l.name as location
        FROM activity_submissions a
        JOIN employees e ON e.id = a.employee_id
        LEFT JOIN locations l ON l.id = a.location_id
        WHERE a.organization_id = $1
      `;
      const params = [orgId];
      let paramIndex = 2;

      if (status) {
        query += ` AND a.status = $${paramIndex++}`;
        params.push(status);
      }
      if (type) {
        query += ` AND a.type = $${paramIndex++}`;
        params.push(type);
      }

      query += ` ORDER BY a.submitted_at DESC LIMIT $${paramIndex}`;
      params.push(parseInt(limit));

      const result = await db.query(query, params);
      submissions = result.rows;
    } catch (dbError) {
      // Table doesn't exist, return empty array
      if (dbError.code !== '42P01') {
        console.error('Activity query error:', dbError);
      }
    }

    res.json({
      submissions,
      activities: submissions // alias for compatibility
    });
  } catch (error) {
    console.error('Get activity error:', error);
    res.status(500).json({ error: 'Failed to get activity' });
  }
});

/**
 * POST /api/activity/:id/approve
 * Approve an activity submission
 */
router.post('/:id/approve', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const orgId = req.user.organizationId;

    const result = await db.query(`
      UPDATE activity_submissions
      SET status = 'approved', reviewed_by = $1, reviewed_at = NOW()
      WHERE id = $2 AND organization_id = $3
      RETURNING *
    `, [userId, id, orgId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    res.json({ submission: result.rows[0] });
  } catch (error) {
    console.error('Approve activity error:', error);
    res.status(500).json({ error: 'Failed to approve' });
  }
});

/**
 * POST /api/activity/:id/reject
 * Reject an activity submission
 */
router.post('/:id/reject', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user.userId;
    const orgId = req.user.organizationId;

    const result = await db.query(`
      UPDATE activity_submissions
      SET status = 'rejected', reviewed_by = $1, reviewed_at = NOW(), rejection_reason = $2
      WHERE id = $3 AND organization_id = $4
      RETURNING *
    `, [userId, reason, id, orgId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    res.json({ submission: result.rows[0] });
  } catch (error) {
    console.error('Reject activity error:', error);
    res.status(500).json({ error: 'Failed to reject' });
  }
});

export default router;
