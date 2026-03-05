// ============================================================
// TASKS API ROUTES
// Personal and team task management for mobile app
// ============================================================

import { Router } from 'express';
import { db } from '../lib/database.js';
import { authMiddleware, requireRole } from '../middleware/index.js';

const router = Router();
router.use(authMiddleware);

// ============================================================
// PERSONAL TASKS
// ============================================================

// GET /api/tasks - Get personal tasks for logged-in user
router.get('/', async (req, res) => {
  try {
    const { organizationId, employeeId, role } = req.user;
    const { status, category, date } = req.query;

    if (!employeeId && role === 'worker') {
      return res.status(400).json({ error: 'No employee linked to user' });
    }

    let query = `
      SELECT t.*,
             l.name as location_name,
             u.first_name as assigned_by_first_name,
             u.last_name as assigned_by_last_name
      FROM tasks t
      LEFT JOIN locations l ON l.id = t.location_id
      LEFT JOIN users u ON u.id = t.assigned_by
      WHERE t.organization_id = $1
        AND t.assigned_to = $2
    `;

    const params = [organizationId, employeeId];
    let paramIndex = 3;

    if (status) {
      query += ` AND t.status = $${paramIndex++}`;
      params.push(status);
    }

    if (category && category !== 'all') {
      query += ` AND t.category = $${paramIndex++}`;
      params.push(category);
    }

    if (date) {
      query += ` AND DATE(t.due_at) = $${paramIndex++}`;
      params.push(date);
    }

    query += ` ORDER BY
      CASE t.priority
        WHEN 'urgent' THEN 1
        WHEN 'high' THEN 2
        WHEN 'medium' THEN 3
        WHEN 'low' THEN 4
      END,
      t.due_at ASC NULLS LAST`;

    const result = await db.query(query, params);

    // Transform for mobile app
    const tasks = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      category: row.category || 'general',
      priority: row.priority,
      status: row.status,
      dueAt: row.due_at,
      dueTime: row.due_time,
      duration: row.estimated_duration_minutes ? `${row.estimated_duration_minutes} min` : null,
      xpReward: row.xp_reward || 0,
      points: row.xp_reward || 0,
      location: row.location_name,
      locationId: row.location_id,
      subtasks: row.subtasks || [],
      requirements: row.requirements || [],
      assignedBy: row.assigned_by_first_name
        ? { name: `${row.assigned_by_first_name} ${row.assigned_by_last_name}` }
        : null,
      completedAt: row.completed_at,
      completionNotes: row.completion_notes,
      createdAt: row.created_at,
    }));

    res.json({ tasks });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Failed to get tasks' });
  }
});

// ============================================================
// TEAM TASKS (Manager View)
// ============================================================

// GET /api/tasks/team - Team tasks with aggregated metrics for managers
router.get('/team', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { locationId, category, startDate, endDate } = req.query;

    // Base filter conditions
    let whereClause = 'WHERE t.organization_id = $1';
    const params = [organizationId];
    let paramIndex = 2;

    if (locationId) {
      whereClause += ` AND t.location_id = $${paramIndex++}`;
      params.push(locationId);
    }

    if (category && category !== 'all') {
      whereClause += ` AND t.category = $${paramIndex++}`;
      params.push(category);
    }

    if (startDate) {
      whereClause += ` AND t.due_at >= $${paramIndex++}`;
      params.push(startDate);
    }

    if (endDate) {
      whereClause += ` AND t.due_at <= $${paramIndex++}`;
      params.push(endDate);
    }

    // Get completion metrics
    const metricsQuery = `
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status != 'completed' AND due_at < NOW() THEN 1 ELSE 0 END) as overdue
      FROM tasks t
      ${whereClause}
    `;

    const metricsResult = await db.query(metricsQuery, params);
    const metrics = metricsResult.rows[0];

    const total = parseInt(metrics.total) || 0;
    const completed = parseInt(metrics.completed) || 0;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Get tasks by category
    const categoryQuery = `
      SELECT
        COALESCE(category, 'general') as category,
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
      FROM tasks t
      ${whereClause}
      GROUP BY category
      ORDER BY total DESC
    `;

    const categoryResult = await db.query(categoryQuery, params);
    const byCategory = categoryResult.rows.map(row => ({
      category: row.category,
      total: parseInt(row.total),
      completed: parseInt(row.completed),
      percentage: parseInt(row.total) > 0
        ? Math.round((parseInt(row.completed) / parseInt(row.total)) * 100)
        : 0,
    }));

    // Get team workload (tasks per employee)
    const workloadQuery = `
      SELECT
        e.id as employee_id,
        e.first_name,
        e.last_name,
        COUNT(*) as total_tasks,
        SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
        SUM(CASE WHEN t.status != 'completed' AND t.due_at < NOW() THEN 1 ELSE 0 END) as overdue_tasks
      FROM tasks t
      JOIN employees e ON e.id = t.assigned_to
      ${whereClause}
      GROUP BY e.id, e.first_name, e.last_name
      ORDER BY total_tasks DESC
      LIMIT 10
    `;

    const workloadResult = await db.query(workloadQuery, params);
    const workload = workloadResult.rows.map(row => ({
      employeeId: row.employee_id,
      name: `${row.first_name} ${row.last_name}`,
      totalTasks: parseInt(row.total_tasks),
      completedTasks: parseInt(row.completed_tasks),
      overdueTasks: parseInt(row.overdue_tasks),
    }));

    // Get all tasks list for the team
    const tasksQuery = `
      SELECT t.*,
             l.name as location_name,
             e.first_name as assigned_to_first_name,
             e.last_name as assigned_to_last_name,
             u.first_name as assigned_by_first_name,
             u.last_name as assigned_by_last_name
      FROM tasks t
      LEFT JOIN locations l ON l.id = t.location_id
      LEFT JOIN employees e ON e.id = t.assigned_to
      LEFT JOIN users u ON u.id = t.assigned_by
      ${whereClause}
      ORDER BY
        CASE t.priority
          WHEN 'urgent' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
        END,
        t.due_at ASC NULLS LAST
      LIMIT 100
    `;

    const tasksResult = await db.query(tasksQuery, params);
    const tasks = tasksResult.rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      category: row.category || 'general',
      priority: row.priority,
      status: row.status,
      dueAt: row.due_at,
      dueTime: row.due_time,
      duration: row.estimated_duration_minutes ? `${row.estimated_duration_minutes} min` : null,
      xpReward: row.xp_reward || 0,
      points: row.xp_reward || 0,
      location: row.location_name,
      locationId: row.location_id,
      assignedTo: row.assigned_to_first_name
        ? `${row.assigned_to_first_name} ${row.assigned_to_last_name}`
        : 'Unassigned',
      assignedToId: row.assigned_to,
      assignedBy: row.assigned_by_first_name
        ? { name: `${row.assigned_by_first_name} ${row.assigned_by_last_name}` }
        : null,
      subtasks: row.subtasks || [],
      requirements: row.requirements || [],
      completedAt: row.completed_at,
      createdAt: row.created_at,
    }));

    res.json({
      metrics: {
        total,
        completed,
        pending: parseInt(metrics.pending) || 0,
        inProgress: parseInt(metrics.in_progress) || 0,
        overdue: parseInt(metrics.overdue) || 0,
        completionRate,
      },
      byCategory,
      workload,
      tasks,
    });
  } catch (error) {
    console.error('Get team tasks error:', error);
    res.status(500).json({ error: 'Failed to get team tasks' });
  }
});

// ============================================================
// TASK DETAIL
// ============================================================

// GET /api/tasks/:id - Get single task detail
router.get('/:id', async (req, res) => {
  try {
    const { organizationId, employeeId, role } = req.user;
    const { id } = req.params;

    const result = await db.query(
      `SELECT t.*,
              l.name as location_name,
              e.first_name as assigned_to_first_name,
              e.last_name as assigned_to_last_name,
              u.first_name as assigned_by_first_name,
              u.last_name as assigned_by_last_name
       FROM tasks t
       LEFT JOIN locations l ON l.id = t.location_id
       LEFT JOIN employees e ON e.id = t.assigned_to
       LEFT JOIN users u ON u.id = t.assigned_by
       WHERE t.id = $1 AND t.organization_id = $2`,
      [id, organizationId]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const row = result.rows[0];

    // Workers can only see their own tasks
    if (role === 'worker' && row.assigned_to !== employeeId) {
      return res.status(403).json({ error: 'Not authorized to view this task' });
    }

    const task = {
      id: row.id,
      title: row.title,
      description: row.description,
      category: row.category || 'general',
      priority: row.priority,
      status: row.status,
      dueAt: row.due_at,
      dueTime: row.due_time,
      duration: row.estimated_duration_minutes ? `${row.estimated_duration_minutes} min` : null,
      estimatedDurationMinutes: row.estimated_duration_minutes,
      xpReward: row.xp_reward || 0,
      points: row.xp_reward || 0,
      location: row.location_name,
      locationId: row.location_id,
      assignedTo: row.assigned_to_first_name
        ? `${row.assigned_to_first_name} ${row.assigned_to_last_name}`
        : 'Unassigned',
      assignedToId: row.assigned_to,
      assignedBy: row.assigned_by_first_name
        ? { name: `${row.assigned_by_first_name} ${row.assigned_by_last_name}` }
        : null,
      subtasks: row.subtasks || [],
      requirements: row.requirements || [],
      completedAt: row.completed_at,
      completionNotes: row.completion_notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    res.json({ task });
  } catch (error) {
    console.error('Get task detail error:', error);
    res.status(500).json({ error: 'Failed to get task' });
  }
});

// ============================================================
// CREATE TASK
// ============================================================

// POST /api/tasks - Create a new task
router.post('/', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { organizationId, userId } = req.user;
    const {
      title,
      description,
      assignedTo,
      locationId,
      category = 'general',
      priority = 'medium',
      dueAt,
      dueTime,
      estimatedDurationMinutes = 30,
      xpReward = 0,
      subtasks = [],
      requirements = [],
    } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const result = await db.query(
      `INSERT INTO tasks (
        organization_id, assigned_to, assigned_by, location_id,
        title, description, category, priority, status,
        due_at, due_time, estimated_duration_minutes, xp_reward,
        subtasks, requirements
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        organizationId, assignedTo, userId, locationId,
        title, description, category, priority,
        dueAt, dueTime, estimatedDurationMinutes, xpReward,
        JSON.stringify(subtasks), JSON.stringify(requirements)
      ]
    );

    res.status(201).json({ task: result.rows[0] });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// ============================================================
// UPDATE TASK
// ============================================================

// PATCH /api/tasks/:id - Update task (status, subtasks, etc.)
router.patch('/:id', async (req, res) => {
  try {
    const { organizationId, employeeId, role } = req.user;
    const { id } = req.params;
    const updates = req.body;

    // First check task exists and user has access
    const existing = await db.query(
      `SELECT * FROM tasks WHERE id = $1 AND organization_id = $2`,
      [id, organizationId]
    );

    if (!existing.rows[0]) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = existing.rows[0];

    // Workers can only update their own tasks (status, subtasks, completion)
    if (role === 'worker') {
      if (task.assigned_to !== employeeId) {
        return res.status(403).json({ error: 'Not authorized to update this task' });
      }
      // Workers can only update limited fields
      const allowedForWorker = ['status', 'subtasks', 'completion_notes'];
      const updateKeys = Object.keys(updates);
      const invalidKeys = updateKeys.filter(k => !allowedForWorker.includes(k) && !allowedForWorker.includes(k.replace(/([A-Z])/g, '_$1').toLowerCase()));
      if (invalidKeys.length > 0) {
        return res.status(403).json({ error: `Workers cannot update: ${invalidKeys.join(', ')}` });
      }
    }

    // Build update query
    const allowedFields = [
      'title', 'description', 'assigned_to', 'location_id', 'category',
      'priority', 'status', 'due_at', 'due_time', 'estimated_duration_minutes',
      'xp_reward', 'subtasks', 'requirements', 'completion_notes'
    ];

    const setClauses = ['updated_at = NOW()'];
    const values = [id, organizationId];
    let paramIndex = 3;

    for (const [key, value] of Object.entries(updates)) {
      // Convert camelCase to snake_case
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (allowedFields.includes(snakeKey)) {
        setClauses.push(`${snakeKey} = $${paramIndex++}`);
        // JSON fields need to be stringified
        if (['subtasks', 'requirements'].includes(snakeKey)) {
          values.push(JSON.stringify(value));
        } else {
          values.push(value);
        }
      }
    }

    // Handle status change to completed
    if (updates.status === 'completed' && task.status !== 'completed') {
      setClauses.push(`completed_at = NOW()`);
    }

    const result = await db.query(
      `UPDATE tasks SET ${setClauses.join(', ')}
       WHERE id = $1 AND organization_id = $2
       RETURNING *`,
      values
    );

    res.json({ task: result.rows[0] });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// ============================================================
// DELETE TASK
// ============================================================

// DELETE /api/tasks/:id - Delete a task (managers only)
router.delete('/:id', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { id } = req.params;

    const result = await db.query(
      `DELETE FROM tasks WHERE id = $1 AND organization_id = $2 RETURNING id`,
      [id, organizationId]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

export default router;
