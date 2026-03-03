-- Migration: Payroll Export Field Mappings
-- Created: 2026-03-03

-- Configurable export field mappings for different payroll providers
CREATE TABLE IF NOT EXISTS payroll_export_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  provider VARCHAR(50) NOT NULL,
  description TEXT,
  field_mappings JSONB NOT NULL DEFAULT '{}',
  output_format VARCHAR(20) DEFAULT 'csv' CHECK (output_format IN ('csv', 'xlsx', 'json', 'xml')),
  delimiter VARCHAR(5) DEFAULT ',',
  include_header BOOLEAN DEFAULT true,
  date_format VARCHAR(50) DEFAULT 'YYYY-MM-DD',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payroll_export_mappings_org ON payroll_export_mappings(organization_id);
CREATE INDEX IF NOT EXISTS idx_payroll_export_mappings_provider ON payroll_export_mappings(provider);

-- Enable RLS
ALTER TABLE payroll_export_mappings ENABLE ROW LEVEL SECURITY;

-- RLS policy
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payroll_export_mappings' AND policyname = 'payroll_export_mappings_org_isolation') THEN
    CREATE POLICY payroll_export_mappings_org_isolation ON payroll_export_mappings
      FOR ALL
      USING (organization_id = current_setting('app.current_organization_id', true)::uuid);
  END IF;
END $$;

-- Insert default mappings for common providers
-- (These can be overridden by org-specific mappings)
