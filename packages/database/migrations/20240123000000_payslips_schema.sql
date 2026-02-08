-- ============================================================
-- PAYSLIPS SCHEMA
-- Employee payslips and earnings records
-- ============================================================

-- Payslips
CREATE TABLE IF NOT EXISTS payslips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,

  -- Pay period
  pay_period_start DATE NOT NULL,
  pay_period_end DATE NOT NULL,
  pay_date DATE NOT NULL,

  -- Earnings (all in pence)
  gross_pay INTEGER NOT NULL,
  net_pay INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'GBP',

  -- Hours
  regular_hours DECIMAL(6,2) DEFAULT 0,
  overtime_hours DECIMAL(6,2) DEFAULT 0,
  holiday_hours DECIMAL(6,2) DEFAULT 0,

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'sent', 'viewed')),

  -- PDF
  pdf_url TEXT,
  pdf_generated_at TIMESTAMPTZ,

  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(organization_id, employee_id, pay_period_start, pay_period_end)
);

-- Payslip line items (earnings and deductions)
CREATE TABLE IF NOT EXISTS payslip_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payslip_id UUID NOT NULL REFERENCES payslips(id) ON DELETE CASCADE,

  -- Item type
  item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('earning', 'deduction', 'employer_contribution')),
  category VARCHAR(50) NOT NULL, -- e.g., 'basic_pay', 'overtime', 'bonus', 'tax', 'ni', 'pension'

  -- Details
  description VARCHAR(200) NOT NULL,
  amount INTEGER NOT NULL, -- In pence (positive for earnings, positive for deductions to be subtracted)
  quantity DECIMAL(8,2), -- Hours, units, etc.
  rate DECIMAL(10,4), -- Rate per unit

  -- Tax treatment
  is_taxable BOOLEAN DEFAULT true,
  is_pensionable BOOLEAN DEFAULT true,

  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Year-to-date tracking
CREATE TABLE IF NOT EXISTS payslip_ytd (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  tax_year VARCHAR(10) NOT NULL, -- e.g., '2024-25'

  -- Cumulative totals (in pence)
  gross_pay_ytd INTEGER DEFAULT 0,
  taxable_pay_ytd INTEGER DEFAULT 0,
  tax_paid_ytd INTEGER DEFAULT 0,
  ni_paid_ytd INTEGER DEFAULT 0,
  pension_ytd INTEGER DEFAULT 0,
  student_loan_ytd INTEGER DEFAULT 0,
  net_pay_ytd INTEGER DEFAULT 0,

  -- Hours
  regular_hours_ytd DECIMAL(8,2) DEFAULT 0,
  overtime_hours_ytd DECIMAL(8,2) DEFAULT 0,
  holiday_hours_ytd DECIMAL(8,2) DEFAULT 0,

  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(organization_id, employee_id, tax_year)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payslips_employee ON payslips(employee_id);
CREATE INDEX IF NOT EXISTS idx_payslips_org ON payslips(organization_id);
CREATE INDEX IF NOT EXISTS idx_payslips_period ON payslips(pay_period_start, pay_period_end);
CREATE INDEX IF NOT EXISTS idx_payslips_date ON payslips(pay_date DESC);
CREATE INDEX IF NOT EXISTS idx_payslips_status ON payslips(status);
CREATE INDEX IF NOT EXISTS idx_payslip_items_payslip ON payslip_items(payslip_id);
CREATE INDEX IF NOT EXISTS idx_payslip_ytd_employee ON payslip_ytd(employee_id, tax_year);
