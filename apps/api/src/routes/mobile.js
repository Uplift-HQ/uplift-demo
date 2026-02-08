// ============================================================
// MOBILE APP COMPATIBILITY ROUTES
// Routes expected by the mobile app that don't exist elsewhere
// ============================================================

import { Router } from 'express';
import { db } from '../lib/database.js';
import { authMiddleware, requireRole } from '../middleware/index.js';

const router = Router();
router.use(authMiddleware);

// ============================================================
// TIME TRACKING ALIASES
// ============================================================

// Mobile expects /time/current, backend has /time/status
// This route is an alias for mobile compatibility
router.get('/time/current', async (req, res) => {
  try {
    const { employeeId, organizationId } = req.user;

    // Find current active time entry (no clock_out)
    const result = await db.query(
      `SELECT te.*, l.name as location_name
       FROM time_entries te
       LEFT JOIN locations l ON l.id = te.location_id
       WHERE te.employee_id = $1 AND te.clock_out IS NULL
       ORDER BY te.clock_in DESC
       LIMIT 1`,
      [employeeId]
    );

    if (result.rows.length > 0) {
      res.json({
        isClocked: true,
        entry: result.rows[0],
      });
    } else {
      res.json({
        isClocked: false,
      });
    }
  } catch (error) {
    console.error('[Mobile] Error getting clock status:', error);
    res.status(500).json({ error: 'Failed to get clock status' });
  }
});

// ============================================================
// SHIFT CLAIM (alias for apply)
// ============================================================

// Mobile expects /shifts/:id/claim, backend has /shifts/:id/apply
router.post('/shifts/:id/claim', async (req, res) => {
  try {
    const { id } = req.params;
    const { employeeId, organizationId } = req.user;

    // Get the shift
    const shiftResult = await db.query(
      `SELECT * FROM shifts WHERE id = $1 AND organization_id = $2`,
      [id, organizationId]
    );

    if (shiftResult.rows.length === 0) {
      return res.status(404).json({ error: 'Shift not found' });
    }

    const shift = shiftResult.rows[0];

    // Check if shift is open
    if (!shift.is_open || shift.employee_id) {
      return res.status(400).json({ error: 'Shift is not available' });
    }

    // Assign shift to employee
    const updated = await db.query(
      `UPDATE shifts
       SET employee_id = $1, is_open = FALSE, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [employeeId, id]
    );

    res.json({ shift: updated.rows[0] });
  } catch (error) {
    console.error('[Mobile] Error claiming shift:', error);
    res.status(500).json({ error: 'Failed to claim shift' });
  }
});

// ============================================================
// DASHBOARD PENDING APPROVALS
// ============================================================

router.get('/dashboard/pending-approvals', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { organizationId } = req.user;

    const [timeOff, swaps, timeEntries] = await Promise.all([
      db.query(
        `SELECT tor.*, e.first_name, e.last_name, e.avatar_url,
                top.name as policy_name
         FROM time_off_requests tor
         JOIN employees e ON e.id = tor.employee_id
         JOIN time_off_policies top ON top.id = tor.policy_id
         WHERE tor.organization_id = $1 AND tor.status = 'pending'
         ORDER BY tor.created_at DESC
         LIMIT 50`,
        [organizationId]
      ),
      db.query(
        `SELECT ss.*,
                fe.first_name as from_first_name, fe.last_name as from_last_name,
                te.first_name as to_first_name, te.last_name as to_last_name,
                s.date, s.start_time, s.end_time
         FROM shift_swaps ss
         JOIN employees fe ON fe.id = ss.from_employee_id
         LEFT JOIN employees te ON te.id = ss.to_employee_id
         JOIN shifts s ON s.id = ss.shift_id
         WHERE ss.organization_id = $1 AND ss.status = 'pending'
         ORDER BY ss.created_at DESC
         LIMIT 50`,
        [organizationId]
      ),
      db.query(
        `SELECT te.*, e.first_name, e.last_name, l.name as location_name
         FROM time_entries te
         JOIN employees e ON e.id = te.employee_id
         LEFT JOIN locations l ON l.id = te.location_id
         WHERE te.organization_id = $1 AND te.status = 'pending'
         ORDER BY te.clock_in DESC
         LIMIT 50`,
        [organizationId]
      ),
    ]);

    res.json({
      timeOff: timeOff.rows,
      swaps: swaps.rows,
      timeEntries: timeEntries.rows,
    });
  } catch (error) {
    console.error('[Mobile] Error getting pending approvals:', error);
    res.status(500).json({ error: 'Failed to get pending approvals' });
  }
});

// ============================================================
// MANAGER DASHBOARD
// ============================================================

router.get('/manager/dashboard', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const today = new Date().toISOString().split('T')[0];

    const [
      teamSize,
      shiftsToday,
      pendingCounts,
      openShifts,
      topPerformers,
      alerts,
    ] = await Promise.all([
      // Team size
      db.query(
        `SELECT COUNT(*) as count FROM employees WHERE organization_id = $1 AND status = 'active'`,
        [organizationId]
      ),
      // Shifts today
      db.query(
        `SELECT COUNT(*) as count FROM shifts WHERE organization_id = $1 AND date = $2`,
        [organizationId, today]
      ),
      // Pending approvals count
      db.query(
        `SELECT
           (SELECT COUNT(*) FROM time_off_requests WHERE organization_id = $1 AND status = 'pending') as time_off,
           (SELECT COUNT(*) FROM shift_swaps WHERE organization_id = $1 AND status = 'pending') as swaps,
           (SELECT COUNT(*) FROM time_entries WHERE organization_id = $1 AND status = 'pending') as time_entries`,
        [organizationId]
      ),
      // Open shifts
      db.query(
        `SELECT COUNT(*) as count FROM shifts
         WHERE organization_id = $1 AND is_open = TRUE AND date >= $2 AND employee_id IS NULL`,
        [organizationId, today]
      ),
      // Top performers (by points or hours)
      db.query(
        `SELECT e.id, e.first_name, e.last_name, e.avatar_url,
                COALESCE(ep.total_earned, 0) as score
         FROM employees e
         LEFT JOIN employee_points ep ON ep.employee_id = e.id
         WHERE e.organization_id = $1 AND e.status = 'active'
         ORDER BY ep.total_earned DESC NULLS LAST
         LIMIT 5`,
        [organizationId]
      ),
      // Alerts (certifications expiring, understaffed days)
      db.query(
        `SELECT 'certification_expiring' as type,
                e.first_name || ' ' || e.last_name as employee_name,
                s.name as skill_name,
                es.expires_at
         FROM employee_skills es
         JOIN employees e ON e.id = es.employee_id
         JOIN skills s ON s.id = es.skill_id
         WHERE e.organization_id = $1
           AND es.expires_at IS NOT NULL
           AND es.expires_at <= CURRENT_DATE + 60
         ORDER BY es.expires_at
         LIMIT 10`,
        [organizationId]
      ),
    ]);

    const pendingApprovals = pendingCounts.rows[0] || { time_off: 0, swaps: 0, time_entries: 0 };

    res.json({
      teamSize: parseInt(teamSize.rows[0]?.count || 0),
      shiftsToday: parseInt(shiftsToday.rows[0]?.count || 0),
      pendingApprovals: parseInt(pendingApprovals.time_off) + parseInt(pendingApprovals.swaps) + parseInt(pendingApprovals.time_entries),
      openShifts: parseInt(openShifts.rows[0]?.count || 0),
      teamPerformance: {
        avgAttendance: 96, // Would calculate from time_entries
        avgMomentum: 87,   // Would calculate from gamification
        avgSatisfaction: 4.7,
        tasksCompleted: 0,
        hoursScheduled: 0,
      },
      alerts: alerts.rows.map(a => ({
        type: 'warning',
        message: `${a.employee_name}'s ${a.skill_name} expires ${a.expires_at}`,
        severity: 'medium',
      })),
      topPerformers: topPerformers.rows.map(p => ({
        id: p.id,
        name: `${p.first_name} ${p.last_name}`,
        score: parseInt(p.score || 0),
        avatar: p.avatar_url,
      })),
    });
  } catch (error) {
    console.error('[Mobile] Error getting manager dashboard:', error);
    res.status(500).json({ error: 'Failed to get manager dashboard' });
  }
});

// ============================================================
// NOTIFICATIONS
// ============================================================

router.get('/notifications/unread-count', async (req, res) => {
  try {
    const { userId } = req.user;

    const result = await db.query(
      `SELECT COUNT(*) as count FROM notifications
       WHERE user_id = $1 AND read = FALSE`,
      [userId]
    );

    res.json({ count: parseInt(result.rows[0]?.count || 0) });
  } catch (error) {
    console.error('[Mobile] Error getting unread count:', error);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
});

// ============================================================
// JOBS / CAREER
// ============================================================

// My applications
router.get('/jobs/applications/mine', async (req, res) => {
  try {
    const { employeeId, organizationId } = req.user;

    const result = await db.query(
      `SELECT ja.*, j.title, j.description, j.status as job_status,
              d.name as department_name, l.name as location_name
       FROM job_applications ja
       JOIN job_postings j ON j.id = ja.job_id
       LEFT JOIN departments d ON d.id = j.department_id
       LEFT JOIN locations l ON l.id = j.location_id
       WHERE ja.employee_id = $1
       ORDER BY ja.created_at DESC`,
      [employeeId]
    );

    res.json({ applications: result.rows });
  } catch (error) {
    console.error('[Mobile] Error getting my applications:', error);
    res.status(500).json({ error: 'Failed to get applications' });
  }
});

// Career opportunities (jobs matched to user's skills)
router.get('/jobs/opportunities', async (req, res) => {
  try {
    const { employeeId, organizationId } = req.user;

    // Get user's skills
    const userSkills = await db.query(
      `SELECT skill_id FROM employee_skills WHERE employee_id = $1`,
      [employeeId]
    );
    const skillIds = userSkills.rows.map(s => s.skill_id);

    // Get open job postings with match scoring
    const result = await db.query(
      `SELECT j.*, d.name as department_name, l.name as location_name,
              (
                SELECT COUNT(*) FROM job_required_skills jrs
                WHERE jrs.job_id = j.id AND jrs.skill_id = ANY($2)
              ) as matching_skills,
              (
                SELECT COUNT(*) FROM job_required_skills jrs WHERE jrs.job_id = j.id
              ) as required_skills_count
       FROM job_postings j
       LEFT JOIN departments d ON d.id = j.department_id
       LEFT JOIN locations l ON l.id = j.location_id
       WHERE j.organization_id = $1 AND j.status = 'open'
       ORDER BY matching_skills DESC, j.created_at DESC
       LIMIT 20`,
      [organizationId, skillIds.length > 0 ? skillIds : [null]]
    );

    // Calculate match score
    const opportunities = result.rows.map(job => ({
      ...job,
      matchScore: job.required_skills_count > 0
        ? Math.round((job.matching_skills / job.required_skills_count) * 100)
        : 100,
    }));

    res.json({ opportunities });
  } catch (error) {
    console.error('[Mobile] Error getting career opportunities:', error);
    res.status(500).json({ error: 'Failed to get opportunities' });
  }
});

// ============================================================
// TASKS
// ============================================================

router.get('/tasks', async (req, res) => {
  try {
    const { employeeId, organizationId } = req.user;
    const { date, status } = req.query;

    let query = `
      SELECT t.*, l.name as location_name
      FROM tasks t
      LEFT JOIN locations l ON l.id = t.location_id
      WHERE t.organization_id = $1 AND t.assigned_to = $2
    `;
    const params = [organizationId, employeeId];
    let paramIndex = 3;

    if (date) {
      query += ` AND DATE(t.due_at) = $${paramIndex++}`;
      params.push(date);
    }

    if (status) {
      query += ` AND t.status = $${paramIndex++}`;
      params.push(status);
    }

    query += ` ORDER BY t.priority DESC, t.due_at ASC`;

    const result = await db.query(query, params);

    res.json({ tasks: result.rows });
  } catch (error) {
    console.error('[Mobile] Error getting tasks:', error);
    res.status(500).json({ error: 'Failed to get tasks' });
  }
});

router.post('/tasks/:id/complete', async (req, res) => {
  try {
    const { id } = req.params;
    const { employeeId, organizationId } = req.user;
    const { notes } = req.body;

    const result = await db.query(
      `UPDATE tasks
       SET status = 'completed', completed_at = NOW(), completion_notes = $3
       WHERE id = $1 AND organization_id = $2 AND assigned_to = $4
       RETURNING *`,
      [id, organizationId, notes || null, employeeId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found or not assigned to you' });
    }

    res.json({ task: result.rows[0], success: true });
  } catch (error) {
    console.error('[Mobile] Error completing task:', error);
    res.status(500).json({ error: 'Failed to complete task' });
  }
});

// ============================================================
// FEED (Social Feed)
// ============================================================

router.get('/feed', async (req, res) => {
  try {
    const { organizationId, userId } = req.user;
    const { limit = 20, offset = 0 } = req.query;

    const result = await db.query(
      `SELECT fp.*,
              u.first_name, u.last_name, u.avatar_url,
              e.primary_role_id,
              r.name as role_name,
              (SELECT COUNT(*) FROM feed_likes fl WHERE fl.post_id = fp.id) as likes,
              (SELECT COUNT(*) FROM feed_comments fc WHERE fc.post_id = fp.id) as comments,
              EXISTS(SELECT 1 FROM feed_likes fl WHERE fl.post_id = fp.id AND fl.user_id = $2) as liked
       FROM feed_posts fp
       JOIN users u ON u.id = fp.user_id
       LEFT JOIN employees e ON e.user_id = u.id
       LEFT JOIN roles r ON r.id = e.primary_role_id
       WHERE fp.organization_id = $1
       ORDER BY fp.created_at DESC
       LIMIT $3 OFFSET $4`,
      [organizationId, userId, parseInt(limit), parseInt(offset)]
    );

    res.json({
      posts: result.rows.map(post => ({
        id: post.id,
        content: post.content,
        type: post.type,
        createdAt: post.created_at,
        likes: parseInt(post.likes || 0),
        comments: parseInt(post.comments || 0),
        liked: post.liked,
        author: {
          name: `${post.first_name} ${post.last_name}`,
          avatar: post.avatar_url,
          role: post.role_name || 'Employee',
        },
      })),
    });
  } catch (error) {
    console.error('[Mobile] Error getting feed:', error);
    res.status(500).json({ error: 'Failed to get feed' });
  }
});

router.post('/feed', async (req, res) => {
  try {
    const { organizationId, userId } = req.user;
    const { content, type = 'post', mentioned = [] } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const result = await db.query(
      `INSERT INTO feed_posts (organization_id, user_id, content, type, mentioned)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [organizationId, userId, content.trim(), type, JSON.stringify(mentioned)]
    );

    res.json({ post: result.rows[0] });
  } catch (error) {
    console.error('[Mobile] Error creating feed post:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

router.post('/feed/:id/like', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;

    // Upsert like
    await db.query(
      `INSERT INTO feed_likes (post_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (post_id, user_id) DO NOTHING`,
      [id, userId]
    );

    // Get updated post
    const result = await db.query(
      `SELECT fp.*,
              (SELECT COUNT(*) FROM feed_likes fl WHERE fl.post_id = fp.id) as likes
       FROM feed_posts fp WHERE fp.id = $1`,
      [id]
    );

    res.json({ post: result.rows[0] });
  } catch (error) {
    console.error('[Mobile] Error liking post:', error);
    res.status(500).json({ error: 'Failed to like post' });
  }
});

router.delete('/feed/:id/like', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;

    await db.query(
      `DELETE FROM feed_likes WHERE post_id = $1 AND user_id = $2`,
      [id, userId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('[Mobile] Error unliking post:', error);
    res.status(500).json({ error: 'Failed to unlike post' });
  }
});

router.post('/feed/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.user;
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const result = await db.query(
      `INSERT INTO feed_comments (post_id, user_id, content)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [id, userId, content.trim()]
    );

    res.json({ comment: result.rows[0] });
  } catch (error) {
    console.error('[Mobile] Error adding comment:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// ============================================================
// REPORTS (for mobile)
// ============================================================

router.get('/reports', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const monthEnd = today.toISOString().split('T')[0];

    const [hours, employees, attendance] = await Promise.all([
      // Total hours this month
      db.query(
        `SELECT SUM(total_hours) as total_hours,
                SUM(overtime_hours) as overtime_hours
         FROM time_entries
         WHERE organization_id = $1 AND clock_in >= $2 AND clock_in <= $3 AND status = 'approved'`,
        [organizationId, monthStart, monthEnd]
      ),
      // Employee count by status
      db.query(
        `SELECT status, COUNT(*) as count FROM employees WHERE organization_id = $1 GROUP BY status`,
        [organizationId]
      ),
      // Average attendance
      db.query(
        `SELECT
           COUNT(*) FILTER (WHERE employee_id IS NOT NULL) as filled,
           COUNT(*) as total
         FROM shifts
         WHERE organization_id = $1 AND date >= $2 AND date <= $3`,
        [organizationId, monthStart, monthEnd]
      ),
    ]);

    const attData = attendance.rows[0] || { filled: 0, total: 0 };
    const attendanceRate = attData.total > 0 ? (attData.filled / attData.total * 100).toFixed(1) : 0;

    res.json({
      summary: {
        period: 'This Month',
        totalHours: parseFloat(hours.rows[0]?.total_hours || 0).toFixed(1),
        overtime: parseFloat(hours.rows[0]?.overtime_hours || 0).toFixed(1),
        laborCost: 0, // Would calculate from hours * rates
        attendance: parseFloat(attendanceRate),
        turnover: 0, // Would calculate from terminations
      },
      departments: [], // Would aggregate by department
    });
  } catch (error) {
    console.error('[Mobile] Error getting reports:', error);
    res.status(500).json({ error: 'Failed to get reports' });
  }
});

export default router;
