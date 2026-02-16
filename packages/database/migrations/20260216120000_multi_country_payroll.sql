-- ============================================================
-- MULTI-COUNTRY PAYROLL CONFIGURATION
-- Provider configuration per country/organization
-- ============================================================

-- Payroll country configurations
CREATE TABLE IF NOT EXISTS payroll_country_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id), -- NULL = global default
  country_code VARCHAR(2) NOT NULL,
  country_name VARCHAR(100) NOT NULL,

  -- Provider settings
  provider VARCHAR(50) NOT NULL, -- 'payrunio', 'native', 'deel', 'remote', 'papaya', 'onesource', 'fallback'
  provider_account_id VARCHAR(255), -- Account ID in external provider
  provider_credentials JSONB DEFAULT '{}', -- Encrypted credentials specific to this config

  -- Tax settings
  tax_year_start VARCHAR(10) DEFAULT 'January', -- Month tax year starts
  currency VARCHAR(3) NOT NULL,
  default_tax_code VARCHAR(50),
  default_ni_category VARCHAR(10),

  -- EOR settings (Employer of Record)
  eor_enabled BOOLEAN DEFAULT false,
  eor_contract_type VARCHAR(50), -- 'full_eor', 'contractor', 'hybrid'
  eor_entity_name VARCHAR(255), -- Legal entity name in country

  -- Compliance
  statutory_benefits JSONB DEFAULT '{}', -- Country-specific benefits config
  pension_mandatory BOOLEAN DEFAULT false,
  pension_min_employee_pct DECIMAL(4,2),
  pension_min_employer_pct DECIMAL(4,2),

  -- Status
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'inactive', 'pending_setup'
  verified_at TIMESTAMP WITH TIME ZONE,
  verified_by UUID REFERENCES users(id),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_country_config UNIQUE (organization_id, country_code)
);

-- EOR employees - employees hired through EOR providers
CREATE TABLE IF NOT EXISTS eor_employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),

  -- Provider info
  provider VARCHAR(50) NOT NULL, -- 'deel', 'remote', 'papaya'
  provider_employee_id VARCHAR(255), -- ID in external system
  provider_contract_id VARCHAR(255),

  -- Contract details
  country_code VARCHAR(2) NOT NULL,
  employment_type VARCHAR(50) DEFAULT 'full_time', -- 'full_time', 'part_time', 'contractor'
  contract_start_date DATE NOT NULL,
  contract_end_date DATE, -- NULL = indefinite

  -- Compensation (in local currency)
  local_currency VARCHAR(3) NOT NULL,
  local_gross_salary DECIMAL(12,2),
  local_pay_frequency VARCHAR(50) DEFAULT 'monthly',

  -- Conversion (to org's base currency if needed)
  base_currency VARCHAR(3),
  exchange_rate DECIMAL(10,6),
  base_gross_salary DECIMAL(12,2),

  -- Sync status
  last_synced_at TIMESTAMP WITH TIME ZONE,
  sync_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'synced', 'error'
  sync_error TEXT,

  -- Metadata
  provider_metadata JSONB DEFAULT '{}',

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_eor_employee UNIQUE (employee_id)
);

-- EOR payments - track payments made through EOR providers
CREATE TABLE IF NOT EXISTS eor_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  eor_employee_id UUID NOT NULL REFERENCES eor_employees(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),

  -- Provider info
  provider VARCHAR(50) NOT NULL,
  provider_payment_id VARCHAR(255),

  -- Payment details
  pay_period_start DATE NOT NULL,
  pay_period_end DATE NOT NULL,
  payment_date DATE,

  -- Amounts (in local currency)
  gross_pay DECIMAL(12,2),
  net_pay DECIMAL(12,2),
  total_deductions DECIMAL(12,2),
  employer_cost DECIMAL(12,2), -- Total cost including employer taxes/contributions

  -- Breakdown
  income_tax DECIMAL(12,2),
  social_security_employee DECIMAL(12,2),
  social_security_employer DECIMAL(12,2),
  pension_employee DECIMAL(12,2),
  pension_employer DECIMAL(12,2),
  other_deductions JSONB DEFAULT '[]',

  -- EOR fees
  eor_service_fee DECIMAL(12,2),
  eor_fee_currency VARCHAR(3),

  -- Status
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'paid', 'failed'
  status_message TEXT,

  -- Invoice
  invoice_id VARCHAR(255),
  invoice_url TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payroll_country_configs_org ON payroll_country_configs(organization_id);
CREATE INDEX IF NOT EXISTS idx_payroll_country_configs_country ON payroll_country_configs(country_code);
CREATE INDEX IF NOT EXISTS idx_eor_employees_org ON eor_employees(organization_id);
CREATE INDEX IF NOT EXISTS idx_eor_employees_provider ON eor_employees(provider);
CREATE INDEX IF NOT EXISTS idx_eor_payments_employee ON eor_payments(eor_employee_id);
CREATE INDEX IF NOT EXISTS idx_eor_payments_status ON eor_payments(status);

-- Add EOR fields to employees table
ALTER TABLE employees ADD COLUMN IF NOT EXISTS is_eor BOOLEAN DEFAULT false;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS eor_provider VARCHAR(50);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS country_code VARCHAR(2) DEFAULT 'GB';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS tax_residence_country VARCHAR(2);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS work_location_country VARCHAR(2);
