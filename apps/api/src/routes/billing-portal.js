// ============================================================
// BILLING PORTAL ROUTES
// Customer self-serve billing management API endpoints
// Uses real billing service - NO MOCK DATA
// ============================================================

import { Router } from 'express';
import { db } from '../lib/database.js';
import { authMiddleware } from '../middleware/index.js';
import * as billingService from '../services/billing.js';

const router = Router();

// GET /api/billing/overview - Get billing overview
router.get('/overview', authMiddleware, async (req, res) => {
  try {
    const organizationId = req.user.organization_id || req.user.organizationId;

    // Get organization details
    const orgResult = await db.query(
      `SELECT id, name, billing_email, email FROM organizations WHERE id = $1`,
      [organizationId]
    );

    if (orgResult.rows.length === 0) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const org = orgResult.rows[0];

    // Get real subscription from database
    const subscription = await billingService.getSubscription(organizationId);

    // Get seat usage
    const seatUsage = await billingService.getSeatUsage(organizationId);

    // Get payment methods from database
    const paymentMethods = await billingService.getPaymentMethods(organizationId);
    const defaultPayment = paymentMethods.find(pm => pm.is_default) || paymentMethods[0];

    // Get real invoices from database
    const invoices = await billingService.getInvoices(organizationId, 5);

    // Build response with real data
    const billingData = {
      organization: {
        id: org.id,
        name: org.name,
        billingEmail: org.billing_email || org.email
      },
      subscription: subscription ? {
        plan: subscription.plan_name || subscription.plan_slug || 'No plan',
        planSlug: subscription.plan_slug,
        status: subscription.status || 'inactive',
        billingPeriod: 'monthly',
        currentPeriodStart: subscription.current_period_start,
        currentPeriodEnd: subscription.current_period_end,
        cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
        trialEnd: subscription.trial_end,
        seats: {
          coreUsed: parseInt(seatUsage.core_used) || 0,
          corePurchased: parseInt(seatUsage.core_purchased) || 0,
          flexUsed: parseInt(seatUsage.flex_used) || 0,
          flexPurchased: parseInt(seatUsage.flex_purchased) || 0,
          totalActive: parseInt(seatUsage.total_active) || 0
        },
        corePricePerSeat: subscription.core_price_per_seat || 0,
        flexPricePerSeat: subscription.flex_price_per_seat || 0
      } : null,
      paymentMethod: defaultPayment ? {
        type: defaultPayment.type || 'card',
        brand: defaultPayment.card_brand,
        last4: defaultPayment.card_last4,
        expiryMonth: defaultPayment.card_exp_month,
        expiryYear: defaultPayment.card_exp_year
      } : null,
      invoices: invoices.map(inv => ({
        id: inv.id,
        number: inv.number,
        date: inv.invoice_date,
        dueDate: inv.due_date,
        amount: parseFloat(inv.total) / 100, // Convert from cents
        currency: inv.currency || 'GBP',
        status: inv.status,
        pdfUrl: inv.invoice_pdf_url,
        hostedUrl: inv.hosted_invoice_url
      })),
      nextInvoice: subscription?.current_period_end ? {
        date: subscription.current_period_end,
        estimatedAmount: (
          (parseInt(seatUsage.core_purchased) || 0) * (subscription.core_price_per_seat || 0) +
          (parseInt(seatUsage.flex_purchased) || 0) * (subscription.flex_price_per_seat || 0)
        )
      } : null
    };

    res.json(billingData);
  } catch (error) {
    console.error('Get billing overview error:', error);
    res.status(500).json({ error: 'Failed to get billing overview' });
  }
});

// GET /api/billing/plans - Get available plans from database
router.get('/plans', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT id, slug, name, description,
             core_price_per_seat, flex_price_per_seat,
             min_seats, max_seats, features, is_active
      FROM billing_plans
      WHERE is_active = true
      ORDER BY core_price_per_seat ASC
    `);

    const plans = result.rows.map(plan => ({
      id: plan.slug,
      name: plan.name,
      description: plan.description,
      monthlyPrice: plan.core_price_per_seat,
      flexPrice: plan.flex_price_per_seat,
      features: plan.features || [],
      limits: {
        minSeats: plan.min_seats,
        maxSeats: plan.max_seats
      }
    }));

    // If no plans in database, return default structure
    if (plans.length === 0) {
      return res.json({
        plans: [],
        message: 'No billing plans configured. Contact support.'
      });
    }

    res.json({ plans });
  } catch (error) {
    console.error('Get plans error:', error);
    res.status(500).json({ error: 'Failed to get plans' });
  }
});

// POST /api/billing/portal-session - Create Stripe billing portal session
router.post('/portal-session', authMiddleware, async (req, res) => {
  try {
    const organizationId = req.user.organization_id || req.user.organizationId;
    const { returnUrl } = req.body;

    const defaultReturnUrl = `${process.env.APP_URL || 'https://app.uplifthq.co.uk'}/settings/billing`;

    const session = await billingService.createBillingPortalSession(
      organizationId,
      returnUrl || defaultReturnUrl
    );

    res.json({ url: session.url });
  } catch (error) {
    console.error('Create portal session error:', error);

    if (error.message?.includes('Stripe not configured')) {
      return res.status(503).json({
        error: 'Billing portal not available. Please contact support.',
        code: 'STRIPE_NOT_CONFIGURED'
      });
    }

    if (error.message?.includes('No Stripe customer')) {
      return res.status(400).json({
        error: 'No billing account found. Please contact support to set up billing.',
        code: 'NO_BILLING_ACCOUNT'
      });
    }

    res.status(500).json({ error: 'Failed to create billing portal session' });
  }
});

// POST /api/billing/change-plan - Change subscription plan
router.post('/change-plan', authMiddleware, async (req, res) => {
  try {
    const organizationId = req.user.organization_id || req.user.organizationId;
    const { role } = req.user;
    const { planId } = req.body;

    if (role !== 'admin' && role !== 'owner') {
      return res.status(403).json({ error: 'Only admins can change plans' });
    }

    if (!planId) {
      return res.status(400).json({ error: 'planId is required' });
    }

    const result = await billingService.changePlan(organizationId, planId);

    res.json({
      success: true,
      previousPlan: result.previousPlan,
      newPlan: result.newPlan,
      message: `Plan changed from ${result.previousPlan} to ${result.newPlan}`
    });
  } catch (error) {
    console.error('Change plan error:', error);

    if (error.message?.includes('Stripe not configured')) {
      return res.status(503).json({ error: 'Billing not available. Contact support.' });
    }

    res.status(500).json({ error: error.message || 'Failed to change plan' });
  }
});

// POST /api/billing/seats - Update seat count
router.post('/seats', authMiddleware, async (req, res) => {
  try {
    const organizationId = req.user.organization_id || req.user.organizationId;
    const { role } = req.user;
    const { coreSeats, flexSeats } = req.body;

    if (role !== 'admin' && role !== 'owner') {
      return res.status(403).json({ error: 'Only admins can update seats' });
    }

    const results = {};

    if (coreSeats !== undefined) {
      if (coreSeats < 1) {
        return res.status(400).json({ error: 'Core seats must be at least 1' });
      }
      results.coreSeats = await billingService.updateCoreSeats(organizationId, coreSeats);
    }

    if (flexSeats !== undefined) {
      if (flexSeats < 0) {
        return res.status(400).json({ error: 'Flex seats cannot be negative' });
      }
      results.flexSeats = await billingService.updateFlexSeats(organizationId, flexSeats);
    }

    res.json({
      success: true,
      ...results,
      message: 'Seat count updated successfully'
    });
  } catch (error) {
    console.error('Update seats error:', error);

    if (error.message?.includes('Stripe not configured')) {
      return res.status(503).json({ error: 'Billing not available. Contact support.' });
    }

    res.status(500).json({ error: error.message || 'Failed to update seats' });
  }
});

// POST /api/billing/cancel - Cancel subscription
router.post('/cancel', authMiddleware, async (req, res) => {
  try {
    const organizationId = req.user.organization_id || req.user.organizationId;
    const { role } = req.user;
    const { reason, feedback, immediate = false } = req.body;

    if (role !== 'admin' && role !== 'owner') {
      return res.status(403).json({ error: 'Only admins can cancel subscriptions' });
    }

    const subscription = await billingService.cancelSubscription(
      organizationId,
      immediate,
      reason || feedback
    );

    res.json({
      success: true,
      status: subscription.status,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      message: immediate
        ? 'Subscription cancelled immediately'
        : 'Subscription will be cancelled at the end of the billing period'
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);

    if (error.message?.includes('No active subscription')) {
      return res.status(400).json({ error: 'No active subscription to cancel' });
    }

    res.status(500).json({ error: error.message || 'Failed to cancel subscription' });
  }
});

// POST /api/billing/reactivate - Reactivate cancelled subscription
router.post('/reactivate', authMiddleware, async (req, res) => {
  try {
    const organizationId = req.user.organization_id || req.user.organizationId;
    const { role } = req.user;

    if (role !== 'admin' && role !== 'owner') {
      return res.status(403).json({ error: 'Only admins can reactivate subscriptions' });
    }

    // Get subscription
    const sub = await billingService.getSubscription(organizationId);

    if (!sub?.stripe_subscription_id) {
      return res.status(400).json({ error: 'No subscription found to reactivate' });
    }

    // Reactivate via Stripe - remove cancel_at_period_end
    if (billingService.stripe) {
      await billingService.stripe.subscriptions.update(sub.stripe_subscription_id, {
        cancel_at_period_end: false
      });
    }

    // Update local database
    await db.query(`
      UPDATE subscriptions
      SET cancel_at_period_end = false, cancellation_reason = null, updated_at = NOW()
      WHERE organization_id = $1
    `, [organizationId]);

    res.json({
      success: true,
      message: 'Subscription reactivated successfully'
    });
  } catch (error) {
    console.error('Reactivate subscription error:', error);
    res.status(500).json({ error: error.message || 'Failed to reactivate subscription' });
  }
});

// GET /api/billing/invoices - Get invoice history
router.get('/invoices', authMiddleware, async (req, res) => {
  try {
    const organizationId = req.user.organization_id || req.user.organizationId;
    const limit = Math.min(parseInt(req.query.limit) || 12, 100);

    const invoices = await billingService.getInvoices(organizationId, limit);

    res.json({
      invoices: invoices.map(inv => ({
        id: inv.id,
        stripeId: inv.stripe_invoice_id,
        number: inv.number,
        date: inv.invoice_date,
        dueDate: inv.due_date,
        paidAt: inv.paid_at,
        amount: parseFloat(inv.total) / 100, // Convert from cents
        amountPaid: parseFloat(inv.amount_paid) / 100,
        amountDue: parseFloat(inv.amount_due) / 100,
        currency: inv.currency || 'GBP',
        status: inv.status,
        pdfUrl: inv.invoice_pdf_url,
        hostedUrl: inv.hosted_invoice_url
      }))
    });
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({ error: 'Failed to get invoices' });
  }
});

// GET /api/billing/subscription - Get current subscription details
router.get('/subscription', authMiddleware, async (req, res) => {
  try {
    const organizationId = req.user.organization_id || req.user.organizationId;

    const subscription = await billingService.getSubscription(organizationId);
    const seatUsage = await billingService.getSeatUsage(organizationId);

    if (!subscription) {
      return res.json({ subscription: null, message: 'No active subscription' });
    }

    res.json({
      subscription: {
        id: subscription.id,
        stripeId: subscription.stripe_subscription_id,
        plan: subscription.plan_name || subscription.plan_slug,
        planSlug: subscription.plan_slug,
        status: subscription.status,
        coreSeats: subscription.core_seats,
        flexSeats: subscription.flex_seats,
        currentPeriodStart: subscription.current_period_start,
        currentPeriodEnd: subscription.current_period_end,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        trialStart: subscription.trial_start,
        trialEnd: subscription.trial_end
      },
      usage: {
        coreUsed: parseInt(seatUsage.core_used) || 0,
        corePurchased: parseInt(seatUsage.core_purchased) || 0,
        flexUsed: parseInt(seatUsage.flex_used) || 0,
        flexPurchased: parseInt(seatUsage.flex_purchased) || 0,
        totalActive: parseInt(seatUsage.total_active) || 0
      }
    });
  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({ error: 'Failed to get subscription' });
  }
});

// PUT /api/billing/payment-method - Update payment method (redirect to Stripe portal)
router.put('/payment-method', authMiddleware, async (req, res) => {
  try {
    const organizationId = req.user.organization_id || req.user.organizationId;
    const { role } = req.user;

    if (role !== 'admin' && role !== 'owner') {
      return res.status(403).json({ error: 'Only admins can update payment methods' });
    }

    // Create billing portal session for payment method update
    const returnUrl = `${process.env.APP_URL || 'https://app.uplifthq.co.uk'}/settings/billing`;

    const session = await billingService.createBillingPortalSession(organizationId, returnUrl);

    res.json({
      url: session.url,
      message: 'Redirect to Stripe to update payment method'
    });
  } catch (error) {
    console.error('Update payment method error:', error);

    if (error.message?.includes('Stripe not configured')) {
      return res.status(503).json({
        error: 'Payment method updates not available. Contact support.',
        code: 'STRIPE_NOT_CONFIGURED'
      });
    }

    res.status(500).json({ error: 'Failed to update payment method' });
  }
});

export default router;
