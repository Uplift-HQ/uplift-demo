-- ============================================================
-- COOKIE CONSENT TRACKING
-- GDPR/PECR compliant cookie consent management
-- ============================================================

CREATE TABLE IF NOT EXISTS cookie_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Can be user_id OR anonymous visitor ID
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  visitor_id VARCHAR(100), -- For non-logged-in users

  -- Consent choices
  essential BOOLEAN NOT NULL DEFAULT true, -- Always true, required
  analytics BOOLEAN NOT NULL DEFAULT false,
  marketing BOOLEAN NOT NULL DEFAULT false,
  preferences BOOLEAN NOT NULL DEFAULT false,

  -- Metadata
  ip_address INET,
  user_agent TEXT,
  consent_given_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  consent_updated_at TIMESTAMPTZ,

  -- For consent withdrawal
  withdrawn_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_cookie_consent_user ON cookie_consents(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cookie_consent_visitor ON cookie_consents(visitor_id) WHERE visitor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cookie_consent_active ON cookie_consents(user_id, visitor_id) WHERE withdrawn_at IS NULL;

-- Add withdrawn_at column to user_consents for terms withdrawal
ALTER TABLE user_consents ADD COLUMN IF NOT EXISTS withdrawn_at TIMESTAMPTZ;

-- Audit log archive table for old logs
CREATE TABLE IF NOT EXISTS audit_log_archive (
  LIKE audit_log INCLUDING ALL
);

-- Index for archive queries
CREATE INDEX IF NOT EXISTS idx_audit_archive_org ON audit_log_archive(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_archive_date ON audit_log_archive(created_at);

-- Add deletion_requested_at to users for GDPR deletion requests
ALTER TABLE users ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_users_deletion ON users(deletion_requested_at) WHERE deletion_requested_at IS NOT NULL;
