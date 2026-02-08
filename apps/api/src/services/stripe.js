// ============================================================
// STRIPE SERVICE
// Handles all Stripe API interactions for subscriptions
// ============================================================

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
});

// ==================== CUSTOMERS ====================

export async function createCustomer({ email, name, organizationId, metadata = {} }) {
  return stripe.customers.create({
    email,
    name,
    metadata: {
      organization_id: organizationId,
      ...metadata,
    },
  });
}

export async function getCustomer(customerId) {
  return stripe.customers.retrieve(customerId);
}

export async function updateCustomer(customerId, updates) {
  return stripe.customers.update(customerId, updates);
}

// ==================== SUBSCRIPTIONS ====================

export async function createSubscription({
  customerId,
  corePriceId,
  flexPriceId,
  coreQuantity,
  flexQuantity = 0,
  trialDays = 0,
  metadata = {},
}) {
  const items = [
    { price: corePriceId, quantity: coreQuantity },
  ];

  // Only add flex if quantity > 0
  if (flexQuantity > 0) {
    items.push({ price: flexPriceId, quantity: flexQuantity });
  }

  const subscriptionParams = {
    customer: customerId,
    items,
    payment_behavior: 'default_incomplete',
    payment_settings: {
      save_default_payment_method: 'on_subscription',
    },
    expand: ['latest_invoice.payment_intent'],
    metadata,
  };

  if (trialDays > 0) {
    subscriptionParams.trial_period_days = trialDays;
  }

  return stripe.subscriptions.create(subscriptionParams);
}

export async function getSubscription(subscriptionId) {
  return stripe.subscriptions.retrieve(subscriptionId, {
    expand: ['items.data.price', 'customer', 'latest_invoice'],
  });
}

export async function updateSubscriptionSeats({
  subscriptionId,
  coreQuantity,
  flexQuantity,
  corePriceId,
  flexPriceId,
}) {
  // Get current subscription to find item IDs
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  
  const coreItem = subscription.items.data.find(item => item.price.id === corePriceId);
  const flexItem = subscription.items.data.find(item => item.price.id === flexPriceId);

  const items = [];

  // Update core seats
  if (coreItem) {
    items.push({ id: coreItem.id, quantity: coreQuantity });
  }

  // Update or add/remove flex seats
  if (flexQuantity > 0) {
    if (flexItem) {
      items.push({ id: flexItem.id, quantity: flexQuantity });
    } else {
      // Add flex item
      items.push({ price: flexPriceId, quantity: flexQuantity });
    }
  } else if (flexItem) {
    // Remove flex item (quantity 0)
    items.push({ id: flexItem.id, deleted: true });
  }

  return stripe.subscriptions.update(subscriptionId, {
    items,
    proration_behavior: 'create_prorations',
  });
}

export async function cancelSubscription(subscriptionId, { atPeriodEnd = true } = {}) {
  if (atPeriodEnd) {
    return stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
  }
  return stripe.subscriptions.cancel(subscriptionId);
}

export async function reactivateSubscription(subscriptionId) {
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  });
}

export async function previewProration({
  subscriptionId,
  coreQuantity,
  flexQuantity,
  corePriceId,
  flexPriceId,
}) {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  
  const coreItem = subscription.items.data.find(item => item.price.id === corePriceId);
  const flexItem = subscription.items.data.find(item => item.price.id === flexPriceId);

  const items = [];

  if (coreItem) {
    items.push({ id: coreItem.id, quantity: coreQuantity });
  }

  if (flexQuantity > 0) {
    if (flexItem) {
      items.push({ id: flexItem.id, quantity: flexQuantity });
    } else {
      items.push({ price: flexPriceId, quantity: flexQuantity });
    }
  } else if (flexItem) {
    items.push({ id: flexItem.id, deleted: true });
  }

  const invoice = await stripe.invoices.createPreview({
    customer: subscription.customer,
    subscription: subscriptionId,
    subscription_items: items,
    subscription_proration_behavior: 'create_prorations',
  });

  return {
    subtotal: invoice.subtotal,
    tax: invoice.tax || 0,
    total: invoice.total,
    amountDue: invoice.amount_due,
    prorationAmount: invoice.lines.data
      .filter(line => line.proration)
      .reduce((sum, line) => sum + line.amount, 0),
  };
}

// ==================== CHECKOUT ====================

export async function createCheckoutSession({
  customerId,
  corePriceId,
  coreQuantity,
  successUrl,
  cancelUrl,
  metadata = {},
}) {
  return stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [
      {
        price: corePriceId,
        quantity: coreQuantity,
        adjustable_quantity: {
          enabled: true,
          minimum: 1,
        },
      },
    ],
    subscription_data: {
      metadata,
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
  });
}

// ==================== BILLING PORTAL ====================

export async function createBillingPortalSession({ customerId, returnUrl }) {
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}

// ==================== INVOICES ====================

export async function getInvoice(invoiceId) {
  return stripe.invoices.retrieve(invoiceId);
}

export async function listInvoices(customerId, limit = 10) {
  return stripe.invoices.list({
    customer: customerId,
    limit,
  });
}

export async function getUpcomingInvoice(customerId) {
  try {
    return await stripe.invoices.retrieveUpcoming({
      customer: customerId,
    });
  } catch (error) {
    // No upcoming invoice (e.g., canceled subscription)
    if (error.code === 'invoice_upcoming_none') {
      return null;
    }
    throw error;
  }
}

// ==================== PAYMENT METHODS ====================

export async function listPaymentMethods(customerId) {
  return stripe.paymentMethods.list({
    customer: customerId,
    type: 'card',
  });
}

export async function getPaymentMethod(paymentMethodId) {
  return stripe.paymentMethods.retrieve(paymentMethodId);
}

export async function setDefaultPaymentMethod(customerId, paymentMethodId) {
  return stripe.customers.update(customerId, {
    invoice_settings: {
      default_payment_method: paymentMethodId,
    },
  });
}

// ==================== WEBHOOKS ====================

export function constructWebhookEvent(payload, signature, webhookSecret) {
  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}

// ==================== PRICES ====================

export async function getPrice(priceId) {
  return stripe.prices.retrieve(priceId);
}

export async function listPrices(productId) {
  return stripe.prices.list({
    product: productId,
    active: true,
  });
}

// ==================== USAGE RECORDS (for future metering) ====================

export async function createUsageRecord(subscriptionItemId, quantity, timestamp) {
  return stripe.subscriptionItems.createUsageRecord(subscriptionItemId, {
    quantity,
    timestamp: timestamp || Math.floor(Date.now() / 1000),
    action: 'set',
  });
}

export default {
  createCustomer,
  getCustomer,
  updateCustomer,
  createSubscription,
  getSubscription,
  updateSubscriptionSeats,
  cancelSubscription,
  reactivateSubscription,
  previewProration,
  createCheckoutSession,
  createBillingPortalSession,
  getInvoice,
  listInvoices,
  getUpcomingInvoice,
  listPaymentMethods,
  getPaymentMethod,
  setDefaultPaymentMethod,
  constructWebhookEvent,
  getPrice,
  listPrices,
  createUsageRecord,
};
