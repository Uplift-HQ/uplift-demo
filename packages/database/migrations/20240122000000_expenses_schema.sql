-- ============================================================
-- EXPENSES SCHEMA
-- Employee expense claims and reimbursements
-- ============================================================

-- Expense categories
CREATE TABLE IF NOT EXISTS expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  max_amount INTEGER, -- Max per claim in pence, NULL = no limit
  requires_receipt BOOLEAN DEFAULT true,
  requires_approval BOOLEAN DEFAULT true,
  gl_code VARCHAR(50), -- For accounting integration
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(organization_id, name)
);

-- Expense claims
CREATE TABLE IF NOT EXISTS expense_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,

  -- Claim details
  description TEXT NOT NULL,
  category_id UUID REFERENCES expense_categories(id),
  amount INTEGER NOT NULL, -- In pence
  currency VARCHAR(3) DEFAULT 'GBP',
  expense_date DATE NOT NULL,

  -- Receipt
  receipt_url TEXT,
  receipt_verified BOOLEAN DEFAULT false,

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('draft', 'pending', 'approved', 'rejected', 'paid', 'cancelled')),

  -- Approval workflow
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,

  -- Payment
  paid_at TIMESTAMPTZ,
  payment_reference TEXT,
  payment_method VARCHAR(50),

  -- Metadata
  notes TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_expense_categories_org ON expense_categories(organization_id);
CREATE INDEX IF NOT EXISTS idx_expense_claims_employee ON expense_claims(employee_id);
CREATE INDEX IF NOT EXISTS idx_expense_claims_org ON expense_claims(organization_id);
CREATE INDEX IF NOT EXISTS idx_expense_claims_status ON expense_claims(status);
CREATE INDEX IF NOT EXISTS idx_expense_claims_date ON expense_claims(expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_expense_claims_pending ON expense_claims(organization_id, status) WHERE status = 'pending';

-- Seed default categories for each organization
INSERT INTO expense_categories (organization_id, name, description, requires_receipt, max_amount, gl_code)
SELECT o.id, cat.name, cat.description, cat.requires_receipt, cat.max_amount, cat.gl_code
FROM organizations o
CROSS JOIN (VALUES
  ('Travel', 'Transport and travel expenses including fuel, public transport, taxis', true, 50000, '6100'),
  ('Meals', 'Food and drink expenses during work hours or with clients', true, 5000, '6200'),
  ('Accommodation', 'Hotels and lodging for business travel', true, 20000, '6150'),
  ('Equipment', 'Work equipment, tools, and supplies', true, 20000, '6300'),
  ('Training', 'Professional development, courses, and certifications', true, NULL, '6400'),
  ('Software', 'Software subscriptions and licenses', true, 10000, '6350'),
  ('Phone/Internet', 'Mobile phone and internet expenses', true, 5000, '6500'),
  ('Parking', 'Parking fees and permits', true, 2000, '6120'),
  ('Mileage', 'Personal vehicle mileage reimbursement', false, NULL, '6110'),
  ('Other', 'Miscellaneous business expenses', true, 10000, '6900')
) AS cat(name, description, requires_receipt, max_amount, gl_code)
WHERE NOT EXISTS (SELECT 1 FROM expense_categories WHERE name = cat.name AND organization_id = o.id);
