-- ============================================================
-- COMPLIANCE & TRAINING SCHEMA
-- Required training, certifications, and compliance tracking
-- ============================================================

-- Compliance items (training courses, certifications, policies)
CREATE TABLE IF NOT EXISTS compliance_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Item details
  name VARCHAR(200) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL CHECK (category IN ('training', 'certification', 'policy', 'health_safety', 'legal')),

  -- Requirements
  is_mandatory BOOLEAN DEFAULT true,
  valid_for_days INTEGER, -- NULL = never expires
  renewal_reminder_days INTEGER DEFAULT 30,

  -- Content
  content_url TEXT, -- Link to training material
  content_type VARCHAR(20) DEFAULT 'external' CHECK (content_type IN ('external', 'video', 'document', 'quiz')),
  estimated_duration_minutes INTEGER,

  -- Applicability
  applies_to_roles TEXT[], -- Which roles need this
  applies_to_locations UUID[], -- Which locations need this
  applies_to_departments UUID[], -- Which departments need this

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Employee compliance records
CREATE TABLE IF NOT EXISTS employee_compliance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  compliance_item_id UUID NOT NULL REFERENCES compliance_items(id) ON DELETE CASCADE,

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'expired', 'waived')),

  -- Completion details
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  score INTEGER, -- For quizzes (percentage)
  certificate_url TEXT,

  -- Progress tracking
  progress_percent INTEGER DEFAULT 0,
  last_activity_at TIMESTAMPTZ,

  -- Verification
  verified_by UUID REFERENCES users(id),
  verified_at TIMESTAMPTZ,
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(employee_id, compliance_item_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_compliance_items_org ON compliance_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_compliance_items_category ON compliance_items(category);
CREATE INDEX IF NOT EXISTS idx_compliance_items_active ON compliance_items(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_employee_compliance_employee ON employee_compliance(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_compliance_item ON employee_compliance(compliance_item_id);
CREATE INDEX IF NOT EXISTS idx_employee_compliance_status ON employee_compliance(status);
CREATE INDEX IF NOT EXISTS idx_employee_compliance_expires ON employee_compliance(expires_at) WHERE status = 'completed';

-- Seed some common compliance items
INSERT INTO compliance_items (organization_id, name, description, category, is_mandatory, valid_for_days, content_type, estimated_duration_minutes)
SELECT o.id, item.name, item.description, item.category, item.is_mandatory, item.valid_for_days, item.content_type, item.duration
FROM organizations o
CROSS JOIN (VALUES
  ('Food Hygiene Level 2', 'Basic food safety and hygiene certification', 'certification', true, 365, 'external', 120),
  ('First Aid at Work', 'Emergency first aid training', 'certification', true, 1095, 'external', 480),
  ('Health & Safety Induction', 'Workplace health and safety basics', 'health_safety', true, NULL, 'video', 45),
  ('Fire Safety Awareness', 'Fire prevention and evacuation procedures', 'health_safety', true, 365, 'video', 30),
  ('Manual Handling', 'Safe lifting and carrying techniques', 'health_safety', true, 365, 'video', 20),
  ('GDPR Awareness', 'Data protection and privacy training', 'policy', true, 365, 'video', 30),
  ('Anti-Harassment Policy', 'Workplace harassment prevention', 'policy', true, 365, 'document', 15),
  ('Allergen Awareness', 'Food allergen handling and labeling', 'training', true, 365, 'video', 45),
  ('Customer Service Excellence', 'Customer service best practices', 'training', false, NULL, 'video', 60),
  ('Cash Handling Procedures', 'Safe and accurate cash management', 'training', true, NULL, 'document', 30)
) AS item(name, description, category, is_mandatory, valid_for_days, content_type, duration)
WHERE NOT EXISTS (SELECT 1 FROM compliance_items WHERE name = item.name AND organization_id = o.id);
