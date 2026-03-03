-- Migration: Contract Templates + Document Chasing
-- Created: 2026-03-03

-- Contract templates table
CREATE TABLE IF NOT EXISTS contract_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  content_html TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contract_templates_org ON contract_templates(organization_id);

-- Enable RLS
ALTER TABLE contract_templates ENABLE ROW LEVEL SECURITY;

-- RLS policy for contract_templates
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'contract_templates' AND policyname = 'contract_templates_org_isolation') THEN
    CREATE POLICY contract_templates_org_isolation ON contract_templates
      FOR ALL
      USING (organization_id = current_setting('app.current_organization_id', true)::uuid);
  END IF;
END $$;

-- Contracts table (issued contracts to employees)
CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  template_id UUID REFERENCES contract_templates(id) ON DELETE SET NULL,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  content_html TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'signed', 'expired', 'cancelled')),
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  signature_data JSONB,
  document_url VARCHAR(500),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contracts_org ON contracts(organization_id);
CREATE INDEX IF NOT EXISTS idx_contracts_employee ON contracts(employee_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);

-- Enable RLS
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

-- RLS policy for contracts
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'contracts' AND policyname = 'contracts_org_isolation') THEN
    CREATE POLICY contracts_org_isolation ON contracts
      FOR ALL
      USING (organization_id = current_setting('app.current_organization_id', true)::uuid);
  END IF;
END $$;

-- Document chases (reminders sent)
CREATE TABLE IF NOT EXISTS document_chases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  message_type VARCHAR(20) DEFAULT 'email' CHECK (message_type IN ('email', 'sms', 'push')),
  recipient VARCHAR(255) NOT NULL,
  message_preview TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_chases_org ON document_chases(organization_id);
CREATE INDEX IF NOT EXISTS idx_document_chases_contract ON document_chases(contract_id);

-- Enable RLS
ALTER TABLE document_chases ENABLE ROW LEVEL SECURITY;

-- RLS policy for document_chases
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'document_chases' AND policyname = 'document_chases_org_isolation') THEN
    CREATE POLICY document_chases_org_isolation ON document_chases
      FOR ALL
      USING (organization_id = current_setting('app.current_organization_id', true)::uuid);
  END IF;
END $$;
