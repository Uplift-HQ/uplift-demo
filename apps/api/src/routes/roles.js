// ============================================================
// ROLES API ROUTES
// CRUD for custom roles and permissions
// ============================================================

import { Router } from 'express';
import { authMiddleware } from '../middleware/index.js';
import { db } from '../lib/database.js';

const router = Router();

/**
 * GET /api/roles
 * Get all roles for the organization
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    if (!['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const result = await db.query(
      `SELECT r.*,
        (SELECT COUNT(*) FROM users u WHERE u.custom_role_id = r.id AND u.organization_id = r.organization_id) as user_count
       FROM custom_roles r
       WHERE r.organization_id = $1
       ORDER BY r.created_at ASC`,
      [req.user.organizationId]
    );

    const roles = result.rows.map(r => ({
      id: r.id,
      name: r.name,
      description: r.description,
      permissions: r.permissions || {},
      userCount: parseInt(r.user_count) || 0,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));

    res.json({ roles });
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({ error: 'Failed to get roles' });
  }
});

/**
 * GET /api/roles/:id
 * Get a specific role by ID
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    if (!['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;

    const result = await db.query(
      `SELECT r.*,
        (SELECT COUNT(*) FROM users u WHERE u.custom_role_id = r.id AND u.organization_id = r.organization_id) as user_count
       FROM custom_roles r
       WHERE r.id = $1 AND r.organization_id = $2`,
      [id, req.user.organizationId]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Role not found' });
    }

    const r = result.rows[0];
    res.json({
      role: {
        id: r.id,
        name: r.name,
        description: r.description,
        permissions: r.permissions || {},
        userCount: parseInt(r.user_count) || 0,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }
    });
  } catch (error) {
    console.error('Get role error:', error);
    res.status(500).json({ error: 'Failed to get role' });
  }
});

/**
 * POST /api/roles
 * Create a new custom role
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    if (!['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { name, description, permissions } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Role name is required' });
    }

    // Check for duplicate name
    const existing = await db.query(
      `SELECT id FROM custom_roles WHERE organization_id = $1 AND LOWER(name) = LOWER($2)`,
      [req.user.organizationId, name.trim()]
    );

    if (existing.rows[0]) {
      return res.status(400).json({ error: 'A role with this name already exists' });
    }

    // Validate permissions structure
    const validPermissions = {};
    const validModules = ['dashboard', 'schedule', 'time-tracking', 'time-off', 'payroll', 'employees', 'reports', 'settings'];
    const validLevels = ['none', 'read', 'write', 'admin'];

    if (permissions && typeof permissions === 'object') {
      for (const [module, level] of Object.entries(permissions)) {
        if (validModules.includes(module) && validLevels.includes(level)) {
          validPermissions[module] = level;
        }
      }
    }

    const result = await db.query(
      `INSERT INTO custom_roles (organization_id, name, description, permissions, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [req.user.organizationId, name.trim(), description?.trim() || null, JSON.stringify(validPermissions), req.user.userId]
    );

    const r = result.rows[0];

    // Log activity
    try {
      const { activityLog } = await import('../services/activity.js');
      await activityLog.log({
        userId: req.user.userId,
        organizationId: req.user.organizationId,
        action: 'role_created',
        details: { roleId: r.id, roleName: r.name },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });
    } catch (logError) {
      console.error('Failed to log role creation:', logError);
    }

    res.status(201).json({
      success: true,
      role: {
        id: r.id,
        name: r.name,
        description: r.description,
        permissions: r.permissions || {},
        userCount: 0,
        createdAt: r.created_at,
      }
    });
  } catch (error) {
    console.error('Create role error:', error);
    res.status(500).json({ error: 'Failed to create role' });
  }
});

/**
 * PUT /api/roles/:id
 * Update an existing custom role
 */
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    if (!['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    const { name, description, permissions } = req.body;

    // Check role exists and belongs to this organization
    const existing = await db.query(
      `SELECT * FROM custom_roles WHERE id = $1 AND organization_id = $2`,
      [id, req.user.organizationId]
    );

    if (!existing.rows[0]) {
      return res.status(404).json({ error: 'Role not found' });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Role name is required' });
    }

    // Check for duplicate name (excluding current role)
    const duplicate = await db.query(
      `SELECT id FROM custom_roles WHERE organization_id = $1 AND LOWER(name) = LOWER($2) AND id != $3`,
      [req.user.organizationId, name.trim(), id]
    );

    if (duplicate.rows[0]) {
      return res.status(400).json({ error: 'A role with this name already exists' });
    }

    // Validate permissions structure
    const validPermissions = {};
    const validModules = ['dashboard', 'schedule', 'time-tracking', 'time-off', 'payroll', 'employees', 'reports', 'settings'];
    const validLevels = ['none', 'read', 'write', 'admin'];

    if (permissions && typeof permissions === 'object') {
      for (const [module, level] of Object.entries(permissions)) {
        if (validModules.includes(module) && validLevels.includes(level)) {
          validPermissions[module] = level;
        }
      }
    }

    const result = await db.query(
      `UPDATE custom_roles
       SET name = $1, description = $2, permissions = $3, updated_at = NOW()
       WHERE id = $4 AND organization_id = $5
       RETURNING *`,
      [name.trim(), description?.trim() || null, JSON.stringify(validPermissions), id, req.user.organizationId]
    );

    const r = result.rows[0];

    // Log activity
    try {
      const { activityLog } = await import('../services/activity.js');
      await activityLog.log({
        userId: req.user.userId,
        organizationId: req.user.organizationId,
        action: 'role_updated',
        details: { roleId: r.id, roleName: r.name },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });
    } catch (logError) {
      console.error('Failed to log role update:', logError);
    }

    // Get user count
    const countResult = await db.query(
      `SELECT COUNT(*) as count FROM users WHERE custom_role_id = $1 AND organization_id = $2`,
      [id, req.user.organizationId]
    );

    res.json({
      success: true,
      role: {
        id: r.id,
        name: r.name,
        description: r.description,
        permissions: r.permissions || {},
        userCount: parseInt(countResult.rows[0]?.count) || 0,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }
    });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

/**
 * DELETE /api/roles/:id
 * Delete a custom role
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    if (!['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;

    // Check role exists and belongs to this organization
    const existing = await db.query(
      `SELECT * FROM custom_roles WHERE id = $1 AND organization_id = $2`,
      [id, req.user.organizationId]
    );

    if (!existing.rows[0]) {
      return res.status(404).json({ error: 'Role not found' });
    }

    const roleName = existing.rows[0].name;

    // Get count of affected users
    const countResult = await db.query(
      `SELECT COUNT(*) as count FROM users WHERE custom_role_id = $1 AND organization_id = $2`,
      [id, req.user.organizationId]
    );
    const affectedUsers = parseInt(countResult.rows[0]?.count) || 0;

    // Remove role assignment from users (they revert to their base role)
    await db.query(
      `UPDATE users SET custom_role_id = NULL, updated_at = NOW()
       WHERE custom_role_id = $1 AND organization_id = $2`,
      [id, req.user.organizationId]
    );

    // Delete the role
    await db.query(
      `DELETE FROM custom_roles WHERE id = $1 AND organization_id = $2`,
      [id, req.user.organizationId]
    );

    // Log activity
    try {
      const { activityLog } = await import('../services/activity.js');
      await activityLog.log({
        userId: req.user.userId,
        organizationId: req.user.organizationId,
        action: 'role_deleted',
        details: { roleId: id, roleName, affectedUsers },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });
    } catch (logError) {
      console.error('Failed to log role deletion:', logError);
    }

    res.json({
      success: true,
      message: `Role deleted. ${affectedUsers} user(s) reverted to default permissions.`,
      affectedUsers,
    });
  } catch (error) {
    console.error('Delete role error:', error);
    res.status(500).json({ error: 'Failed to delete role' });
  }
});

/**
 * GET /api/roles/:id/users
 * Get users assigned to a specific role
 */
router.get('/:id/users', authMiddleware, async (req, res) => {
  try {
    if (!['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;

    const result = await db.query(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.role, u.status
       FROM users u
       WHERE u.custom_role_id = $1 AND u.organization_id = $2
       ORDER BY u.first_name, u.last_name`,
      [id, req.user.organizationId]
    );

    res.json({
      users: result.rows.map(u => ({
        id: u.id,
        firstName: u.first_name,
        lastName: u.last_name,
        name: `${u.first_name} ${u.last_name}`.trim(),
        email: u.email,
        baseRole: u.role,
        status: u.status,
      }))
    });
  } catch (error) {
    console.error('Get role users error:', error);
    res.status(500).json({ error: 'Failed to get role users' });
  }
});

/**
 * POST /api/roles/:id/assign
 * Assign a role to a user
 */
router.post('/:id/assign', authMiddleware, async (req, res) => {
  try {
    if (!['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Verify role exists
    const roleResult = await db.query(
      `SELECT * FROM custom_roles WHERE id = $1 AND organization_id = $2`,
      [id, req.user.organizationId]
    );

    if (!roleResult.rows[0]) {
      return res.status(404).json({ error: 'Role not found' });
    }

    // Verify user exists and belongs to same organization
    const userResult = await db.query(
      `SELECT * FROM users WHERE id = $1 AND organization_id = $2`,
      [userId, req.user.organizationId]
    );

    if (!userResult.rows[0]) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Assign the role
    await db.query(
      `UPDATE users SET custom_role_id = $1, updated_at = NOW() WHERE id = $2`,
      [id, userId]
    );

    res.json({
      success: true,
      message: 'Role assigned successfully',
    });
  } catch (error) {
    console.error('Assign role error:', error);
    res.status(500).json({ error: 'Failed to assign role' });
  }
});

/**
 * POST /api/roles/:id/unassign
 * Remove a role from a user
 */
router.post('/:id/unassign', authMiddleware, async (req, res) => {
  try {
    if (!['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Remove role assignment
    await db.query(
      `UPDATE users SET custom_role_id = NULL, updated_at = NOW()
       WHERE id = $1 AND organization_id = $2 AND custom_role_id = $3`,
      [userId, req.user.organizationId, id]
    );

    res.json({
      success: true,
      message: 'Role removed from user',
    });
  } catch (error) {
    console.error('Unassign role error:', error);
    res.status(500).json({ error: 'Failed to remove role from user' });
  }
});

export default router;
