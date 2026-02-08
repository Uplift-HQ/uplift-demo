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

/**
 * GET /api/performance/public-feedback
 * Public feedback feed for organization
 */
router.get('/public-feedback', async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const { limit = 50 } = req.query;

    const result = await db.query(`
      SELECT f.*,
        CASE WHEN f.is_anonymous THEN 'Anonymous' ELSE fu.first_name || ' ' || fu.last_name END as from_name,
        tu.first_name || ' ' || tu.last_name as to_name,
        (SELECT SUBSTRING(fu.first_name, 1, 1) || SUBSTRING(fu.last_name, 1, 1)) as from_initials,
        (SELECT SUBSTRING(tu.first_name, 1, 1) || SUBSTRING(tu.last_name, 1, 1)) as to_initials
      FROM feedback f
      LEFT JOIN users fu ON fu.id = f.from_user_id
      JOIN users tu ON tu.id = f.to_user_id
      WHERE f.organization_id = $1 AND f.visibility = 'shared_with_manager'
      ORDER BY f.created_at DESC
      LIMIT $2
    `, [orgId, parseInt(limit)]);

    res.json({ feedback: result.rows });
  } catch (error) {
    console.error('Get public feedback error:', error);
    res.status(500).json({ error: 'Failed to get feedback' });
  }
});

/**
 * POST /api/performance/feedback/:id/react
 * Add reaction to feedback
 */
router.post('/feedback/:id/react', async (req, res) => {
  try {
    const { id } = req.params;
    const { reaction } = req.body; // thumbsUp, heart, sparkle

    if (!['thumbsUp', 'heart', 'sparkle'].includes(reaction)) {
      return res.status(400).json({ error: 'Invalid reaction type' });
    }

    const result = await db.query(`
      UPDATE feedback
      SET reactions = jsonb_set(
        COALESCE(reactions, '{"thumbsUp": 0, "heart": 0, "sparkle": 0}'::jsonb),
        ARRAY[$2],
        (COALESCE((reactions->>$2)::int, 0) + 1)::text::jsonb
      )
      WHERE id = $1
      RETURNING reactions
    `, [id, reaction]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    res.json({ reactions: result.rows[0].reactions });
  } catch (error) {
    console.error('React to feedback error:', error);
    res.status(500).json({ error: 'Failed to react to feedback' });
  }
});

// ============================================================
// REVIEW CYCLES
// ============================================================

/**
 * GET /api/performance/cycles
 * List all review cycles
 */
router.get('/cycles', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const { status } = req.query;

    let query = `
      SELECT rc.*,
        (SELECT COUNT(*) FROM review_cycle_participants rcp WHERE rcp.cycle_id = rc.id) as total_participants,
        (SELECT COUNT(*) FROM review_cycle_participants rcp WHERE rcp.cycle_id = rc.id AND rcp.manager_done = true) as completed_count,
        u.first_name || ' ' || u.last_name as created_by_name
      FROM review_cycles rc
      LEFT JOIN users u ON u.id = rc.created_by
      WHERE rc.organization_id = $1
    `;
    const params = [orgId];

    if (status) {
      query += ` AND rc.status = $2`;
      params.push(status);
    }

    query += ' ORDER BY rc.start_date DESC';

    const result = await db.query(query, params);
    res.json({ cycles: result.rows });
  } catch (error) {
    console.error('Get review cycles error:', error);
    res.status(500).json({ error: 'Failed to get review cycles' });
  }
});

/**
 * GET /api/performance/cycles/:id
 * Get cycle with participants
 */
router.get('/cycles/:id', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { id } = req.params;
    const orgId = req.user.organizationId;

    const cycleResult = await db.query(`
      SELECT rc.*,
        u.first_name || ' ' || u.last_name as created_by_name
      FROM review_cycles rc
      LEFT JOIN users u ON u.id = rc.created_by
      WHERE rc.id = $1 AND rc.organization_id = $2
    `, [id, orgId]);

    if (cycleResult.rows.length === 0) {
      return res.status(404).json({ error: 'Review cycle not found' });
    }

    const participantsResult = await db.query(`
      SELECT rcp.*,
        eu.first_name || ' ' || eu.last_name as employee_name,
        e.job_title,
        d.name as department_name
      FROM review_cycle_participants rcp
      JOIN employees e ON e.id = rcp.employee_id
      JOIN users eu ON eu.id = e.user_id
      LEFT JOIN departments d ON d.id = e.department_id
      WHERE rcp.cycle_id = $1
      ORDER BY eu.first_name, eu.last_name
    `, [id]);

    res.json({
      cycle: cycleResult.rows[0],
      participants: participantsResult.rows
    });
  } catch (error) {
    console.error('Get review cycle error:', error);
    res.status(500).json({ error: 'Failed to get review cycle' });
  }
});

/**
 * POST /api/performance/cycles
 * Create a new review cycle
 */
router.post('/cycles', requireRole(['admin']), async (req, res) => {
  try {
    const { name, type, start_date, end_date, self_assessment, manager_review, peer_review, employee_ids } = req.body;
    const orgId = req.user.organizationId;
    const userId = req.user.userId;

    if (!name || !type || !start_date || !end_date) {
      return res.status(400).json({ error: 'Name, type, start date, and end date are required' });
    }

    // Start transaction
    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      // Create cycle
      const cycleResult = await client.query(`
        INSERT INTO review_cycles (organization_id, name, type, start_date, end_date, self_assessment, manager_review, peer_review, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `, [orgId, name, type, start_date, end_date, self_assessment !== false, manager_review !== false, peer_review || false, userId]);

      const cycleId = cycleResult.rows[0].id;

      // Add participants
      if (employee_ids && employee_ids.length > 0) {
        for (const empId of employee_ids) {
          await client.query(`
            INSERT INTO review_cycle_participants (cycle_id, employee_id)
            VALUES ($1, $2)
            ON CONFLICT (cycle_id, employee_id) DO NOTHING
          `, [cycleId, empId]);
        }
      }

      await client.query('COMMIT');
      res.status(201).json({ cycle: cycleResult.rows[0] });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Create review cycle error:', error);
    res.status(500).json({ error: 'Failed to create review cycle' });
  }
});

/**
 * PATCH /api/performance/cycles/:id
 * Update review cycle
 */
router.patch('/cycles/:id', requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, status, start_date, end_date } = req.body;
    const orgId = req.user.organizationId;

    const setClause = [];
    const values = [];
    let paramIndex = 1;

    if (name) { setClause.push(`name = $${paramIndex++}`); values.push(name); }
    if (status) { setClause.push(`status = $${paramIndex++}`); values.push(status); }
    if (start_date) { setClause.push(`start_date = $${paramIndex++}`); values.push(start_date); }
    if (end_date) { setClause.push(`end_date = $${paramIndex++}`); values.push(end_date); }

    if (setClause.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id, orgId);
    const result = await db.query(`
      UPDATE review_cycles SET ${setClause.join(', ')}
      WHERE id = $${paramIndex++} AND organization_id = $${paramIndex}
      RETURNING *
    `, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Review cycle not found' });
    }

    res.json({ cycle: result.rows[0] });
  } catch (error) {
    console.error('Update review cycle error:', error);
    res.status(500).json({ error: 'Failed to update review cycle' });
  }
});

/**
 * PATCH /api/performance/cycles/:id/participants/:participantId
 * Update participant status in cycle
 */
router.patch('/cycles/:id/participants/:participantId', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { id, participantId } = req.params;
    const { self_done, manager_done, peer_done, rating } = req.body;

    const setClause = [];
    const values = [];
    let paramIndex = 1;

    if (self_done !== undefined) { setClause.push(`self_done = $${paramIndex++}`); values.push(self_done); }
    if (manager_done !== undefined) { setClause.push(`manager_done = $${paramIndex++}`); values.push(manager_done); }
    if (peer_done !== undefined) { setClause.push(`peer_done = $${paramIndex++}`); values.push(peer_done); }
    if (rating !== undefined) { setClause.push(`rating = $${paramIndex++}`); values.push(rating); }

    if (setClause.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(participantId, id);
    const result = await db.query(`
      UPDATE review_cycle_participants SET ${setClause.join(', ')}, submitted_at = NOW()
      WHERE id = $${paramIndex++} AND cycle_id = $${paramIndex}
      RETURNING *
    `, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Participant not found' });
    }

    res.json({ participant: result.rows[0] });
  } catch (error) {
    console.error('Update participant error:', error);
    res.status(500).json({ error: 'Failed to update participant' });
  }
});

// ============================================================
// 1-ON-1 MEETINGS
// ============================================================

/**
 * GET /api/performance/one-on-ones
 * Get user's 1-on-1 meetings (as manager or employee)
 */
router.get('/one-on-ones', async (req, res) => {
  try {
    const userId = req.user.userId;
    const orgId = req.user.organizationId;
    const { status, upcoming } = req.query;

    let query = `
      SELECT o.*,
        mu.first_name || ' ' || mu.last_name as manager_name,
        SUBSTRING(mu.first_name, 1, 1) || SUBSTRING(mu.last_name, 1, 1) as manager_initials,
        eu.first_name || ' ' || eu.last_name as employee_name,
        SUBSTRING(eu.first_name, 1, 1) || SUBSTRING(eu.last_name, 1, 1) as employee_initials,
        (SELECT json_agg(oa.* ORDER BY oa.created_at) FROM one_on_one_actions oa WHERE oa.one_on_one_id = o.id) as action_items
      FROM one_on_ones o
      JOIN users mu ON mu.id = o.manager_id
      JOIN users eu ON eu.id = o.employee_id
      WHERE o.organization_id = $1 AND (o.manager_id = $2 OR o.employee_id = $2)
    `;
    const params = [orgId, userId];
    let paramIndex = 3;

    if (status) {
      query += ` AND o.status = $${paramIndex++}`;
      params.push(status);
    }

    if (upcoming === 'true') {
      query += ` AND o.scheduled_date >= CURRENT_DATE AND o.status IN ('scheduled', 'rescheduled')`;
    }

    query += ' ORDER BY o.scheduled_date DESC, o.scheduled_time DESC';

    const result = await db.query(query, params);
    res.json({ meetings: result.rows });
  } catch (error) {
    console.error('Get one-on-ones error:', error);
    res.status(500).json({ error: 'Failed to get meetings' });
  }
});

/**
 * GET /api/performance/one-on-ones/:id
 * Get a specific 1-on-1 meeting
 */
router.get('/one-on-ones/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const result = await db.query(`
      SELECT o.*,
        mu.first_name || ' ' || mu.last_name as manager_name,
        eu.first_name || ' ' || eu.last_name as employee_name,
        (SELECT json_agg(oa.* ORDER BY oa.created_at) FROM one_on_one_actions oa WHERE oa.one_on_one_id = o.id) as action_items
      FROM one_on_ones o
      JOIN users mu ON mu.id = o.manager_id
      JOIN users eu ON eu.id = o.employee_id
      WHERE o.id = $1 AND (o.manager_id = $2 OR o.employee_id = $2)
    `, [id, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    res.json({ meeting: result.rows[0] });
  } catch (error) {
    console.error('Get one-on-one error:', error);
    res.status(500).json({ error: 'Failed to get meeting' });
  }
});

/**
 * POST /api/performance/one-on-ones
 * Create a 1-on-1 meeting
 */
router.post('/one-on-ones', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { employee_id, scheduled_date, scheduled_time, recurring, agenda } = req.body;
    const managerId = req.user.userId;
    const orgId = req.user.organizationId;

    if (!employee_id || !scheduled_date) {
      return res.status(400).json({ error: 'Employee ID and scheduled date are required' });
    }

    const result = await db.query(`
      INSERT INTO one_on_ones (organization_id, manager_id, employee_id, scheduled_date, scheduled_time, recurring, agenda)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [orgId, managerId, employee_id, scheduled_date, scheduled_time, recurring || 'none', agenda ? JSON.stringify(agenda) : '[]']);

    res.status(201).json({ meeting: result.rows[0] });
  } catch (error) {
    console.error('Create one-on-one error:', error);
    res.status(500).json({ error: 'Failed to create meeting' });
  }
});

/**
 * PATCH /api/performance/one-on-ones/:id
 * Update a 1-on-1 meeting
 */
router.patch('/one-on-ones/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { scheduled_date, scheduled_time, status, agenda, notes, mood } = req.body;

    // Verify user is manager or employee
    const checkResult = await db.query(
      'SELECT id FROM one_on_ones WHERE id = $1 AND (manager_id = $2 OR employee_id = $2)',
      [id, userId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Meeting not found or not authorized' });
    }

    const setClause = [];
    const values = [];
    let paramIndex = 1;

    if (scheduled_date) { setClause.push(`scheduled_date = $${paramIndex++}`); values.push(scheduled_date); }
    if (scheduled_time) { setClause.push(`scheduled_time = $${paramIndex++}`); values.push(scheduled_time); }
    if (status) { setClause.push(`status = $${paramIndex++}`); values.push(status); }
    if (agenda) { setClause.push(`agenda = $${paramIndex++}`); values.push(JSON.stringify(agenda)); }
    if (notes !== undefined) { setClause.push(`notes = $${paramIndex++}`); values.push(notes); }
    if (mood !== undefined) { setClause.push(`mood = $${paramIndex++}`); values.push(mood); }

    if (setClause.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);
    const result = await db.query(`
      UPDATE one_on_ones SET ${setClause.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, values);

    res.json({ meeting: result.rows[0] });
  } catch (error) {
    console.error('Update one-on-one error:', error);
    res.status(500).json({ error: 'Failed to update meeting' });
  }
});

/**
 * POST /api/performance/one-on-ones/:id/actions
 * Add action item to 1-on-1
 */
router.post('/one-on-ones/:id/actions', async (req, res) => {
  try {
    const { id } = req.params;
    const { text, assigned_to, due_date } = req.body;
    const userId = req.user.userId;

    if (!text) {
      return res.status(400).json({ error: 'Action item text is required' });
    }

    // Verify user is part of meeting
    const checkResult = await db.query(
      'SELECT id FROM one_on_ones WHERE id = $1 AND (manager_id = $2 OR employee_id = $2)',
      [id, userId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Meeting not found or not authorized' });
    }

    const result = await db.query(`
      INSERT INTO one_on_one_actions (one_on_one_id, text, assigned_to, due_date)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [id, text, assigned_to, due_date]);

    res.status(201).json({ action: result.rows[0] });
  } catch (error) {
    console.error('Create action item error:', error);
    res.status(500).json({ error: 'Failed to create action item' });
  }
});

/**
 * PATCH /api/performance/one-on-ones/:id/actions/:actionId
 * Update action item
 */
router.patch('/one-on-ones/:id/actions/:actionId', async (req, res) => {
  try {
    const { actionId } = req.params;
    const { text, is_completed } = req.body;

    const setClause = [];
    const values = [];
    let paramIndex = 1;

    if (text) { setClause.push(`text = $${paramIndex++}`); values.push(text); }
    if (is_completed !== undefined) {
      setClause.push(`is_completed = $${paramIndex++}`);
      values.push(is_completed);
      if (is_completed) {
        setClause.push(`completed_at = NOW()`);
      }
    }

    if (setClause.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(actionId);
    const result = await db.query(`
      UPDATE one_on_one_actions SET ${setClause.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Action item not found' });
    }

    res.json({ action: result.rows[0] });
  } catch (error) {
    console.error('Update action item error:', error);
    res.status(500).json({ error: 'Failed to update action item' });
  }
});

// ============================================================
// DEVELOPMENT PLANS
// ============================================================

/**
 * GET /api/performance/development-plans
 * Get development plans
 */
router.get('/development-plans', async (req, res) => {
  try {
    const userId = req.user.userId;
    const orgId = req.user.organizationId;
    const isManager = ['admin', 'manager'].includes(req.user.role);

    let query = `
      SELECT dp.*,
        eu.first_name || ' ' || eu.last_name as employee_name,
        e.job_title,
        (SELECT json_agg(
          json_build_object(
            'id', dfa.id,
            'title', dfa.title,
            'sort_order', dfa.sort_order,
            'actions', (SELECT json_agg(da.* ORDER BY da.sort_order) FROM development_actions da WHERE da.focus_area_id = dfa.id)
          ) ORDER BY dfa.sort_order
        ) FROM development_focus_areas dfa WHERE dfa.plan_id = dp.id) as focus_areas
      FROM development_plans dp
      JOIN employees e ON e.id = dp.employee_id
      JOIN users eu ON eu.id = e.user_id
      WHERE dp.organization_id = $1
    `;
    const params = [orgId];

    if (!isManager) {
      query += ` AND e.user_id = $2`;
      params.push(userId);
    }

    query += ' ORDER BY dp.created_at DESC';

    const result = await db.query(query, params);
    res.json({ plans: result.rows });
  } catch (error) {
    console.error('Get development plans error:', error);
    res.status(500).json({ error: 'Failed to get development plans' });
  }
});

/**
 * POST /api/performance/development-plans
 * Create development plan
 */
router.post('/development-plans', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { employee_id, title, review_date, focus_areas } = req.body;
    const orgId = req.user.organizationId;
    const userId = req.user.userId;

    if (!employee_id || !title) {
      return res.status(400).json({ error: 'Employee ID and title are required' });
    }

    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      // Create plan
      const planResult = await client.query(`
        INSERT INTO development_plans (organization_id, employee_id, title, review_date, status, created_by)
        VALUES ($1, $2, $3, $4, 'active', $5)
        RETURNING *
      `, [orgId, employee_id, title, review_date, userId]);

      const planId = planResult.rows[0].id;

      // Add focus areas and actions
      if (focus_areas && focus_areas.length > 0) {
        for (let i = 0; i < focus_areas.length; i++) {
          const area = focus_areas[i];
          const areaResult = await client.query(`
            INSERT INTO development_focus_areas (plan_id, title, sort_order)
            VALUES ($1, $2, $3)
            RETURNING id
          `, [planId, area.title, i]);

          const areaId = areaResult.rows[0].id;

          if (area.actions && area.actions.length > 0) {
            for (let j = 0; j < area.actions.length; j++) {
              const action = area.actions[j];
              await client.query(`
                INSERT INTO development_actions (focus_area_id, text, type, sort_order)
                VALUES ($1, $2, $3, $4)
              `, [areaId, action.text, action.type || 'other', j]);
            }
          }
        }
      }

      await client.query('COMMIT');
      res.status(201).json({ plan: planResult.rows[0] });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Create development plan error:', error);
    res.status(500).json({ error: 'Failed to create development plan' });
  }
});

/**
 * PATCH /api/performance/development-plans/:id/actions/:actionId
 * Update development action status
 */
router.patch('/development-plans/:id/actions/:actionId', async (req, res) => {
  try {
    const { actionId } = req.params;
    const { status, text } = req.body;

    const setClause = [];
    const values = [];
    let paramIndex = 1;

    if (status) {
      setClause.push(`status = $${paramIndex++}`);
      values.push(status);
      if (status === 'completed') {
        setClause.push(`completed_at = NOW()`);
      }
    }
    if (text) { setClause.push(`text = $${paramIndex++}`); values.push(text); }

    if (setClause.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(actionId);
    const result = await db.query(`
      UPDATE development_actions SET ${setClause.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Action not found' });
    }

    res.json({ action: result.rows[0] });
  } catch (error) {
    console.error('Update development action error:', error);
    res.status(500).json({ error: 'Failed to update action' });
  }
});

// ============================================================
// OKRs (OBJECTIVES AND KEY RESULTS)
// ============================================================

/**
 * GET /api/performance/okrs
 * List OKRs
 */
router.get('/okrs', async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const { level, status, period } = req.query;

    let query = `
      SELECT o.*,
        eu.first_name || ' ' || eu.last_name as owner_name,
        (SELECT json_agg(kr.* ORDER BY kr.sort_order) FROM key_results kr WHERE kr.okr_id = o.id) as key_results
      FROM okrs o
      LEFT JOIN employees e ON e.id = o.owner_id
      LEFT JOIN users eu ON eu.id = e.user_id
      WHERE o.organization_id = $1
    `;
    const params = [orgId];
    let paramIndex = 2;

    if (level) {
      query += ` AND o.level = $${paramIndex++}`;
      params.push(level);
    }
    if (status) {
      query += ` AND o.status = $${paramIndex++}`;
      params.push(status);
    }
    if (period) {
      query += ` AND o.period = $${paramIndex++}`;
      params.push(period);
    }

    query += ' ORDER BY o.level, o.created_at DESC';

    const result = await db.query(query, params);
    res.json({ okrs: result.rows });
  } catch (error) {
    console.error('Get OKRs error:', error);
    res.status(500).json({ error: 'Failed to get OKRs' });
  }
});

/**
 * POST /api/performance/okrs
 * Create OKR
 */
router.post('/okrs', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { title, level, owner_id, department, period, key_results } = req.body;
    const orgId = req.user.organizationId;
    const userId = req.user.userId;

    if (!title || !level || !period) {
      return res.status(400).json({ error: 'Title, level, and period are required' });
    }

    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      // Create OKR
      const okrResult = await client.query(`
        INSERT INTO okrs (organization_id, title, level, owner_id, department, period, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [orgId, title, level, owner_id, department, period, userId]);

      const okrId = okrResult.rows[0].id;

      // Add key results
      if (key_results && key_results.length > 0) {
        for (let i = 0; i < key_results.length; i++) {
          const kr = key_results[i];
          await client.query(`
            INSERT INTO key_results (okr_id, title, target, current, sort_order)
            VALUES ($1, $2, $3, $4, $5)
          `, [okrId, kr.title, kr.target, kr.current || '', i]);
        }
      }

      await client.query('COMMIT');
      res.status(201).json({ okr: okrResult.rows[0] });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Create OKR error:', error);
    res.status(500).json({ error: 'Failed to create OKR' });
  }
});

/**
 * PATCH /api/performance/okrs/:id
 * Update OKR
 */
router.patch('/okrs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, status, progress } = req.body;
    const orgId = req.user.organizationId;

    const setClause = [];
    const values = [];
    let paramIndex = 1;

    if (title) { setClause.push(`title = $${paramIndex++}`); values.push(title); }
    if (status) { setClause.push(`status = $${paramIndex++}`); values.push(status); }
    if (progress !== undefined) { setClause.push(`progress = $${paramIndex++}`); values.push(progress); }

    if (setClause.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id, orgId);
    const result = await db.query(`
      UPDATE okrs SET ${setClause.join(', ')}
      WHERE id = $${paramIndex++} AND organization_id = $${paramIndex}
      RETURNING *
    `, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'OKR not found' });
    }

    res.json({ okr: result.rows[0] });
  } catch (error) {
    console.error('Update OKR error:', error);
    res.status(500).json({ error: 'Failed to update OKR' });
  }
});

/**
 * PATCH /api/performance/okrs/:id/key-results/:krId
 * Update key result progress
 */
router.patch('/okrs/:id/key-results/:krId', async (req, res) => {
  try {
    const { krId } = req.params;
    const { current, progress } = req.body;

    const setClause = [];
    const values = [];
    let paramIndex = 1;

    if (current !== undefined) { setClause.push(`current = $${paramIndex++}`); values.push(current); }
    if (progress !== undefined) { setClause.push(`progress = $${paramIndex++}`); values.push(progress); }

    if (setClause.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(krId);
    const result = await db.query(`
      UPDATE key_results SET ${setClause.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Key result not found' });
    }

    // Recalculate OKR progress
    const okrResult = await db.query(`
      UPDATE okrs SET progress = (
        SELECT COALESCE(AVG(progress), 0)::int FROM key_results WHERE okr_id = okrs.id
      )
      WHERE id = (SELECT okr_id FROM key_results WHERE id = $1)
      RETURNING id, progress
    `, [krId]);

    res.json({ keyResult: result.rows[0], okrProgress: okrResult.rows[0]?.progress });
  } catch (error) {
    console.error('Update key result error:', error);
    res.status(500).json({ error: 'Failed to update key result' });
  }
});

/**
 * GET /api/performance/employees
 * Get employees list for dropdowns
 */
router.get('/employees', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const orgId = req.user.organizationId;

    const result = await db.query(`
      SELECT e.id, e.user_id, u.first_name, u.last_name,
        u.first_name || ' ' || u.last_name as name,
        SUBSTRING(u.first_name, 1, 1) || SUBSTRING(u.last_name, 1, 1) as initials,
        e.job_title, d.name as department
      FROM employees e
      JOIN users u ON u.id = e.user_id
      LEFT JOIN departments d ON d.id = e.department_id
      WHERE e.organization_id = $1 AND e.status = 'active'
      ORDER BY u.first_name, u.last_name
    `, [orgId]);

    res.json({ employees: result.rows });
  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({ error: 'Failed to get employees' });
  }
});

/**
 * GET /api/performance/dashboard
 * Performance dashboard stats
 */
router.get('/dashboard', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const orgId = req.user.organizationId;

    // Active review cycles
    const cyclesResult = await db.query(`
      SELECT COUNT(*) as active_cycles FROM review_cycles
      WHERE organization_id = $1 AND status IN ('active', 'in_review')
    `, [orgId]);

    // Reviews completed this quarter
    const reviewsResult = await db.query(`
      SELECT COUNT(*) as completed_reviews FROM performance_reviews
      WHERE organization_id = $1 AND completed_at >= date_trunc('quarter', CURRENT_DATE)
    `, [orgId]);

    // Average rating
    const ratingResult = await db.query(`
      SELECT COALESCE(AVG(overall_rating), 0) as avg_rating FROM performance_reviews
      WHERE organization_id = $1 AND overall_rating IS NOT NULL
      AND completed_at >= date_trunc('year', CURRENT_DATE)
    `, [orgId]);

    // Goals on track
    const goalsResult = await db.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'in_progress' AND progress_percentage >= 50) as on_track,
        COUNT(*) FILTER (WHERE status = 'in_progress' AND progress_percentage < 50) as at_risk,
        COUNT(*) FILTER (WHERE status = 'completed') as completed
      FROM goals WHERE organization_id = $1
    `, [orgId]);

    // Upcoming 1-on-1s
    const meetingsResult = await db.query(`
      SELECT COUNT(*) as upcoming_meetings FROM one_on_ones
      WHERE organization_id = $1 AND status = 'scheduled'
      AND scheduled_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
    `, [orgId]);

    res.json({
      activeCycles: parseInt(cyclesResult.rows[0].active_cycles),
      completedReviews: parseInt(reviewsResult.rows[0].completed_reviews),
      avgRating: parseFloat(ratingResult.rows[0].avg_rating).toFixed(1),
      goalsOnTrack: parseInt(goalsResult.rows[0].on_track || 0),
      goalsAtRisk: parseInt(goalsResult.rows[0].at_risk || 0),
      goalsCompleted: parseInt(goalsResult.rows[0].completed || 0),
      upcomingMeetings: parseInt(meetingsResult.rows[0].upcoming_meetings)
    });
  } catch (error) {
    console.error('Get performance dashboard error:', error);
    res.status(500).json({ error: 'Failed to get dashboard data' });
  }
});

export default router;
