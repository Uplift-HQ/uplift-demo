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

// ============================================================
// COMPETENCY FRAMEWORKS
// ============================================================

/**
 * GET /api/performance/frameworks
 * List competency frameworks
 */
router.get('/frameworks', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const orgId = req.user.organizationId;

    const result = await db.query(`
      SELECT cf.*,
        (SELECT COUNT(*) FROM competencies c WHERE c.framework_id = cf.id) as competency_count,
        u.first_name || ' ' || u.last_name as created_by_name
      FROM competency_frameworks cf
      LEFT JOIN users u ON u.id = cf.created_by
      WHERE cf.organization_id = $1
      ORDER BY cf.is_default DESC, cf.name
    `, [orgId]);

    res.json({ frameworks: result.rows });
  } catch (error) {
    console.error('Get frameworks error:', error);
    res.status(500).json({ error: 'Failed to get frameworks' });
  }
});

/**
 * GET /api/performance/frameworks/:id
 * Get framework with competencies
 */
router.get('/frameworks/:id', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { id } = req.params;
    const orgId = req.user.organizationId;

    const frameworkResult = await db.query(`
      SELECT * FROM competency_frameworks
      WHERE id = $1 AND organization_id = $2
    `, [id, orgId]);

    if (frameworkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Framework not found' });
    }

    const competenciesResult = await db.query(`
      SELECT c.*,
        (SELECT json_agg(cl.* ORDER BY cl.level)
         FROM competency_levels cl WHERE cl.competency_id = c.id) as levels
      FROM competencies c
      WHERE c.framework_id = $1
      ORDER BY c.sort_order, c.category, c.name
    `, [id]);

    res.json({
      framework: frameworkResult.rows[0],
      competencies: competenciesResult.rows
    });
  } catch (error) {
    console.error('Get framework error:', error);
    res.status(500).json({ error: 'Failed to get framework' });
  }
});

/**
 * POST /api/performance/frameworks
 * Create competency framework
 */
router.post('/frameworks', requireRole(['admin']), async (req, res) => {
  try {
    const { name, description, competencies, is_default } = req.body;
    const orgId = req.user.organizationId;
    const userId = req.user.userId;

    if (!name) {
      return res.status(400).json({ error: 'Framework name is required' });
    }

    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      // If setting as default, unset current default
      if (is_default) {
        await client.query(`
          UPDATE competency_frameworks SET is_default = false
          WHERE organization_id = $1 AND is_default = true
        `, [orgId]);
      }

      // Create framework
      const frameworkResult = await client.query(`
        INSERT INTO competency_frameworks (organization_id, name, description, is_default, created_by)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [orgId, name, description, is_default || false, userId]);

      const frameworkId = frameworkResult.rows[0].id;

      // Add competencies
      if (competencies && competencies.length > 0) {
        for (let i = 0; i < competencies.length; i++) {
          const comp = competencies[i];
          const compResult = await client.query(`
            INSERT INTO competencies (framework_id, name, description, category, weight, sort_order, is_required)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id
          `, [frameworkId, comp.name, comp.description, comp.category, comp.weight || 1.0, i, comp.is_required !== false]);

          // Add level definitions
          if (comp.levels && comp.levels.length > 0) {
            for (const level of comp.levels) {
              await client.query(`
                INSERT INTO competency_levels (competency_id, level, label, description, behavioral_indicators)
                VALUES ($1, $2, $3, $4, $5)
              `, [compResult.rows[0].id, level.level, level.label, level.description, level.indicators || []]);
            }
          }
        }
      }

      await client.query('COMMIT');
      res.status(201).json({ framework: frameworkResult.rows[0] });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Create framework error:', error);
    res.status(500).json({ error: 'Failed to create framework' });
  }
});

/**
 * POST /api/performance/frameworks/:id/competencies
 * Add competency to framework
 */
router.post('/frameworks/:id/competencies', requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, category, weight, levels } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Competency name is required' });
    }

    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      // Get max sort order
      const maxOrder = await client.query(`
        SELECT COALESCE(MAX(sort_order), -1) + 1 as next_order
        FROM competencies WHERE framework_id = $1
      `, [id]);

      // Create competency
      const compResult = await client.query(`
        INSERT INTO competencies (framework_id, name, description, category, weight, sort_order)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [id, name, description, category, weight || 1.0, maxOrder.rows[0].next_order]);

      const competencyId = compResult.rows[0].id;

      // Add level definitions
      if (levels && levels.length > 0) {
        for (const level of levels) {
          await client.query(`
            INSERT INTO competency_levels (competency_id, level, label, description, behavioral_indicators)
            VALUES ($1, $2, $3, $4, $5)
          `, [competencyId, level.level, level.label, level.description, level.indicators || []]);
        }
      } else {
        // Add default level definitions
        const defaultLevels = [
          { level: 1, label: 'Developing', description: 'Still learning the fundamentals' },
          { level: 2, label: 'Competent', description: 'Meets basic expectations' },
          { level: 3, label: 'Proficient', description: 'Consistently performs well' },
          { level: 4, label: 'Expert', description: 'Exceeds expectations, mentors others' },
          { level: 5, label: 'Mastery', description: 'Organizational expert, sets the standard' },
        ];
        for (const level of defaultLevels) {
          await client.query(`
            INSERT INTO competency_levels (competency_id, level, label, description)
            VALUES ($1, $2, $3, $4)
          `, [competencyId, level.level, level.label, level.description]);
        }
      }

      await client.query('COMMIT');
      res.status(201).json({ competency: compResult.rows[0] });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Add competency error:', error);
    res.status(500).json({ error: 'Failed to add competency' });
  }
});

// ============================================================
// 360-DEGREE REVIEWS
// ============================================================

/**
 * POST /api/performance/cycles/:id/configure-360
 * Configure 360 review for a cycle
 */
router.post('/cycles/:id/configure-360', requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      min_peer_reviewers = 3,
      max_peer_reviewers = 5,
      include_direct_reports = true,
      include_cross_functional = true,
      anonymize_peer_feedback = true,
      peer_selection_mode = 'employee_selected',
      peer_selection_deadline
    } = req.body;

    // Update cycle to include 360
    await db.query(`
      UPDATE review_cycles SET include_360 = true WHERE id = $1
    `, [id]);

    // Create or update 360 config
    const result = await db.query(`
      INSERT INTO review_360_config (
        cycle_id, min_peer_reviewers, max_peer_reviewers, include_direct_reports,
        include_cross_functional, anonymize_peer_feedback, peer_selection_mode, peer_selection_deadline
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (cycle_id) DO UPDATE SET
        min_peer_reviewers = EXCLUDED.min_peer_reviewers,
        max_peer_reviewers = EXCLUDED.max_peer_reviewers,
        include_direct_reports = EXCLUDED.include_direct_reports,
        include_cross_functional = EXCLUDED.include_cross_functional,
        anonymize_peer_feedback = EXCLUDED.anonymize_peer_feedback,
        peer_selection_mode = EXCLUDED.peer_selection_mode,
        peer_selection_deadline = EXCLUDED.peer_selection_deadline
      RETURNING *
    `, [id, min_peer_reviewers, max_peer_reviewers, include_direct_reports,
        include_cross_functional, anonymize_peer_feedback, peer_selection_mode, peer_selection_deadline]);

    res.json({ config: result.rows[0] });
  } catch (error) {
    console.error('Configure 360 error:', error);
    res.status(500).json({ error: 'Failed to configure 360 review' });
  }
});

/**
 * POST /api/performance/cycles/:cycleId/360-nominations
 * Nominate peers for 360 review
 */
router.post('/cycles/:cycleId/360-nominations', async (req, res) => {
  try {
    const { cycleId } = req.params;
    const { reviewee_id, reviewer_ids, relationship = 'peer' } = req.body;
    const userId = req.user.userId;
    const isManager = ['admin', 'manager'].includes(req.user.role);

    // Get employee ID for current user
    const empResult = await db.query('SELECT id FROM employees WHERE user_id = $1', [userId]);
    const userEmployeeId = empResult.rows[0]?.id;

    // Determine nominated_by
    let nominatedBy = 'employee';
    if (isManager && reviewee_id !== userEmployeeId) {
      nominatedBy = 'manager';
    }

    // Verify cycle has 360 enabled
    const cycleCheck = await db.query(`
      SELECT rc.*, r3c.max_peer_reviewers
      FROM review_cycles rc
      LEFT JOIN review_360_config r3c ON r3c.cycle_id = rc.id
      WHERE rc.id = $1
    `, [cycleId]);

    if (!cycleCheck.rows[0]?.include_360) {
      return res.status(400).json({ error: 'Cycle does not have 360 reviews enabled' });
    }

    const nominations = [];
    for (const reviewerId of reviewer_ids) {
      try {
        const result = await db.query(`
          INSERT INTO review_360_nominations (cycle_id, reviewee_id, reviewer_id, relationship, nominated_by)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (cycle_id, reviewee_id, reviewer_id) DO NOTHING
          RETURNING *
        `, [cycleId, reviewee_id, reviewerId, relationship, nominatedBy]);

        if (result.rows[0]) {
          nominations.push(result.rows[0]);
        }
      } catch (err) {
        console.error('Nomination error:', err);
      }
    }

    res.status(201).json({ nominations, created: nominations.length });
  } catch (error) {
    console.error('Nominate peers error:', error);
    res.status(500).json({ error: 'Failed to nominate peers' });
  }
});

/**
 * GET /api/performance/360/pending
 * Get pending 360 reviews to complete
 */
router.get('/360/pending', async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get employee ID for current user
    const empResult = await db.query('SELECT id FROM employees WHERE user_id = $1', [userId]);
    if (!empResult.rows[0]) {
      return res.json({ reviews: [] });
    }
    const employeeId = empResult.rows[0].id;

    const result = await db.query(`
      SELECT n.*,
        rc.name as cycle_name, rc.end_date,
        eu.first_name || ' ' || eu.last_name as reviewee_name,
        e.job_title as reviewee_title
      FROM review_360_nominations n
      JOIN review_cycles rc ON rc.id = n.cycle_id
      JOIN employees e ON e.id = n.reviewee_id
      JOIN users eu ON eu.id = e.user_id
      WHERE n.reviewer_id = $1
        AND n.status IN ('pending', 'accepted')
        AND rc.status IN ('active', 'in_review')
      ORDER BY rc.end_date ASC
    `, [employeeId]);

    res.json({ reviews: result.rows });
  } catch (error) {
    console.error('Get pending 360 reviews error:', error);
    res.status(500).json({ error: 'Failed to get pending reviews' });
  }
});

/**
 * POST /api/performance/360/submit/:nominationId
 * Submit 360 feedback
 */
router.post('/360/submit/:nominationId', async (req, res) => {
  try {
    const { nominationId } = req.params;
    const { feedback_text, strengths, development_areas, overall_rating, competency_ratings } = req.body;
    const userId = req.user.userId;

    // Verify nomination belongs to current user
    const empResult = await db.query('SELECT id FROM employees WHERE user_id = $1', [userId]);
    const employeeId = empResult.rows[0]?.id;

    const nomCheck = await db.query(
      'SELECT * FROM review_360_nominations WHERE id = $1 AND reviewer_id = $2',
      [nominationId, employeeId]
    );

    if (!nomCheck.rows[0]) {
      return res.status(403).json({ error: 'Not authorized to submit this review' });
    }

    // Create or update response
    const responseResult = await db.query(`
      INSERT INTO review_360_responses (nomination_id, feedback_text, strengths, development_areas, overall_rating, competency_ratings, submitted_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (nomination_id) DO UPDATE SET
        feedback_text = EXCLUDED.feedback_text,
        strengths = EXCLUDED.strengths,
        development_areas = EXCLUDED.development_areas,
        overall_rating = EXCLUDED.overall_rating,
        competency_ratings = EXCLUDED.competency_ratings,
        submitted_at = NOW()
      RETURNING *
    `, [nominationId, feedback_text, strengths, development_areas, overall_rating, JSON.stringify(competency_ratings || {})]);

    // Update nomination status
    await db.query(`
      UPDATE review_360_nominations SET status = 'completed', completed_at = NOW()
      WHERE id = $1
    `, [nominationId]);

    res.json({ response: responseResult.rows[0], message: 'Feedback submitted successfully' });
  } catch (error) {
    console.error('Submit 360 feedback error:', error);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

/**
 * GET /api/performance/360/summary/:employeeId
 * Get 360 feedback summary for an employee (manager view)
 */
router.get('/360/summary/:employeeId', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { cycleId } = req.query;
    const orgId = req.user.organizationId;

    // Verify employee belongs to org
    const empCheck = await db.query(
      'SELECT id FROM employees WHERE id = $1 AND organization_id = $2',
      [employeeId, orgId]
    );

    if (!empCheck.rows[0]) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Get all completed nominations and responses
    let query = `
      SELECT n.relationship,
        r.overall_rating, r.feedback_text, r.strengths, r.development_areas, r.competency_ratings,
        cfg.anonymize_peer_feedback
      FROM review_360_nominations n
      JOIN review_360_responses r ON r.nomination_id = n.id
      JOIN review_360_config cfg ON cfg.cycle_id = n.cycle_id
      WHERE n.reviewee_id = $1 AND n.status = 'completed'
    `;
    const params = [employeeId];

    if (cycleId) {
      query += ` AND n.cycle_id = $2`;
      params.push(cycleId);
    }

    const responses = await db.query(query, params);

    // Aggregate results
    const summary = {
      totalResponses: responses.rows.length,
      averageRating: 0,
      byRelationship: {},
      commonStrengths: [],
      commonDevelopmentAreas: [],
      competencyAverages: {},
    };

    if (responses.rows.length > 0) {
      const ratings = responses.rows.filter(r => r.overall_rating).map(r => r.overall_rating);
      summary.averageRating = ratings.length > 0
        ? Math.round(ratings.reduce((a, b) => a + b, 0) / ratings.length * 10) / 10
        : null;

      // Group by relationship
      responses.rows.forEach(r => {
        if (!summary.byRelationship[r.relationship]) {
          summary.byRelationship[r.relationship] = { count: 0, ratings: [] };
        }
        summary.byRelationship[r.relationship].count++;
        if (r.overall_rating) {
          summary.byRelationship[r.relationship].ratings.push(r.overall_rating);
        }

        // Aggregate competency ratings
        if (r.competency_ratings) {
          const compRatings = typeof r.competency_ratings === 'string'
            ? JSON.parse(r.competency_ratings)
            : r.competency_ratings;

          Object.entries(compRatings).forEach(([compId, rating]) => {
            if (!summary.competencyAverages[compId]) {
              summary.competencyAverages[compId] = [];
            }
            summary.competencyAverages[compId].push(rating);
          });
        }
      });

      // Calculate competency averages
      Object.keys(summary.competencyAverages).forEach(compId => {
        const ratings = summary.competencyAverages[compId];
        summary.competencyAverages[compId] = Math.round(ratings.reduce((a, b) => a + b, 0) / ratings.length * 10) / 10;
      });

      // Calculate relationship averages
      Object.keys(summary.byRelationship).forEach(rel => {
        const relRatings = summary.byRelationship[rel].ratings;
        summary.byRelationship[rel].averageRating = relRatings.length > 0
          ? Math.round(relRatings.reduce((a, b) => a + b, 0) / relRatings.length * 10) / 10
          : null;
      });
    }

    // Include anonymized feedback text if configured
    const anonymizedFeedback = responses.rows
      .filter(r => r.feedback_text)
      .map(r => ({
        relationship: r.relationship,
        feedback: r.feedback_text,
        strengths: r.strengths,
        developmentAreas: r.development_areas,
      }));

    res.json({ summary, feedback: anonymizedFeedback });
  } catch (error) {
    console.error('Get 360 summary error:', error);
    res.status(500).json({ error: 'Failed to get 360 summary' });
  }
});

// ============================================================
// CALIBRATION SESSIONS
// ============================================================

/**
 * GET /api/performance/calibration
 * List calibration sessions
 */
router.get('/calibration', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const { status, cycleId } = req.query;

    let query = `
      SELECT cs.*,
        rc.name as cycle_name,
        d.name as department_name,
        l.name as location_name,
        u.first_name || ' ' || u.last_name as facilitator_name,
        (SELECT COUNT(*) FROM calibration_employees ce WHERE ce.session_id = cs.id) as employee_count,
        (SELECT COUNT(*) FROM calibration_participants cp WHERE cp.session_id = cs.id) as participant_count
      FROM calibration_sessions cs
      LEFT JOIN review_cycles rc ON rc.id = cs.cycle_id
      LEFT JOIN departments d ON d.id = cs.department_id
      LEFT JOIN locations l ON l.id = cs.location_id
      LEFT JOIN users u ON u.id = cs.facilitator_id
      WHERE cs.organization_id = $1
    `;
    const params = [orgId];
    let paramIndex = 2;

    if (status) {
      query += ` AND cs.status = $${paramIndex++}`;
      params.push(status);
    }
    if (cycleId) {
      query += ` AND cs.cycle_id = $${paramIndex++}`;
      params.push(cycleId);
    }

    query += ' ORDER BY cs.scheduled_date DESC';

    const result = await db.query(query, params);
    res.json({ sessions: result.rows });
  } catch (error) {
    console.error('Get calibration sessions error:', error);
    res.status(500).json({ error: 'Failed to get calibration sessions' });
  }
});

/**
 * GET /api/performance/calibration/:id
 * Get calibration session details
 */
router.get('/calibration/:id', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { id } = req.params;
    const orgId = req.user.organizationId;

    const sessionResult = await db.query(`
      SELECT cs.*,
        rc.name as cycle_name,
        d.name as department_name,
        u.first_name || ' ' || u.last_name as facilitator_name
      FROM calibration_sessions cs
      LEFT JOIN review_cycles rc ON rc.id = cs.cycle_id
      LEFT JOIN departments d ON d.id = cs.department_id
      LEFT JOIN users u ON u.id = cs.facilitator_id
      WHERE cs.id = $1 AND cs.organization_id = $2
    `, [id, orgId]);

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const participantsResult = await db.query(`
      SELECT cp.*, u.first_name || ' ' || u.last_name as name
      FROM calibration_participants cp
      JOIN users u ON u.id = cp.user_id
      WHERE cp.session_id = $1
    `, [id]);

    const employeesResult = await db.query(`
      SELECT ce.*,
        eu.first_name || ' ' || eu.last_name as employee_name,
        e.job_title, d.name as department,
        pr.overall_rating as review_rating, pr.status as review_status
      FROM calibration_employees ce
      JOIN employees e ON e.id = ce.employee_id
      JOIN users eu ON eu.id = e.user_id
      LEFT JOIN departments d ON d.id = e.department_id
      LEFT JOIN performance_reviews pr ON pr.id = ce.review_id
      WHERE ce.session_id = $1
      ORDER BY ce.pre_overall_rating DESC NULLS LAST, eu.first_name
    `, [id]);

    // Get distribution snapshot
    const distributionResult = await db.query(`
      SELECT * FROM calibration_distributions
      WHERE session_id = $1
      ORDER BY created_at DESC
    `, [id]);

    res.json({
      session: sessionResult.rows[0],
      participants: participantsResult.rows,
      employees: employeesResult.rows,
      distributions: distributionResult.rows
    });
  } catch (error) {
    console.error('Get calibration session error:', error);
    res.status(500).json({ error: 'Failed to get session' });
  }
});

/**
 * POST /api/performance/calibration
 * Create calibration session
 */
router.post('/calibration', requireRole(['admin']), async (req, res) => {
  try {
    const {
      name, description, cycle_id, scheduled_date, scheduled_time,
      duration_minutes, meeting_link, facilitator_id, department_id,
      location_id, participant_ids, employee_ids
    } = req.body;
    const orgId = req.user.organizationId;
    const userId = req.user.userId;

    if (!name) {
      return res.status(400).json({ error: 'Session name is required' });
    }

    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      // Create session
      const sessionResult = await client.query(`
        INSERT INTO calibration_sessions (
          organization_id, name, description, cycle_id, scheduled_date, scheduled_time,
          duration_minutes, meeting_link, facilitator_id, department_id, location_id, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `, [orgId, name, description, cycle_id, scheduled_date, scheduled_time,
          duration_minutes || 60, meeting_link, facilitator_id || userId, department_id,
          location_id, userId]);

      const sessionId = sessionResult.rows[0].id;

      // Add facilitator as participant
      await client.query(`
        INSERT INTO calibration_participants (session_id, user_id, role)
        VALUES ($1, $2, 'facilitator')
      `, [sessionId, facilitator_id || userId]);

      // Add other participants
      if (participant_ids && participant_ids.length > 0) {
        for (const pid of participant_ids) {
          await client.query(`
            INSERT INTO calibration_participants (session_id, user_id, role)
            VALUES ($1, $2, 'participant')
            ON CONFLICT (session_id, user_id) DO NOTHING
          `, [sessionId, pid]);
        }
      }

      // Add employees to calibrate
      if (employee_ids && employee_ids.length > 0) {
        for (const eid of employee_ids) {
          // Get their performance review for this cycle if exists
          let reviewId = null;
          if (cycle_id) {
            const reviewResult = await client.query(`
              SELECT pr.id, pr.overall_rating FROM performance_reviews pr
              JOIN review_cycle_participants rcp ON rcp.employee_id = pr.employee_id AND rcp.cycle_id = $2
              WHERE pr.employee_id = $1
              ORDER BY pr.created_at DESC LIMIT 1
            `, [eid, cycle_id]);
            reviewId = reviewResult.rows[0]?.id;
          }

          await client.query(`
            INSERT INTO calibration_employees (session_id, employee_id, review_id)
            VALUES ($1, $2, $3)
            ON CONFLICT (session_id, employee_id) DO NOTHING
          `, [sessionId, eid, reviewId]);
        }
      }

      await client.query('COMMIT');
      res.status(201).json({ session: sessionResult.rows[0] });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Create calibration session error:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

/**
 * PATCH /api/performance/calibration/:id/employees/:employeeId
 * Update employee calibration rating
 */
router.patch('/calibration/:id/employees/:employeeId', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { id, employeeId } = req.params;
    const { pre_overall_rating, pre_potential_rating, pre_promotion_ready,
            post_overall_rating, post_potential_rating, post_promotion_ready,
            discussion_points, calibration_notes, change_justification } = req.body;
    const userId = req.user.userId;

    const setClause = [];
    const values = [];
    let paramIndex = 1;

    if (pre_overall_rating !== undefined) { setClause.push(`pre_overall_rating = $${paramIndex++}`); values.push(pre_overall_rating); }
    if (pre_potential_rating !== undefined) { setClause.push(`pre_potential_rating = $${paramIndex++}`); values.push(pre_potential_rating); }
    if (pre_promotion_ready !== undefined) { setClause.push(`pre_promotion_ready = $${paramIndex++}`); values.push(pre_promotion_ready); }
    if (post_overall_rating !== undefined) { setClause.push(`post_overall_rating = $${paramIndex++}`); values.push(post_overall_rating); }
    if (post_potential_rating !== undefined) { setClause.push(`post_potential_rating = $${paramIndex++}`); values.push(post_potential_rating); }
    if (post_promotion_ready !== undefined) { setClause.push(`post_promotion_ready = $${paramIndex++}`); values.push(post_promotion_ready); }
    if (discussion_points) { setClause.push(`discussion_points = $${paramIndex++}`); values.push(discussion_points); }
    if (calibration_notes !== undefined) { setClause.push(`calibration_notes = $${paramIndex++}`); values.push(calibration_notes); }
    if (change_justification !== undefined) { setClause.push(`change_justification = $${paramIndex++}`); values.push(change_justification); }

    // Track if rating was changed
    if (post_overall_rating !== undefined) {
      setClause.push(`calibrated_by = $${paramIndex++}`);
      values.push(userId);
      setClause.push(`calibrated_at = NOW()`);

      // Check if it differs from pre-rating
      const preCheck = await db.query(`
        SELECT pre_overall_rating FROM calibration_employees
        WHERE session_id = $1 AND employee_id = $2
      `, [id, employeeId]);

      if (preCheck.rows[0] && preCheck.rows[0].pre_overall_rating !== post_overall_rating) {
        setClause.push(`rating_changed = TRUE`);
      }
    }

    if (setClause.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id, employeeId);
    const result = await db.query(`
      UPDATE calibration_employees SET ${setClause.join(', ')}
      WHERE session_id = $${paramIndex++} AND employee_id = $${paramIndex}
      RETURNING *
    `, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Employee not found in session' });
    }

    res.json({ employee: result.rows[0] });
  } catch (error) {
    console.error('Update calibration employee error:', error);
    res.status(500).json({ error: 'Failed to update employee' });
  }
});

/**
 * POST /api/performance/calibration/:id/snapshot
 * Save distribution snapshot
 */
router.post('/calibration/:id/snapshot', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { id } = req.params;
    const { snapshot_type } = req.body; // 'pre_calibration' or 'post_calibration'

    // Calculate distribution from current ratings
    const ratingField = snapshot_type === 'pre_calibration' ? 'pre_overall_rating' : 'post_overall_rating';

    const distResult = await db.query(`
      SELECT
        COUNT(*) FILTER (WHERE ${ratingField} = 1) as rating_1,
        COUNT(*) FILTER (WHERE ${ratingField} = 2) as rating_2,
        COUNT(*) FILTER (WHERE ${ratingField} = 3) as rating_3,
        COUNT(*) FILTER (WHERE ${ratingField} = 4) as rating_4,
        COUNT(*) FILTER (WHERE ${ratingField} = 5) as rating_5,
        COUNT(*) as total,
        AVG(${ratingField}) as mean,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ${ratingField}) as median
      FROM calibration_employees
      WHERE session_id = $1 AND ${ratingField} IS NOT NULL
    `, [id]);

    const dist = distResult.rows[0];

    const result = await db.query(`
      INSERT INTO calibration_distributions (
        session_id, snapshot_type, rating_1_count, rating_2_count, rating_3_count,
        rating_4_count, rating_5_count, total_employees, mean_rating, median_rating
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (session_id, snapshot_type) DO UPDATE SET
        rating_1_count = EXCLUDED.rating_1_count,
        rating_2_count = EXCLUDED.rating_2_count,
        rating_3_count = EXCLUDED.rating_3_count,
        rating_4_count = EXCLUDED.rating_4_count,
        rating_5_count = EXCLUDED.rating_5_count,
        total_employees = EXCLUDED.total_employees,
        mean_rating = EXCLUDED.mean_rating,
        median_rating = EXCLUDED.median_rating,
        created_at = NOW()
      RETURNING *
    `, [id, snapshot_type, dist.rating_1 || 0, dist.rating_2 || 0, dist.rating_3 || 0,
        dist.rating_4 || 0, dist.rating_5 || 0, dist.total || 0, dist.mean, dist.median]);

    res.json({ distribution: result.rows[0] });
  } catch (error) {
    console.error('Save distribution snapshot error:', error);
    res.status(500).json({ error: 'Failed to save snapshot' });
  }
});

/**
 * POST /api/performance/calibration/:id/finalize
 * Finalize calibration and apply ratings to reviews
 */
router.post('/calibration/:id/finalize', requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      // Get all calibrated employees
      const employees = await client.query(`
        SELECT ce.*, e.user_id
        FROM calibration_employees ce
        JOIN employees e ON e.id = ce.employee_id
        WHERE ce.session_id = $1 AND ce.post_overall_rating IS NOT NULL
      `, [id]);

      let updated = 0;

      for (const emp of employees.rows) {
        // Update performance review if exists
        if (emp.review_id) {
          await client.query(`
            UPDATE performance_reviews SET
              pre_calibration_rating = overall_rating,
              overall_rating = $2,
              is_calibrated = TRUE,
              calibrated_at = NOW(),
              calibrated_by = $3,
              calibration_session_id = $4
            WHERE id = $1
          `, [emp.review_id, emp.post_overall_rating, userId, id]);
        }

        // Update employee record
        await client.query(`
          UPDATE employees SET
            current_performance_rating = $2,
            potential_rating = $3,
            last_review_date = CURRENT_DATE
          WHERE id = $1
        `, [emp.employee_id, emp.post_overall_rating, emp.post_potential_rating]);

        updated++;
      }

      // Mark session as completed
      await client.query(`
        UPDATE calibration_sessions SET status = 'completed', completed_at = NOW()
        WHERE id = $1
      `, [id]);

      // Save final distribution snapshot
      await client.query(`
        INSERT INTO calibration_distributions (
          session_id, snapshot_type, rating_1_count, rating_2_count, rating_3_count,
          rating_4_count, rating_5_count, total_employees, mean_rating, median_rating
        )
        SELECT $1, 'post_calibration',
          COUNT(*) FILTER (WHERE post_overall_rating = 1),
          COUNT(*) FILTER (WHERE post_overall_rating = 2),
          COUNT(*) FILTER (WHERE post_overall_rating = 3),
          COUNT(*) FILTER (WHERE post_overall_rating = 4),
          COUNT(*) FILTER (WHERE post_overall_rating = 5),
          COUNT(*),
          AVG(post_overall_rating),
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY post_overall_rating)
        FROM calibration_employees WHERE session_id = $1 AND post_overall_rating IS NOT NULL
        ON CONFLICT (session_id, snapshot_type) DO UPDATE SET
          rating_1_count = EXCLUDED.rating_1_count,
          rating_2_count = EXCLUDED.rating_2_count,
          rating_3_count = EXCLUDED.rating_3_count,
          rating_4_count = EXCLUDED.rating_4_count,
          rating_5_count = EXCLUDED.rating_5_count,
          total_employees = EXCLUDED.total_employees,
          mean_rating = EXCLUDED.mean_rating,
          median_rating = EXCLUDED.median_rating,
          created_at = NOW()
      `, [id]);

      await client.query('COMMIT');

      res.json({
        success: true,
        message: `Calibration finalized. Updated ${updated} reviews.`,
        employeesUpdated: updated
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Finalize calibration error:', error);
    res.status(500).json({ error: 'Failed to finalize calibration' });
  }
});

// ============================================================
// FEEDBACK REQUESTS
// ============================================================

/**
 * POST /api/performance/feedback/request
 * Request feedback from someone
 */
router.post('/feedback/request', async (req, res) => {
  try {
    const { target_id, subject, context, due_date } = req.body;
    const userId = req.user.userId;
    const orgId = req.user.organizationId;

    if (!target_id || !subject) {
      return res.status(400).json({ error: 'Target user and subject are required' });
    }

    const result = await db.query(`
      INSERT INTO feedback_requests (organization_id, requester_id, target_id, subject, context, due_date)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [orgId, userId, target_id, subject, context, due_date]);

    res.status(201).json({ request: result.rows[0] });
  } catch (error) {
    console.error('Create feedback request error:', error);
    res.status(500).json({ error: 'Failed to create request' });
  }
});

/**
 * GET /api/performance/feedback/requests
 * Get pending feedback requests
 */
router.get('/feedback/requests', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { type = 'received' } = req.query;

    let query;
    if (type === 'received') {
      query = `
        SELECT fr.*,
          ru.first_name || ' ' || ru.last_name as requester_name
        FROM feedback_requests fr
        JOIN users ru ON ru.id = fr.requester_id
        WHERE fr.target_id = $1 AND fr.status = 'pending'
        ORDER BY fr.due_date ASC NULLS LAST, fr.created_at DESC
      `;
    } else {
      query = `
        SELECT fr.*,
          tu.first_name || ' ' || tu.last_name as target_name
        FROM feedback_requests fr
        JOIN users tu ON tu.id = fr.target_id
        WHERE fr.requester_id = $1
        ORDER BY fr.created_at DESC
      `;
    }

    const result = await db.query(query, [userId]);
    res.json({ requests: result.rows });
  } catch (error) {
    console.error('Get feedback requests error:', error);
    res.status(500).json({ error: 'Failed to get requests' });
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
