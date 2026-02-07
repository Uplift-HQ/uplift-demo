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
-- SEED DATA: Default plans
-- ============================================================

INSERT INTO billing_plans (name, slug, description, core_seat_price_monthly, flex_seat_price_monthly, min_core_seats, features, display_order)
VALUES 
    ('Growth', 'growth', 'For growing teams ready to modernize workforce management', 1000, 1000, 5, 
     '{"shifts": true, "time_tracking": true, "skills": true, "basic_reporting": true, "mobile_app": true}', 1),
    ('Scale', 'scale', 'For organizations that need advanced features and integrations', 800, 800, 50,
     '{"shifts": true, "time_tracking": true, "skills": true, "advanced_reporting": true, "mobile_app": true, "api_access": true, "integrations": true, "sso": false}', 2),
    ('Enterprise', 'enterprise', 'For large organizations with complex requirements', 0, 0, 200,
     '{"shifts": true, "time_tracking": true, "skills": true, "advanced_reporting": true, "mobile_app": true, "api_access": true, "integrations": true, "sso": true, "custom_branding": true, "dedicated_support": true}', 3)
ON CONFLICT (slug) DO NOTHING;
