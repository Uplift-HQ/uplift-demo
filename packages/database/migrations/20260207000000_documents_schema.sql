-- ============================================================
-- DOCUMENTS & E-SIGNATURES SCHEMA
-- Document management, uploads, and electronic signatures
-- ============================================================

-- ============================================================
-- DOCUMENTS
-- ============================================================

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Document info
  title VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'other', -- contract, policy, certificate, id_document, letter, other
  description TEXT,

  -- Assignment
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,

  -- File storage
  file_name VARCHAR(255) NOT NULL,
  file_path TEXT, -- Legacy: full URL or path
  file_type VARCHAR(20), -- pdf, docx, image, etc.
  file_size BIGINT,
  mime_type VARCHAR(100),
  storage_key VARCHAR(500), -- S3/storage service key

  -- Signature workflow
  signature_status VARCHAR(20) DEFAULT 'none', -- none, pending, signed, rejected
  signature_required BOOLEAN DEFAULT FALSE,
  signed_at TIMESTAMPTZ,

  -- Metadata
  tags TEXT[],
  expires_at DATE,
  is_template BOOLEAN DEFAULT FALSE,
  parent_template_id UUID REFERENCES documents(id) ON DELETE SET NULL,

  -- Audit
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ -- Soft delete
);

CREATE INDEX idx_documents_org ON documents(organization_id);
CREATE INDEX idx_documents_employee ON documents(employee_id);
CREATE INDEX idx_documents_category ON documents(organization_id, category);
CREATE INDEX idx_documents_status ON documents(organization_id, signature_status);
CREATE INDEX idx_documents_pending ON documents(organization_id) WHERE signature_status = 'pending';

-- ============================================================
-- DOCUMENT SIGNATURES
-- ============================================================

CREATE TABLE document_signatures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,

  -- Signature data
  signature_text VARCHAR(255) NOT NULL, -- Typed signature (full name)
  signature_image TEXT, -- Optional: Base64 drawn signature

  -- Timestamps
  signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  agreed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- When they checked "I agree"

  -- Audit trail (important for legal compliance)
  ip_address VARCHAR(45),
  user_agent TEXT,
  device_info JSONB,

  -- Verification
  verification_hash VARCHAR(128), -- SHA-256 of document at signing time

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(document_id, employee_id) -- One signature per employee per document
);

CREATE INDEX idx_document_signatures_document ON document_signatures(document_id);
CREATE INDEX idx_document_signatures_employee ON document_signatures(employee_id);

-- ============================================================
-- DOCUMENT TEMPLATES
-- For generating pre-filled documents
-- ============================================================

CREATE TABLE document_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'other',
  description TEXT,

  -- Template content
  content_type VARCHAR(20) DEFAULT 'html', -- html, markdown, pdf_form
  content TEXT, -- HTML/markdown template with placeholders
  file_path TEXT, -- For PDF templates
  storage_key VARCHAR(500),

  -- Variables that can be filled
  variables JSONB DEFAULT '[]'::jsonb, -- ["employee_name", "start_date", "salary", ...]

  -- Settings
  requires_signature BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,

  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_document_templates_org ON document_templates(organization_id);
CREATE INDEX idx_document_templates_category ON document_templates(organization_id, category);

-- ============================================================
-- DOCUMENT ACCESS LOG
-- Track who viewed/downloaded documents
-- ============================================================

CREATE TABLE document_access_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  action VARCHAR(20) NOT NULL, -- view, download, sign, share
  ip_address VARCHAR(45),
  user_agent TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_document_access_document ON document_access_log(document_id);
CREATE INDEX idx_document_access_user ON document_access_log(user_id);
CREATE INDEX idx_document_access_time ON document_access_log(created_at DESC);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_access_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_documents ON documents
  USING (organization_id = current_setting('app.organization_id', true)::uuid);

CREATE POLICY tenant_isolation_document_templates ON document_templates
  USING (organization_id = current_setting('app.organization_id', true)::uuid);

-- Signatures are accessed through documents, inherit document's org
CREATE POLICY tenant_isolation_document_signatures ON document_signatures
  USING (
    document_id IN (
      SELECT id FROM documents
      WHERE organization_id = current_setting('app.organization_id', true)::uuid
    )
  );

-- Access log follows same pattern
CREATE POLICY tenant_isolation_document_access_log ON document_access_log
  USING (
    document_id IN (
      SELECT id FROM documents
      WHERE organization_id = current_setting('app.organization_id', true)::uuid
    )
  );

-- Service role bypass
CREATE POLICY service_bypass_documents ON documents TO uplift_service USING (true);
CREATE POLICY service_bypass_document_signatures ON document_signatures TO uplift_service USING (true);
CREATE POLICY service_bypass_document_templates ON document_templates TO uplift_service USING (true);
CREATE POLICY service_bypass_document_access_log ON document_access_log TO uplift_service USING (true);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Update documents updated_at
CREATE TRIGGER update_documents_ts BEFORE UPDATE ON documents
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_document_templates_ts BEFORE UPDATE ON document_templates
FOR EACH ROW EXECUTE FUNCTION update_updated_at();
