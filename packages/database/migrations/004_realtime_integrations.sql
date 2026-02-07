-- ============================================================
-- UPLIFT DATABASE MIGRATION: Real-time & Integrations
-- Adds tables for push notifications, API keys, webhooks, and OAuth
-- ============================================================

-- --------------------------------------------------------
-- PUSH NOTIFICATION TOKENS
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS push_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    platform VARCHAR(20) NOT NULL DEFAULT 'unknown', -- ios, android, web
    device_name VARCHAR(100),
    failed_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_token ON push_tokens(token);

-- --------------------------------------------------------
-- API KEYS (for REST API access)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_by_user_id UUID REFERENCES users(id),
    key_id VARCHAR(100) NOT NULL UNIQUE,
    secret_hash VARCHAR(64) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    scopes JSONB NOT NULL DEFAULT '[]',
    rate_limit_tier VARCHAR(20) NOT NULL DEFAULT 'standard',
    ip_whitelist JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    expires_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    request_count BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_org ON api_keys(organization_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_id ON api_keys(key_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active) WHERE is_active = true;

-- --------------------------------------------------------
-- WEBHOOKS
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    url VARCHAR(500) NOT NULL,
    events JSONB NOT NULL DEFAULT '[]',
    secret VARCHAR(64) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    headers JSONB DEFAULT '{}',
    last_triggered_at TIMESTAMPTZ,
    last_response_status INTEGER,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhooks_org ON webhooks(organization_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_active ON webhooks(is_active) WHERE is_active = true;

-- --------------------------------------------------------
-- WEBHOOK DELIVERY LOG
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
    event VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    response_status INTEGER,
    response_body TEXT,
    response_time_ms INTEGER,
    success BOOLEAN NOT NULL,
    error_message TEXT,
    attempt_number INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_created ON webhook_deliveries(created_at);

-- --------------------------------------------------------
-- OAUTH INTEGRATIONS
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL, -- google, microsoft, slack, xero, quickbooks, adp
    status VARCHAR(20) NOT NULL DEFAULT 'disconnected', -- connected, disconnected, error
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,
    scope TEXT,
    connected_at TIMESTAMPTZ,
    last_sync_at TIMESTAMPTZ,
    sync_status VARCHAR(20), -- syncing, completed, failed
    sync_error TEXT,
    metadata JSONB DEFAULT '{}',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_integrations_org ON integrations(organization_id);
CREATE INDEX IF NOT EXISTS idx_integrations_provider ON integrations(provider);

-- --------------------------------------------------------
-- OAUTH STATE TOKENS (for CSRF protection during OAuth flow)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS oauth_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state VARCHAR(64) NOT NULL UNIQUE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_oauth_states_state ON oauth_states(state);

-- Auto-cleanup expired states
CREATE INDEX IF NOT EXISTS idx_oauth_states_expires ON oauth_states(expires_at);

-- --------------------------------------------------------
-- SPECIAL EVENTS (for AI scheduling demand adjustment)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS special_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    location_id UUID REFERENCES locations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    event_date DATE NOT NULL,
    demand_factor DECIMAL(3,2) NOT NULL DEFAULT 1.0, -- 0.5 = 50% demand, 1.5 = 150% demand
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_special_events_date ON special_events(event_date);
CREATE INDEX IF NOT EXISTS idx_special_events_org ON special_events(organization_id);

-- --------------------------------------------------------
-- EMPLOYEE PREFERENCES (for AI scheduling)
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS employee_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE UNIQUE,
    preferred_days JSONB DEFAULT '[]', -- [1, 2, 3, 4, 5] for Mon-Fri
    unavailable_days JSONB DEFAULT '[]',
    preferred_shift_types JSONB DEFAULT '[]', -- ['morning', 'afternoon', 'evening']
    max_consecutive_days INTEGER DEFAULT 5,
    min_hours_between_shifts INTEGER DEFAULT 11,
    notes TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employee_prefs_employee ON employee_preferences(employee_id);

-- --------------------------------------------------------
-- CLEANUP JOB - Run periodically to clean expired data
-- --------------------------------------------------------
-- Delete expired OAuth states older than 1 hour
-- DELETE FROM oauth_states WHERE expires_at < NOW() - INTERVAL '1 hour';

-- Delete old webhook deliveries older than 30 days
-- DELETE FROM webhook_deliveries WHERE created_at < NOW() - INTERVAL '30 days';

-- Mark tokens with 3+ failures as inactive
-- UPDATE push_tokens SET updated_at = NOW() WHERE failed_count >= 3;

-- ============================================================
-- COMMENTS
-- ============================================================
COMMENT ON TABLE push_tokens IS 'Expo push notification tokens for mobile devices';
COMMENT ON TABLE api_keys IS 'REST API keys for external integrations';
COMMENT ON TABLE webhooks IS 'Webhook configurations for event notifications';
COMMENT ON TABLE webhook_deliveries IS 'Log of webhook delivery attempts';
COMMENT ON TABLE integrations IS 'OAuth integrations with third-party services';
COMMENT ON TABLE oauth_states IS 'CSRF state tokens for OAuth flow security';
COMMENT ON TABLE special_events IS 'Special events affecting demand forecasting';
COMMENT ON TABLE employee_preferences IS 'Employee scheduling preferences for AI optimization';
