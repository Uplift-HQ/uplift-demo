-- ============================================================
-- UPLIFT COMMERCIAL LAYER
-- Subscriptions, billing, seat management
-- ============================================================

-- Migration: UP
-- ============================================================

-- ------------------------------------------------------------
-- PLANS (Uplift's pricing tiers)
-- ------------------------------------------------------------
CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Plan identity
  name VARCHAR(100) NOT NULL,              -- 'Growth', 'Scale', 'Enterprise'
  slug VARCHAR(50) UNIQUE NOT NULL,        -- 'growth', 'scale', 'enterprise'
  description TEXT,
  
  -- Stripe references
  stripe_product_id VARCHAR(100),          -- prod_xxx
  stripe_core_price_id VARCHAR(100),       -- price_xxx for core seats
  stripe_flex_price_id VARCHAR(100),       -- price_xxx for flex seats
  
  -- Pricing (stored for reference, Stripe is source of truth)
  core_price_per_seat DECIMAL(10,2),       -- e.g., 10.00
  flex_price_per_seat DECIMAL(10,2),       -- e.g., 10.00 (same or different)
  currency VARCHAR(3) DEFAULT 'GBP',
  billing_interval VARCHAR(20) DEFAULT 'month',  -- 'month', 'year'
  
  -- Limits & features
  min_seats INTEGER DEFAULT 1,
  max_seats INTEGER,                       -- NULL = unlimited
  features JSONB DEFAULT '{}'::jsonb,      -- feature flags per plan
  
  -- Plan status
  is_active BOOLEAN DEFAULT true,
  is_public BOOLEAN DEFAULT true,          -- shown on pricing page
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default plans
INSERT INTO plans (name, slug, description, core_price_per_seat, flex_price_per_seat, min_seats, max_seats, features, sort_order) VALUES
('Growth', 'growth', 'For growing teams ready to professionalize workforce management', 10.00, 10.00, 5, 100, 
 '{"scheduling": true, "timeClock": true, "timeOff": true, "skills": true, "mobility": true, "api": false, "sso": false, "dedicatedSupport": false}'::jsonb, 1),
('Scale', 'scale', 'For established organizations needing advanced features', 8.00, 8.00, 50, 500,
 '{"scheduling": true, "timeClock": true, "timeOff": true, "skills": true, "mobility": true, "api": true, "sso": true, "dedicatedSupport": false}'::jsonb, 2),
('Enterprise', 'enterprise', 'For large organizations with complex requirements', NULL, NULL, 200, NULL,
 '{"scheduling": true, "timeClock": true, "timeOff": true, "skills": true, "mobility": true, "api": true, "sso": true, "dedicatedSupport": true, "customIntegrations": true}'::jsonb, 3);

-- ------------------------------------------------------------
-- SUBSCRIPTIONS
-- ------------------------------------------------------------
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES plans(id),
  
  -- Stripe references
  stripe_customer_id VARCHAR(100),         -- cus_xxx
  stripe_subscription_id VARCHAR(100),     -- sub_xxx
  
  -- Subscription state
  status VARCHAR(30) NOT NULL DEFAULT 'trialing',  
    -- 'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'paused'
  
  -- Seat allocation
  core_seats INTEGER NOT NULL DEFAULT 0,   -- purchased core seats
  flex_seats INTEGER NOT NULL DEFAULT 0,   -- current flex seats
  
  -- Billing cycle
  billing_anchor INTEGER,                  -- day of month (1-28)
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  
  -- Trial
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  
  -- Cancellation
  cancel_at_period_end BOOLEAN DEFAULT false,
  canceled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(organization_id)
);

CREATE INDEX idx_subscriptions_org ON subscriptions(organization_id);
CREATE INDEX idx_subscriptions_stripe ON subscriptions(stripe_subscription_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- ------------------------------------------------------------
-- INVOICES
-- ------------------------------------------------------------
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id),
  
  -- Stripe reference
  stripe_invoice_id VARCHAR(100) UNIQUE,   -- in_xxx
  stripe_payment_intent_id VARCHAR(100),   -- pi_xxx
  
  -- Invoice details
  number VARCHAR(50),                      -- INV-2025-0001
  status VARCHAR(30) NOT NULL,             -- 'draft', 'open', 'paid', 'void', 'uncollectible'
  
  -- Amounts (in smallest currency unit, e.g., pence)
  subtotal INTEGER NOT NULL,
  tax INTEGER DEFAULT 0,
  total INTEGER NOT NULL,
  amount_paid INTEGER DEFAULT 0,
  amount_due INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'GBP',
  
  -- Line items snapshot
  lines JSONB DEFAULT '[]'::jsonb,
  
  -- Dates
  invoice_date DATE NOT NULL,
  due_date DATE,
  paid_at TIMESTAMPTZ,
  
  -- PDF
  invoice_pdf_url TEXT,
  hosted_invoice_url TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invoices_org ON invoices(organization_id);
CREATE INDEX idx_invoices_stripe ON invoices(stripe_invoice_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_date ON invoices(invoice_date DESC);

-- ------------------------------------------------------------
-- PAYMENT METHODS
-- ------------------------------------------------------------
CREATE TABLE payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Stripe reference
  stripe_payment_method_id VARCHAR(100),   -- pm_xxx
  
  -- Card details (non-sensitive, from Stripe)
  type VARCHAR(30) DEFAULT 'card',         -- 'card', 'bacs_debit', etc.
  card_brand VARCHAR(30),                  -- 'visa', 'mastercard', etc.
  card_last4 VARCHAR(4),
  card_exp_month INTEGER,
  card_exp_year INTEGER,
  
  -- Status
  is_default BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payment_methods_org ON payment_methods(organization_id);

-- ------------------------------------------------------------
-- SEAT USAGE HISTORY (for reporting/audit)
-- ------------------------------------------------------------
CREATE TABLE seat_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Snapshot period
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Counts at snapshot
  core_seats_purchased INTEGER NOT NULL,
  flex_seats_purchased INTEGER NOT NULL,
  core_seats_used INTEGER NOT NULL,
  flex_seats_used INTEGER NOT NULL,
  total_employees INTEGER NOT NULL,
  
  -- Billing amounts
  core_amount INTEGER,                     -- in pence
  flex_amount INTEGER,
  total_amount INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_seat_usage_org ON seat_usage(organization_id);
CREATE INDEX idx_seat_usage_period ON seat_usage(period_start, period_end);

-- ------------------------------------------------------------
-- BILLING EVENTS (audit log)
-- ------------------------------------------------------------
CREATE TABLE billing_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  
  -- Event info
  event_type VARCHAR(100) NOT NULL,        -- 'subscription.created', 'invoice.paid', 'seats.updated'
  stripe_event_id VARCHAR(100),            -- evt_xxx
  
  -- Event data
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Actor
  actor_type VARCHAR(30),                  -- 'system', 'user', 'stripe', 'admin'
  actor_id UUID,                           -- user_id if applicable
  actor_email VARCHAR(255),
  
  -- Metadata
  ip_address VARCHAR(45),
  user_agent TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_billing_events_org ON billing_events(organization_id);
CREATE INDEX idx_billing_events_type ON billing_events(event_type);
CREATE INDEX idx_billing_events_time ON billing_events(created_at DESC);
CREATE INDEX idx_billing_events_stripe ON billing_events(stripe_event_id);

-- ------------------------------------------------------------
-- MODIFY EMPLOYEES TABLE - Add seat type
-- ------------------------------------------------------------
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS seat_type VARCHAR(20) DEFAULT 'core' CHECK (seat_type IN ('core', 'flex'));

-- Index for seat type queries
CREATE INDEX IF NOT EXISTS idx_employees_seat_type ON employees(organization_id, seat_type);

-- ------------------------------------------------------------
-- MODIFY ORGANIZATIONS TABLE - Add billing fields
-- ------------------------------------------------------------
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS billing_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS billing_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS billing_address JSONB,
ADD COLUMN IF NOT EXISTS tax_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS tax_exempt BOOLEAN DEFAULT false;

-- ------------------------------------------------------------
-- HELPER VIEWS
-- ------------------------------------------------------------

-- Subscription overview with seat counts
CREATE OR REPLACE VIEW subscription_overview AS
SELECT 
  s.*,
  p.name as plan_name,
  p.slug as plan_slug,
  p.core_price_per_seat,
  p.flex_price_per_seat,
  o.name as organization_name,
  o.billing_email,
  (SELECT COUNT(*) FROM employees e WHERE e.organization_id = s.organization_id AND e.status = 'active' AND e.seat_type = 'core') as core_seats_used,
  (SELECT COUNT(*) FROM employees e WHERE e.organization_id = s.organization_id AND e.status = 'active' AND e.seat_type = 'flex') as flex_seats_used,
  (SELECT COUNT(*) FROM employees e WHERE e.organization_id = s.organization_id AND e.status = 'active') as total_active_employees
FROM subscriptions s
JOIN organizations o ON o.id = s.organization_id
LEFT JOIN plans p ON p.id = s.plan_id;

-- MRR calculation view
CREATE OR REPLACE VIEW mrr_by_organization AS
SELECT 
  s.organization_id,
  o.name as organization_name,
  s.status,
  s.core_seats,
  s.flex_seats,
  p.core_price_per_seat,
  p.flex_price_per_seat,
  (s.core_seats * COALESCE(p.core_price_per_seat, 0)) + 
  (s.flex_seats * COALESCE(p.flex_price_per_seat, 0)) as mrr
FROM subscriptions s
JOIN organizations o ON o.id = s.organization_id
LEFT JOIN plans p ON p.id = s.plan_id
WHERE s.status IN ('active', 'trialing', 'past_due');

-- ============================================================
-- Migration: DOWN
-- ============================================================

-- DROP VIEW IF EXISTS mrr_by_organization;
-- DROP VIEW IF EXISTS subscription_overview;
-- ALTER TABLE organizations DROP COLUMN IF EXISTS stripe_customer_id, DROP COLUMN IF EXISTS billing_email, DROP COLUMN IF EXISTS billing_name, DROP COLUMN IF EXISTS billing_address, DROP COLUMN IF EXISTS tax_id, DROP COLUMN IF EXISTS tax_exempt;
-- ALTER TABLE employees DROP COLUMN IF EXISTS seat_type;
-- DROP TABLE IF EXISTS billing_events;
-- DROP TABLE IF EXISTS seat_usage;
-- DROP TABLE IF EXISTS payment_methods;
-- DROP TABLE IF EXISTS invoices;
-- DROP TABLE IF EXISTS subscriptions;
-- DROP TABLE IF EXISTS plans;
