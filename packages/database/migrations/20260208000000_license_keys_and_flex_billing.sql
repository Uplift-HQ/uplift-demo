-- ============================================================
-- LICENSE KEYS & FLEX BILLING ENHANCEMENTS
-- Supports full customer lifecycle management in ops portal
-- ============================================================

-- ============================================================
-- LICENSE KEYS
-- Manage license keys for customer organizations
-- ============================================================

CREATE TABLE IF NOT EXISTS license_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- License key format: UPL-{TYPE}-{RANDOM}-{CHECK}
    license_key VARCHAR(50) NOT NULL UNIQUE,

    -- Plan and capacity
    key_type VARCHAR(20) NOT NULL DEFAULT 'annual',
    -- 'annual' (ANN), 'flex' (FLX), 'trial' (TRL), 'enterprise' (ENT)
    plan_type VARCHAR(20) NOT NULL DEFAULT 'growth',
    -- 'growth', 'scale', 'enterprise'

    -- Seat limits
    max_seats INTEGER NOT NULL DEFAULT 50,
    flex_seats_limit INTEGER NOT NULL DEFAULT 25, -- Default 50% of max_seats
    activated_seats INTEGER NOT NULL DEFAULT 0,

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    -- 'active', 'suspended', 'revoked', 'expired'

    -- Dates
    activated_at TIMESTAMPTZ,
    valid_until TIMESTAMPTZ,
    suspended_at TIMESTAMPTZ,
    suspension_reason TEXT,

    -- Audit
    created_by UUID REFERENCES ops_users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for license_keys
CREATE INDEX IF NOT EXISTS idx_license_keys_org ON license_keys(organization_id);
CREATE INDEX IF NOT EXISTS idx_license_keys_key ON license_keys(license_key);
CREATE INDEX IF NOT EXISTS idx_license_keys_status ON license_keys(status);
CREATE INDEX IF NOT EXISTS idx_license_keys_type ON license_keys(key_type);
CREATE INDEX IF NOT EXISTS idx_license_keys_plan ON license_keys(plan_type);

-- ============================================================
-- FLEX BILLING ENHANCEMENTS
-- Track flex seat usage for accurate billing
-- ============================================================

-- Add flex tracking columns to subscriptions
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS flex_seats_used INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS flex_rate_premium INTEGER NOT NULL DEFAULT 200,
-- Premium in pence (£2.00 default)
ADD COLUMN IF NOT EXISTS flex_seats_limit INTEGER,
-- Maximum flex seats allowed (NULL = 50% of core_seats)
ADD COLUMN IF NOT EXISTS contract_months INTEGER DEFAULT 12,
ADD COLUMN IF NOT EXISTS contract_start_date DATE,
ADD COLUMN IF NOT EXISTS contract_end_date DATE,
ADD COLUMN IF NOT EXISTS setup_fee INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS setup_fee_credited BOOLEAN DEFAULT false;

-- Add flex breakdown to invoices
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS base_seats INTEGER,
ADD COLUMN IF NOT EXISTS base_amount INTEGER,
ADD COLUMN IF NOT EXISTS flex_seats_billed INTEGER,
ADD COLUMN IF NOT EXISTS flex_amount INTEGER,
ADD COLUMN IF NOT EXISTS flex_rate INTEGER,
ADD COLUMN IF NOT EXISTS billing_period_label VARCHAR(50);

-- ============================================================
-- LICENSE ACTIVITY LOG
-- Track all operations on license keys
-- ============================================================

CREATE TABLE IF NOT EXISTS license_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    license_id UUID NOT NULL REFERENCES license_keys(id) ON DELETE CASCADE,

    action VARCHAR(50) NOT NULL,
    -- 'created', 'activated', 'suspended', 'reactivated', 'revoked',
    -- 'seats_modified', 'expiry_extended', 'validated'

    previous_value JSONB,
    new_value JSONB,

    performed_by UUID REFERENCES ops_users(id),
    ip_address INET,
    user_agent TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_license_activity_license ON license_activity(license_id);
CREATE INDEX IF NOT EXISTS idx_license_activity_action ON license_activity(action);
CREATE INDEX IF NOT EXISTS idx_license_activity_date ON license_activity(created_at DESC);

-- ============================================================
-- CUSTOMER CREDITS
-- Track credits applied to customer accounts
-- ============================================================

CREATE TABLE IF NOT EXISTS customer_credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Credit details
    amount INTEGER NOT NULL, -- in pence
    currency VARCHAR(3) NOT NULL DEFAULT 'gbp',
    reason TEXT NOT NULL,

    -- Application
    applied_to_invoice_id UUID REFERENCES invoices(id),
    applied_at TIMESTAMPTZ,

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- 'pending', 'applied', 'expired', 'cancelled'
    expires_at TIMESTAMPTZ,

    -- Audit
    created_by UUID REFERENCES ops_users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_credits_org ON customer_credits(organization_id);
CREATE INDEX IF NOT EXISTS idx_customer_credits_status ON customer_credits(status);

-- ============================================================
-- ORGANIZATION ENHANCEMENTS
-- Additional fields for onboarding
-- ============================================================

ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS trading_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS company_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS industry VARCHAR(100),
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS primary_contact_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS primary_contact_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS primary_contact_phone VARCHAR(50),
ADD COLUMN IF NOT EXISTS address_line1 VARCHAR(255),
ADD COLUMN IF NOT EXISTS address_line2 VARCHAR(255),
ADD COLUMN IF NOT EXISTS city VARCHAR(100),
ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20),
ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'United Kingdom',
ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS onboarded_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS onboarded_by UUID REFERENCES ops_users(id);

-- ============================================================
-- LOCATIONS TABLE
-- Track customer locations/sites
-- ============================================================

CREATE TABLE IF NOT EXISTS organization_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    name VARCHAR(255) NOT NULL,
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'United Kingdom',
    timezone VARCHAR(50) DEFAULT 'Europe/London',

    headcount INTEGER DEFAULT 0,
    is_primary BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_org_locations_org ON organization_locations(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_locations_primary ON organization_locations(organization_id, is_primary) WHERE is_primary = true;

-- ============================================================
-- SUBSCRIPTION CANCELLATIONS
-- Track cancellation details
-- ============================================================

CREATE TABLE IF NOT EXISTS subscription_cancellations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    reason_category VARCHAR(50) NOT NULL,
    -- 'budget', 'competitor', 'not_using', 'features', 'support', 'other'
    reason_detail TEXT,

    effective_type VARCHAR(20) NOT NULL DEFAULT 'period_end',
    -- 'immediate', 'period_end'
    effective_date TIMESTAMPTZ NOT NULL,

    users_affected INTEGER DEFAULT 0,
    mrr_lost INTEGER DEFAULT 0, -- in pence

    -- Retention attempt
    retention_offered BOOLEAN DEFAULT false,
    retention_offer TEXT,
    retention_accepted BOOLEAN,

    cancelled_by UUID REFERENCES ops_users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sub_cancellations_sub ON subscription_cancellations(subscription_id);
CREATE INDEX IF NOT EXISTS idx_sub_cancellations_org ON subscription_cancellations(organization_id);
CREATE INDEX IF NOT EXISTS idx_sub_cancellations_reason ON subscription_cancellations(reason_category);
CREATE INDEX IF NOT EXISTS idx_sub_cancellations_date ON subscription_cancellations(effective_date);

-- ============================================================
-- VIEWS
-- ============================================================

-- License overview with organization details
CREATE OR REPLACE VIEW v_license_overview AS
SELECT
    lk.id,
    lk.license_key,
    lk.key_type,
    lk.plan_type,
    lk.max_seats,
    lk.flex_seats_limit,
    lk.activated_seats,
    lk.status,
    lk.activated_at,
    lk.valid_until,
    lk.created_at,
    o.id AS organization_id,
    o.name AS organization_name,
    o.slug AS organization_slug,
    ou.first_name || ' ' || ou.last_name AS created_by_name
FROM license_keys lk
JOIN organizations o ON lk.organization_id = o.id
LEFT JOIN ops_users ou ON lk.created_by = ou.id;

-- Flex billing summary per organization
CREATE OR REPLACE VIEW v_flex_billing_summary AS
SELECT
    o.id AS organization_id,
    o.name AS organization_name,
    s.core_seats,
    s.flex_seats_used,
    s.flex_rate_premium,
    bp.core_seat_price_monthly AS base_rate,
    bp.flex_seat_price_monthly AS flex_rate,
    (s.core_seats * bp.core_seat_price_monthly) AS base_monthly,
    (s.flex_seats_used * (bp.core_seat_price_monthly + s.flex_rate_premium)) AS flex_monthly,
    (s.core_seats * bp.core_seat_price_monthly) +
    (s.flex_seats_used * (bp.core_seat_price_monthly + s.flex_rate_premium)) AS total_monthly,
    s.status
FROM subscriptions s
JOIN organizations o ON s.organization_id = o.id
JOIN billing_plans bp ON s.plan_id = bp.id
WHERE s.status IN ('active', 'trialing', 'past_due');

-- ============================================================
-- SEED OPS USER (for development/testing)
-- ============================================================

-- Only insert if not exists
INSERT INTO ops_users (email, password_hash, first_name, last_name, role, is_active)
SELECT 'ops@uplift.hr',
       '$2b$10$rqHN.5yjxJH7dQ3k4xJ7/.yHHJEXJHCE5H2hKcEVMG3eDf7XEyZ2C', -- 'OpsAdmin123!'
       'Ops', 'Admin', 'admin', true
WHERE NOT EXISTS (SELECT 1 FROM ops_users WHERE email = 'ops@uplift.hr');
