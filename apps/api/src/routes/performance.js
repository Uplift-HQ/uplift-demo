// ============================================================
// PERFORMANCE MODULE API
// Reviews, goals, feedback, and competency tracking
// ============================================================

import express from 'express';
import { db } from '../lib/database.js';
import { authMiddleware, requireRole } from '../middleware/index.js';

const router = express.Router();

// Apply auth to all routes
router.use(authMiddleware);

// ============================================================
// REVIEWS
// ============================================================

/**
 * GET /api/performance/my-reviews
 * Current user's performance reviews
 */
router.get('/my-reviews', async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get employee id for user
    const empResult = await db.query('SELECT id FROM employees WHERE user_id = $1', [userId]);
    if (empResult.rows.length === 0) {
      return res.json({ reviews: [] });
    }

    const employeeId = empResult.rows[0].id;

    const result = await db.query(`
      SELECT pr.*,
        r.first_name || ' ' || r.last_name as reviewer_name,
        (SELECT json_agg(cr.*) FROM competency_ratings cr WHERE cr.review_id = pr.id) as competencies
      FROM performance_reviews pr
      LEFT JOIN users r ON r.id = pr.reviewer_id
      WHERE pr.employee_id = $1
      ORDER BY pr.created_at DESC
    `, [employeeId]);

    res.json({ reviews: result.rows });
  } catch (error) {
    console.error('Get my reviews error:', error);
    res.status(500).json({ error: 'Failed to get reviews' });
  }
});

/**
 * GET /api/performance/reviews/:id
 * Get a specific review
 */
router.get('/reviews/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const orgId = req.user.organizationId;

    const result = await db.query(`
      SELECT pr.*,
        e.user_id as employee_user_id,
        eu.first_name || ' ' || eu.last_name as employee_name,
        e.job_title,
        r.first_name || ' ' || r.last_name as reviewer_name,
        (SELECT json_agg(cr.* ORDER BY cr.competency_category, cr.competency_name)
         FROM competency_ratings cr WHERE cr.review_id = pr.id) as competencies
      FROM performance_reviews pr
      JOIN employees e ON e.id = pr.employee_id
      JOIN users eu ON eu.id = e.user_id
      LEFT JOIN users r ON r.id = pr.reviewer_id
      WHERE pr.id = $1 AND pr.organization_id = $2
    `, [id, orgId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }

    const review = result.rows[0];

    // Check permission: employee can see their own, managers/admins can see all
    if (review.employee_user_id !== userId && !['admin', 'manager'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Not authorized to view this review' });
    }

    res.json({ review });
  } catch (error) {
    console.error('Get review error:', error);
    res.status(500).json({ error: 'Failed to get review' });
  }
});

/**
 * POST /api/performance/reviews
 * Create a review cycle (admin only)
 */
router.post('/reviews', requireRole(['admin']), async (req, res) => {
  try {
    const { employee_id, reviewer_id, review_period, type, competencies } = req.body;
    const orgId = req.user.organizationId;

    if (!employee_id || !review_period) {
      return res.status(400).json({ error: 'Employee ID and review period are required' });
    }

    // Verify employee belongs to org
    const empResult = await db.query('SELECT id FROM employees WHERE id = $1 AND organization_id = $2', [employee_id, orgId]);
    if (empResult.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const result = await db.query(`
      INSERT INTO performance_reviews (organization_id, employee_id, reviewer_id, review_period, type, status)
      VALUES ($1, $2, $3, $4, $5, 'self_review')
      RETURNING *
    `, [orgId, employee_id, reviewer_id, review_period, type || 'annual']);

    const reviewId = result.rows[0].id;

    // Create competency ratings if provided
    if (competencies && Array.isArray(competencies)) {
      for (const comp of competencies) {
        await db.query(`
          INSERT INTO competency_ratings (review_id, competency_name, competency_category)
          VALUES ($1, $2, $3)
        `, [reviewId, comp.name, comp.category]);
      }
    }

    res.status(201).json({ review: result.rows[0] });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ error: 'Failed to create review' });
  }
});

/**
 * PATCH /api/performance/reviews/:id
 * Update a review (submit self-assessment, manager assessment)
 */
router.patch('/reviews/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const orgId = req.user.organizationId;
    const updates = req.body;

    // Get the review
    const reviewResult = await db.query(`
      SELECT pr.*, e.user_id as employee_user_id
      FROM performance_reviews pr
      JOIN employees e ON e.id = pr.employee_id
      WHERE pr.id = $1 AND pr.organization_id = $2
    `, [id, orgId]);

    if (reviewResult.rows.length === 0) {
      return res.status(404).json({ error: 'Review not found' });
    }

    const review = reviewResult.rows[0];
    const isEmployee = review.employee_user_id === userId;
    const isReviewer = review.reviewer_id === userId;
    const isAdmin = req.user.role === 'admin';

    // Determine what can be updated based on role and status
    const setClause = [];
    const values = [];
    let paramIndex = 1;

    // Employee submitting self-assessment
    if (isEmployee && review.status === 'self_review') {
      if (updates.self_assessment_text !== undefined) {
        setClause.push(`self_assessment_text = $${paramIndex++}`);
        values.push(updates.self_assessment_text);
      }
      if (updates.submit_self) {
        setClause.push(`status = 'manager_review'`);
        setClause.push(`submitted_at = NOW()`);
      }
    }

    // Reviewer/Manager submitting assessment
    if ((isReviewer || isAdmin) && ['manager_review', 'calibration'].includes(review.status)) {
      if (updates.manager_assessment_text !== undefined) {
        setClause.push(`manager_assessment_text = $${paramIndex++}`);
        values.push(updates.manager_assessment_text);
      }
      if (updates.overall_rating !== undefined) {
        setClause.push(`overall_rating = $${paramIndex++}`);
        values.push(updates.overall_rating);
      }
      if (updates.strengths !== undefined) {
        setClause.push(`strengths = $${paramIndex++}`);
        values.push(updates.strengths);
      }
      if (updates.development_areas !== undefined) {
        setClause.push(`development_areas = $${paramIndex++}`);
        values.push(updates.development_areas);
      }
      if (updates.complete) {
        setClause.push(`status = 'complete'`);
        setClause.push(`completed_at = NOW()`);
      }
    }

    // Update competency ratings
    if (updates.competencies && Array.isArray(updates.competencies)) {
      for (const comp of updates.competencies) {
        if (isEmployee && review.status === 'self_review') {
          await db.query(`
            UPDATE competency_ratings SET self_rating = $1, comments = COALESCE($2, comments)
            WHERE id = $3 AND review_id = $4
          `, [comp.self_rating, comp.comments, comp.id, id]);
        }
        if ((isReviewer || isAdmin) && ['manager_review', 'calibration'].includes(review.status)) {
          await db.query(`
            UPDATE competency_ratings SET manager_rating = $1, comments = COALESCE($2, comments)
            WHERE id = $3 AND review_id = $4
          `, [comp.manager_rating, comp.comments, comp.id, id]);
        }
      }
    }

    if (setClause.length === 0) {
      return res.status(400).json({ error: 'No valid updates or insufficient permissions' });
    }

    values.push(id);
    const result = await db.query(`
      UPDATE performance_reviews SET ${setClause.join(', ')} WHERE id = $${paramIndex}
      RETURNING *
    `, values);

    res.json({ review: result.rows[0] });
  } catch (error) {
    console.error('Update review error:', error);
    res.status(500).json({ error: 'Failed to update review' });
  }
});

/**
 * GET /api/performance/team-reviews
 * Team's reviews (manager/admin)
 */
router.get('/team-reviews', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const { status, period } = req.query;

    let query = `
      SELECT pr.*,
        e.user_id as employee_user_id,
        eu.first_name || ' ' || eu.last_name as employee_name,
        e.job_title,
        r.first_name || ' ' || r.last_name as reviewer_name
      FROM performance_reviews pr
      JOIN employees e ON e.id = pr.employee_id
      JOIN users eu ON eu.id = e.user_id
      LEFT JOIN users r ON r.id = pr.reviewer_id
      WHERE pr.organization_id = $1
    `;
    const params = [orgId];
    let paramIndex = 2;

    if (status) {
      query += ` AND pr.status = $${paramIndex++}`;
      params.push(status);
    }
    if (period) {
      query += ` AND pr.review_period = $${paramIndex++}`;
      params.push(period);
    }

    query += ' ORDER BY pr.created_at DESC';

    const result = await db.query(query, params);
    res.json({ reviews: result.rows });
  } catch (error) {
    console.error('Get team reviews error:', error);
    res.status(500).json({ error: 'Failed to get team reviews' });
  }
});

// ============================================================
// GOALS
// ============================================================

/**
 * GET /api/performance/goals
 * Current user's goals
 */
router.get('/goals', async (req, res) => {
  try {
    const userId = req.user.userId;

    const empResult = await db.query('SELECT id FROM employees WHERE user_id = $1', [userId]);
    if (empResult.rows.length === 0) {
      return res.json({ goals: [] });
    }

    const employeeId = empResult.rows[0].id;

    const result = await db.query(`
      SELECT g.*,
        u.first_name || ' ' || u.last_name as created_by_name,
        (SELECT json_agg(gu.* ORDER BY gu.created_at DESC)
         FROM goal_updates gu WHERE gu.goal_id = g.id) as updates
      FROM goals g
      LEFT JOIN users u ON u.id = g.created_by
      WHERE g.employee_id = $1
      ORDER BY
        CASE WHEN g.status = 'in_progress' THEN 0
             WHEN g.status = 'not_started' THEN 1
             WHEN g.status = 'completed' THEN 2
             ELSE 3 END,
        g.target_date ASC NULLS LAST
    `, [employeeId]);

    res.json({ goals: result.rows });
  } catch (error) {
    console.error('Get goals error:', error);
    res.status(500).json({ error: 'Failed to get goals' });
  }
});

/**
 * POST /api/performance/goals
 * Create a new goal
 */
router.post('/goals', async (req, res) => {
  try {
    const { title, description, category, priority, target_date, employee_id } = req.body;
    const userId = req.user.userId;
    const orgId = req.user.organizationId;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    // Determine target employee
    let targetEmployeeId = employee_id;
    if (!targetEmployeeId) {
      const empResult = await db.query('SELECT id FROM employees WHERE user_id = $1', [userId]);
      if (empResult.rows.length === 0) {
        return res.status(400).json({ error: 'No employee profile found' });
      }
      targetEmployeeId = empResult.rows[0].id;
    }

    const result = await db.query(`
      INSERT INTO goals (employee_id, organization_id, title, description, category, priority, target_date, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [targetEmployeeId, orgId, title, description, category || 'performance', priority || 'medium', target_date, userId]);

    res.status(201).json({ goal: result.rows[0] });
  } catch (error) {
    console.error('Create goal error:', error);
    res.status(500).json({ error: 'Failed to create goal' });
  }
});

/**
 * PATCH /api/performance/goals/:id
 * Update goal progress
 */
router.patch('/goals/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { title, description, category, priority, status, progress_percentage, target_date, completed_date } = req.body;

    // Verify ownership or manager role
    const goalResult = await db.query(`
      SELECT g.*, e.user_id as employee_user_id
      FROM goals g
      JOIN employees e ON e.id = g.employee_id
      WHERE g.id = $1
    `, [id]);

    if (goalResult.rows.length === 0) {
      return res.status(404).json({ error: 'Goal not found' });
    }

    const goal = goalResult.rows[0];
    if (goal.employee_user_id !== userId && !['admin', 'manager'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Not authorized to update this goal' });
    }

    const setClause = [];
    const values = [];
    let paramIndex = 1;

    if (title !== undefined) { setClause.push(`title = $${paramIndex++}`); values.push(title); }
    if (description !== undefined) { setClause.push(`description = $${paramIndex++}`); values.push(description); }
    if (category !== undefined) { setClause.push(`category = $${paramIndex++}`); values.push(category); }
    if (priority !== undefined) { setClause.push(`priority = $${paramIndex++}`); values.push(priority); }
    if (status !== undefined) { setClause.push(`status = $${paramIndex++}`); values.push(status); }
    if (progress_percentage !== undefined) { setClause.push(`progress_percentage = $${paramIndex++}`); values.push(progress_percentage); }
    if (target_date !== undefined) { setClause.push(`target_date = $${paramIndex++}`); values.push(target_date); }
    if (completed_date !== undefined) { setClause.push(`completed_date = $${paramIndex++}`); values.push(completed_date); }

    // Auto-set completed status
    if (progress_percentage === 100 && !status) {
      setClause.push(`status = 'completed'`);
      setClause.push(`completed_date = CURRENT_DATE`);
    }

    if (setClause.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);
    const result = await db.query(`
      UPDATE goals SET ${setClause.join(', ')} WHERE id = $${paramIndex}
      RETURNING *
    `, values);

    res.json({ goal: result.rows[0] });
  } catch (error) {
    console.error('Update goal error:', error);
    res.status(500).json({ error: 'Failed to update goal' });
  }
});

/**
 * POST /api/performance/goals/:id/updates
 * Add a progress update to a goal
 */
router.post('/goals/:id/updates', async (req, res) => {
  try {
    const { id } = req.params;
    const { update_text, progress_percentage } = req.body;
    const userId = req.user.userId;

    if (!update_text) {
      return res.status(400).json({ error: 'Update text is required' });
    }

    // Insert update
    const updateResult = await db.query(`
      INSERT INTO goal_updates (goal_id, update_text, progress_percentage, updated_by)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [id, update_text, progress_percentage, userId]);

    // Update goal progress if provided
    if (progress_percentage !== undefined) {
      const status = progress_percentage === 100 ? 'completed' : 'in_progress';
      await db.query(`
        UPDATE goals SET progress_percentage = $1, status = $2,
        completed_date = CASE WHEN $1 = 100 THEN CURRENT_DATE ELSE completed_date END
        WHERE id = $3
      `, [progress_percentage, status, id]);
    }

    res.status(201).json({ update: updateResult.rows[0] });
  } catch (error) {
    console.error('Create goal update error:', error);
    res.status(500).json({ error: 'Failed to create update' });
  }
});

/**
 * GET /api/performance/team-goals
 * Team's goals (manager/admin)
 */
router.get('/team-goals', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const { status } = req.query;

    let query = `
      SELECT g.*,
        eu.first_name || ' ' || eu.last_name as employee_name,
        e.job_title
      FROM goals g
      JOIN employees e ON e.id = g.employee_id
      JOIN users eu ON eu.id = e.user_id
      WHERE g.organization_id = $1
    `;
    const params = [orgId];

    if (status) {
      query += ` AND g.status = $2`;
      params.push(status);
    }

    query += ' ORDER BY g.target_date ASC NULLS LAST';

    const result = await db.query(query, params);
    res.json({ goals: result.rows });
  } catch (error) {
    console.error('Get team goals error:', error);
    res.status(500).json({ error: 'Failed to get team goals' });
  }
});

// ============================================================
// FEEDBACK
// ============================================================

/**
 * POST /api/performance/feedback
 * Give feedback to a colleague
 */
router.post('/feedback', async (req, res) => {
  try {
    const { to_user_id, feedback_text, feedback_type, is_anonymous, visibility } = req.body;
    const fromUserId = req.user.userId;
    const orgId = req.user.organizationId;

    if (!to_user_id || !feedback_text) {
      return res.status(400).json({ error: 'Recipient and feedback text are required' });
    }

    if (to_user_id === fromUserId) {
      return res.status(400).json({ error: 'Cannot give feedback to yourself' });
    }

    const result = await db.query(`
      INSERT INTO feedback (organization_id, from_user_id, to_user_id, feedback_text, feedback_type, is_anonymous, visibility)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [orgId, fromUserId, to_user_id, feedback_text, feedback_type || 'general', is_anonymous || false, visibility || 'private']);

    res.status(201).json({ feedback: result.rows[0] });
  } catch (error) {
    console.error('Create feedback error:', error);
    res.status(500).json({ error: 'Failed to create feedback' });
  }
});

/**
 * GET /api/performance/my-feedback
 * Feedback received by current user
 */
router.get('/my-feedback', async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await db.query(`
      SELECT f.*,
        CASE WHEN f.is_anonymous THEN 'Anonymous' ELSE u.first_name || ' ' || u.last_name END as from_name
      FROM feedback f
      LEFT JOIN users u ON u.id = f.from_user_id
      WHERE f.to_user_id = $1
      ORDER BY f.created_at DESC
    `, [userId]);

    res.json({ feedback: result.rows });
  } catch (error) {
    console.error('Get my feedback error:', error);
    res.status(500).json({ error: 'Failed to get feedback' });
  }
});

/**
 * GET /api/performance/given-feedback
 * Feedback given by current user
 */
router.get('/given-feedback', async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await db.query(`
      SELECT f.*,
        u.first_name || ' ' || u.last_name as to_name
      FROM feedback f
      JOIN users u ON u.id = f.to_user_id
      WHERE f.from_user_id = $1
      ORDER BY f.created_at DESC
    `, [userId]);

    res.json({ feedback: result.rows });
  } catch (error) {
    console.error('Get given feedback error:', error);
    res.status(500).json({ error: 'Failed to get feedback' });
  }
});

export default router;
