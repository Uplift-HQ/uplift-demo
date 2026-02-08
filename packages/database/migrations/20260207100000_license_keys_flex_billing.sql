-- ============================================================
-- LICENSE KEYS & FLEX BILLING ENHANCEMENTS
-- Part of OPS Portal Production-Ready Build
-- ============================================================

-- ------------------------------------------------------------
-- LICENSE KEYS TABLE
-- Format: UPL-{TYPE}-{RANDOM}-{CHECK}
-- Types: ANN (annual), FLX (flex), TRL (trial), ENT (enterprise), GRO (growth), SCA (scale)
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS license_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Key identity
  license_key VARCHAR(50) UNIQUE NOT NULL,  -- UPL-GRO-A1B2C3D4E5F6G7H8-ABCD
  plan_type VARCHAR(30) NOT NULL DEFAULT 'growth',  -- growth, scale, enterprise
  key_type VARCHAR(30) NOT NULL DEFAULT 'annual',   -- annual, flex, trial, enterprise

  -- Seat limits
  max_seats INTEGER NOT NULL DEFAULT 50,
  flex_seats_limit INTEGER,  -- NULL means use default (50% of max_seats)
  activated_seats INTEGER NOT NULL DEFAULT 0,

  -- Status
  status VARCHAR(30) NOT NULL DEFAULT 'active',  -- active, suspended, revoked, expired

  -- Dates
  activated_at TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,  -- NULL = never expires

  -- Audit
  created_by UUID REFERENCES ops_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_license_keys_org ON license_keys(organization_id);
CREATE INDEX IF NOT EXISTS idx_license_keys_status ON license_keys(status);
CREATE INDEX IF NOT EXISTS idx_license_keys_key ON license_keys(license_key);

-- ------------------------------------------------------------
-- FLEX BILLING COLUMNS ON SUBSCRIPTIONS
-- Track flex seat usage and premium rates
-- ------------------------------------------------------------

-- Add flex billing columns to subscriptions
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS flex_seats_used INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS flex_rate_premium DECIMAL(10,2) NOT NULL DEFAULT 2.00,  -- £2 premium per flex seat
ADD COLUMN IF NOT EXISTS flex_billing_enabled BOOLEAN NOT NULL DEFAULT true;

-- Add trial extension reason
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS trial_extended_reason TEXT,
ADD COLUMN IF NOT EXISTS trial_extended_by UUID REFERENCES ops_users(id),
ADD COLUMN IF NOT EXISTS trial_extended_at TIMESTAMPTZ;

-- ------------------------------------------------------------
-- ENHANCED INVOICES
-- Track base vs flex amounts separately
-- ------------------------------------------------------------

ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS base_amount INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS flex_amount INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS flex_seats_billed INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS stripe_invoice_number VARCHAR(100);

-- Add due_date if not exists (might be named differently)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'invoices' AND column_name = 'due_date') THEN
    ALTER TABLE invoices ADD COLUMN due_date DATE;
  END IF;
END $$;

-- ------------------------------------------------------------
-- CUSTOMER CREDITS
-- Track credits applied to customer accounts
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS customer_credits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Credit details
  amount INTEGER NOT NULL,  -- in pence
  currency VARCHAR(3) NOT NULL DEFAULT 'GBP',
  reason TEXT NOT NULL,

  -- Application
  applied_to_invoice_id UUID REFERENCES invoices(id),
  applied_at TIMESTAMPTZ,

  -- Status
  status VARCHAR(30) NOT NULL DEFAULT 'pending',  -- pending, applied, expired
  expires_at TIMESTAMPTZ,

  -- Audit
  created_by UUID REFERENCES ops_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_credits_org ON customer_credits(organization_id);
CREATE INDEX IF NOT EXISTS idx_customer_credits_status ON customer_credits(status);

-- ------------------------------------------------------------
-- ORGANIZATION ENHANCEMENTS
-- Additional fields for onboarding wizard
-- ------------------------------------------------------------

ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS trading_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS company_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS industry VARCHAR(100),
ADD COLUMN IF NOT EXISTS primary_contact_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS primary_contact_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS primary_contact_phone VARCHAR(50),
ADD COLUMN IF NOT EXISTS address_line1 VARCHAR(255),
ADD COLUMN IF NOT EXISTS address_line2 VARCHAR(255),
ADD COLUMN IF NOT EXISTS city VARCHAR(100),
ADD COLUMN IF NOT EXISTS postcode VARCHAR(20),
ADD COLUMN IF NOT EXISTS country VARCHAR(2) DEFAULT 'GB',
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- ------------------------------------------------------------
-- SUBSCRIPTION ENHANCEMENTS
-- Contract and setup fee tracking
-- ------------------------------------------------------------

ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS contract_start_date DATE,
ADD COLUMN IF NOT EXISTS contract_months INTEGER DEFAULT 12,
ADD COLUMN IF NOT EXISTS setup_fee INTEGER DEFAULT 0,  -- in pence
ADD COLUMN IF NOT EXISTS setup_fee_credited BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_trial BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

-- ------------------------------------------------------------
-- FEATURE FLAGS DEFAULTS
-- Plan-level default features
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS feature_defaults (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_slug VARCHAR(50) NOT NULL,
  feature_key VARCHAR(100) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(plan_slug, feature_key)
);

-- Seed default features per plan
INSERT INTO feature_defaults (plan_slug, feature_key, enabled) VALUES
  -- Growth features
  ('growth', 'ai_scheduling', false),
  ('growth', 'shift_marketplace', true),
  ('growth', 'payroll_export', true),
  ('growth', 'api_access', false),
  ('growth', 'sso', false),
  ('growth', 'custom_branding', false),
  ('growth', 'advanced_analytics', false),
  ('growth', 'compliance_module', true),

  -- Scale features
  ('scale', 'ai_scheduling', true),
  ('scale', 'shift_marketplace', true),
  ('scale', 'payroll_export', true),
  ('scale', 'api_access', true),
  ('scale', 'sso', false),
  ('scale', 'custom_branding', false),
  ('scale', 'advanced_analytics', true),
  ('scale', 'compliance_module', true),

  -- Enterprise features
  ('enterprise', 'ai_scheduling', true),
  ('enterprise', 'shift_marketplace', true),
  ('enterprise', 'payroll_export', true),
  ('enterprise', 'api_access', true),
  ('enterprise', 'sso', true),
  ('enterprise', 'custom_branding', true),
  ('enterprise', 'advanced_analytics', true),
  ('enterprise', 'compliance_module', true)
ON CONFLICT (plan_slug, feature_key) DO NOTHING;

-- ------------------------------------------------------------
-- INDEXES FOR PERFORMANCE
-- ------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_feature_defaults_plan ON feature_defaults(plan_slug);
CREATE INDEX IF NOT EXISTS idx_subscriptions_flex ON subscriptions(organization_id) WHERE flex_billing_enabled = true;

-- ------------------------------------------------------------
-- TRIGGER: Update license_keys.updated_at
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_license_keys_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_license_keys_ts ON license_keys;
CREATE TRIGGER update_license_keys_ts
  BEFORE UPDATE ON license_keys
  FOR EACH ROW EXECUTE FUNCTION update_license_keys_updated_at();
