// ============================================================
// OPS ROUTES
// Internal admin API for Uplift operations team
// Version: 2026-01-28-v2
// ============================================================

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../lib/database.js';
import * as billingService from '../services/billing.js';

const router = Router();

// ==================== OPS AUTH MIDDLEWARE ====================

const opsAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.OPS_JWT_SECRET || process.env.JWT_SECRET);
    
    const result = await db.query(
      `SELECT * FROM ops_users WHERE id = $1 AND is_active = true`,
      [decoded.userId]
    );

    if (!result.rows[0]) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.opsUser = result.rows[0];
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

const requireOpsRole = (roles) => (req, res, next) => {
  if (!roles.includes(req.opsUser.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  next();
};

// ==================== OPS AUTH ====================

// Debug route - no auth required
router.get('/ping', (req, res) => {
  res.json({ pong: true, time: new Date().toISOString() });
});

router.post('/auth/login', async (req, res) => {
  console.log('[OPS LOGIN] Request received:', req.body?.email);
  try {
    const { email, password } = req.body;

    const result = await db.query(
      `SELECT * FROM ops_users WHERE email = $1 AND is_active = true`,
      [email.toLowerCase()]
    );

    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    await db.query(
      `UPDATE ops_users SET last_login_at = NOW() WHERE id = $1`,
      [user.id]
    );

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.OPS_JWT_SECRET || process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Ops login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.get('/auth/me', opsAuth, (req, res) => {
  res.json({
    user: {
      id: req.opsUser.id,
      email: req.opsUser.email,
      firstName: req.opsUser.first_name,
      lastName: req.opsUser.last_name,
      role: req.opsUser.role,
    },
  });
});

// Apply auth to all routes below
router.use(opsAuth);

// ==================== DASHBOARD ====================

router.get('/dashboard', async (req, res) => {
  try {
    // Key metrics
    const metrics = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM organizations WHERE status = 'active') as total_customers,
        (SELECT COUNT(*) FROM subscriptions WHERE status = 'active') as active_subscriptions,
        (SELECT COALESCE(SUM(core_seats + flex_seats), 0) FROM subscriptions WHERE status = 'active') as total_seats,
        (SELECT COUNT(*) FROM subscriptions WHERE status = 'trialing') as trials,
        (SELECT COUNT(*) FROM subscriptions WHERE status = 'past_due') as past_due,
        (SELECT COUNT(*) FROM subscriptions WHERE cancel_at_period_end = true) as pending_cancellations
    `);

    // MRR calculation
    const mrrResult = await db.query(`
      SELECT COALESCE(SUM(
        (s.core_seats * bp.core_seat_price_monthly) +
        (COALESCE(s.flex_seats_used, 0) * bp.flex_seat_price_monthly)
      ), 0) as mrr
      FROM subscriptions s
      JOIN billing_plans bp ON s.plan_id = bp.id
      WHERE s.status IN ('active', 'trialing', 'past_due')
    `);

    // Recent activity
    const recentActivity = await db.query(`
      SELECT 
        'subscription_created' as type,
        o.name as org_name,
        s.created_at
      FROM subscriptions s
      JOIN organizations o ON s.organization_id = o.id
      ORDER BY s.created_at DESC
      LIMIT 10
    `);

    // Failed payments
    const failedPayments = await db.query(`
      SELECT 
        o.name as org_name,
        i.total,
        i.currency,
        i.created_at
      FROM invoices i
      JOIN organizations o ON i.organization_id = o.id
      WHERE i.status = 'open' AND i.due_date < NOW()
      ORDER BY i.due_date DESC
      LIMIT 5
    `);

    res.json({
      metrics: {
        ...metrics.rows[0],
        mrr: parseInt(mrrResult.rows[0].mrr) || 0,
      },
      recentActivity: recentActivity.rows,
      failedPayments: failedPayments.rows,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

// ==================== CUSTOMERS ====================

router.get('/customers', async (req, res) => {
  try {
    const { 
      search, 
      status, 
      plan,
      sortBy = 'created_at',
      sortOrder = 'desc',
      limit = 50,
      offset = 0
    } = req.query;

    let query = `
      SELECT
        o.id, o.name, o.slug, o.status, o.created_at,
        s.status as subscription_status,
        s.core_seats, s.flex_seats,
        s.trial_end,
        s.current_period_end,
        s.cancel_at_period_end,
        bp.name as plan_name,
        bp.slug as plan_slug,
        h.overall_score as health_score,
        h.risk_level,
        (SELECT COUNT(*) FROM employees e WHERE e.organization_id = o.id AND e.status = 'active') as active_employees
      FROM organizations o
      LEFT JOIN subscriptions s ON s.organization_id = o.id
      LEFT JOIN billing_plans bp ON s.plan_id = bp.id
      LEFT JOIN customer_health h ON h.organization_id = o.id
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    if (search) {
      query += ` AND (o.name ILIKE $${paramIndex} OR o.slug ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (status) {
      query += ` AND s.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (plan) {
      query += ` AND bp.slug = $${paramIndex}`;
      params.push(plan);
      paramIndex++;
    }

    // Sorting
    const allowedSorts = ['created_at', 'name', 'core_seats', 'health_score'];
    const sortColumn = allowedSorts.includes(sortBy) ? sortBy : 'created_at';
    const order = sortOrder === 'asc' ? 'ASC' : 'DESC';
    query += ` ORDER BY ${sortColumn === 'name' ? 'o.name' : sortColumn} ${order}`;

    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await db.query(query, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(*)
      FROM organizations o
      LEFT JOIN subscriptions s ON s.organization_id = o.id
      LEFT JOIN billing_plans bp ON s.plan_id = bp.id
      WHERE 1=1
    `;
    const countParams = [];
    let countParamIndex = 1;

    if (search) {
      countQuery += ` AND (o.name ILIKE $${countParamIndex} OR o.slug ILIKE $${countParamIndex})`;
      countParams.push(`%${search}%`);
      countParamIndex++;
    }
    if (status) {
      countQuery += ` AND s.status = $${countParamIndex}`;
      countParams.push(status);
    }
    if (plan) {
      countQuery += ` AND bp.slug = $${countParamIndex}`;
      countParams.push(plan);
    }

    const countResult = await db.query(countQuery, countParams);

    res.json({
      customers: result.rows,
      total: parseInt(countResult.rows[0].count),
    });
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

router.get('/customers/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get org details
    const orgResult = await db.query(`
      SELECT o.*,
        s.id as subscription_id, s.status, s.core_seats, s.flex_seats,
        s.flex_seats_used, s.flex_seats_limit, s.trial_start, s.trial_end,
        s.current_period_start, s.current_period_end, s.cancel_at_period_end,
        s.contract_months, s.contract_start_date, s.contract_end_date,
        bp.name as plan_name,
        bp.slug as plan_slug,
        bp.features as plan_features
      FROM organizations o
      LEFT JOIN subscriptions s ON s.organization_id = o.id
      LEFT JOIN billing_plans bp ON s.plan_id = bp.id
      WHERE o.id = $1
    `, [id]);

    if (!orgResult.rows[0]) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    const customer = orgResult.rows[0];

    // Get seat usage
    const usageResult = await db.query(`
      SELECT seat_type, COUNT(*) as count
      FROM employees
      WHERE organization_id = $1 AND status = 'active'
      GROUP BY seat_type
    `, [id]);

    const usage = { core: 0, flex: 0 };
    usageResult.rows.forEach(row => {
      usage[row.seat_type] = parseInt(row.count);
    });

    // Get admins
    const adminsResult = await db.query(`
      SELECT id, email, first_name, last_name, last_login_at
      FROM users
      WHERE organization_id = $1 AND role = 'admin'
    `, [id]);

    // Get recent invoices
    const invoicesResult = await db.query(`
      SELECT id, stripe_invoice_number, total, status, paid_at, created_at
      FROM invoices
      WHERE organization_id = $1
      ORDER BY created_at DESC
      LIMIT 6
    `, [id]);

    // Get notes
    const notesResult = await db.query(`
      SELECT n.*, ou.first_name as author_first_name, ou.last_name as author_last_name
      FROM customer_notes n
      LEFT JOIN ops_users ou ON n.ops_user_id = ou.id
      WHERE n.organization_id = $1
      ORDER BY n.is_pinned DESC, n.created_at DESC
      LIMIT 20
    `, [id]);

    // Get health score
    const healthResult = await db.query(`
      SELECT * FROM customer_health WHERE organization_id = $1
    `, [id]);

    // Get license keys
    const licensesResult = await db.query(`
      SELECT * FROM license_keys
      WHERE organization_id = $1
      ORDER BY created_at DESC
      LIMIT 5
    `, [id]);

    res.json({
      customer,
      usage,
      admins: adminsResult.rows,
      invoices: invoicesResult.rows,
      notes: notesResult.rows,
      health: healthResult.rows[0] || null,
      licenses: licensesResult.rows,
    });
  } catch (error) {
    console.error('Get customer detail error:', error);
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
});

// ==================== CUSTOMER ACTIONS ====================

router.post('/customers/:id/notes', async (req, res) => {
  try {
    const { id } = req.params;
    const { note, noteType = 'general' } = req.body;

    const result = await db.query(`
      INSERT INTO customer_notes (organization_id, ops_user_id, note, note_type)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [id, req.opsUser.id, note, noteType]);

    await logOpsActivity(req.opsUser.id, 'note_added', 'organization', id, { noteType });

    res.json({ note: result.rows[0] });
  } catch (error) {
    console.error('Add note error:', error);
    res.status(500).json({ error: 'Failed to add note' });
  }
});

router.post('/customers/:id/seats', requireOpsRole(['admin', 'support']), async (req, res) => {
  try {
    const { id } = req.params;
    const { coreSeats, flexSeats, reason } = req.body;

    // This would normally call the billing service
    // For now, just update directly
    await db.query(`
      UPDATE subscriptions
      SET core_seats = COALESCE($1, core_seats),
          flex_seats = COALESCE($2, flex_seats),
          updated_at = NOW()
      WHERE organization_id = $3
    `, [coreSeats, flexSeats, id]);

    await logOpsActivity(req.opsUser.id, 'seats_modified', 'organization', id, {
      coreSeats, flexSeats, reason
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Update seats error:', error);
    res.status(500).json({ error: 'Failed to update seats' });
  }
});

router.post('/customers/:id/extend-trial', async (req, res) => {
  try {
    const { id } = req.params;
    const { days, trialEndDate, reason } = req.body;

    let result;
    if (trialEndDate) {
      // Use specific date
      result = await db.query(`
        UPDATE subscriptions
        SET trial_end = $1,
            current_period_end = $1,
            updated_at = NOW()
        WHERE organization_id = $2 AND status = 'trialing'
        RETURNING trial_end
      `, [trialEndDate, id]);
    } else {
      // Use days increment
      result = await db.query(`
        UPDATE subscriptions
        SET trial_end = trial_end + INTERVAL '1 day' * $1,
            current_period_end = trial_end + INTERVAL '1 day' * $1,
            updated_at = NOW()
        WHERE organization_id = $2 AND status = 'trialing'
        RETURNING trial_end
      `, [days || 14, id]);
    }

    if (!result.rows[0]) {
      return res.status(400).json({ error: 'No active trial found' });
    }

    await logOpsActivity(req.opsUser.id, 'trial_extended', 'organization', id, {
      days, trialEndDate, reason, newEndDate: result.rows[0].trial_end
    });

    res.json({ success: true, trialEnd: result.rows[0].trial_end });
  } catch (error) {
    console.error('Extend trial error:', error);
    res.status(500).json({ error: 'Failed to extend trial' });
  }
});

// Cancel subscription
router.post('/customers/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    const { reasonCategory, reasonDetail, effectiveType } = req.body;

    const immediate = effectiveType === 'immediate';

    // Get current subscription info
    const subResult = await db.query(`
      SELECT s.*, o.name as org_name
      FROM subscriptions s
      JOIN organizations o ON s.organization_id = o.id
      WHERE s.organization_id = $1
    `, [id]);

    if (!subResult.rows[0]) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    const sub = subResult.rows[0];

    // Update subscription
    const result = await db.query(`
      UPDATE subscriptions SET
        status = $1,
        cancel_at_period_end = $2,
        canceled_at = NOW(),
        updated_at = NOW()
      WHERE organization_id = $3
      RETURNING *
    `, [
      immediate ? 'canceled' : sub.status,
      !immediate,
      id
    ]);

    // Log cancellation details
    await db.query(`
      INSERT INTO subscription_cancellations (
        subscription_id, organization_id, reason_category, reason_detail,
        effective_type, effective_date, users_affected, mrr_lost, cancelled_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      sub.id, id, reasonCategory, reasonDetail,
      effectiveType, immediate ? new Date() : sub.current_period_end,
      sub.core_seats + sub.flex_seats,
      (sub.core_seats * 1000) + (sub.flex_seats * 1200), // Approximate MRR
      req.opsUser.id
    ]);

    await logOpsActivity(req.opsUser.id, 'subscription_cancelled', 'organization', id, {
      reasonCategory, reasonDetail, immediate, orgName: sub.org_name
    });

    res.json({ success: true, subscription: result.rows[0] });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

router.post('/customers/:id/credit', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, reason } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount required' });
    }

    if (!reason) {
      return res.status(400).json({ error: 'Reason required' });
    }

    // Create credit record in database
    const result = await db.query(`
      INSERT INTO customer_credits (organization_id, amount, reason, status, created_by)
      VALUES ($1, $2, $3, 'pending', $4)
      RETURNING *
    `, [id, amount, reason, req.opsUser.id]);

    await logOpsActivity(req.opsUser.id, 'credit_applied', 'organization', id, {
      amount, reason, creditId: result.rows[0].id
    });

    res.json({ success: true, credit: result.rows[0] });
  } catch (error) {
    console.error('Apply credit error:', error);
    res.status(500).json({ error: 'Failed to apply credit' });
  }
});

// ==================== BILLING OVERVIEW ====================

router.get('/billing/overview', async (req, res) => {
  try {
    // MRR by plan
    const mrrByPlan = await db.query(`
      SELECT
        bp.name as plan_name,
        bp.slug as plan_slug,
        bp.core_seat_price_monthly as core_price,
        COUNT(s.id) as customer_count,
        COALESCE(SUM(s.core_seats), 0) as total_core_seats,
        COALESCE(SUM(COALESCE(s.flex_seats_used, 0)), 0) as total_flex_seats,
        COALESCE(SUM(
          (s.core_seats * bp.core_seat_price_monthly) +
          (COALESCE(s.flex_seats_used, 0) * bp.flex_seat_price_monthly)
        ), 0) as mrr
      FROM subscriptions s
      JOIN billing_plans bp ON s.plan_id = bp.id
      WHERE s.status IN ('active', 'trialing')
      GROUP BY bp.id, bp.name, bp.slug, bp.core_seat_price_monthly
      ORDER BY mrr DESC
    `);

    // Recent seat changes
    const recentChanges = await db.query(`
      SELECT
        sc.*,
        o.name as org_name
      FROM seat_changes sc
      JOIN organizations o ON sc.organization_id = o.id
      ORDER BY sc.created_at DESC
      LIMIT 20
    `);

    // Upcoming renewals
    const upcomingRenewals = await db.query(`
      SELECT
        o.name as org_name,
        s.core_seats,
        COALESCE(s.flex_seats_used, 0) as flex_seats,
        s.current_period_end,
        bp.name as plan_name,
        (s.core_seats * bp.core_seat_price_monthly) +
        (COALESCE(s.flex_seats_used, 0) * bp.flex_seat_price_monthly) as amount
      FROM subscriptions s
      JOIN organizations o ON s.organization_id = o.id
      JOIN billing_plans bp ON s.plan_id = bp.id
      WHERE s.status = 'active'
        AND s.current_period_end BETWEEN NOW() AND NOW() + INTERVAL '7 days'
      ORDER BY s.current_period_end
    `);

    // Failed payments
    const failedPayments = await db.query(`
      SELECT 
        o.id as org_id,
        o.name as org_name,
        i.total,
        i.currency,
        i.due_date,
        i.stripe_hosted_invoice_url
      FROM invoices i
      JOIN organizations o ON i.organization_id = o.id
      WHERE i.status = 'open' AND i.amount_due > 0
      ORDER BY i.due_date
    `);

    res.json({
      mrrByPlan: mrrByPlan.rows,
      recentChanges: recentChanges.rows,
      upcomingRenewals: upcomingRenewals.rows,
      failedPayments: failedPayments.rows,
    });
  } catch (error) {
    console.error('Billing overview error:', error);
    res.status(500).json({ error: 'Failed to load billing overview' });
  }
});

// ==================== RETRY PAYMENT ====================

router.post('/billing/retry-payment', requireOpsRole(['admin', 'finance']), async (req, res) => {
  try {
    const { invoiceId } = req.body;

    const invoiceResult = await db.query(
      `SELECT stripe_invoice_id, organization_id FROM invoices WHERE id = $1`,
      [invoiceId]
    );

    if (!invoiceResult.rows[0]?.stripe_invoice_id) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    await billingService.stripe.invoices.pay(invoiceResult.rows[0].stripe_invoice_id);

    await db.query(
      `UPDATE invoices SET status = 'paid', paid_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [invoiceId]
    );

    await logOpsActivity(req.opsUser.id, 'payment_retried', 'invoice', invoiceId, {
      organizationId: invoiceResult.rows[0].organization_id,
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Retry payment error:', error);
    res.status(400).json({ error: error.message || 'Failed to retry payment' });
  }
});

// ==================== INVOICES ====================

router.get('/invoices', async (req, res) => {
  try {
    const { status, search, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT 
        i.*,
        o.name as org_name
      FROM invoices i
      JOIN organizations o ON i.organization_id = o.id
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    if (status) {
      query += ` AND i.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (search) {
      query += ` AND (o.name ILIKE $${paramIndex} OR i.stripe_invoice_number ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += ` ORDER BY i.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await db.query(query, params);

    res.json({ invoices: result.rows });
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

// ==================== ACTIVITY LOG ====================

router.get('/activity', async (req, res) => {
  try {
    const { limit = 100 } = req.query;

    const result = await db.query(`
      SELECT 
        a.*,
        ou.first_name, ou.last_name, ou.email
      FROM ops_activity_log a
      LEFT JOIN ops_users ou ON a.ops_user_id = ou.id
      ORDER BY a.created_at DESC
      LIMIT $1
    `, [parseInt(limit)]);

    res.json({ activity: result.rows });
  } catch (error) {
    console.error('Get activity error:', error);
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

// ==================== FEATURE FLAGS ====================

router.get('/features/:orgId', async (req, res) => {
  try {
    const { orgId } = req.params;

    // Get plan features for this org
    const planResult = await db.query(`
      SELECT bp.features
      FROM subscriptions s
      JOIN billing_plans bp ON s.plan_id = bp.id
      WHERE s.organization_id = $1
    `, [orgId]);

    const planFeatures = planResult.rows[0]?.features || {};

    // Get overrides
    const overridesResult = await db.query(`
      SELECT feature_key, enabled FROM feature_overrides
      WHERE organization_id = $1
      ORDER BY feature_key
    `, [orgId]);

    const overrides = {};
    overridesResult.rows.forEach(row => {
      overrides[row.feature_key] = row.enabled;
    });

    res.json({ planFeatures, overrides });
  } catch (error) {
    console.error('Get features error:', error);
    res.status(500).json({ error: 'Failed to fetch features' });
  }
});

router.post('/features/:orgId', async (req, res) => {
  try {
    const { orgId } = req.params;
    const { featureKey, enabled, reason, expiresAt } = req.body;

    const result = await db.query(`
      INSERT INTO feature_overrides (organization_id, feature_key, enabled, reason, expires_at, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (organization_id, feature_key) DO UPDATE SET
        enabled = EXCLUDED.enabled,
        reason = EXCLUDED.reason,
        expires_at = EXCLUDED.expires_at,
        created_by = EXCLUDED.created_by
      RETURNING *
    `, [orgId, featureKey, enabled, reason, expiresAt, req.opsUser.id]);

    await logOpsActivity(req.opsUser.id, 'feature_toggled', 'organization', orgId, {
      featureKey, enabled, reason
    });

    res.json({ feature: result.rows[0] });
  } catch (error) {
    console.error('Toggle feature error:', error);
    res.status(500).json({ error: 'Failed to toggle feature' });
  }
});

// Reset all feature overrides for an org
router.delete('/features/:orgId', async (req, res) => {
  try {
    const { orgId } = req.params;

    await db.query(`DELETE FROM feature_overrides WHERE organization_id = $1`, [orgId]);

    await logOpsActivity(req.opsUser.id, 'features_reset', 'organization', orgId, {});

    res.json({ success: true });
  } catch (error) {
    console.error('Reset features error:', error);
    res.status(500).json({ error: 'Failed to reset features' });
  }
});

// ==================== IMPERSONATION ====================

router.post('/impersonate/:orgId', requireOpsRole(['admin']), async (req, res) => {
  try {
    const { orgId } = req.params;

    // Get an admin user from the org
    const userResult = await db.query(`
      SELECT id, email, organization_id
      FROM users
      WHERE organization_id = $1 AND role = 'admin'
      LIMIT 1
    `, [orgId]);

    if (!userResult.rows[0]) {
      return res.status(404).json({ error: 'No admin user found' });
    }

    // Generate a short-lived token for impersonation
    const token = jwt.sign(
      {
        userId: userResult.rows[0].id,
        organizationId: orgId,
        impersonatedBy: req.opsUser.id,
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    await logOpsActivity(req.opsUser.id, 'impersonation_started', 'organization', orgId, {
      targetUser: userResult.rows[0].email
    });

    res.json({
      token,
      portalUrl: `${process.env.PORTAL_URL}?impersonate=${token}`,
    });
  } catch (error) {
    console.error('Impersonation error:', error);
    res.status(500).json({ error: 'Failed to start impersonation' });
  }
});

// ==================== HELPER FUNCTIONS ====================

async function logOpsActivity(opsUserId, action, entityType, entityId, details = {}) {
  await db.query(`
    INSERT INTO ops_activity_log (ops_user_id, action, entity_type, entity_id, details)
    VALUES ($1, $2, $3, $4, $5)
  `, [opsUserId, action, entityType, entityId, JSON.stringify(details)]);
}

// ==================== FX RATES ====================

// Cache FX rates for 1 hour
let fxCache = { rates: {}, fetchedAt: 0 };

router.get('/fx-rates', async (req, res) => {
  try {
    const ONE_HOUR = 60 * 60 * 1000;
    if (Date.now() - fxCache.fetchedAt < ONE_HOUR && Object.keys(fxCache.rates).length > 0) {
      return res.json({ rates: fxCache.rates, base: 'GBP', cached: true });
    }

    // Try fetching from exchangerate-api (free tier: 1500 reqs/mo)
    const response = await fetch('https://open.er-api.com/v6/latest/GBP');
    if (response.ok) {
      const data = await response.json();
      fxCache = { rates: data.rates || {}, fetchedAt: Date.now() };
      return res.json({ rates: fxCache.rates, base: 'GBP' });
    }

    // Fallback: hardcoded approximate rates (GBP base)
    const fallbackRates = {
      GBP: 1, USD: 1.27, EUR: 1.17, CAD: 1.72, AUD: 1.95, JPY: 190,
      CHF: 1.12, SEK: 13.2, NOK: 13.5, DKK: 8.7, SGD: 1.71, NZD: 2.12,
      BRL: 6.2, INR: 106, ZAR: 23.1, MXN: 21.8, AED: 4.66, PLN: 5.12,
      RON: 5.82,
    };
    res.json({ rates: fallbackRates, base: 'GBP', fallback: true });
  } catch (error) {
    console.error('FX rates error:', error);
    res.json({ rates: { GBP: 1, USD: 1.27, EUR: 1.17 }, base: 'GBP', fallback: true });
  }
});

// ==================== ONBOARDING (ops-accessible) ====================

// Get plans (for onboarding wizard)
router.get('/plans', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM billing_plans WHERE is_active = true ORDER BY display_order, name');
    res.json({ plans: result.rows });
  } catch (error) {
    console.error('Get plans error:', error);
    res.status(500).json({ error: 'Failed to get plans' });
  }
});

// Create organization (for onboarding wizard)
router.post('/onboard/organization', async (req, res) => {
  try {
    const {
      name, tradingName, companyNumber, industry,
      primaryContactName, primaryContactEmail,
      addressLine1, addressLine2, city, postalCode, country
    } = req.body;

    if (!name) return res.status(400).json({ error: 'Name required' });

    // Generate slug from name
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const result = await db.query(`
      INSERT INTO organizations (
        name, slug, trading_name, company_number, industry,
        primary_contact_name, primary_contact_email,
        address_line1, address_line2, city, postal_code, country,
        status, onboarded_by, onboarded_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'active', $13, NOW())
      RETURNING *
    `, [
      name, slug, tradingName, companyNumber, industry,
      primaryContactName, primaryContactEmail,
      addressLine1, addressLine2, city, postalCode, country || 'United Kingdom',
      req.opsUser.id
    ]);

    await logOpsActivity(req.opsUser.id, 'organization_created', 'organization', result.rows[0].id, { name });

    res.json({ organization: result.rows[0] });
  } catch (error) {
    console.error('Create org error:', error);
    res.status(500).json({ error: 'Failed to create organization' });
  }
});

// Create subscription for org (for onboarding wizard)
router.post('/onboard/subscription', async (req, res) => {
  try {
    const {
      organizationId, planType, coreSeats, flexSeatsLimit,
      contractMonths, startDate, trialEnabled, trialDays,
      setupFee, setupFeeCredited
    } = req.body;

    // Find plan by slug/type
    const plan = await db.query('SELECT * FROM billing_plans WHERE slug = $1', [planType || 'growth']);
    if (!plan.rows[0]) return res.status(404).json({ error: 'Plan not found' });

    const now = new Date();
    const trialEnd = trialEnabled ? new Date(now.getTime() + (trialDays || 30) * 86400000) : null;
    const contractStart = startDate ? new Date(startDate) : now;
    const contractEnd = new Date(contractStart);
    contractEnd.setMonth(contractEnd.getMonth() + (contractMonths || 12));

    // Create a placeholder Stripe customer ID (would normally create in Stripe)
    const stripeCustomerId = `cus_ops_${Date.now()}`;

    const result = await db.query(`
      INSERT INTO subscriptions (
        organization_id, plan_id, stripe_customer_id,
        status, core_seats, flex_seats, flex_seats_limit,
        contract_months, contract_start_date, contract_end_date,
        trial_start, trial_end, setup_fee, setup_fee_credited,
        current_period_start, current_period_end
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `, [
      organizationId, plan.rows[0].id, stripeCustomerId,
      trialEnabled ? 'trialing' : 'active',
      coreSeats || 50, 0, flexSeatsLimit || Math.floor((coreSeats || 50) * 0.5),
      contractMonths || 12, contractStart, contractEnd,
      trialEnabled ? now : null, trialEnd,
      setupFee || 0, setupFeeCredited || false,
      contractStart, trialEnd || contractEnd
    ]);

    await logOpsActivity(req.opsUser.id, 'subscription_created', 'subscription', result.rows[0].id, {
      organizationId, planType, coreSeats
    });

    res.json({ subscription: result.rows[0] });
  } catch (error) {
    console.error('Create subscription error:', error);
    res.status(500).json({ error: 'Failed to create subscription' });
  }
});

// Create location for org (for onboarding wizard)
router.post('/onboard/location', async (req, res) => {
  try {
    const { organizationId, name, city, country, timezone, headcount, isPrimary } = req.body;

    // If this is primary, unset other primaries
    if (isPrimary) {
      await db.query(`
        UPDATE organization_locations SET is_primary = false WHERE organization_id = $1
      `, [organizationId]);
    }

    const result = await db.query(`
      INSERT INTO organization_locations (organization_id, name, city, country, timezone, headcount, is_primary)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [organizationId, name, city, country || 'United Kingdom', timezone || 'Europe/London', headcount || 0, isPrimary || false]);

    res.json({ location: result.rows[0] });
  } catch (error) {
    console.error('Create location error:', error);
    res.status(500).json({ error: 'Failed to create location' });
  }
});

// Create admin user for org (for onboarding wizard)
router.post('/onboard/user', async (req, res) => {
  try {
    const { organizationId, email, firstName, lastName, password, role, sendWelcomeEmail } = req.body;
    if (!organizationId || !email || !password) return res.status(400).json({ error: 'Missing required fields' });

    const hash = await bcrypt.hash(password, 10);

    const result = await db.query(`
      INSERT INTO users (organization_id, email, password_hash, first_name, last_name, role, status, email_verified)
      VALUES ($1, $2, $3, $4, $5, $6, 'active', true)
      RETURNING id, email, first_name, last_name, role
    `, [organizationId, email.toLowerCase(), hash, firstName, lastName, role || 'admin']);

    await logOpsActivity(req.opsUser.id, 'user_created', 'user', result.rows[0].id, {
      organizationId, email, role: role || 'admin'
    });

    // TODO: Send welcome email if sendWelcomeEmail is true

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Create user error:', error);
    if (error.constraint === 'users_email_key') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// ==================== MANAGE (ops-accessible admin actions) ====================

// Edit organization
router.patch('/manage/organizations/:id', async (req, res) => {
  try {
    const { name, billingEmail, taxId } = req.body;
    const result = await db.query(`
      UPDATE organizations SET
        name = COALESCE($1, name),
        billing_email = COALESCE($2, billing_email),
        tax_id = COALESCE($3, tax_id),
        updated_at = NOW()
      WHERE id = $4 RETURNING *
    `, [name, billingEmail, taxId, req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Organization not found' });
    res.json({ organization: result.rows[0] });
  } catch (error) {
    console.error('Update org error:', error);
    res.status(500).json({ error: 'Failed to update organization' });
  }
});

// Change plan / create subscription
router.post('/manage/organizations/:id/subscription', async (req, res) => {
  try {
    const { planSlug } = req.body;
    const plan = await db.query('SELECT * FROM plans WHERE slug = $1', [planSlug]);
    if (!plan.rows[0]) return res.status(404).json({ error: 'Plan not found' });

    // Upsert subscription
    const result = await db.query(`
      INSERT INTO subscriptions (organization_id, plan_id, status)
      VALUES ($1, $2, 'active')
      ON CONFLICT (organization_id) DO UPDATE SET
        plan_id = $2, status = 'active', updated_at = NOW()
      RETURNING *
    `, [req.params.id, plan.rows[0].id]);

    res.json({ subscription: result.rows[0] });
  } catch (error) {
    console.error('Change plan error:', error);
    res.status(500).json({ error: 'Failed to change plan' });
  }
});

// Cancel subscription
router.post('/manage/organizations/:id/subscription/cancel', async (req, res) => {
  try {
    const { immediate, reason } = req.body;
    const status = immediate ? 'canceled' : 'pending_cancel';
    const result = await db.query(`
      UPDATE subscriptions SET status = $1, canceled_at = NOW(), cancel_reason = $2, updated_at = NOW()
      WHERE organization_id = $3 RETURNING *
    `, [status, reason || null, req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Subscription not found' });
    res.json({ subscription: result.rows[0] });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

export default router;
