-- ============================================================
-- MULTI-METHOD CLOCK-IN SUPPORT
-- GPS, Kiosk, Badge, QR Code
-- ============================================================

-- Add clock_in_method column to time_entries
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS clock_in_method VARCHAR(20) DEFAULT 'gps';
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS kiosk_id UUID;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS badge_id VARCHAR(100);

-- Add badge_id to employees
ALTER TABLE employees ADD COLUMN IF NOT EXISTS badge_id VARCHAR(100);
CREATE INDEX IF NOT EXISTS idx_employees_badge ON employees(organization_id, badge_id) WHERE badge_id IS NOT NULL;

-- Organization clock-in settings (stored in features JSONB)
-- Default structure: { "clock_methods": { "gps": true, "kiosk": false, "badge": false, "qr": false }, "gps_geofence_radius": 100, "gps_require_selfie": false }

-- Kiosk registration table
CREATE TABLE IF NOT EXISTS kiosks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,

  name VARCHAR(100) NOT NULL,
  api_key_hash VARCHAR(255) NOT NULL,
  api_key_prefix VARCHAR(10) NOT NULL, -- First 8 chars for identification

  is_active BOOLEAN DEFAULT TRUE,
  last_seen_at TIMESTAMPTZ,
  last_seen_ip VARCHAR(45),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),

  UNIQUE(organization_id, name)
);

CREATE INDEX IF NOT EXISTS idx_kiosks_org ON kiosks(organization_id);
CREATE INDEX IF NOT EXISTS idx_kiosks_api_key ON kiosks(api_key_prefix);

-- Add RLS
ALTER TABLE kiosks ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_kiosks ON kiosks
  FOR ALL TO PUBLIC
  USING (organization_id = current_setting('app.organization_id', true)::uuid);

CREATE POLICY service_bypass_kiosks ON kiosks TO uplift_service USING (true);

-- Index for faster employee lookups by badge/PIN
CREATE INDEX IF NOT EXISTS idx_employees_org_active ON employees(organization_id, status) WHERE status = 'active';
