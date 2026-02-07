-- ============================================================
-- OPS USER MANAGEMENT & RBAC
-- Admin user management, roles, sessions, and audit logging
-- ============================================================

-- ------------------------------------------------------------
-- OPS ROLES TABLE
-- Define permissions for each role
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS ops_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_system BOOLEAN NOT NULL DEFAULT false,  -- Cannot be deleted
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default roles with permissions
INSERT INTO ops_roles (name, description, permissions, is_system) VALUES
  ('super_admin', 'Full access to all features including user management',
   '["onboard", "customers.view", "customers.edit", "licenses.view", "licenses.edit", "features.view", "features.edit", "billing.view", "billing.edit", "activity.view", "users.view", "users.edit", "users.create", "users.delete", "impersonate", "audit.view"]'::jsonb, true),
  ('admin', 'Full access except user management',
   '["onboard", "customers.view", "customers.edit", "licenses.view", "licenses.edit", "features.view", "features.edit", "billing.view", "billing.edit", "activity.view", "impersonate", "audit.view"]'::jsonb, true),
  ('billing_viewer', 'View billing and customers only',
   '["customers.view", "billing.view", "activity.view"]'::jsonb, true),
  ('support', 'Customer support with impersonation',
   '["customers.view", "customers.edit", "licenses.view", "activity.view", "impersonate"]'::jsonb, true),
  ('read_only', 'View-only access to all data',
   '["customers.view", "licenses.view", "features.view", "billing.view", "activity.view"]'::jsonb, true)
ON CONFLICT (name) DO NOTHING;

-- ------------------------------------------------------------
-- EXTEND OPS_USERS TABLE
-- Add security and MFA fields
-- ------------------------------------------------------------

-- Add columns if they don't exist
ALTER TABLE ops_users
ADD COLUMN IF NOT EXISTS name VARCHAR(255),
ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'active',
ADD COLUMN IF NOT EXISTS login_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS failed_login_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS force_password_change BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS mfa_secret VARCHAR(255),
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES ops_users(id);

-- Add role_id column with foreign key
ALTER TABLE ops_users
ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES ops_roles(id);

-- Update name from first_name + last_name if empty
UPDATE ops_users SET name = CONCAT(first_name, ' ', last_name) WHERE name IS NULL;

-- Set default role to admin for existing users
UPDATE ops_users SET role_id = (SELECT id FROM ops_roles WHERE name = 'admin') WHERE role_id IS NULL;

-- Add constraint for status
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ops_users_status_check') THEN
    ALTER TABLE ops_users ADD CONSTRAINT ops_users_status_check
      CHECK (status IN ('active', 'suspended', 'disabled'));
  END IF;
END $$;

-- ------------------------------------------------------------
-- OPS SESSIONS TABLE
-- Track active sessions for security
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS ops_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ops_user_id UUID NOT NULL REFERENCES ops_users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,  -- Hashed session token
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
CREATE INDEX IF NOT EXISTS idx_ops_sessions_active ON ops_sessions(ops_user_id) WHERE revoked_at IS NULL AND expires_at > NOW();

-- ------------------------------------------------------------
-- OPS AUDIT LOG TABLE
-- Comprehensive audit trail for all admin actions
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS ops_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ops_user_id UUID REFERENCES ops_users(id) ON DELETE SET NULL,
  ops_user_email VARCHAR(255),  -- Denormalized for history
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(100),  -- 'user', 'customer', 'license', 'subscription', etc.
  target_id UUID,
  target_name VARCHAR(255),  -- Denormalized for readability
  details JSONB DEFAULT '{}'::jsonb,
  ip_address VARCHAR(45),
  user_agent TEXT,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ops_audit_user ON ops_audit_log(ops_user_id);
CREATE INDEX IF NOT EXISTS idx_ops_audit_action ON ops_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_ops_audit_target ON ops_audit_log(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_ops_audit_time ON ops_audit_log(created_at DESC);

-- ------------------------------------------------------------
-- DEFAULT SUPER ADMIN USER
-- dazevedo@uplifthq.co.uk with force_password_change
-- ------------------------------------------------------------

-- Get super_admin role id
DO $$
DECLARE
  super_admin_role_id UUID;
  temp_password_hash VARCHAR(255);
BEGIN
  SELECT id INTO super_admin_role_id FROM ops_roles WHERE name = 'super_admin';

  -- Hash for 'ChangeMe123!' - should be changed on first login
  -- Note: In production, this should be a proper bcrypt hash
  temp_password_hash := '$2a$10$rQdJmDVHxlxMVn7H6XhxXuN8dPQZGxQ.3nK4sS3LxPqQCqV4qVVXu';

  -- Insert or update super admin
  INSERT INTO ops_users (
    email,
    name,
    first_name,
    last_name,
    password_hash,
    role_id,
    role,  -- Legacy field
    status,
    force_password_change,
    is_active
  ) VALUES (
    'dazevedo@uplifthq.co.uk',
    'Diogo Azevedo',
    'Diogo',
    'Azevedo',
    temp_password_hash,
    super_admin_role_id,
    'super_admin',
    'active',
    true,
    true
  )
  ON CONFLICT (email) DO UPDATE SET
    role_id = super_admin_role_id,
    role = 'super_admin',
    name = 'Diogo Azevedo';
END $$;

-- ------------------------------------------------------------
-- TRIGGERS
-- ------------------------------------------------------------

-- Update updated_at on ops_users
DROP TRIGGER IF EXISTS update_ops_users_ts ON ops_users;
CREATE TRIGGER update_ops_users_ts
  BEFORE UPDATE ON ops_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Update updated_at on ops_roles
DROP TRIGGER IF EXISTS update_ops_roles_ts ON ops_roles;
CREATE TRIGGER update_ops_roles_ts
  BEFORE UPDATE ON ops_roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
