-- ============================================================
-- UPLIFT BILLING SCHEMA
-- Commercial layer for SaaS subscriptions and seat management
-- ============================================================

-- Plans available for purchase
CREATE TABLE IF NOT EXISTS billing_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL, -- 'Growth', 'Scale', 'Enterprise'
    slug VARCHAR(50) NOT NULL UNIQUE, -- 'growth', 'scale', 'enterprise'
    description TEXT,
    
    -- Pricing (stored in pence/cents for accuracy)
    core_seat_price_monthly INTEGER NOT NULL, -- £10 = 1000
    flex_seat_price_monthly INTEGER NOT NULL, -- same or different
    currency VARCHAR(3) NOT NULL DEFAULT 'gbp',
    
    -- Limits
    min_core_seats INTEGER NOT NULL DEFAULT 1,
    max_core_seats INTEGER, -- NULL = unlimited
    max_flex_seats INTEGER, -- NULL = unlimited
    
    -- Feature flags
    features JSONB NOT NULL DEFAULT '{}',
    -- e.g. {"api_access": true, "sso": true, "custom_branding": true}
    
    -- Stripe
    stripe_core_price_id VARCHAR(255), -- price_xxx for core seats
    stripe_flex_price_id VARCHAR(255), -- price_xxx for flex seats
    
    -- Pilot/setup fees and regular pricing (for non-founding partners)
    pilot_setup_fee INTEGER DEFAULT 0,           -- One-time setup fee in pence
    regular_core_price INTEGER DEFAULT 0,        -- Regular (non-founding) core price
    regular_flex_price INTEGER DEFAULT 0,        -- Regular (non-founding) flex price
    is_founding_partner_pricing BOOLEAN DEFAULT true, -- Whether current prices are founding partner rates

    is_active BOOLEAN NOT NULL DEFAULT true,
    display_order INTEGER NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Customer subscriptions (one per org, mirrors Stripe)
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Stripe IDs
    stripe_customer_id VARCHAR(255) NOT NULL,
    stripe_subscription_id VARCHAR(255) UNIQUE,
    
    -- Current plan
    plan_id UUID NOT NULL REFERENCES billing_plans(id),
    
    -- Seat counts
    core_seats INTEGER NOT NULL DEFAULT 1,
    flex_seats INTEGER NOT NULL DEFAULT 0,
    
    -- Status (mirrors Stripe)
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    -- 'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete'
    
    -- Billing cycle
    billing_cycle_anchor TIMESTAMPTZ, -- When billing started
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    
    -- Trial
    trial_start TIMESTAMPTZ,
    trial_end TIMESTAMPTZ,
    
    -- Cancellation
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
    canceled_at TIMESTAMPTZ,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',

    -- Founding partner tracking
    is_founding_partner BOOLEAN DEFAULT false,
    founding_partner_locked_at TIMESTAMPTZ, -- When they locked in founding partner pricing

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(organization_id) -- One subscription per org
);

-- Seat assignments (who's using which seat type)
-- This links employees to their seat type for billing enforcement
ALTER TABLE employees ADD COLUMN IF NOT EXISTS seat_type VARCHAR(20) DEFAULT 'core';
-- 'core' or 'flex'

-- Invoice records (synced from Stripe, for ops visibility)
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    
    -- Stripe
    stripe_invoice_id VARCHAR(255) NOT NULL UNIQUE,
    stripe_invoice_number VARCHAR(100),
    stripe_hosted_invoice_url TEXT,
    stripe_invoice_pdf TEXT,
    
    -- Amounts (in smallest currency unit)
    subtotal INTEGER NOT NULL,
    tax INTEGER NOT NULL DEFAULT 0,
    total INTEGER NOT NULL,
    amount_paid INTEGER NOT NULL DEFAULT 0,
    amount_due INTEGER NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'gbp',
    
    -- Status
    status VARCHAR(50) NOT NULL, -- 'draft', 'open', 'paid', 'void', 'uncollectible'
    
    -- Dates
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,
    due_date TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    
    -- Line items summary
    line_items JSONB DEFAULT '[]',
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seat change history (for auditing and ops)
CREATE TABLE IF NOT EXISTS seat_changes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    
    change_type VARCHAR(50) NOT NULL, -- 'core_added', 'core_removed', 'flex_added', 'flex_removed'
    quantity INTEGER NOT NULL, -- How many seats changed
    
    previous_core_seats INTEGER NOT NULL,
    new_core_seats INTEGER NOT NULL,
    previous_flex_seats INTEGER NOT NULL,
    new_flex_seats INTEGER NOT NULL,
    
    -- Who made the change
    changed_by UUID REFERENCES users(id),
    reason TEXT,
    
    -- Stripe proration
    stripe_proration_amount INTEGER, -- Amount charged/credited
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Payment methods (synced from Stripe)
CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    stripe_payment_method_id VARCHAR(255) NOT NULL UNIQUE,
    type VARCHAR(50) NOT NULL, -- 'card', 'bacs_debit', etc.
    
    -- Card details (if card)
    card_brand VARCHAR(50),
    card_last4 VARCHAR(4),
    card_exp_month INTEGER,
    card_exp_year INTEGER,
    
    is_default BOOLEAN NOT NULL DEFAULT false,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Stripe webhook events (for idempotency and debugging)
CREATE TABLE IF NOT EXISTS stripe_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_event_id VARCHAR(255) NOT NULL UNIQUE,
    event_type VARCHAR(255) NOT NULL,
    payload JSONB NOT NULL,
    processed BOOLEAN NOT NULL DEFAULT false,
    processed_at TIMESTAMPTZ,
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- UPLIFT OPS TABLES
-- Internal tools for running the business
-- ============================================================

-- Ops users (separate from customer users)
CREATE TABLE IF NOT EXISTS ops_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'support', -- 'admin', 'support', 'finance', 'sales'
    permissions JSONB DEFAULT '[]',
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ops activity log (audit trail)
CREATE TABLE IF NOT EXISTS ops_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ops_user_id UUID REFERENCES ops_users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100), -- 'organization', 'subscription', 'invoice'
    entity_id UUID,
    details JSONB DEFAULT '{}',
    ip_address INET,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Customer notes (internal notes about orgs)
CREATE TABLE IF NOT EXISTS customer_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    ops_user_id UUID REFERENCES ops_users(id),
    note TEXT NOT NULL,
    note_type VARCHAR(50) DEFAULT 'general', -- 'general', 'support', 'sales', 'billing'
    is_pinned BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Customer health scores (for churn prediction)
CREATE TABLE IF NOT EXISTS customer_health (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Health metrics (0-100)
    overall_score INTEGER NOT NULL DEFAULT 50,
    engagement_score INTEGER, -- Based on login frequency, feature usage
    adoption_score INTEGER, -- % of features used
    growth_score INTEGER, -- Seat expansion trend
    support_score INTEGER, -- Support ticket sentiment
    
    -- Risk indicators
    risk_level VARCHAR(20) DEFAULT 'low', -- 'low', 'medium', 'high'
    churn_risk_factors JSONB DEFAULT '[]',
    
    -- Last activity
    last_admin_login TIMESTAMPTZ,
    last_worker_activity TIMESTAMPTZ,
    
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(organization_id)
);

-- Feature flags (per org overrides)
CREATE TABLE IF NOT EXISTS feature_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    feature_key VARCHAR(100) NOT NULL,
    enabled BOOLEAN NOT NULL,
    expires_at TIMESTAMPTZ,
    reason TEXT,
    created_by UUID REFERENCES ops_users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(organization_id, feature_key)
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_subscriptions_org ON subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_invoices_org ON invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_stripe ON invoices(stripe_invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_seat_changes_org ON seat_changes(organization_id);
CREATE INDEX IF NOT EXISTS idx_stripe_events_type ON stripe_events(event_type);
CREATE INDEX IF NOT EXISTS idx_stripe_events_processed ON stripe_events(processed);
CREATE INDEX IF NOT EXISTS idx_ops_activity_user ON ops_activity_log(ops_user_id);
CREATE INDEX IF NOT EXISTS idx_ops_activity_entity ON ops_activity_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_customer_notes_org ON customer_notes(organization_id);
CREATE INDEX IF NOT EXISTS idx_customer_health_org ON customer_health(organization_id);
CREATE INDEX IF NOT EXISTS idx_customer_health_risk ON customer_health(risk_level);
CREATE INDEX IF NOT EXISTS idx_employees_seat_type ON employees(seat_type);

-- ============================================================
-- FLEX SEAT ORDERS (Time-bound flexi-licensing)
-- ============================================================

-- Time-bound flex seat purchases for seasonal workers
CREATE TABLE IF NOT EXISTS flex_seat_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Order details
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price_per_seat INTEGER NOT NULL,  -- pence, at time of order
    total_amount INTEGER NOT NULL,    -- quantity * price_per_seat

    -- Validity period
    valid_from DATE NOT NULL,
    valid_to DATE NOT NULL,

    -- Billing
    stripe_invoice_id TEXT,
    stripe_invoice_status TEXT, -- draft, open, paid, void

    -- Status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'expired', 'cancelled')),

    -- Metadata
    requested_by UUID REFERENCES users(id),
    approved_by UUID,  -- ops user who approved (if manual)
    notes TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Ensure valid_to > valid_from
    CONSTRAINT valid_date_range CHECK (valid_to > valid_from)
);

-- Index for finding active flex orders
CREATE INDEX IF NOT EXISTS idx_flex_orders_org_dates
ON flex_seat_orders(organization_id, valid_from, valid_to)
WHERE status = 'active';

-- Index for expiring orders
CREATE INDEX IF NOT EXISTS idx_flex_orders_expiry
ON flex_seat_orders(valid_to)
WHERE status = 'active';

-- ============================================================
-- FUNCTIONS: Flex seat calculations
-- ============================================================

-- Function to get current active flex seats for an org
CREATE OR REPLACE FUNCTION get_active_flex_seats(org_id UUID)
RETURNS INTEGER AS $$
    SELECT COALESCE(SUM(quantity), 0)::INTEGER
    FROM flex_seat_orders
    WHERE organization_id = org_id
      AND status = 'active'
      AND valid_from <= CURRENT_DATE
      AND valid_to >= CURRENT_DATE;
$$ LANGUAGE SQL STABLE;

-- Function to get total allowed seats (core + permanent flex + active temporary flex)
CREATE OR REPLACE FUNCTION get_total_seat_allowance(org_id UUID)
RETURNS INTEGER AS $$
    SELECT
        COALESCE(s.core_seats, 0) +
        COALESCE(s.flex_seats, 0) +
        get_active_flex_seats(org_id)
    FROM subscriptions s
    WHERE s.organization_id = org_id
      AND s.status IN ('active', 'trialing');
$$ LANGUAGE SQL STABLE;

-- ============================================================
-- VIEW: Subscription summary for billing queries
-- ============================================================

CREATE OR REPLACE VIEW v_subscription_summary AS
SELECT
    o.id AS organization_id,
    o.name AS organization_name,
    s.id AS subscription_id,
    bp.name AS plan_name,
    bp.slug AS plan_slug,
    s.core_seats,
    s.flex_seats AS permanent_flex_seats,
    get_active_flex_seats(o.id) AS temporary_flex_seats,
    s.core_seats + s.flex_seats + get_active_flex_seats(o.id) AS total_seats,
    s.is_founding_partner,
    CASE
        WHEN s.is_founding_partner THEN bp.core_seat_price_monthly
        ELSE bp.regular_core_price
    END AS effective_core_price,
    CASE
        WHEN s.is_founding_partner THEN bp.flex_seat_price_monthly
        ELSE bp.regular_flex_price
    END AS effective_flex_price,
    s.status,
    s.current_period_start,
    s.current_period_end,
    s.cancel_at_period_end
FROM organizations o
JOIN subscriptions s ON s.organization_id = o.id
JOIN billing_plans bp ON bp.id = s.plan_id;

-- ============================================================
-- SEED DATA: Default plans
-- ============================================================

-- Clear existing plans to update with correct pricing
DELETE FROM billing_plans WHERE slug IN ('growth', 'scale', 'enterprise');

-- Insert correct pricing (amounts in pence)
INSERT INTO billing_plans (
    name, slug, description,
    core_seat_price_monthly, flex_seat_price_monthly, currency,
    min_core_seats, max_core_seats, max_flex_seats,
    features,
    pilot_setup_fee, regular_core_price, regular_flex_price,
    display_order
) VALUES
(
    'Growth',
    'growth',
    'For growing teams of 50-250 workers',
    1000,   -- £10/user/month (founding partner price)
    1200,   -- £12/user/month (base + £2 flex premium)
    'gbp',
    50,     -- minimum 50 seats
    250,    -- max 250 seats
    125,    -- max flex = 50% of max core
    '{
        "mobile_app": true,
        "scheduling": true,
        "time_tracking": true,
        "skills_matrix": true,
        "career_pathing": true,
        "gamification": true,
        "basic_analytics": true,
        "integrations": true,
        "api_access": false,
        "sso": false,
        "custom_branding": false,
        "dedicated_support": false
    }',
    250000,  -- £2,500 pilot setup fee
    1500,    -- £15/user regular price
    1700,    -- £17/user regular flex price
    1
),
(
    'Scale',
    'scale',
    'For established operations with 251-750 workers',
    800,    -- £8/user/month (founding partner price)
    1000,   -- £10/user/month (base + £2 flex premium)
    'gbp',
    251,    -- minimum 251 seats
    750,    -- max 750 seats
    375,    -- max flex = 50% of max core
    '{
        "mobile_app": true,
        "scheduling": true,
        "time_tracking": true,
        "skills_matrix": true,
        "career_pathing": true,
        "gamification": true,
        "basic_analytics": true,
        "advanced_analytics": true,
        "integrations": true,
        "custom_integrations": true,
        "api_access": true,
        "sso": false,
        "custom_branding": false,
        "dedicated_support": true,
        "quarterly_reviews": true
    }',
    500000,  -- £5,000 pilot setup fee
    1200,    -- £12/user regular price
    1400,    -- £14/user regular flex price
    2
),
(
    'Enterprise',
    'enterprise',
    'For large organisations with 750+ workers',
    0,      -- POA - custom pricing
    0,      -- POA - custom pricing
    'gbp',
    751,    -- minimum 751 seats
    NULL,   -- unlimited
    NULL,   -- unlimited flex
    '{
        "mobile_app": true,
        "scheduling": true,
        "time_tracking": true,
        "skills_matrix": true,
        "career_pathing": true,
        "gamification": true,
        "basic_analytics": true,
        "advanced_analytics": true,
        "integrations": true,
        "custom_integrations": true,
        "api_access": true,
        "sso": true,
        "custom_branding": true,
        "dedicated_support": true,
        "quarterly_reviews": true,
        "sla_guarantees": true,
        "on_premise": true,
        "custom_development": true,
        "white_label": true
    }',
    1000000, -- £10,000+ pilot setup fee (minimum)
    0,       -- POA
    0,       -- POA
    3
);
