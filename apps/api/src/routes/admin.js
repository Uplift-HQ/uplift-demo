// ============================================================
// UPLIFT ADMIN ROUTES
// Internal backoffice API for Uplift operations team
// ============================================================

import { Router } from 'express';
import { db } from '../lib/database.js';
import * as billingService from '../services/billing.js';

const router = Router();

// ============================================================
// ADMIN AUTH MIDDLEWARE
// Requires superadmin role (Uplift staff only)
// ============================================================

const requireSuperAdmin = (req, res, next) => {
  if (req.user?.role !== 'superadmin') {
    return res.status(403).json({ error: 'Superadmin access required' });
  }
  next();
};

router.use(requireSuperAdmin);

// ============================================================
// DASHBOARD / METRICS
// ============================================================

/**
 * GET /api/admin/metrics - Get business metrics
 */
router.get('/metrics', async (req, res) => {
  try {
    // MRR and subscription metrics
    const mrr = await billingService.getMRR();
    
    // Customer counts
    const customerCounts = await db.query(`
      SELECT 
        COUNT(*) FILTER (WHERE s.status = 'active') as active,
        COUNT(*) FILTER (WHERE s.status = 'trialing') as trialing,
        COUNT(*) FILTER (WHERE s.status = 'past_due') as past_due,
        COUNT(*) FILTER (WHERE s.status = 'canceled') as canceled,
        COUNT(*) as total
      FROM subscriptions s
    `);
    
    // Recent signups (last 30 days)
    const recentSignups = await db.query(`
      SELECT COUNT(*) as count
      FROM organizations
      WHERE created_at > NOW() - INTERVAL '30 days'
    `);
    
    // Churn (canceled in last 30 days)
    const churn = await db.query(`
      SELECT COUNT(*) as count
      FROM subscriptions
      WHERE status = 'canceled' 
        AND canceled_at > NOW() - INTERVAL '30 days'
    `);
    
    // Revenue by plan
    const revenueByPlan = await billingService.getRevenueByPlan();
    
    // Total seats
    const seatCounts = await db.query(`
      SELECT 
        SUM(core_seats) as total_core,
        SUM(flex_seats) as total_flex,
        SUM(core_seats + flex_seats) as total
      FROM subscriptions
      WHERE status IN ('active', 'trialing')
    `);
    
    // Total employees across platform
    const employeeCounts = await db.query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) as total
      FROM employees
    `);

    res.json({
      mrr: mrr.total_mrr,
      activeSubscriptions: parseInt(mrr.active_subscriptions),
      customers: customerCounts.rows[0],
      seats: {
        core: parseInt(seatCounts.rows[0]?.total_core || 0),
        flex: parseInt(seatCounts.rows[0]?.total_flex || 0),
        total: parseInt(seatCounts.rows[0]?.total || 0),
      },
      employees: employeeCounts.rows[0],
      revenueByPlan,
      newCustomers30d: parseInt(recentSignups.rows[0]?.count || 0),
      churned30d: parseInt(churn.rows[0]?.count || 0),
    });
  } catch (error) {
    console.error('Get metrics error:', error);
    res.status(500).json({ error: 'Failed to get metrics' });
  }
});

/**
 * GET /api/admin/metrics/mrr-history - Get MRR over time
 */
router.get('/metrics/mrr-history', async (req, res) => {
  try {
    const months = parseInt(req.query.months) || 12;
    
    // This would need historical snapshots - simplified version
    const result = await db.query(`
      SELECT
        DATE_TRUNC('month', created_at) as month,
        COUNT(*) as new_subscriptions
      FROM subscriptions
      WHERE created_at > NOW() - INTERVAL '1 month' * $1
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month
    `, [months]);

    res.json({ history: result.rows });
  } catch (error) {
    console.error('Get MRR history error:', error);
    res.status(500).json({ error: 'Failed to get MRR history' });
  }
});

// ============================================================
// ORGANIZATIONS / CUSTOMERS
// ============================================================

/**
 * POST /api/admin/organizations - Create new organization (onboarding)
 */
router.post('/organizations', async (req, res) => {
  try {
    const { name, slug, billingEmail, billingName, taxId } = req.body;

    if (!name || !billingEmail) {
      return res.status(400).json({ error: 'Name and billing email are required' });
    }

    const orgSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    // Check slug uniqueness
    const existing = await db.query('SELECT id FROM organizations WHERE slug = $1', [orgSlug]);
    if (existing.rows[0]) {
      return res.status(400).json({ error: 'Organization slug already exists' });
    }

    const result = await db.query(`
      INSERT INTO organizations (name, slug, billing_email, billing_name, tax_id, status)
      VALUES ($1, $2, $3, $4, $5, 'active')
      RETURNING *
    `, [name, orgSlug, billingEmail, billingName || name, taxId || null]);

    res.json({ organization: result.rows[0] });
  } catch (error) {
    console.error('Create organization error:', error);
    res.status(500).json({ error: 'Failed to create organization' });
  }
});

/**
 * POST /api/admin/organizations/:id/users - Create admin user for organization
 */
router.post('/organizations/:id/users', async (req, res) => {
  try {
    const { id } = req.params;
    const { email, firstName, lastName, password, role = 'admin' } = req.body;

    if (!email || !firstName || !lastName || !password) {
      return res.status(400).json({ error: 'Email, firstName, lastName, and password are required' });
    }

    // Check seat availability before creating user
    const seatCheck = await billingService.checkSeatAvailability(id);
    if (!seatCheck.allowed) {
      return res.status(403).json({ error: seatCheck.error, code: 'SEAT_LIMIT_EXCEEDED' });
    }

    const bcrypt = (await import('bcryptjs')).default;
    const passwordHash = await bcrypt.hash(password, 12);

    // Check if user email already exists
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows[0]) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Create employee record first with assigned seat type
    const empResult = await db.query(`
      INSERT INTO employees (organization_id, first_name, last_name, email, status, seat_type)
      VALUES ($1, $2, $3, $4, 'active', $5)
      RETURNING id
    `, [id, firstName, lastName, email.toLowerCase(), seatCheck.seatType]);

    // Create user record
    const userResult = await db.query(`
      INSERT INTO users (organization_id, employee_id, email, password_hash, first_name, last_name, role, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
      RETURNING id, email, first_name, last_name, role
    `, [id, empResult.rows[0].id, email.toLowerCase(), passwordHash, firstName, lastName, role]);

    res.json({ user: userResult.rows[0], seatType: seatCheck.seatType });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

/**
 * GET /api/admin/organizations - List all organizations
 */
router.get('/organizations', async (req, res) => {
  try {
    const { 
      status, 
      plan,
      search, 
      sortBy = 'created_at', 
      sortOrder = 'desc',
      limit = 50, 
      offset = 0 
    } = req.query;

    let query = `
      SELECT 
        o.*,
        s.status as subscription_status,
        s.core_seats,
        s.flex_seats,
        s.current_period_end,
        s.cancel_at_period_end,
        p.name as plan_name,
        p.slug as plan_slug,
        (SELECT COUNT(*) FROM employees e WHERE e.organization_id = o.id AND e.status = 'active') as employee_count,
        (SELECT COUNT(*) FROM users u WHERE u.organization_id = o.id AND u.status = 'active') as user_count,
        (SELECT MAX(last_login_at) FROM users u WHERE u.organization_id = o.id) as last_activity
      FROM organizations o
      LEFT JOIN subscriptions s ON s.organization_id = o.id
      LEFT JOIN plans p ON p.id = s.plan_id
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;

    if (status) {
      query += ` AND s.status = $${paramIndex++}`;
      params.push(status);
    }
    
    if (plan) {
      query += ` AND p.slug = $${paramIndex++}`;
      params.push(plan);
    }

    if (search) {
      query += ` AND (o.name ILIKE $${paramIndex} OR o.billing_email ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Validate sort column
    const allowedSorts = ['created_at', 'name', 'employee_count', 'subscription_status'];
    const sortColumn = allowedSorts.includes(sortBy) ? sortBy : 'created_at';
    const order = sortOrder === 'asc' ? 'ASC' : 'DESC';
    
    query += ` ORDER BY ${sortColumn} ${order} NULLS LAST LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    const result = await db.query(query, params);
    
    // Get total count - build query with parameters
    const countParams = [];
    let countQuery = `
      SELECT COUNT(*) FROM organizations o
      LEFT JOIN subscriptions s ON s.organization_id = o.id
      LEFT JOIN plans p ON p.id = s.plan_id
      WHERE 1=1
    `;
    let countParamIndex = 1;
    if (status) {
      countQuery += ` AND s.status = $${countParamIndex++}`;
      countParams.push(status);
    }
    if (plan) {
      countQuery += ` AND p.slug = $${countParamIndex++}`;
      countParams.push(plan);
    }
    const countResult = await db.query(countQuery, countParams);

    res.json({
      organizations: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    console.error('List organizations error:', error);
    res.status(500).json({ error: 'Failed to list organizations' });
  }
});

/**
 * GET /api/admin/organizations/:id - Get organization details
 */
router.get('/organizations/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Organization with subscription
    const orgResult = await db.query(`
      SELECT 
        o.*,
        s.id as subscription_id,
        s.status as subscription_status,
        s.core_seats,
        s.flex_seats,
        s.current_period_start,
        s.current_period_end,
        s.trial_start,
        s.trial_end,
        s.cancel_at_period_end,
        s.canceled_at,
        s.cancellation_reason,
        p.name as plan_name,
        p.slug as plan_slug,
        p.core_price_per_seat,
        p.flex_price_per_seat
      FROM organizations o
      LEFT JOIN subscriptions s ON s.organization_id = o.id
      LEFT JOIN plans p ON p.id = s.plan_id
      WHERE o.id = $1
    `, [id]);

    if (!orgResult.rows[0]) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const org = orgResult.rows[0];

    // Seat usage
    const usage = await billingService.getSeatUsage(id);

    // Users
    const usersResult = await db.query(`
      SELECT id, email, first_name, last_name, role, status, last_login_at, created_at
      FROM users WHERE organization_id = $1 ORDER BY created_at DESC
    `, [id]);

    // Recent invoices
    const invoices = await billingService.getInvoices(id, 6);

    // Billing events
    const events = await billingService.getBillingEvents(id, 20);

    // Activity stats
    const activityResult = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM employees WHERE organization_id = $1 AND status = 'active') as active_employees,
        (SELECT COUNT(*) FROM shifts WHERE organization_id = $1 AND date >= CURRENT_DATE) as upcoming_shifts,
        (SELECT COUNT(*) FROM time_entries WHERE organization_id = $1 AND clock_in >= NOW() - INTERVAL '7 days') as time_entries_7d
    `, [id]);

    res.json({
      organization: org,
      subscription: org.subscription_id ? {
        id: org.subscription_id,
        status: org.subscription_status,
        coreSeats: org.core_seats,
        flexSeats: org.flex_seats,
        currentPeriodStart: org.current_period_start,
        currentPeriodEnd: org.current_period_end,
        trialEnd: org.trial_end,
        cancelAtPeriodEnd: org.cancel_at_period_end,
        plan: {
          name: org.plan_name,
          slug: org.plan_slug,
          corePricePerSeat: org.core_price_per_seat,
          flexPricePerSeat: org.flex_price_per_seat,
        },
      } : null,
      usage,
      users: usersResult.rows,
      invoices,
      events,
      activity: activityResult.rows[0],
    });
  } catch (error) {
    console.error('Get organization error:', error);
    res.status(500).json({ error: 'Failed to get organization' });
  }
});

/**
 * PATCH /api/admin/organizations/:id - Update organization
 */
router.patch('/organizations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, billingEmail, billingName, taxId, notes } = req.body;

    await db.query(`
      UPDATE organizations SET
        name = COALESCE($1, name),
        billing_email = COALESCE($2, billing_email),
        billing_name = COALESCE($3, billing_name),
        tax_id = COALESCE($4, tax_id),
        metadata = COALESCE(metadata, '{}'::jsonb) || COALESCE($5, '{}'::jsonb),
        updated_at = NOW()
      WHERE id = $6
    `, [name, billingEmail, billingName, taxId, notes ? { internal_notes: notes } : null, id]);

    res.json({ success: true });
  } catch (error) {
    console.error('Update organization error:', error);
    res.status(500).json({ error: 'Failed to update organization' });
  }
});

// ============================================================
// SUBSCRIPTION MANAGEMENT (Admin override)
// ============================================================

/**
 * POST /api/admin/organizations/:id/subscription - Create/update subscription
 */
router.post('/organizations/:id/subscription', async (req, res) => {
  try {
    const { id } = req.params;
    const { planSlug, coreSeats, flexSeats, trialDays, status } = req.body;

    // Check if subscription exists
    const existingSub = await billingService.getSubscription(id);

    if (existingSub) {
      // Update existing
      if (planSlug && planSlug !== existingSub.plan_slug) {
        await billingService.changePlan(id, planSlug);
      }
      if (coreSeats !== undefined && coreSeats !== existingSub.core_seats) {
        await billingService.updateCoreSeats(id, coreSeats);
      }
      if (flexSeats !== undefined && flexSeats !== existingSub.flex_seats) {
        await billingService.updateFlexSeats(id, flexSeats);
      }
      // Manual status override (admin only)
      if (status) {
        await db.query(
          `UPDATE subscriptions SET status = $1, updated_at = NOW() WHERE organization_id = $2`,
          [status, id]
        );
      }
    } else {
      // Create new
      await billingService.createSubscription(id, planSlug, coreSeats, { trialDays });
      if (flexSeats > 0) {
        await billingService.updateFlexSeats(id, flexSeats);
      }
    }

    const subscription = await billingService.getSubscription(id);
    res.json({ subscription });
  } catch (error) {
    console.error('Admin subscription update error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/admin/organizations/:id/subscription/cancel - Cancel subscription (admin)
 */
router.post('/organizations/:id/subscription/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    const { immediate, reason } = req.body;

    await billingService.cancelSubscription(id, immediate, reason);
    res.json({ success: true });
  } catch (error) {
    console.error('Admin cancel subscription error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/admin/organizations/:id/subscription/extend-trial - Extend trial
 */
router.post('/organizations/:id/subscription/extend-trial', async (req, res) => {
  try {
    const { id } = req.params;
    const { days } = req.body;

    const sub = await billingService.getSubscription(id);
    if (!sub?.stripe_subscription_id) {
      return res.status(400).json({ error: 'No subscription found' });
    }

    const newTrialEnd = new Date();
    newTrialEnd.setDate(newTrialEnd.getDate() + (days || 14));

    await billingService.stripe.subscriptions.update(sub.stripe_subscription_id, {
      trial_end: Math.floor(newTrialEnd.getTime() / 1000),
    });

    await db.query(
      `UPDATE subscriptions SET trial_end = $1, updated_at = NOW() WHERE organization_id = $2`,
      [newTrialEnd, id]
    );

    res.json({ success: true, newTrialEnd });
  } catch (error) {
    console.error('Extend trial error:', error);
    res.status(400).json({ error: error.message });
  }
});

// ============================================================
// CREDITS & ADJUSTMENTS
// ============================================================

/**
 * POST /api/admin/organizations/:id/credit - Issue credit
 */
router.post('/organizations/:id/credit', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, reason } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount required' });
    }

    const org = await db.query(
      `SELECT stripe_customer_id FROM organizations WHERE id = $1`,
      [id]
    );

    if (!org.rows[0]?.stripe_customer_id) {
      return res.status(400).json({ error: 'No Stripe customer found' });
    }

    // Create credit balance transaction in Stripe
    const credit = await billingService.stripe.customers.createBalanceTransaction(
      org.rows[0].stripe_customer_id,
      {
        amount: -amount, // Negative = credit
        currency: 'gbp',
        description: reason || 'Credit issued by Uplift',
      }
    );

    // Log event
    await db.query(`
      INSERT INTO billing_events (organization_id, event_type, data, actor_type, actor_id)
      VALUES ($1, 'credit.issued', $2, 'admin', $3)
    `, [id, JSON.stringify({ amount, reason, stripe_txn: credit.id }), req.user.userId]);

    res.json({ success: true, credit });
  } catch (error) {
    console.error('Issue credit error:', error);
    res.status(400).json({ error: error.message });
  }
});

// ============================================================
// INVOICES
// ============================================================

/**
 * GET /api/admin/invoices - List all invoices
 */
router.get('/invoices', async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT 
        i.*,
        o.name as organization_name
      FROM invoices i
      JOIN organizations o ON o.id = i.organization_id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (status) {
      query += ` AND i.status = $${paramIndex++}`;
      params.push(status);
    }

    query += ` ORDER BY i.invoice_date DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    const result = await db.query(query, params);
    res.json({ invoices: result.rows });
  } catch (error) {
    console.error('List invoices error:', error);
    res.status(500).json({ error: 'Failed to list invoices' });
  }
});

/**
 * POST /api/admin/invoices/:id/void - Void invoice
 */
router.post('/invoices/:id/void', async (req, res) => {
  try {
    const { id } = req.params;

    const invoiceResult = await db.query(
      `SELECT stripe_invoice_id FROM invoices WHERE id = $1`,
      [id]
    );

    if (!invoiceResult.rows[0]) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    await billingService.stripe.invoices.voidInvoice(invoiceResult.rows[0].stripe_invoice_id);

    await db.query(
      `UPDATE invoices SET status = 'void', updated_at = NOW() WHERE id = $1`,
      [id]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Void invoice error:', error);
    res.status(400).json({ error: error.message });
  }
});

// ============================================================
// PLANS MANAGEMENT
// ============================================================

/**
 * GET /api/admin/plans - Get all plans (including inactive)
 */
router.get('/plans', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT p.*, 
        (SELECT COUNT(*) FROM subscriptions s WHERE s.plan_id = p.id AND s.status = 'active') as active_subscriptions
      FROM plans p
      ORDER BY sort_order
    `);
    res.json({ plans: result.rows });
  } catch (error) {
    console.error('Get plans error:', error);
    res.status(500).json({ error: 'Failed to get plans' });
  }
});

/**
 * PATCH /api/admin/plans/:id - Update plan
 */
router.patch('/plans/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, description, corePricePerSeat, flexPricePerSeat, 
      minSeats, maxSeats, features, isActive, isPublic 
    } = req.body;

    await db.query(`
      UPDATE plans SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        core_price_per_seat = COALESCE($3, core_price_per_seat),
        flex_price_per_seat = COALESCE($4, flex_price_per_seat),
        min_seats = COALESCE($5, min_seats),
        max_seats = COALESCE($6, max_seats),
        features = COALESCE($7, features),
        is_active = COALESCE($8, is_active),
        is_public = COALESCE($9, is_public),
        updated_at = NOW()
      WHERE id = $10
    `, [name, description, corePricePerSeat, flexPricePerSeat, minSeats, maxSeats, features, isActive, isPublic, id]);

    res.json({ success: true });
  } catch (error) {
    console.error('Update plan error:', error);
    res.status(500).json({ error: 'Failed to update plan' });
  }
});

// ============================================================
// IMPERSONATION
// ============================================================

/**
 * POST /api/admin/organizations/:id/impersonate - Get impersonation token
 */
router.post('/organizations/:id/impersonate', async (req, res) => {
  try {
    const { id } = req.params;

    // Get an admin user from the organization
    const userResult = await db.query(`
      SELECT id, email, first_name, last_name, role
      FROM users
      WHERE organization_id = $1 AND role = 'admin' AND status = 'active'
      LIMIT 1
    `, [id]);

    if (!userResult.rows[0]) {
      return res.status(400).json({ error: 'No admin user found to impersonate' });
    }

    // Generate temporary token
    const { authService } = await import('../services/auth.js');
    const token = await authService.generateImpersonationToken(
      userResult.rows[0],
      req.user.userId // Admin who is impersonating
    );

    // Log the impersonation
    await db.query(`
      INSERT INTO billing_events (organization_id, event_type, data, actor_type, actor_id, actor_email)
      VALUES ($1, 'admin.impersonation', $2, 'admin', $3, $4)
    `, [
      id,
      JSON.stringify({ impersonated_user_id: userResult.rows[0].id }),
      req.user.userId,
      req.user.email,
    ]);

    res.json({
      token,
      user: userResult.rows[0],
      expiresIn: '1h',
    });
  } catch (error) {
    console.error('Impersonation error:', error);
    res.status(500).json({ error: 'Failed to create impersonation session' });
  }
});

// ============================================================
// AUDIT LOG
// ============================================================

/**
 * GET /api/admin/audit-log - Get audit logs with filtering
 */
router.get('/audit-log', async (req, res) => {
  try {
    const {
      action,
      userId,
      entityType,
      startDate,
      endDate,
      search,
      page = 1,
      limit = 50,
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    let paramIndex = 1;

    let whereClause = '1=1';

    if (action) {
      whereClause += ` AND al.action = $${paramIndex++}`;
      params.push(action);
    }

    if (userId) {
      whereClause += ` AND al.user_id = $${paramIndex++}`;
      params.push(userId);
    }

    if (entityType) {
      whereClause += ` AND al.entity_type = $${paramIndex++}`;
      params.push(entityType);
    }

    if (startDate) {
      whereClause += ` AND al.created_at >= $${paramIndex++}`;
      params.push(new Date(startDate));
    }

    if (endDate) {
      whereClause += ` AND al.created_at <= $${paramIndex++}`;
      params.push(new Date(endDate + 'T23:59:59'));
    }

    if (search) {
      whereClause += ` AND (
        u.email ILIKE $${paramIndex} OR
        u.first_name ILIKE $${paramIndex} OR
        u.last_name ILIKE $${paramIndex} OR
        al.ip_address::text ILIKE $${paramIndex} OR
        al.details::text ILIKE $${paramIndex}
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Get logs with user info
    const logsQuery = `
      SELECT
        al.*,
        u.email as user_email,
        CONCAT(u.first_name, ' ', u.last_name) as user_name,
        o.name as organization_name
      FROM audit_log al
      LEFT JOIN users u ON u.id = al.user_id
      LEFT JOIN organizations o ON o.id = al.organization_id
      WHERE ${whereClause}
      ORDER BY al.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    params.push(parseInt(limit), offset);

    const logsResult = await db.query(logsQuery, params);

    // Get total count
    const countParams = params.slice(0, -2); // Remove limit and offset
    const countQuery = `
      SELECT COUNT(*) as total
      FROM audit_log al
      LEFT JOIN users u ON u.id = al.user_id
      WHERE ${whereClause}
    `;
    const countResult = await db.query(countQuery, countParams);

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({
      logs: logsResult.rows,
      total,
      totalPages,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (error) {
    console.error('Get audit log error:', error);
    res.status(500).json({ error: 'Failed to get audit logs' });
  }
});

/**
 * GET /api/admin/audit-log/export - Export audit logs as CSV
 */
router.get('/audit-log/export', async (req, res) => {
  try {
    const { action, startDate, endDate } = req.query;

    const params = [];
    let paramIndex = 1;
    let whereClause = '1=1';

    if (action) {
      whereClause += ` AND al.action = $${paramIndex++}`;
      params.push(action);
    }

    if (startDate) {
      whereClause += ` AND al.created_at >= $${paramIndex++}`;
      params.push(new Date(startDate));
    }

    if (endDate) {
      whereClause += ` AND al.created_at <= $${paramIndex++}`;
      params.push(new Date(endDate + 'T23:59:59'));
    }

    const query = `
      SELECT
        al.created_at as timestamp,
        COALESCE(u.email, 'system') as user_email,
        CONCAT(u.first_name, ' ', u.last_name) as user_name,
        al.action,
        al.entity_type,
        al.entity_id,
        al.ip_address,
        al.user_agent,
        al.details
      FROM audit_log al
      LEFT JOIN users u ON u.id = al.user_id
      WHERE ${whereClause}
      ORDER BY al.created_at DESC
      LIMIT 10000
    `;

    const result = await db.query(query, params);

    // Generate CSV
    const headers = ['Timestamp', 'User Email', 'User Name', 'Action', 'Entity Type', 'Entity ID', 'IP Address', 'User Agent', 'Details'];
    const rows = result.rows.map(row => [
      row.timestamp,
      row.user_email,
      row.user_name,
      row.action,
      row.entity_type || '',
      row.entity_id || '',
      row.ip_address || '',
      (row.user_agent || '').replace(/"/g, '""'),
      row.details ? JSON.stringify(row.details).replace(/"/g, '""') : '',
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=audit-log-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('Export audit log error:', error);
    res.status(500).json({ error: 'Failed to export audit logs' });
  }
});

/**
 * GET /api/admin/audit-log/stats - Get audit log statistics
 */
router.get('/audit-log/stats', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;

    const stats = await db.query(`
      SELECT
        action,
        COUNT(*) as count
      FROM audit_log
      WHERE created_at >= NOW() - INTERVAL '1 day' * $1
      GROUP BY action
      ORDER BY count DESC
      LIMIT 20
    `, [days]);

    const dailyActivity = await db.query(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE action LIKE '%login%') as logins,
        COUNT(*) FILTER (WHERE action LIKE '%failed%') as failures
      FROM audit_log
      WHERE created_at >= NOW() - INTERVAL '1 day' * $1
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `, [days]);

    res.json({
      byAction: stats.rows,
      dailyActivity: dailyActivity.rows,
    });
  } catch (error) {
    console.error('Get audit log stats error:', error);
    res.status(500).json({ error: 'Failed to get audit log stats' });
  }
});

// ============================================================
// DATABASE MIGRATIONS (Admin only)
// ============================================================

/**
 * GET /api/admin/migrations/status - Get migration status
 */
router.get('/migrations/status', async (req, res) => {
  try {
    // Check if migrations table exists
    const tableCheck = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = '_migrations'
      )
    `);

    if (!tableCheck.rows[0].exists) {
      return res.json({
        status: 'no_migrations_table',
        executed: [],
        message: 'Migrations table does not exist yet'
      });
    }

    // Get executed migrations
    const executed = await db.query(`
      SELECT filename, executed_at
      FROM _migrations
      ORDER BY executed_at ASC
    `);

    // Get all tables
    const tables = await db.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    res.json({
      status: 'ok',
      executed: executed.rows,
      executedCount: executed.rows.length,
      tables: tables.rows.map(r => r.table_name),
      tableCount: tables.rows.length
    });
  } catch (error) {
    console.error('Get migration status error:', error);
    res.status(500).json({ error: 'Failed to get migration status', details: error.message });
  }
});

/**
 * POST /api/admin/migrations/run - Run pending migrations
 */
router.post('/migrations/run', async (req, res) => {
  const client = await db.getClient();

  try {
    console.log('🚀 Starting database migrations via API...');

    // Create migrations tracking table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Get list of executed migrations
    const executed = await client.query('SELECT filename FROM _migrations');
    const executedFiles = new Set(executed.rows.map(r => r.filename));

    // Migration SQL files - embedded for API execution
    const migrations = await getMigrationFiles();

    const results = [];
    let migratedCount = 0;

    for (const migration of migrations) {
      if (executedFiles.has(migration.filename)) {
        results.push({ filename: migration.filename, status: 'skipped', reason: 'already executed' });
        continue;
      }

      console.log(`📄 Running ${migration.filename}...`);

      try {
        await client.query('BEGIN');
        await client.query(migration.sql);
        await client.query(
          'INSERT INTO _migrations (filename) VALUES ($1)',
          [migration.filename]
        );
        await client.query('COMMIT');
        results.push({ filename: migration.filename, status: 'success' });
        migratedCount++;
        console.log(`   ✅ ${migration.filename} completed`);
      } catch (error) {
        await client.query('ROLLBACK');
        results.push({ filename: migration.filename, status: 'failed', error: error.message });
        console.error(`   ❌ ${migration.filename} failed:`, error.message);
        // Continue with other migrations instead of stopping
      }
    }

    res.json({
      success: true,
      migratedCount,
      skippedCount: migrations.length - migratedCount - results.filter(r => r.status === 'failed').length,
      failedCount: results.filter(r => r.status === 'failed').length,
      results
    });
  } catch (error) {
    console.error('❌ Migration failed:', error);
    res.status(500).json({ error: 'Migration failed', details: error.message });
  } finally {
    client.release();
  }
});

// Helper to get migration files (simplified - key schema migrations)
async function getMigrationFiles() {
  // Core migrations that need to exist
  return [
    {
      filename: '001_core_schema.sql',
      sql: `
        -- Organizations
        CREATE TABLE IF NOT EXISTS organizations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          slug VARCHAR(100) UNIQUE NOT NULL,
          timezone VARCHAR(50) DEFAULT 'Europe/London',
          currency VARCHAR(3) DEFAULT 'GBP',
          features JSONB DEFAULT '{}',
          settings JSONB DEFAULT '{}',
          billing_email VARCHAR(255),
          billing_name VARCHAR(255),
          tax_id VARCHAR(50),
          stripe_customer_id VARCHAR(100),
          metadata JSONB DEFAULT '{}',
          status VARCHAR(20) DEFAULT 'active',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Users
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
          employee_id UUID,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255),
          first_name VARCHAR(100) NOT NULL,
          last_name VARCHAR(100) NOT NULL,
          role VARCHAR(50) DEFAULT 'worker',
          status VARCHAR(20) DEFAULT 'active',
          preferred_language VARCHAR(10) DEFAULT 'en',
          avatar_url TEXT,
          phone VARCHAR(50),
          last_login_at TIMESTAMPTZ,
          email_verified_at TIMESTAMPTZ,
          mfa_enabled BOOLEAN DEFAULT false,
          mfa_secret VARCHAR(100),
          backup_codes TEXT[],
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Employees
        CREATE TABLE IF NOT EXISTS employees (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
          user_id UUID REFERENCES users(id) ON DELETE SET NULL,
          employee_number VARCHAR(50),
          first_name VARCHAR(100) NOT NULL,
          last_name VARCHAR(100) NOT NULL,
          email VARCHAR(255),
          phone VARCHAR(50),
          job_title VARCHAR(100),
          department_id UUID,
          location_id UUID,
          manager_id UUID REFERENCES employees(id),
          employment_type VARCHAR(50) DEFAULT 'full_time',
          contract_hours NUMERIC(5,2),
          hourly_rate NUMERIC(10,2),
          salary NUMERIC(12,2),
          start_date DATE,
          end_date DATE,
          status VARCHAR(20) DEFAULT 'active',
          seat_type VARCHAR(20) DEFAULT 'core',
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Departments
        CREATE TABLE IF NOT EXISTS departments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
          name VARCHAR(100) NOT NULL,
          parent_id UUID REFERENCES departments(id),
          manager_id UUID,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Locations
        CREATE TABLE IF NOT EXISTS locations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
          name VARCHAR(100) NOT NULL,
          address TEXT,
          city VARCHAR(100),
          country VARCHAR(100),
          timezone VARCHAR(50),
          open_time TIME,
          close_time TIME,
          status VARCHAR(20) DEFAULT 'active',
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_users_org ON users(organization_id);
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_employees_org ON employees(organization_id);
        CREATE INDEX IF NOT EXISTS idx_employees_user ON employees(user_id);
      `
    },
    {
      filename: '002_scheduling.sql',
      sql: `
        -- Shifts
        CREATE TABLE IF NOT EXISTS shifts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
          location_id UUID REFERENCES locations(id),
          employee_id UUID REFERENCES employees(id),
          department_id UUID,
          date DATE NOT NULL,
          start_time TIME NOT NULL,
          end_time TIME NOT NULL,
          break_minutes INTEGER DEFAULT 0,
          status VARCHAR(20) DEFAULT 'scheduled',
          is_open BOOLEAN DEFAULT false,
          notes TEXT,
          created_by UUID,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Time entries
        CREATE TABLE IF NOT EXISTS time_entries (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
          employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
          shift_id UUID REFERENCES shifts(id),
          clock_in TIMESTAMPTZ NOT NULL,
          clock_out TIMESTAMPTZ,
          break_start TIMESTAMPTZ,
          break_end TIMESTAMPTZ,
          total_break_minutes INTEGER DEFAULT 0,
          status VARCHAR(20) DEFAULT 'active',
          location_id UUID,
          notes TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Time off requests
        CREATE TABLE IF NOT EXISTS time_off_requests (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
          employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
          type VARCHAR(50) NOT NULL,
          start_date DATE NOT NULL,
          end_date DATE NOT NULL,
          total_days NUMERIC(5,2),
          status VARCHAR(20) DEFAULT 'pending',
          reason TEXT,
          approved_by UUID,
          approved_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_shifts_org_date ON shifts(organization_id, date);
        CREATE INDEX IF NOT EXISTS idx_shifts_employee ON shifts(employee_id, date);
        CREATE INDEX IF NOT EXISTS idx_time_entries_employee ON time_entries(employee_id, clock_in);
      `
    },
    {
      filename: '003_billing.sql',
      sql: `
        -- Plans
        CREATE TABLE IF NOT EXISTS plans (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          slug VARCHAR(50) UNIQUE NOT NULL,
          name VARCHAR(100) NOT NULL,
          description TEXT,
          core_price_per_seat NUMERIC(10,2) NOT NULL,
          flex_price_per_seat NUMERIC(10,2) NOT NULL,
          min_seats INTEGER DEFAULT 1,
          max_seats INTEGER,
          features JSONB DEFAULT '{}',
          is_active BOOLEAN DEFAULT true,
          is_public BOOLEAN DEFAULT true,
          sort_order INTEGER DEFAULT 0,
          stripe_price_id_core VARCHAR(100),
          stripe_price_id_flex VARCHAR(100),
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Subscriptions
        CREATE TABLE IF NOT EXISTS subscriptions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id UUID UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
          plan_id UUID REFERENCES plans(id),
          status VARCHAR(20) DEFAULT 'active',
          core_seats INTEGER DEFAULT 0,
          flex_seats INTEGER DEFAULT 0,
          trial_start TIMESTAMPTZ,
          trial_end TIMESTAMPTZ,
          trial_ends_at TIMESTAMPTZ,
          current_period_start TIMESTAMPTZ,
          current_period_end TIMESTAMPTZ,
          cancel_at_period_end BOOLEAN DEFAULT false,
          canceled_at TIMESTAMPTZ,
          cancellation_reason TEXT,
          stripe_subscription_id VARCHAR(100),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Invoices
        CREATE TABLE IF NOT EXISTS invoices (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
          stripe_invoice_id VARCHAR(100),
          invoice_number VARCHAR(50),
          invoice_date DATE,
          due_date DATE,
          subtotal NUMERIC(12,2),
          tax NUMERIC(12,2),
          total NUMERIC(12,2),
          status VARCHAR(20) DEFAULT 'draft',
          pdf_url TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Billing events
        CREATE TABLE IF NOT EXISTS billing_events (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
          event_type VARCHAR(100) NOT NULL,
          data JSONB,
          actor_type VARCHAR(50),
          actor_id UUID,
          actor_email VARCHAR(255),
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_subscriptions_org ON subscriptions(organization_id);
        CREATE INDEX IF NOT EXISTS idx_invoices_org ON invoices(organization_id);
      `
    },
    {
      filename: '004_learning.sql',
      sql: `
        -- Learning courses
        CREATE TABLE IF NOT EXISTS learning_courses (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          category VARCHAR(100),
          duration_minutes INTEGER,
          thumbnail_url TEXT,
          content_type VARCHAR(50) DEFAULT 'video',
          content_url TEXT,
          is_required BOOLEAN DEFAULT false,
          is_published BOOLEAN DEFAULT true,
          created_by UUID,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Course enrollments
        CREATE TABLE IF NOT EXISTS learning_enrollments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          course_id UUID REFERENCES learning_courses(id) ON DELETE CASCADE,
          employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
          status VARCHAR(20) DEFAULT 'enrolled',
          progress INTEGER DEFAULT 0,
          started_at TIMESTAMPTZ,
          completed_at TIMESTAMPTZ,
          due_date DATE,
          score INTEGER,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(course_id, employee_id)
        );

        CREATE INDEX IF NOT EXISTS idx_courses_org ON learning_courses(organization_id);
        CREATE INDEX IF NOT EXISTS idx_enrollments_employee ON learning_enrollments(employee_id);
      `
    },
    {
      filename: '005_performance.sql',
      sql: `
        -- Performance goals
        CREATE TABLE IF NOT EXISTS performance_goals (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
          employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          category VARCHAR(100),
          level VARCHAR(50) DEFAULT 'individual',
          target_value NUMERIC(12,2),
          current_value NUMERIC(12,2) DEFAULT 0,
          unit VARCHAR(50),
          start_date DATE,
          due_date DATE,
          status VARCHAR(20) DEFAULT 'active',
          progress INTEGER DEFAULT 0,
          created_by UUID,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Performance reviews
        CREATE TABLE IF NOT EXISTS performance_reviews (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
          employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
          reviewer_id UUID REFERENCES employees(id),
          cycle_id UUID,
          type VARCHAR(50) DEFAULT 'annual',
          status VARCHAR(20) DEFAULT 'pending',
          overall_rating INTEGER,
          self_assessment JSONB,
          manager_assessment JSONB,
          feedback TEXT,
          submitted_at TIMESTAMPTZ,
          completed_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Review cycles
        CREATE TABLE IF NOT EXISTS performance_cycles (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          type VARCHAR(50) DEFAULT 'annual',
          start_date DATE NOT NULL,
          end_date DATE NOT NULL,
          self_review_deadline DATE,
          manager_review_deadline DATE,
          status VARCHAR(20) DEFAULT 'active',
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_goals_employee ON performance_goals(employee_id);
        CREATE INDEX IF NOT EXISTS idx_reviews_employee ON performance_reviews(employee_id);
      `
    },
    {
      filename: '006_recognition.sql',
      sql: `
        -- Recognition/kudos
        CREATE TABLE IF NOT EXISTS recognition (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
          from_employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
          to_employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
          category VARCHAR(100),
          value VARCHAR(100),
          message TEXT NOT NULL,
          points INTEGER DEFAULT 0,
          is_public BOOLEAN DEFAULT true,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Recognition reactions
        CREATE TABLE IF NOT EXISTS recognition_reactions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          recognition_id UUID REFERENCES recognition(id) ON DELETE CASCADE,
          employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
          reaction VARCHAR(50) NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(recognition_id, employee_id)
        );

        CREATE INDEX IF NOT EXISTS idx_recognition_to ON recognition(to_employee_id);
        CREATE INDEX IF NOT EXISTS idx_recognition_from ON recognition(from_employee_id);
      `
    },
    {
      filename: '007_payroll.sql',
      sql: `
        -- Payroll runs
        CREATE TABLE IF NOT EXISTS payroll_runs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
          pay_period_start DATE NOT NULL,
          pay_period_end DATE NOT NULL,
          pay_date DATE NOT NULL,
          status VARCHAR(20) DEFAULT 'draft',
          total_gross NUMERIC(12,2) DEFAULT 0,
          total_deductions NUMERIC(12,2) DEFAULT 0,
          total_net NUMERIC(12,2) DEFAULT 0,
          employee_count INTEGER DEFAULT 0,
          approved_by UUID,
          approved_at TIMESTAMPTZ,
          processed_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Payslips
        CREATE TABLE IF NOT EXISTS payslips (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          payroll_run_id UUID REFERENCES payroll_runs(id) ON DELETE CASCADE,
          employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
          gross_pay NUMERIC(12,2) NOT NULL,
          tax NUMERIC(12,2) DEFAULT 0,
          national_insurance NUMERIC(12,2) DEFAULT 0,
          pension NUMERIC(12,2) DEFAULT 0,
          student_loan NUMERIC(12,2) DEFAULT 0,
          other_deductions NUMERIC(12,2) DEFAULT 0,
          net_pay NUMERIC(12,2) NOT NULL,
          hours_worked NUMERIC(8,2),
          overtime_hours NUMERIC(8,2),
          breakdown JSONB DEFAULT '{}',
          status VARCHAR(20) DEFAULT 'pending',
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Tax codes
        CREATE TABLE IF NOT EXISTS employee_tax_info (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          employee_id UUID UNIQUE REFERENCES employees(id) ON DELETE CASCADE,
          tax_code VARCHAR(20) DEFAULT '1257L',
          ni_category VARCHAR(5) DEFAULT 'A',
          student_loan_plan VARCHAR(10),
          pension_contribution NUMERIC(5,2) DEFAULT 5.00,
          pension_type VARCHAR(20) DEFAULT 'percentage',
          bank_account_name VARCHAR(255),
          bank_sort_code VARCHAR(10),
          bank_account_number VARCHAR(20),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_payroll_runs_org ON payroll_runs(organization_id);
        CREATE INDEX IF NOT EXISTS idx_payslips_employee ON payslips(employee_id);
      `
    },
    {
      filename: '008_surveys.sql',
      sql: `
        -- Surveys
        CREATE TABLE IF NOT EXISTS surveys (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          type VARCHAR(50) DEFAULT 'engagement',
          status VARCHAR(20) DEFAULT 'draft',
          is_anonymous BOOLEAN DEFAULT true,
          start_date TIMESTAMPTZ,
          end_date TIMESTAMPTZ,
          questions JSONB DEFAULT '[]',
          created_by UUID,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Survey responses
        CREATE TABLE IF NOT EXISTS survey_responses (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          survey_id UUID REFERENCES surveys(id) ON DELETE CASCADE,
          employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
          answers JSONB NOT NULL,
          submitted_at TIMESTAMPTZ DEFAULT NOW(),
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_surveys_org ON surveys(organization_id);
        CREATE INDEX IF NOT EXISTS idx_survey_responses ON survey_responses(survey_id);
      `
    },
    {
      filename: '009_notifications.sql',
      sql: `
        -- Notifications
        CREATE TABLE IF NOT EXISTS notifications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          organization_id UUID,
          type VARCHAR(100) NOT NULL,
          title VARCHAR(255) NOT NULL,
          message TEXT,
          data JSONB DEFAULT '{}',
          read_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Email queue
        CREATE TABLE IF NOT EXISTS email_queue (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          to_email VARCHAR(255) NOT NULL,
          to_name VARCHAR(255),
          template VARCHAR(100),
          template_data JSONB DEFAULT '{}',
          subject VARCHAR(255),
          body_html TEXT,
          body_text TEXT,
          language VARCHAR(10) DEFAULT 'en',
          status VARCHAR(20) DEFAULT 'pending',
          attempts INTEGER DEFAULT 0,
          last_error TEXT,
          sent_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read_at);
        CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status, created_at);
      `
    },
    {
      filename: '010_skills_careers.sql',
      sql: `
        -- Skills
        CREATE TABLE IF NOT EXISTS skills (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
          name VARCHAR(100) NOT NULL,
          category VARCHAR(100),
          description TEXT,
          is_required BOOLEAN DEFAULT false,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Employee skills
        CREATE TABLE IF NOT EXISTS employee_skills (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
          skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,
          level INTEGER DEFAULT 1,
          verified_at TIMESTAMPTZ,
          verified_by UUID,
          expires_at DATE,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(employee_id, skill_id)
        );

        -- Job postings
        CREATE TABLE IF NOT EXISTS job_postings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          department_id UUID,
          location_id UUID,
          employment_type VARCHAR(50),
          salary_min NUMERIC(12,2),
          salary_max NUMERIC(12,2),
          is_internal BOOLEAN DEFAULT true,
          status VARCHAR(20) DEFAULT 'draft',
          closes_at DATE,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Job applications
        CREATE TABLE IF NOT EXISTS job_applications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          job_posting_id UUID REFERENCES job_postings(id) ON DELETE CASCADE,
          employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
          status VARCHAR(20) DEFAULT 'applied',
          cover_letter TEXT,
          resume_url TEXT,
          applied_at TIMESTAMPTZ DEFAULT NOW(),
          reviewed_at TIMESTAMPTZ,
          UNIQUE(job_posting_id, employee_id)
        );

        CREATE INDEX IF NOT EXISTS idx_skills_org ON skills(organization_id);
        CREATE INDEX IF NOT EXISTS idx_employee_skills ON employee_skills(employee_id);
        CREATE INDEX IF NOT EXISTS idx_job_postings_org ON job_postings(organization_id);
      `
    },
    {
      filename: '011_documents.sql',
      sql: `
        -- Documents
        CREATE TABLE IF NOT EXISTS documents (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
          employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          type VARCHAR(100),
          category VARCHAR(100),
          file_url TEXT NOT NULL,
          file_size INTEGER,
          mime_type VARCHAR(100),
          requires_signature BOOLEAN DEFAULT false,
          signed_at TIMESTAMPTZ,
          expires_at DATE,
          created_by UUID,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_documents_employee ON documents(employee_id);
        CREATE INDEX IF NOT EXISTS idx_documents_org ON documents(organization_id);
      `
    },
    {
      filename: '012_audit_refresh_tokens.sql',
      sql: `
        -- Audit log
        CREATE TABLE IF NOT EXISTS audit_log (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id UUID,
          user_id UUID,
          action VARCHAR(100) NOT NULL,
          entity_type VARCHAR(100),
          entity_id UUID,
          details JSONB,
          ip_address INET,
          user_agent TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Refresh tokens
        CREATE TABLE IF NOT EXISTS refresh_tokens (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          token_hash VARCHAR(255) NOT NULL,
          device_info JSONB,
          expires_at TIMESTAMPTZ NOT NULL,
          revoked_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_audit_log_org ON audit_log(organization_id, created_at);
        CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id, created_at);
        CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
      `
    }
  ];
}

export default router;
