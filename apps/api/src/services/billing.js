// ============================================================
// STRIPE BILLING SERVICE
// Handles all Stripe interactions for subscriptions, seats, invoices
// ============================================================

import Stripe from 'stripe';
import { db } from '../lib/database.js';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

// ============================================================
// CUSTOMER MANAGEMENT
// ============================================================

export async function createCustomer(organization) {
  const customer = await stripe.customers.create({
    name: organization.name,
    email: organization.billing_email || organization.email,
    metadata: {
      organization_id: organization.id,
      organization_slug: organization.slug,
    },
  });

  // Store customer ID
  await db.query(
    `UPDATE organizations SET stripe_customer_id = $1 WHERE id = $2`,
    [customer.id, organization.id]
  );

  return customer;
}

export async function getOrCreateCustomer(organizationId) {
  const orgResult = await db.query(
    `SELECT * FROM organizations WHERE id = $1`,
    [organizationId]
  );
  
  const org = orgResult.rows[0];
  if (!org) throw new Error('Organization not found');

  if (org.stripe_customer_id) {
    return await stripe.customers.retrieve(org.stripe_customer_id);
  }

  return await createCustomer(org);
}

export async function updateCustomer(organizationId, data) {
  const orgResult = await db.query(
    `SELECT stripe_customer_id FROM organizations WHERE id = $1`,
    [organizationId]
  );
  
  if (!orgResult.rows[0]?.stripe_customer_id) {
    throw new Error('No Stripe customer found');
  }

  return await stripe.customers.update(orgResult.rows[0].stripe_customer_id, data);
}

// ============================================================
// SUBSCRIPTION MANAGEMENT
// ============================================================

export async function createSubscription(organizationId, planSlug, coreSeats, options = {}) {
  // Get plan
  const planResult = await db.query(
    `SELECT * FROM plans WHERE slug = $1 AND is_active = true`,
    [planSlug]
  );
  const plan = planResult.rows[0];
  if (!plan) throw new Error('Plan not found');

  // Validate seats
  if (plan.min_seats && coreSeats < plan.min_seats) {
    throw new Error(`Minimum ${plan.min_seats} seats required for this plan`);
  }
  if (plan.max_seats && coreSeats > plan.max_seats) {
    throw new Error(`Maximum ${plan.max_seats} seats allowed for this plan`);
  }

  // Get or create customer
  const customer = await getOrCreateCustomer(organizationId);

  // Build subscription items
  const items = [];
  
  // Core seats
  if (plan.stripe_core_price_id) {
    items.push({
      price: plan.stripe_core_price_id,
      quantity: coreSeats,
    });
  }

  // Create Stripe subscription
  const subscriptionParams = {
    customer: customer.id,
    items,
    metadata: {
      organization_id: organizationId,
      plan_slug: planSlug,
    },
    payment_behavior: 'default_incomplete',
    payment_settings: {
      save_default_payment_method: 'on_subscription',
    },
    expand: ['latest_invoice.payment_intent'],
  };

  // Trial period
  if (options.trialDays) {
    subscriptionParams.trial_period_days = options.trialDays;
  }

  // Billing anchor (day of month)
  if (options.billingAnchor) {
    subscriptionParams.billing_cycle_anchor_config = {
      day_of_month: options.billingAnchor,
    };
  }

  const subscription = await stripe.subscriptions.create(subscriptionParams);

  // Store subscription locally
  await db.query(`
    INSERT INTO subscriptions (
      organization_id, plan_id, stripe_customer_id, stripe_subscription_id,
      status, core_seats, flex_seats, billing_anchor,
      current_period_start, current_period_end,
      trial_start, trial_end
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    ON CONFLICT (organization_id) DO UPDATE SET
      plan_id = EXCLUDED.plan_id,
      stripe_subscription_id = EXCLUDED.stripe_subscription_id,
      status = EXCLUDED.status,
      core_seats = EXCLUDED.core_seats,
      current_period_start = EXCLUDED.current_period_start,
      current_period_end = EXCLUDED.current_period_end,
      updated_at = NOW()
  `, [
    organizationId,
    plan.id,
    customer.id,
    subscription.id,
    subscription.status,
    coreSeats,
    0, // flex_seats
    options.billingAnchor || new Date(subscription.current_period_start * 1000).getDate(),
    new Date(subscription.current_period_start * 1000),
    new Date(subscription.current_period_end * 1000),
    subscription.trial_start ? new Date(subscription.trial_start * 1000) : null,
    subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
  ]);

  // Log event
  await logBillingEvent(organizationId, 'subscription.created', {
    subscription_id: subscription.id,
    plan: planSlug,
    core_seats: coreSeats,
  });

  return {
    subscription,
    clientSecret: subscription.latest_invoice?.payment_intent?.client_secret,
  };
}

export async function getSubscription(organizationId) {
  const result = await db.query(`
    SELECT s.*, p.name as plan_name, p.slug as plan_slug,
           p.core_price_per_seat, p.flex_price_per_seat
    FROM subscriptions s
    LEFT JOIN plans p ON p.id = s.plan_id
    WHERE s.organization_id = $1
  `, [organizationId]);
  
  return result.rows[0];
}

export async function cancelSubscription(organizationId, immediate = false, reason = null) {
  const sub = await getSubscription(organizationId);
  if (!sub?.stripe_subscription_id) {
    throw new Error('No active subscription found');
  }

  let subscription;
  if (immediate) {
    subscription = await stripe.subscriptions.cancel(sub.stripe_subscription_id);
  } else {
    subscription = await stripe.subscriptions.update(sub.stripe_subscription_id, {
      cancel_at_period_end: true,
    });
  }

  // Update local
  await db.query(`
    UPDATE subscriptions 
    SET status = $1, cancel_at_period_end = $2, canceled_at = $3, cancellation_reason = $4, updated_at = NOW()
    WHERE organization_id = $5
  `, [
    subscription.status,
    subscription.cancel_at_period_end,
    immediate ? new Date() : null,
    reason,
    organizationId,
  ]);

  await logBillingEvent(organizationId, 'subscription.canceled', {
    immediate,
    reason,
  });

  return subscription;
}

// ============================================================
// SEAT MANAGEMENT
// ============================================================

export async function updateCoreSeats(organizationId, newQuantity) {
  const sub = await getSubscription(organizationId);
  if (!sub?.stripe_subscription_id) {
    throw new Error('No active subscription found');
  }

  // Get plan limits
  const planResult = await db.query(
    `SELECT * FROM plans WHERE id = $1`,
    [sub.plan_id]
  );
  const plan = planResult.rows[0];

  if (plan?.min_seats && newQuantity < plan.min_seats) {
    throw new Error(`Minimum ${plan.min_seats} seats required`);
  }
  if (plan?.max_seats && newQuantity > plan.max_seats) {
    throw new Error(`Maximum ${plan.max_seats} seats allowed on this plan`);
  }

  // Get subscription items from Stripe
  const stripeSubscription = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
  const coreItem = stripeSubscription.items.data.find(
    item => item.price.id === plan.stripe_core_price_id
  );

  if (!coreItem) {
    throw new Error('Core seat item not found in subscription');
  }

  // Update quantity
  await stripe.subscriptionItems.update(coreItem.id, {
    quantity: newQuantity,
    proration_behavior: 'create_prorations',
  });

  // Update local
  await db.query(
    `UPDATE subscriptions SET core_seats = $1, updated_at = NOW() WHERE organization_id = $2`,
    [newQuantity, organizationId]
  );

  await logBillingEvent(organizationId, 'seats.core_updated', {
    previous: sub.core_seats,
    new: newQuantity,
  });

  return { previous: sub.core_seats, new: newQuantity };
}

export async function updateFlexSeats(organizationId, newQuantity) {
  const sub = await getSubscription(organizationId);
  if (!sub?.stripe_subscription_id) {
    throw new Error('No active subscription found');
  }

  const planResult = await db.query(
    `SELECT * FROM plans WHERE id = $1`,
    [sub.plan_id]
  );
  const plan = planResult.rows[0];

  // Get or create flex seat item
  const stripeSubscription = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
  let flexItem = stripeSubscription.items.data.find(
    item => item.price.id === plan.stripe_flex_price_id
  );

  if (newQuantity > 0) {
    if (flexItem) {
      // Update existing flex item
      await stripe.subscriptionItems.update(flexItem.id, {
        quantity: newQuantity,
        proration_behavior: 'create_prorations',
      });
    } else {
      // Add new flex item
      await stripe.subscriptionItems.create({
        subscription: sub.stripe_subscription_id,
        price: plan.stripe_flex_price_id,
        quantity: newQuantity,
        proration_behavior: 'create_prorations',
      });
    }
  } else if (flexItem) {
    // Remove flex seats entirely
    await stripe.subscriptionItems.del(flexItem.id, {
      proration_behavior: 'create_prorations',
    });
  }

  // Update local
  await db.query(
    `UPDATE subscriptions SET flex_seats = $1, updated_at = NOW() WHERE organization_id = $2`,
    [newQuantity, organizationId]
  );

  await logBillingEvent(organizationId, 'seats.flex_updated', {
    previous: sub.flex_seats,
    new: newQuantity,
  });

  return { previous: sub.flex_seats, new: newQuantity };
}

export async function getSeatUsage(organizationId) {
  const result = await db.query(`
    SELECT 
      s.core_seats as core_purchased,
      s.flex_seats as flex_purchased,
      COUNT(*) FILTER (WHERE e.seat_type = 'core' AND e.status = 'active') as core_used,
      COUNT(*) FILTER (WHERE e.seat_type = 'flex' AND e.status = 'active') as flex_used,
      COUNT(*) FILTER (WHERE e.status = 'active') as total_active
    FROM subscriptions s
    LEFT JOIN employees e ON e.organization_id = s.organization_id
    WHERE s.organization_id = $1
    GROUP BY s.core_seats, s.flex_seats
  `, [organizationId]);

  return result.rows[0] || {
    core_purchased: 0,
    flex_purchased: 0,
    core_used: 0,
    flex_used: 0,
    total_active: 0,
  };
}

/**
 * Check if organization has available seats for a new user/employee
 * Returns { allowed: boolean, seatType?: 'core'|'flex', error?: string }
 */
export async function checkSeatAvailability(organizationId) {
  const usage = await getSeatUsage(organizationId);
  const coreAvailable = (usage.core_purchased || 0) - (parseInt(usage.core_used) || 0);
  const flexAvailable = (usage.flex_purchased || 0) - (parseInt(usage.flex_used) || 0);

  // First try to use a core seat
  if (coreAvailable > 0) {
    return { allowed: true, seatType: 'core', remaining: coreAvailable - 1 };
  }

  // Then try flex seats
  if (flexAvailable > 0) {
    return { allowed: true, seatType: 'flex', remaining: flexAvailable - 1 };
  }

  // No seats available
  return {
    allowed: false,
    error: `Seat limit reached. You have ${usage.core_purchased || 0} core seats and ${usage.flex_purchased || 0} flex seats, all in use.`,
    coreUsed: usage.core_used,
    corePurchased: usage.core_purchased,
    flexUsed: usage.flex_used,
    flexPurchased: usage.flex_purchased,
  };
}

/**
 * Enforce seat limit - throws error if no seats available
 * Call this before creating a user or employee
 */
export async function enforceSeatLimit(organizationId) {
  const check = await checkSeatAvailability(organizationId);
  if (!check.allowed) {
    const error = new Error(check.error);
    error.code = 'SEAT_LIMIT_EXCEEDED';
    error.status = 403;
    throw error;
  }
  return check;
}

// ============================================================
// PLAN CHANGES
// ============================================================

export async function changePlan(organizationId, newPlanSlug) {
  const sub = await getSubscription(organizationId);
  if (!sub?.stripe_subscription_id) {
    throw new Error('No active subscription found');
  }

  const newPlanResult = await db.query(
    `SELECT * FROM plans WHERE slug = $1 AND is_active = true`,
    [newPlanSlug]
  );
  const newPlan = newPlanResult.rows[0];
  if (!newPlan) throw new Error('Plan not found');

  // Validate seats against new plan limits
  const totalSeats = sub.core_seats + sub.flex_seats;
  if (newPlan.min_seats && totalSeats < newPlan.min_seats) {
    throw new Error(`New plan requires minimum ${newPlan.min_seats} seats`);
  }
  if (newPlan.max_seats && totalSeats > newPlan.max_seats) {
    throw new Error(`New plan allows maximum ${newPlan.max_seats} seats`);
  }

  // Get Stripe subscription
  const stripeSubscription = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);

  // Update items to new prices
  const items = stripeSubscription.items.data.map(item => {
    if (item.price.id === sub.stripe_core_price_id) {
      return {
        id: item.id,
        price: newPlan.stripe_core_price_id,
        quantity: sub.core_seats,
      };
    }
    if (item.price.id === sub.stripe_flex_price_id && sub.flex_seats > 0) {
      return {
        id: item.id,
        price: newPlan.stripe_flex_price_id,
        quantity: sub.flex_seats,
      };
    }
    return { id: item.id };
  });

  await stripe.subscriptions.update(sub.stripe_subscription_id, {
    items,
    proration_behavior: 'create_prorations',
  });

  // Update local
  await db.query(
    `UPDATE subscriptions SET plan_id = $1, updated_at = NOW() WHERE organization_id = $2`,
    [newPlan.id, organizationId]
  );

  await logBillingEvent(organizationId, 'plan.changed', {
    previous_plan: sub.plan_slug,
    new_plan: newPlanSlug,
  });

  return { previousPlan: sub.plan_slug, newPlan: newPlanSlug };
}

// ============================================================
// INVOICES
// ============================================================

export async function getInvoices(organizationId, limit = 10) {
  const result = await db.query(`
    SELECT * FROM invoices 
    WHERE organization_id = $1 
    ORDER BY invoice_date DESC 
    LIMIT $2
  `, [organizationId, limit]);
  
  return result.rows;
}

export async function syncInvoice(stripeInvoice) {
  const orgResult = await db.query(
    `SELECT id FROM organizations WHERE stripe_customer_id = $1`,
    [stripeInvoice.customer]
  );
  
  if (!orgResult.rows[0]) return null;
  const organizationId = orgResult.rows[0].id;

  // Get subscription ID
  const subResult = await db.query(
    `SELECT id FROM subscriptions WHERE stripe_subscription_id = $1`,
    [stripeInvoice.subscription]
  );

  await db.query(`
    INSERT INTO invoices (
      organization_id, subscription_id, stripe_invoice_id, stripe_payment_intent_id,
      number, status, subtotal, tax, total, amount_paid, amount_due, currency,
      lines, invoice_date, due_date, paid_at, invoice_pdf_url, hosted_invoice_url
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
    ON CONFLICT (stripe_invoice_id) DO UPDATE SET
      status = EXCLUDED.status,
      amount_paid = EXCLUDED.amount_paid,
      amount_due = EXCLUDED.amount_due,
      paid_at = EXCLUDED.paid_at,
      invoice_pdf_url = EXCLUDED.invoice_pdf_url,
      updated_at = NOW()
  `, [
    organizationId,
    subResult.rows[0]?.id,
    stripeInvoice.id,
    stripeInvoice.payment_intent,
    stripeInvoice.number,
    stripeInvoice.status,
    stripeInvoice.subtotal,
    stripeInvoice.tax || 0,
    stripeInvoice.total,
    stripeInvoice.amount_paid,
    stripeInvoice.amount_due,
    stripeInvoice.currency.toUpperCase(),
    JSON.stringify(stripeInvoice.lines?.data || []),
    new Date(stripeInvoice.created * 1000),
    stripeInvoice.due_date ? new Date(stripeInvoice.due_date * 1000) : null,
    stripeInvoice.status === 'paid' ? new Date() : null,
    stripeInvoice.invoice_pdf,
    stripeInvoice.hosted_invoice_url,
  ]);

  return { organizationId, invoiceId: stripeInvoice.id };
}

// ============================================================
// PAYMENT METHODS
// ============================================================

export async function getPaymentMethods(organizationId) {
  const result = await db.query(
    `SELECT * FROM payment_methods WHERE organization_id = $1 ORDER BY is_default DESC, created_at DESC`,
    [organizationId]
  );
  return result.rows;
}

export async function syncPaymentMethod(stripePaymentMethod, organizationId) {
  await db.query(`
    INSERT INTO payment_methods (
      organization_id, stripe_payment_method_id, type,
      card_brand, card_last4, card_exp_month, card_exp_year
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (stripe_payment_method_id) DO UPDATE SET
      card_exp_month = EXCLUDED.card_exp_month,
      card_exp_year = EXCLUDED.card_exp_year,
      updated_at = NOW()
  `, [
    organizationId,
    stripePaymentMethod.id,
    stripePaymentMethod.type,
    stripePaymentMethod.card?.brand,
    stripePaymentMethod.card?.last4,
    stripePaymentMethod.card?.exp_month,
    stripePaymentMethod.card?.exp_year,
  ]);
}

export async function createBillingPortalSession(organizationId, returnUrl) {
  const orgResult = await db.query(
    `SELECT stripe_customer_id FROM organizations WHERE id = $1`,
    [organizationId]
  );
  
  if (!orgResult.rows[0]?.stripe_customer_id) {
    throw new Error('No Stripe customer found');
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: orgResult.rows[0].stripe_customer_id,
    return_url: returnUrl,
  });

  return session;
}

// ============================================================
// BILLING EVENTS
// ============================================================

async function logBillingEvent(organizationId, eventType, data, actor = null) {
  await db.query(`
    INSERT INTO billing_events (organization_id, event_type, data, actor_type, actor_id, actor_email)
    VALUES ($1, $2, $3, $4, $5, $6)
  `, [
    organizationId,
    eventType,
    JSON.stringify(data),
    actor?.type || 'system',
    actor?.id,
    actor?.email,
  ]);
}

export async function getBillingEvents(organizationId, limit = 50) {
  const result = await db.query(`
    SELECT * FROM billing_events 
    WHERE organization_id = $1 
    ORDER BY created_at DESC 
    LIMIT $2
  `, [organizationId, limit]);
  
  return result.rows;
}

// ============================================================
// WEBHOOK HANDLERS
// ============================================================

export async function handleWebhook(event) {
  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      await handleSubscriptionUpdate(event.data.object);
      break;
      
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object);
      break;
      
    case 'invoice.paid':
      await handleInvoicePaid(event.data.object);
      break;
      
    case 'invoice.payment_failed':
      await handleInvoicePaymentFailed(event.data.object);
      break;
      
    case 'invoice.created':
    case 'invoice.updated':
      await syncInvoice(event.data.object);
      break;
      
    case 'payment_method.attached':
      await handlePaymentMethodAttached(event.data.object);
      break;
      
    default:
      console.log(`Unhandled webhook event: ${event.type}`);
  }

  // Log all events
  const orgResult = await db.query(
    `SELECT id FROM organizations WHERE stripe_customer_id = $1`,
    [event.data.object.customer]
  );
  
  if (orgResult.rows[0]) {
    await db.query(`
      INSERT INTO billing_events (organization_id, event_type, stripe_event_id, data, actor_type)
      VALUES ($1, $2, $3, $4, 'stripe')
    `, [
      orgResult.rows[0].id,
      event.type,
      event.id,
      JSON.stringify(event.data.object),
    ]);
  }
}

async function handleSubscriptionUpdate(subscription) {
  await db.query(`
    UPDATE subscriptions SET
      status = $1,
      current_period_start = $2,
      current_period_end = $3,
      cancel_at_period_end = $4,
      updated_at = NOW()
    WHERE stripe_subscription_id = $5
  `, [
    subscription.status,
    new Date(subscription.current_period_start * 1000),
    new Date(subscription.current_period_end * 1000),
    subscription.cancel_at_period_end,
    subscription.id,
  ]);
}

async function handleSubscriptionDeleted(subscription) {
  await db.query(`
    UPDATE subscriptions SET
      status = 'canceled',
      canceled_at = NOW(),
      updated_at = NOW()
    WHERE stripe_subscription_id = $1
  `, [subscription.id]);
}

async function handleInvoicePaid(invoice) {
  await syncInvoice(invoice);
  
  // Update subscription status if it was past_due
  if (invoice.subscription) {
    await db.query(`
      UPDATE subscriptions SET status = 'active', updated_at = NOW()
      WHERE stripe_subscription_id = $1 AND status = 'past_due'
    `, [invoice.subscription]);
  }
}

async function handleInvoicePaymentFailed(invoice) {
  await syncInvoice(invoice);
  
  // Mark subscription as past_due
  if (invoice.subscription) {
    await db.query(`
      UPDATE subscriptions SET status = 'past_due', updated_at = NOW()
      WHERE stripe_subscription_id = $1
    `, [invoice.subscription]);
  }

  // Send email notification about failed payment
  try {
    // Get organization admin users
    const orgResult = await db.query(
      `SELECT o.id, o.name FROM organizations o
       JOIN subscriptions s ON s.organization_id = o.id
       WHERE s.stripe_subscription_id = $1`,
      [invoice.subscription]
    );

    if (orgResult.rows[0]) {
      const admins = await db.query(
        `SELECT u.email, u.first_name, u.last_name FROM users u
         WHERE u.organization_id = $1 AND u.role = 'admin' AND u.status = 'active'`,
        [orgResult.rows[0].id]
      );

      // Lazy import to avoid circular dependency
      const { emailService } = await import('./email.js');

      for (const admin of admins.rows) {
        await emailService.sendPaymentFailed(admin, {
          amount: invoice.amount_due,
          currency: invoice.currency,
          invoiceNumber: invoice.number,
        });
      }
    }
  } catch (error) {
    console.error('Failed to send payment failed notification:', error);
  }
}

async function handlePaymentMethodAttached(paymentMethod) {
  const orgResult = await db.query(
    `SELECT id FROM organizations WHERE stripe_customer_id = $1`,
    [paymentMethod.customer]
  );
  
  if (orgResult.rows[0]) {
    await syncPaymentMethod(paymentMethod, orgResult.rows[0].id);
  }
}

// ============================================================
// METRICS
// ============================================================

export async function getMRR() {
  const result = await db.query(`
    SELECT 
      COALESCE(SUM(
        (s.core_seats * COALESCE(p.core_price_per_seat, 0)) +
        (s.flex_seats * COALESCE(p.flex_price_per_seat, 0))
      ), 0) as total_mrr,
      COUNT(DISTINCT s.organization_id) as active_subscriptions,
      SUM(s.core_seats) as total_core_seats,
      SUM(s.flex_seats) as total_flex_seats
    FROM subscriptions s
    LEFT JOIN plans p ON p.id = s.plan_id
    WHERE s.status IN ('active', 'trialing')
  `);
  
  return result.rows[0];
}

export async function getRevenueByPlan() {
  const result = await db.query(`
    SELECT 
      p.name as plan_name,
      p.slug as plan_slug,
      COUNT(DISTINCT s.organization_id) as customer_count,
      SUM(s.core_seats) as total_core_seats,
      SUM(s.flex_seats) as total_flex_seats,
      SUM(
        (s.core_seats * COALESCE(p.core_price_per_seat, 0)) +
        (s.flex_seats * COALESCE(p.flex_price_per_seat, 0))
      ) as mrr
    FROM subscriptions s
    JOIN plans p ON p.id = s.plan_id
    WHERE s.status IN ('active', 'trialing')
    GROUP BY p.id
    ORDER BY mrr DESC
  `);
  
  return result.rows;
}

export { stripe };
