-- ============================================================
-- UPLIFT DATABASE MIGRATION: API Factory
-- Custom API endpoints, field mappings, and execution logs
-- ============================================================

-- --------------------------------------------------------
-- CUSTOM ENDPOINTS (API Factory)
-- Build custom REST API integrations
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS custom_endpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    method VARCHAR(10) NOT NULL CHECK (method IN ('GET', 'POST', 'PUT', 'PATCH', 'DELETE')),
    url TEXT NOT NULL,
    headers JSONB DEFAULT '{}',
    body_template JSONB,
    auth_type VARCHAR(50) NOT NULL DEFAULT 'none' CHECK (auth_type IN ('none', 'api_key', 'bearer', 'basic', 'oauth2')),
    auth_config JSONB DEFAULT '{}',
    trigger_type VARCHAR(50) NOT NULL DEFAULT 'manual' CHECK (trigger_type IN ('manual', 'schedule', 'event', 'webhook')),
    trigger_config JSONB DEFAULT '{}',
    field_mappings JSONB DEFAULT '[]',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_custom_endpoints_org ON custom_endpoints(organization_id);
CREATE INDEX IF NOT EXISTS idx_custom_endpoints_active ON custom_endpoints(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_custom_endpoints_created_by ON custom_endpoints(created_by);

-- --------------------------------------------------------
-- CUSTOM ENDPOINT EXECUTIONS
-- Log of all API calls made by custom endpoints
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS custom_endpoint_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint_id UUID NOT NULL REFERENCES custom_endpoints(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    trigger VARCHAR(50) NOT NULL CHECK (trigger IN ('manual', 'schedule', 'event', 'webhook', 'test')),
    request_method VARCHAR(10),
    request_url TEXT,
    request_headers JSONB,
    request_body JSONB,
    response_status INTEGER,
    response_headers JSONB,
    response_body TEXT,
    duration_ms INTEGER,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'error')),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_executions_endpoint ON custom_endpoint_executions(endpoint_id);
CREATE INDEX IF NOT EXISTS idx_executions_org ON custom_endpoint_executions(organization_id);
CREATE INDEX IF NOT EXISTS idx_executions_created ON custom_endpoint_executions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_executions_status ON custom_endpoint_executions(status);

-- --------------------------------------------------------
-- INTEGRATION FIELD MAPPINGS
-- Map fields between Uplift and external systems
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS integration_field_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    integration_id UUID REFERENCES integrations(id) ON DELETE CASCADE,
    endpoint_id UUID REFERENCES custom_endpoints(id) ON DELETE CASCADE,
    source_field VARCHAR(255) NOT NULL,
    target_field VARCHAR(255) NOT NULL,
    transform VARCHAR(50) DEFAULT 'direct' CHECK (transform IN ('direct', 'format_date', 'concat', 'uppercase', 'lowercase', 'custom')),
    transform_config JSONB,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_one_parent CHECK (
        (integration_id IS NOT NULL AND endpoint_id IS NULL) OR
        (integration_id IS NULL AND endpoint_id IS NOT NULL) OR
        (integration_id IS NULL AND endpoint_id IS NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_field_mappings_org ON integration_field_mappings(organization_id);
CREATE INDEX IF NOT EXISTS idx_field_mappings_integration ON integration_field_mappings(integration_id);
CREATE INDEX IF NOT EXISTS idx_field_mappings_endpoint ON integration_field_mappings(endpoint_id);

-- --------------------------------------------------------
-- INTEGRATION SYNC LOGS
-- Unified log for all integration activities
-- --------------------------------------------------------
CREATE TABLE IF NOT EXISTS integration_sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    integration_id UUID REFERENCES integrations(id) ON DELETE SET NULL,
    endpoint_id UUID REFERENCES custom_endpoints(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'error', 'warning', 'info')),
    records_processed INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sync_logs_org ON integration_sync_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_integration ON integration_sync_logs(integration_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_endpoint ON integration_sync_logs(endpoint_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_created ON integration_sync_logs(created_at DESC);

-- --------------------------------------------------------
-- COMMENTS
-- --------------------------------------------------------
COMMENT ON TABLE custom_endpoints IS 'User-defined REST API integrations (API Factory)';
COMMENT ON TABLE custom_endpoint_executions IS 'Execution history for custom endpoints';
COMMENT ON TABLE integration_field_mappings IS 'Field mappings between Uplift and external systems';
COMMENT ON TABLE integration_sync_logs IS 'Unified activity log for all integrations';

-- --------------------------------------------------------
-- TRIGGER: Update updated_at on custom_endpoints
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION update_custom_endpoints_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_custom_endpoints_updated_at ON custom_endpoints;
CREATE TRIGGER trigger_custom_endpoints_updated_at
    BEFORE UPDATE ON custom_endpoints
    FOR EACH ROW
    EXECUTE FUNCTION update_custom_endpoints_updated_at();
