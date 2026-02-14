// ============================================================
// BILLING PORTAL ROUTES
// Customer self-serve billing management API endpoints
// ============================================================

import { Router } from 'express';
import { db } from '../lib/database.js';
import { authMiddleware } from '../middleware/index.js';

const router = Router();

// Stripe would be initialized here in production
// const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// GET /api/billing/overview - Get billing overview
router.get('/overview', authMiddleware, async (req, res) => {
  try {
    const { organization_id } = req.user;

    // Get organization billing details
    const orgResult = await db.query(
      `SELECT o.*, s.name as subscription_plan, s.price, s.billing_period
       FROM organizations o
       LEFT JOIN subscriptions s ON s.organization_id = o.id AND s.status = 'active'
       WHERE o.id = $1`,
      [organization_id]
    );

    if (orgResult.rows.length === 0) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const org = orgResult.rows[0];

    // Get employee count for seat-based billing
    const employeeResult = await db.query(
      `SELECT COUNT(*) as count FROM users WHERE organization_id = $1 AND status = 'active'`,
      [organization_id]
    );

    // Mock billing data (would come from Stripe in production)
    const billingData = {
      organization: {
        id: org.id,
        name: org.name,
        billingEmail: org.billing_email || org.email
      },
      subscription: {
        plan: org.subscription_plan || 'Professional',
        status: 'active',
        price: org.price || 9.99,
        billingPeriod: org.billing_period || 'monthly',
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        seats: {
          used: parseInt(employeeResult.rows[0].count),
          included: 10,
          additional: Math.max(0, parseInt(employeeResult.rows[0].count) - 10),
          pricePerSeat: 5.00
        }
      },
      paymentMethod: {
        type: 'card',
        brand: 'visa',
        last4: '4242',
        expiryMonth: 12,
        expiryYear: 2025
      },
      invoices: [
        {
          id: 'inv_001',
          date: '2024-01-01',
          amount: 99.90,
          status: 'paid',
          pdfUrl: '#'
        },
        {
          id: 'inv_002',
          date: '2023-12-01',
          amount: 99.90,
          status: 'paid',
          pdfUrl: '#'
        }
      ],
      nextInvoice: {
        date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        estimatedAmount: 99.90 + (Math.max(0, parseInt(employeeResult.rows[0].count) - 10) * 5.00)
      }
    };

    res.json(billingData);
  } catch (error) {
    console.error('Get billing overview error:', error);
    res.status(500).json({ error: 'Failed to get billing overview' });
  }
});

// GET /api/billing/plans - Get available plans
router.get('/plans', async (req, res) => {
  const plans = [
    {
      id: 'starter',
      name: 'Starter',
      description: 'Perfect for small teams getting started',
      monthlyPrice: 4.99,
      yearlyPrice: 49.99,
      features: [
        'Up to 10 employees',
        'Basic scheduling',
        'Time tracking',
        'Mobile app access',
        'Email support'
      ],
      limits: {
        employees: 10,
        locations: 1,
        admins: 1
      }
    },
    {
      id: 'professional',
      name: 'Professional',
      description: 'For growing businesses with advanced needs',
      monthlyPrice: 9.99,
      yearlyPrice: 99.99,
      popular: true,
      features: [
        'Up to 50 employees',
        'Advanced scheduling',
        'Time tracking with GPS',
        'Payroll integration',
        'Custom reports',
        'Priority support'
      ],
      limits: {
        employees: 50,
        locations: 5,
        admins: 5
      }
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      description: 'For large organizations with custom requirements',
      monthlyPrice: 19.99,
      yearlyPrice: 199.99,
      features: [
        'Unlimited employees',
        'All Professional features',
        'Custom integrations',
        'Dedicated account manager',
        'SLA guarantee',
        'On-premise option',
        '24/7 phone support'
      ],
      limits: {
        employees: -1, // unlimited
        locations: -1,
        admins: -1
      }
    }
  ];

  res.json({ plans });
});

// POST /api/billing/portal-session - Create Stripe billing portal session
router.post('/portal-session', authMiddleware, async (req, res) => {
  try {
    const { organization_id } = req.user;
    const { returnUrl } = req.body;

    // In production, this would create a Stripe billing portal session
    // const session = await stripe.billingPortal.sessions.create({
    //   customer: stripeCustomerId,
    //   return_url: returnUrl || `${process.env.APP_URL}/settings/billing`
    // });

    // Mock response for development
    res.json({
      url: returnUrl || '/settings/billing',
      message: 'In production, this would redirect to Stripe billing portal'
    });
  } catch (error) {
    console.error('Create portal session error:', error);
    res.status(500).json({ error: 'Failed to create billing portal session' });
  }
});

// POST /api/billing/change-plan - Change subscription plan
router.post('/change-plan', authMiddleware, async (req, res) => {
  try {
    const { organization_id, role } = req.user;
    const { planId, billingPeriod } = req.body;

    if (role !== 'admin' && role !== 'owner') {
      return res.status(403).json({ error: 'Only admins can change plans' });
    }

    if (!planId) {
      return res.status(400).json({ error: 'planId is required' });
    }

    // In production, this would update Stripe subscription
    // const subscription = await stripe.subscriptions.update(subscriptionId, { ... });

    res.json({
      success: true,
      message: `Plan changed to ${planId}`,
      effectiveDate: new Date().toISOString()
    });
  } catch (error) {
    console.error('Change plan error:', error);
    res.status(500).json({ error: 'Failed to change plan' });
  }
});

// POST /api/billing/seats - Update seat count
router.post('/seats', authMiddleware, async (req, res) => {
  try {
    const { organization_id, role } = req.user;
    const { quantity } = req.body;

    if (role !== 'admin' && role !== 'owner') {
      return res.status(403).json({ error: 'Only admins can update seats' });
    }

    if (!quantity || quantity < 1) {
      return res.status(400).json({ error: 'Valid quantity is required' });
    }

    // In production, this would update Stripe subscription quantity
    res.json({
      success: true,
      seats: quantity,
      message: `Seat count updated to ${quantity}`
    });
  } catch (error) {
    console.error('Update seats error:', error);
    res.status(500).json({ error: 'Failed to update seats' });
  }
});

// POST /api/billing/cancel - Cancel subscription
router.post('/cancel', authMiddleware, async (req, res) => {
  try {
    const { organization_id, role } = req.user;
    const { reason, feedback } = req.body;

    if (role !== 'admin' && role !== 'owner') {
      return res.status(403).json({ error: 'Only admins can cancel subscriptions' });
    }

    // Log cancellation reason
    await db.query(
      `INSERT INTO subscription_events (organization_id, event_type, metadata)
       VALUES ($1, 'cancellation_requested', $2::jsonb)
       ON CONFLICT DO NOTHING`,
      [organization_id, JSON.stringify({ reason, feedback })]
    ).catch(() => {}); // Table might not exist

    // In production, this would cancel via Stripe
    res.json({
      success: true,
      cancelAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      message: 'Subscription will be cancelled at the end of the billing period'
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

// POST /api/billing/reactivate - Reactivate cancelled subscription
router.post('/reactivate', authMiddleware, async (req, res) => {
  try {
    const { organization_id, role } = req.user;

    if (role !== 'admin' && role !== 'owner') {
      return res.status(403).json({ error: 'Only admins can reactivate subscriptions' });
    }

    // In production, this would reactivate via Stripe
    res.json({
      success: true,
      message: 'Subscription reactivated successfully'
    });
  } catch (error) {
    console.error('Reactivate subscription error:', error);
    res.status(500).json({ error: 'Failed to reactivate subscription' });
  }
});

// GET /api/billing/invoices - Get invoice history
router.get('/invoices', authMiddleware, async (req, res) => {
  try {
    const { organization_id } = req.user;
    const { limit = 12 } = req.query;

    // In production, this would fetch from Stripe
    // const invoices = await stripe.invoices.list({ customer: customerId, limit });

    // Mock invoice data
    const invoices = [];
    const now = new Date();
    for (let i = 0; i < Math.min(limit, 12); i++) {
      const date = new Date(now);
      date.setMonth(date.getMonth() - i);
      invoices.push({
        id: `inv_${String(i + 1).padStart(3, '0')}`,
        number: `INV-2024-${String(100 - i).padStart(4, '0')}`,
        date: date.toISOString().split('T')[0],
        dueDate: date.toISOString().split('T')[0],
        amount: 99.90,
        currency: 'GBP',
        status: 'paid',
        pdfUrl: '#'
      });
    }

    res.json({ invoices });
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({ error: 'Failed to get invoices' });
  }
});

// PUT /api/billing/payment-method - Update payment method
router.put('/payment-method', authMiddleware, async (req, res) => {
  try {
    const { organization_id, role } = req.user;

    if (role !== 'admin' && role !== 'owner') {
      return res.status(403).json({ error: 'Only admins can update payment methods' });
    }

    // In production, STRIPE_SECRET_KEY is required for payment method updates
    if (process.env.NODE_ENV === 'production' && !process.env.STRIPE_SECRET_KEY) {
      return res.status(503).json({
        error: 'Payment method updates are not available. Please contact support.',
        code: 'STRIPE_NOT_CONFIGURED'
      });
    }

    // In development/staging without Stripe configured, return mock response
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.json({
        clientSecret: 'mock_client_secret_dev_only',
        message: 'Development mode: Stripe not configured. In production, use this client secret with Stripe.js to collect payment method',
        isDevelopment: true
      });
    }

    // Production path: Use actual Stripe
    // const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    // const setupIntent = await stripe.setupIntents.create({ customer: customerId });
    // res.json({ clientSecret: setupIntent.client_secret });

    res.status(501).json({ error: 'Stripe integration pending configuration' });
  } catch (error) {
    console.error('Update payment method error:', error);
    res.status(500).json({ error: 'Failed to update payment method' });
  }
});

export default router;
