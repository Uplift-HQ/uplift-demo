// ============================================================
// BILLING API ROUTES
// Subscription management, seat updates, invoices
// ============================================================

import { Router } from 'express';
import Stripe from 'stripe';
import { db } from '../lib/database.js';
import { authMiddleware, requireRole } from '../middleware/index.js';
import * as billingService from '../services/billing.js';

const router = Router();

// Graceful Stripe initialization
const STRIPE_CONFIGURED = !!process.env.STRIPE_SECRET_KEY;
let stripe = null;

if (STRIPE_CONFIGURED) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });
} else {
  console.warn('[Billing Routes] STRIPE_SECRET_KEY not set - some billing features disabled.');
}

function requireStripe() {
  if (!stripe) {
    throw new Error('Stripe not configured. Please set STRIPE_SECRET_KEY environment variable.');
  }
  return stripe;
}

// ============================================================
// STRIPE WEBHOOK HANDLER (exported for direct mounting in index.js)
// Must be mounted BEFORE authMiddleware routes to avoid 401
// ============================================================

export const stripeWebhookHandler = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = requireStripe().webhooks.constructEvent(
      req.rawBody, // Need raw body for signature verification
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    await billingService.handleWebhook(event);
    res.json({ received: true });
  } catch (err) {
    console.error('Webhook processing error:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};

// All routes below require authentication
router.use(authMiddleware);

// ============================================================
// SUBSCRIPTION
// ============================================================

/**
 * GET /api/billing/subscription - Get current subscription
 */
router.get('/subscription', async (req, res) => {
  try {
    const subscription = await billingService.getSubscription(req.user.organizationId);
    const usage = await billingService.getSeatUsage(req.user.organizationId);
    
    res.json({ subscription, usage });
  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({ error: 'Failed to get subscription' });
  }
});

/**
 * POST /api/billing/subscription - Create new subscription
 */
router.post('/subscription', requireRole(['admin']), async (req, res) => {
  try {
    const { planSlug, coreSeats, trialDays, billingAnchor } = req.body;

    if (!planSlug || !coreSeats) {
      return res.status(400).json({ error: 'Plan and seat count required' });
    }

    const result = await billingService.createSubscription(
      req.user.organizationId,
      planSlug,
      coreSeats,
      { trialDays, billingAnchor }
    );

    res.status(201).json(result);
  } catch (error) {
    console.error('Create subscription error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/billing/subscription/cancel - Cancel subscription
 */
router.post('/subscription/cancel', requireRole(['admin']), async (req, res) => {
  try {
    const { immediate, reason } = req.body;
    
    const result = await billingService.cancelSubscription(
      req.user.organizationId,
      immediate,
      reason
    );

    res.json({ success: true, subscription: result });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/billing/subscription/reactivate - Reactivate canceled subscription
 */
router.post('/subscription/reactivate', requireRole(['admin']), async (req, res) => {
  try {
    const sub = await billingService.getSubscription(req.user.organizationId);
    
    if (!sub?.stripe_subscription_id) {
      return res.status(400).json({ error: 'No subscription found' });
    }

    const subscription = await requireStripe().subscriptions.update(sub.stripe_subscription_id, {
      cancel_at_period_end: false,
    });

    await db.query(`
      UPDATE subscriptions 
      SET cancel_at_period_end = false, cancellation_reason = NULL, updated_at = NOW()
      WHERE organization_id = $1
    `, [req.user.organizationId]);

    res.json({ success: true, subscription });
  } catch (error) {
    console.error('Reactivate subscription error:', error);
    res.status(400).json({ error: error.message });
  }
});

// ============================================================
// PLANS
// ============================================================

/**
 * GET /api/billing/plans - Get available plans
 */
router.get('/plans', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT id, name, slug, description, core_seat_price_monthly, flex_seat_price_monthly,
             currency, min_core_seats, max_core_seats, max_flex_seats, features, display_order
      FROM billing_plans
      WHERE is_active = true
      ORDER BY display_order
    `);

    res.json({ plans: result.rows });
  } catch (error) {
    console.error('Get plans error:', error);
    res.status(500).json({ error: 'Failed to get plans' });
  }
});

/**
 * POST /api/billing/plan/change - Change plan
 */
router.post('/plan/change', requireRole(['admin']), async (req, res) => {
  try {
    const { planSlug } = req.body;
    
    if (!planSlug) {
      return res.status(400).json({ error: 'Plan slug required' });
    }

    const result = await billingService.changePlan(req.user.organizationId, planSlug);
    res.json(result);
  } catch (error) {
    console.error('Change plan error:', error);
    res.status(400).json({ error: error.message });
  }
});

// ============================================================
// SEATS
// ============================================================

/**
 * GET /api/billing/seats - Get seat usage
 */
router.get('/seats', async (req, res) => {
  try {
    const usage = await billingService.getSeatUsage(req.user.organizationId);
    res.json(usage);
  } catch (error) {
    console.error('Get seat usage error:', error);
    res.status(500).json({ error: 'Failed to get seat usage' });
  }
});

/**
 * POST /api/billing/seats/core - Update core seats
 */
router.post('/seats/core', requireRole(['admin']), async (req, res) => {
  try {
    const { quantity } = req.body;
    
    if (!quantity || quantity < 1) {
      return res.status(400).json({ error: 'Valid quantity required' });
    }

    const result = await billingService.updateCoreSeats(req.user.organizationId, quantity);
    res.json(result);
  } catch (error) {
    console.error('Update core seats error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/billing/seats/flex - Update flex seats
 */
router.post('/seats/flex', requireRole(['admin']), async (req, res) => {
  try {
    const { quantity } = req.body;
    
    if (quantity === undefined || quantity < 0) {
      return res.status(400).json({ error: 'Valid quantity required' });
    }

    const result = await billingService.updateFlexSeats(req.user.organizationId, quantity);
    res.json(result);
  } catch (error) {
    console.error('Update flex seats error:', error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * POST /api/billing/seats/assign - Assign seat type to employee
 */
router.post('/seats/assign', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { employeeId, seatType } = req.body;
    
    if (!employeeId || !['core', 'flex'].includes(seatType)) {
      return res.status(400).json({ error: 'Employee ID and valid seat type required' });
    }

    // Check seat availability
    const usage = await billingService.getSeatUsage(req.user.organizationId);
    const sub = await billingService.getSubscription(req.user.organizationId);
    
    if (seatType === 'core' && usage.core_used >= sub.core_seats) {
      return res.status(400).json({ 
        error: 'No core seats available. Purchase more seats or use flex.',
        availableCore: sub.core_seats - usage.core_used,
        availableFlex: sub.flex_seats - usage.flex_used,
      });
    }
    
    if (seatType === 'flex' && usage.flex_used >= sub.flex_seats) {
      return res.status(400).json({ 
        error: 'No flex seats available. Purchase more flex seats.',
        availableCore: sub.core_seats - usage.core_used,
        availableFlex: sub.flex_seats - usage.flex_used,
      });
    }

    await db.query(`
      UPDATE employees SET seat_type = $1, updated_at = NOW()
      WHERE id = $2 AND organization_id = $3
    `, [seatType, employeeId, req.user.organizationId]);

    res.json({ success: true, seatType });
  } catch (error) {
    console.error('Assign seat error:', error);
    res.status(500).json({ error: 'Failed to assign seat' });
  }
});

// ============================================================
// INVOICES
// ============================================================

/**
 * GET /api/billing/invoices - Get invoice history
 */
router.get('/invoices', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 12;
    const invoices = await billingService.getInvoices(req.user.organizationId, limit);
    res.json({ invoices });
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({ error: 'Failed to get invoices' });
  }
});

/**
 * GET /api/billing/invoices/upcoming - Get upcoming invoice preview
 */
router.get('/invoices/upcoming', async (req, res) => {
  try {
    const sub = await billingService.getSubscription(req.user.organizationId);
    
    if (!sub?.stripe_subscription_id) {
      return res.json({ upcomingInvoice: null });
    }

    const upcomingInvoice = await requireStripe().invoices.retrieveUpcoming({
      subscription: sub.stripe_subscription_id,
    });

    res.json({
      upcomingInvoice: {
        amount: upcomingInvoice.total,
        currency: upcomingInvoice.currency,
        dueDate: new Date(upcomingInvoice.next_payment_attempt * 1000),
        lines: upcomingInvoice.lines.data.map(line => ({
          description: line.description,
          amount: line.amount,
          quantity: line.quantity,
        })),
      },
    });
  } catch (error) {
    console.error('Get upcoming invoice error:', error);
    res.status(500).json({ error: 'Failed to get upcoming invoice' });
  }
});

// ============================================================
// PAYMENT METHODS
// ============================================================

/**
 * GET /api/billing/payment-methods - Get payment methods
 */
router.get('/payment-methods', async (req, res) => {
  try {
    const methods = await billingService.getPaymentMethods(req.user.organizationId);
    res.json({ paymentMethods: methods });
  } catch (error) {
    console.error('Get payment methods error:', error);
    res.status(500).json({ error: 'Failed to get payment methods' });
  }
});

/**
 * POST /api/billing/payment-methods/setup - Create setup intent for adding card
 */
router.post('/payment-methods/setup', requireRole(['admin']), async (req, res) => {
  try {
    const customer = await billingService.getOrCreateCustomer(req.user.organizationId);
    
    const setupIntent = await requireStripe().setupIntents.create({
      customer: customer.id,
      payment_method_types: ['card'],
    });

    res.json({ clientSecret: setupIntent.client_secret });
  } catch (error) {
    console.error('Create setup intent error:', error);
    res.status(500).json({ error: 'Failed to create setup intent' });
  }
});

/**
 * POST /api/billing/payment-methods/:id/default - Set default payment method
 */
router.post('/payment-methods/:id/default', requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get payment method
    const pmResult = await db.query(
      `SELECT stripe_payment_method_id FROM payment_methods WHERE id = $1 AND organization_id = $2`,
      [id, req.user.organizationId]
    );
    
    if (!pmResult.rows[0]) {
      return res.status(404).json({ error: 'Payment method not found' });
    }

    // Update in Stripe
    const sub = await billingService.getSubscription(req.user.organizationId);
    if (sub?.stripe_subscription_id) {
      await requireStripe().subscriptions.update(sub.stripe_subscription_id, {
        default_payment_method: pmResult.rows[0].stripe_payment_method_id,
      });
    }

    // Update local
    await db.query(
      `UPDATE payment_methods SET is_default = (id = $1) WHERE organization_id = $2`,
      [id, req.user.organizationId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Set default payment method error:', error);
    res.status(500).json({ error: 'Failed to set default payment method' });
  }
});

/**
 * DELETE /api/billing/payment-methods/:id - Remove payment method
 */
router.delete('/payment-methods/:id', requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    
    const pmResult = await db.query(
      `SELECT stripe_payment_method_id, is_default FROM payment_methods WHERE id = $1 AND organization_id = $2`,
      [id, req.user.organizationId]
    );
    
    if (!pmResult.rows[0]) {
      return res.status(404).json({ error: 'Payment method not found' });
    }
    
    if (pmResult.rows[0].is_default) {
      return res.status(400).json({ error: 'Cannot delete default payment method' });
    }

    // Detach from Stripe
    await requireStripe().paymentMethods.detach(pmResult.rows[0].stripe_payment_method_id);

    // Delete local
    await db.query(
      `DELETE FROM payment_methods WHERE id = $1`,
      [id]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Delete payment method error:', error);
    res.status(500).json({ error: 'Failed to delete payment method' });
  }
});

// ============================================================
// BILLING PORTAL
// ============================================================

/**
 * POST /api/billing/portal - Create Stripe billing portal session
 */
router.post('/portal', requireRole(['admin']), async (req, res) => {
  try {
    const { returnUrl } = req.body;
    
    const session = await billingService.createBillingPortalSession(
      req.user.organizationId,
      returnUrl || `${process.env.APP_URL}/settings/billing`
    );

    res.json({ url: session.url });
  } catch (error) {
    console.error('Create portal session error:', error);
    res.status(500).json({ error: 'Failed to create portal session' });
  }
});

// ============================================================
// BILLING HISTORY / EVENTS
// ============================================================

/**
 * GET /api/billing/events - Get billing events (audit log)
 */
router.get('/events', requireRole(['admin']), async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const events = await billingService.getBillingEvents(req.user.organizationId, limit);
    res.json({ events });
  } catch (error) {
    console.error('Get billing events error:', error);
    res.status(500).json({ error: 'Failed to get billing events' });
  }
});

export default router;
