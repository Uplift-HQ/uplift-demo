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

export default router;
