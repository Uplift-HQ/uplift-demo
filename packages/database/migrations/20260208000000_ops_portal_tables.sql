-- ============================================================
-- OPS PORTAL TABLES
-- Required tables for ops portal functionality
-- ============================================================

-- Enable uuid extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------
-- OPS ROLES TABLE
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ops_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO ops_roles (name, description, permissions, is_system) VALUES
  ('super_admin', 'Full access to all features including user management',
   '["onboard", "customers.view", "customers.edit", "licenses.view", "licenses.edit", "features.view", "features.edit", "billing.view", "billing.edit", "activity.view", "users.view", "users.edit", "users.create", "users.delete", "impersonate", "audit.view"]'::jsonb, true),
  ('admin', 'Full access except user management',
   '["onboard", "customers.view", "customers.edit", "licenses.view", "licenses.edit", "features.view", "features.edit", "billing.view", "billing.edit", "activity.view", "impersonate", "audit.view"]'::jsonb, true),
  ('support', 'Customer support with impersonation',
   '["customers.view", "customers.edit", "licenses.view", "activity.view", "impersonate"]'::jsonb, true),
  ('billing_viewer', 'View billing and customers only',
   '["customers.view", "billing.view", "activity.view"]'::jsonb, true),
  ('read_only', 'View-only access to all data',
   '["customers.view", "licenses.view", "features.view", "billing.view", "activity.view"]'::jsonb, true)
ON CONFLICT (name) DO NOTHING;

-- ------------------------------------------------------------
-- OPS USERS TABLE (if not exists)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ops_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'admin',
  role_id UUID REFERENCES ops_roles(id),
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  is_active BOOLEAN NOT NULL DEFAULT true,
  login_count INTEGER NOT NULL DEFAULT 0,
  failed_login_count INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  force_password_change BOOLEAN NOT NULL DEFAULT false,
  mfa_enabled BOOLEAN NOT NULL DEFAULT false,
  mfa_secret VARCHAR(255),
  created_by UUID REFERENCES ops_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- OPS SESSIONS TABLE
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ops_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ops_user_id UUID NOT NULL REFERENCES ops_users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  device_info JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ops_sessions_user ON ops_sessions(ops_user_id);
CREATE INDEX IF NOT EXISTS idx_ops_sessions_token ON ops_sessions(token_hash);

-- ------------------------------------------------------------
-- OPS AUDIT LOG TABLE
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ops_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ops_user_id UUID REFERENCES ops_users(id) ON DELETE SET NULL,
  ops_user_email VARCHAR(255),
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(100),
  target_id UUID,
  target_name VARCHAR(255),
  details JSONB DEFAULT '{}'::jsonb,
  ip_address VARCHAR(45),
  user_agent TEXT,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ops_audit_user ON ops_audit_log(ops_user_id);
CREATE INDEX IF NOT EXISTS idx_ops_audit_action ON ops_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_ops_audit_time ON ops_audit_log(created_at DESC);

-- ------------------------------------------------------------
-- OPS ACTIVITY LOG TABLE
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ops_activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ops_user_id UUID REFERENCES ops_users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100),
  entity_id UUID,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ops_activity_user ON ops_activity_log(ops_user_id);
CREATE INDEX IF NOT EXISTS idx_ops_activity_time ON ops_activity_log(created_at DESC);

-- ------------------------------------------------------------
-- CUSTOMER NOTES TABLE
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS customer_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  ops_user_id UUID REFERENCES ops_users(id) ON DELETE SET NULL,
  note TEXT NOT NULL,
  note_type VARCHAR(50) DEFAULT 'general',
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_notes_org ON customer_notes(organization_id);

-- ------------------------------------------------------------
-- CUSTOMER HEALTH TABLE
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS customer_health (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID UNIQUE NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  overall_score INTEGER DEFAULT 0,
  risk_level VARCHAR(20) DEFAULT 'low',
  last_calculated_at TIMESTAMPTZ DEFAULT NOW(),
  factors JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- FEATURE OVERRIDES TABLE
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS feature_overrides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  feature_key VARCHAR(100) NOT NULL,
  enabled BOOLEAN NOT NULL,
  reason TEXT,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES ops_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, feature_key)
);

CREATE INDEX IF NOT EXISTS idx_feature_overrides_org ON feature_overrides(organization_id);

-- ------------------------------------------------------------
-- LICENSE KEYS TABLE (if not exists)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS license_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  license_key VARCHAR(50) UNIQUE NOT NULL,
  plan_type VARCHAR(30) NOT NULL DEFAULT 'growth',
  key_type VARCHAR(30) NOT NULL DEFAULT 'annual',
  max_seats INTEGER NOT NULL DEFAULT 50,
  flex_seats_limit INTEGER,
  activated_seats INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(30) NOT NULL DEFAULT 'active',
  activated_at TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  created_by UUID REFERENCES ops_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_license_keys_org ON license_keys(organization_id);
CREATE INDEX IF NOT EXISTS idx_license_keys_status ON license_keys(status);

-- ------------------------------------------------------------
-- SEAT CHANGES TABLE
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS seat_changes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  previous_core_seats INTEGER,
  new_core_seats INTEGER,
  previous_flex_seats INTEGER,
  new_flex_seats INTEGER,
  reason TEXT,
  changed_by UUID REFERENCES ops_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seat_changes_org ON seat_changes(organization_id);

-- ------------------------------------------------------------
-- SUPER ADMIN USER
-- Password: UpliftOps2026!
-- ------------------------------------------------------------
DO $$
DECLARE
  super_admin_role_id UUID;
BEGIN
  SELECT id INTO super_admin_role_id FROM ops_roles WHERE name = 'super_admin';

  INSERT INTO ops_users (
    email, name, first_name, last_name, password_hash,
    role_id, role, status, is_active
  ) VALUES (
    'dazevedo@uplifthq.co.uk',
    'Diogo Azevedo',
    'Diogo',
    'Azevedo',
    '$2a$10$0BHhU5NhcyQvqbY8M9nBWO9F5TxmKuFHwZ4RtOHbnvLwpSOAyeIxS',
    super_admin_role_id,
    'super_admin',
    'active',
    true
  )
  ON CONFLICT (email) DO UPDATE SET
    password_hash = '$2a$10$0BHhU5NhcyQvqbY8M9nBWO9F5TxmKuFHwZ4RtOHbnvLwpSOAyeIxS',
    role_id = super_admin_role_id,
    role = 'super_admin',
    name = 'Diogo Azevedo',
    is_active = true,
    status = 'active';
END $$;
