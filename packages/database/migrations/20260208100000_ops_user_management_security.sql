-- ============================================================
-- OPS USER MANAGEMENT & SECURITY
-- Role-based access control, sessions, MFA, and audit logging
-- ============================================================

-- ============================================================
-- OPS ROLES
-- Define roles with specific permissions
-- ============================================================

CREATE TABLE IF NOT EXISTS ops_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,

    -- Permissions (granular control)
    can_manage_users BOOLEAN NOT NULL DEFAULT false,
    can_view_customers BOOLEAN NOT NULL DEFAULT false,
    can_edit_customers BOOLEAN NOT NULL DEFAULT false,
    can_manage_licenses BOOLEAN NOT NULL DEFAULT false,
    can_manage_billing BOOLEAN NOT NULL DEFAULT false,
    can_view_billing BOOLEAN NOT NULL DEFAULT false,
    can_manage_features BOOLEAN NOT NULL DEFAULT false,
    can_view_audit_log BOOLEAN NOT NULL DEFAULT false,
    can_onboard_customers BOOLEAN NOT NULL DEFAULT false,
    can_cancel_customers BOOLEAN NOT NULL DEFAULT false,
    can_view_activity BOOLEAN NOT NULL DEFAULT false,

    -- System flag (cannot be deleted)
    is_system BOOLEAN NOT NULL DEFAULT false,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- EXTEND OPS_USERS TABLE
-- Add security, MFA, and role fields
-- ============================================================

-- Add role reference
ALTER TABLE ops_users
ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES ops_roles(id);

-- Security fields
ALTER TABLE ops_users
ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_login_ip INET,
ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS force_password_change BOOLEAN NOT NULL DEFAULT false;

-- MFA fields
ALTER TABLE ops_users
ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS mfa_secret VARCHAR(64),
ADD COLUMN IF NOT EXISTS mfa_backup_codes TEXT[],
ADD COLUMN IF NOT EXISTS mfa_verified_at TIMESTAMPTZ;

-- Profile fields
ALTER TABLE ops_users
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'Europe/London',
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES ops_users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES ops_users(id);

-- ============================================================
-- OPS SESSIONS
-- Track active user sessions
-- ============================================================

CREATE TABLE IF NOT EXISTS ops_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ops_user_id UUID NOT NULL REFERENCES ops_users(id) ON DELETE CASCADE,

    -- Session token (hashed)
    token_hash VARCHAR(128) NOT NULL UNIQUE,

    -- Session info
    ip_address INET,
    user_agent TEXT,
    device_type VARCHAR(50), -- 'desktop', 'mobile', 'tablet'
    browser VARCHAR(100),
    os VARCHAR(100),

    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,

    -- Termination
    terminated_at TIMESTAMPTZ,
    terminated_by UUID REFERENCES ops_users(id),
    termination_reason VARCHAR(50), -- 'logout', 'expired', 'forced', 'password_change'

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ops_sessions_user ON ops_sessions(ops_user_id);
CREATE INDEX IF NOT EXISTS idx_ops_sessions_token ON ops_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_ops_sessions_active ON ops_sessions(ops_user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_ops_sessions_expires ON ops_sessions(expires_at);

-- ============================================================
-- OPS AUDIT LOG
-- Track security-sensitive operations
-- ============================================================

CREATE TABLE IF NOT EXISTS ops_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Who
    ops_user_id UUID REFERENCES ops_users(id),
    ops_user_email VARCHAR(255), -- Denormalized for deleted users

    -- What
    action VARCHAR(100) NOT NULL,
    -- Categories: auth.*, user.*, customer.*, license.*, billing.*, feature.*, system.*

    category VARCHAR(50) NOT NULL,
    -- 'authentication', 'user_management', 'customer', 'license', 'billing', 'feature', 'system'

    severity VARCHAR(20) NOT NULL DEFAULT 'info',
    -- 'info', 'warning', 'critical'

    -- Context
    entity_type VARCHAR(50),
    entity_id UUID,
    entity_name VARCHAR(255), -- Denormalized for readability

    -- Details
    description TEXT,
    previous_value JSONB,
    new_value JSONB,
    metadata JSONB,

    -- Request info
    ip_address INET,
    user_agent TEXT,
    session_id UUID REFERENCES ops_sessions(id),

    -- Outcome
    success BOOLEAN NOT NULL DEFAULT true,
    error_message TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ops_audit_user ON ops_audit_log(ops_user_id);
CREATE INDEX IF NOT EXISTS idx_ops_audit_action ON ops_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_ops_audit_category ON ops_audit_log(category);
CREATE INDEX IF NOT EXISTS idx_ops_audit_severity ON ops_audit_log(severity);
CREATE INDEX IF NOT EXISTS idx_ops_audit_entity ON ops_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_ops_audit_date ON ops_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ops_audit_date_category ON ops_audit_log(created_at DESC, category);

-- ============================================================
-- PASSWORD HISTORY
-- Prevent password reuse
-- ============================================================

CREATE TABLE IF NOT EXISTS ops_password_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ops_user_id UUID NOT NULL REFERENCES ops_users(id) ON DELETE CASCADE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ops_password_history_user ON ops_password_history(ops_user_id);

-- ============================================================
-- SEED DEFAULT ROLES
-- ============================================================

INSERT INTO ops_roles (name, display_name, description, is_system,
    can_manage_users, can_view_customers, can_edit_customers, can_manage_licenses,
    can_manage_billing, can_view_billing, can_manage_features, can_view_audit_log,
    can_onboard_customers, can_cancel_customers, can_view_activity)
VALUES
    ('super_admin', 'Super Admin', 'Full system access including user management', true,
     true, true, true, true, true, true, true, true, true, true, true),

    ('admin', 'Admin', 'Full customer and operations access', true,
     false, true, true, true, true, true, true, false, true, true, true),

    ('billing_viewer', 'Billing Viewer', 'View-only access to billing information', true,
     false, true, false, false, false, true, false, false, false, false, true),

    ('support', 'Support', 'Customer support and basic operations', true,
     false, true, true, true, false, false, false, false, false, false, true),

    ('read_only', 'Read Only', 'View-only access to customer data', true,
     false, true, false, false, false, false, false, false, false, false, true)
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- SEED SUPER ADMIN USER
-- dazevedo@uplifthq.co.uk
-- ============================================================

-- First, get the super_admin role ID
DO $$
DECLARE
    super_admin_role_id UUID;
    new_user_id UUID;
BEGIN
    SELECT id INTO super_admin_role_id FROM ops_roles WHERE name = 'super_admin';

    -- Insert the super admin user if not exists
    INSERT INTO ops_users (email, password_hash, first_name, last_name, role, role_id, is_active, force_password_change)
    SELECT
        'dazevedo@uplifthq.co.uk',
        '$2b$10$rqHN.5yjxJH7dQ3k4xJ7/.yHHJEXJHCE5H2hKcEVMG3eDf7XEyZ2C', -- 'OpsAdmin123!'
        'Diogo', 'Azevedo', 'admin', super_admin_role_id, true, true
    WHERE NOT EXISTS (SELECT 1 FROM ops_users WHERE email = 'dazevedo@uplifthq.co.uk')
    RETURNING id INTO new_user_id;

    -- Log the creation if user was created
    IF new_user_id IS NOT NULL THEN
        INSERT INTO ops_audit_log (
            ops_user_id, ops_user_email, action, category, severity,
            entity_type, entity_id, entity_name, description
        ) VALUES (
            new_user_id, 'dazevedo@uplifthq.co.uk', 'user.created', 'user_management', 'info',
            'ops_user', new_user_id, 'Diogo Azevedo', 'Initial super admin user created via migration'
        );
    END IF;
END $$;

-- Update existing ops@uplift.hr user to have a role (if exists)
DO $$
DECLARE
    admin_role_id UUID;
BEGIN
    SELECT id INTO admin_role_id FROM ops_roles WHERE name = 'admin';

    UPDATE ops_users
    SET role_id = admin_role_id
    WHERE email = 'ops@uplift.hr' AND role_id IS NULL;
END $$;

-- ============================================================
-- VIEWS
-- ============================================================

-- Users with role details
CREATE OR REPLACE VIEW v_ops_users AS
SELECT
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    u.first_name || ' ' || u.last_name AS full_name,
    u.role AS legacy_role,
    u.role_id,
    r.name AS role_name,
    r.display_name AS role_display_name,
    u.is_active,
    u.mfa_enabled,
    u.last_login_at,
    u.failed_login_attempts,
    u.locked_until,
    u.force_password_change,
    u.created_at,
    u.updated_at
FROM ops_users u
LEFT JOIN ops_roles r ON u.role_id = r.id;

-- Active sessions summary
CREATE OR REPLACE VIEW v_active_sessions AS
SELECT
    s.id,
    s.ops_user_id,
    u.email,
    u.first_name || ' ' || u.last_name AS user_name,
    s.ip_address,
    s.device_type,
    s.browser,
    s.os,
    s.last_activity_at,
    s.expires_at,
    s.created_at
FROM ops_sessions s
JOIN ops_users u ON s.ops_user_id = u.id
WHERE s.is_active = true AND s.expires_at > NOW();

-- Audit log with user details
CREATE OR REPLACE VIEW v_ops_audit_log AS
SELECT
    a.id,
    a.ops_user_id,
    COALESCE(u.email, a.ops_user_email) AS user_email,
    COALESCE(u.first_name || ' ' || u.last_name, 'System') AS user_name,
    a.action,
    a.category,
    a.severity,
    a.entity_type,
    a.entity_id,
    a.entity_name,
    a.description,
    a.success,
    a.error_message,
    a.ip_address,
    a.created_at
FROM ops_audit_log a
LEFT JOIN ops_users u ON a.ops_user_id = u.id;

-- ============================================================
-- CLEANUP FUNCTION
-- Remove expired sessions
-- ============================================================

CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    UPDATE ops_sessions
    SET is_active = false,
        terminated_at = NOW(),
        termination_reason = 'expired'
    WHERE is_active = true AND expires_at < NOW();

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
