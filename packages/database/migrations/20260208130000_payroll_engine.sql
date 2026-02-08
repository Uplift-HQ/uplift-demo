-- ============================================================
-- PAYROLL ENGINE SCHEMA
-- Multi-country payroll with provider integration
-- ============================================================

-- Payroll country configurations
CREATE TABLE IF NOT EXISTS payroll_country_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    country_code VARCHAR(3) NOT NULL,
    country_name VARCHAR(100) NOT NULL,

    -- Provider configuration
    provider VARCHAR(50) NOT NULL DEFAULT 'fallback', -- payrunio, native, onesource, fallback
    provider_api_url TEXT,
    provider_api_key_env_var VARCHAR(100), -- Environment variable name for API key

    -- Currency and tax year
    currency_code VARCHAR(3) NOT NULL,
    tax_year_start VARCHAR(20) NOT NULL DEFAULT 'January', -- January, April, etc.
    tax_year_end_month INTEGER DEFAULT 12,

    -- Pay frequencies supported
    pay_frequencies_supported JSONB DEFAULT '["monthly"]'::jsonb,

    -- Status
    status VARCHAR(20) DEFAULT 'active', -- active, configured, pending, disabled

    -- Country-specific configuration
    config_json JSONB DEFAULT '{}'::jsonb,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(organization_id, country_code)
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_payroll_country_configs_country ON payroll_country_configs(country_code);
CREATE INDEX IF NOT EXISTS idx_payroll_country_configs_org ON payroll_country_configs(organization_id);

-- Payroll tax tables (reference data)
CREATE TABLE IF NOT EXISTS payroll_tax_tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    country_code VARCHAR(3) NOT NULL,
    tax_year VARCHAR(10) NOT NULL, -- e.g., "2025/26"

    -- Tax type
    tax_type VARCHAR(50) NOT NULL, -- income_tax, social_security, health_insurance, pension, etc.

    -- Bracket details
    bracket_name VARCHAR(100),
    lower_bound DECIMAL(15,2) DEFAULT 0,
    upper_bound DECIMAL(15,2), -- NULL for unlimited
    rate_percentage DECIMAL(8,4) NOT NULL,

    -- Additional info
    applies_to VARCHAR(50) DEFAULT 'employee', -- employee, employer, both
    region VARCHAR(100), -- For countries with regional variations (e.g., Scotland, US states)
    notes TEXT,

    -- Effective dates
    effective_from DATE NOT NULL,
    effective_to DATE,

    -- Organization override (NULL = global)
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for tax table lookups
CREATE INDEX IF NOT EXISTS idx_payroll_tax_tables_country_year ON payroll_tax_tables(country_code, tax_year);
CREATE INDEX IF NOT EXISTS idx_payroll_tax_tables_type ON payroll_tax_tables(tax_type);
CREATE INDEX IF NOT EXISTS idx_payroll_tax_tables_effective ON payroll_tax_tables(effective_from, effective_to);

-- Payroll runs (batch payroll processing)
CREATE TABLE IF NOT EXISTS payroll_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Run details
    run_number VARCHAR(50), -- e.g., "PR-2026-02"
    pay_period_start DATE NOT NULL,
    pay_period_end DATE NOT NULL,
    pay_date DATE NOT NULL,
    pay_frequency VARCHAR(20) DEFAULT 'monthly',

    -- Status
    status VARCHAR(20) DEFAULT 'draft', -- draft, pending_approval, approved, rejected, processing, completed, failed

    -- Summary totals
    total_employees INTEGER DEFAULT 0,
    total_gross DECIMAL(15,2) DEFAULT 0,
    total_net DECIMAL(15,2) DEFAULT 0,
    total_tax DECIMAL(15,2) DEFAULT 0,
    total_employee_ni DECIMAL(15,2) DEFAULT 0,
    total_employer_ni DECIMAL(15,2) DEFAULT 0,
    total_pension DECIMAL(15,2) DEFAULT 0,
    total_employer_pension DECIMAL(15,2) DEFAULT 0,
    total_student_loans DECIMAL(15,2) DEFAULT 0,
    total_employer_cost DECIMAL(15,2) DEFAULT 0,

    -- Currency
    currency VARCHAR(3) DEFAULT 'GBP',

    -- Provider info
    provider VARCHAR(50), -- Which provider was used
    provider_run_id VARCHAR(100), -- External run ID if applicable

    -- Approval workflow
    created_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    rejected_by UUID REFERENCES users(id),
    rejected_at TIMESTAMPTZ,
    rejection_reason TEXT,

    -- Processing info
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    errors JSONB DEFAULT '[]'::jsonb,

    -- Metadata
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for payroll run queries
CREATE INDEX IF NOT EXISTS idx_payroll_runs_org ON payroll_runs(organization_id);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_status ON payroll_runs(status);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_period ON payroll_runs(pay_period_start, pay_period_end);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_date ON payroll_runs(pay_date);

-- Link payslips to payroll runs
ALTER TABLE payslips ADD COLUMN IF NOT EXISTS payroll_run_id UUID REFERENCES payroll_runs(id);
CREATE INDEX IF NOT EXISTS idx_payslips_payroll_run ON payslips(payroll_run_id);

-- PayRun.io employer mapping
CREATE TABLE IF NOT EXISTS payroll_external_employers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL, -- payrunio, onesource

    -- External IDs
    external_employer_id VARCHAR(100) NOT NULL,
    external_employer_code VARCHAR(100),

    -- HMRC details (UK)
    tax_office_number VARCHAR(10),
    tax_office_reference VARCHAR(20),
    paye_reference VARCHAR(30),
    accounts_office_reference VARCHAR(20),

    -- Status
    status VARCHAR(20) DEFAULT 'active',
    last_synced_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(organization_id, provider)
);

-- PayRun.io employee mapping
CREATE TABLE IF NOT EXISTS payroll_external_employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,

    -- External IDs
    external_employee_id VARCHAR(100) NOT NULL,
    external_employee_code VARCHAR(100),

    -- Pay schedule
    external_pay_schedule_id VARCHAR(100),

    -- Status
    status VARCHAR(20) DEFAULT 'active',
    last_synced_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(employee_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_payroll_ext_employees_employee ON payroll_external_employees(employee_id);

-- RTI submissions tracking (UK)
CREATE TABLE IF NOT EXISTS payroll_rti_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    payroll_run_id UUID REFERENCES payroll_runs(id),

    -- Submission type
    submission_type VARCHAR(20) NOT NULL, -- FPS, EPS, NVR, EYU
    tax_year VARCHAR(10) NOT NULL,
    tax_month INTEGER,

    -- Status
    status VARCHAR(20) DEFAULT 'pending', -- pending, submitted, accepted, rejected, failed

    -- External reference
    provider VARCHAR(50),
    external_submission_id VARCHAR(100),
    correlation_id VARCHAR(100),

    -- HMRC response
    hmrc_response_code VARCHAR(20),
    hmrc_response_message TEXT,
    hmrc_receipt TEXT,

    -- Timing
    submitted_at TIMESTAMPTZ,
    response_received_at TIMESTAMPTZ,

    -- Retry handling
    attempt_count INTEGER DEFAULT 0,
    last_error TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payroll_rti_org ON payroll_rti_submissions(organization_id);
CREATE INDEX IF NOT EXISTS idx_payroll_rti_run ON payroll_rti_submissions(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_payroll_rti_type ON payroll_rti_submissions(submission_type);

-- Employee payroll settings
CREATE TABLE IF NOT EXISTS employee_payroll_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,

    -- Tax settings
    tax_code VARCHAR(20) DEFAULT '1257L',
    tax_basis VARCHAR(20) DEFAULT 'cumulative', -- cumulative, week1month1

    -- NI settings
    ni_category VARCHAR(5) DEFAULT 'A',
    ni_number VARCHAR(20),

    -- Student loans
    student_loan_plan_1 BOOLEAN DEFAULT FALSE,
    student_loan_plan_2 BOOLEAN DEFAULT FALSE,
    student_loan_plan_4 BOOLEAN DEFAULT FALSE,
    student_loan_plan_5 BOOLEAN DEFAULT FALSE,
    student_loan_postgrad BOOLEAN DEFAULT FALSE,

    -- Pension
    pension_opt_in BOOLEAN DEFAULT TRUE,
    pension_employee_percent DECIMAL(5,2) DEFAULT 5.00,
    pension_employer_percent DECIMAL(5,2) DEFAULT 3.00,
    pension_salary_sacrifice BOOLEAN DEFAULT FALSE,

    -- Director settings
    is_director BOOLEAN DEFAULT FALSE,
    director_ni_method VARCHAR(50), -- StandardAnnualisedEarningsMethod, AlternativeMethod
    directorship_start_date DATE,

    -- Pay method
    payment_method VARCHAR(20) DEFAULT 'bacs', -- bacs, cheque, cash
    sort_code VARCHAR(10),
    account_number VARCHAR(20),
    account_name VARCHAR(100),
    building_society_reference VARCHAR(50),

    -- Starter/leaver
    starter_declaration VARCHAR(5), -- A, B, C
    p45_previous_pay DECIMAL(15,2),
    p45_previous_tax DECIMAL(15,2),

    -- Custom deductions
    custom_deductions JSONB DEFAULT '[]'::jsonb,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(employee_id)
);

CREATE INDEX IF NOT EXISTS idx_employee_payroll_settings ON employee_payroll_settings(employee_id);

-- Insert default country configurations
INSERT INTO payroll_country_configs (country_code, country_name, provider, currency_code, tax_year_start, pay_frequencies_supported, status, config_json)
VALUES
    ('GB', 'United Kingdom', 'payrunio', 'GBP', 'April', '["weekly", "fortnightly", "monthly"]', 'active',
     '{"hmrc_enabled": true, "auto_enrolment": true, "rti_enabled": true}'),
    ('DE', 'Germany', 'fallback', 'EUR', 'January', '["monthly"]', 'active',
     '{"solidarity_surcharge": true, "church_tax_regions": ["Bavaria", "Baden-Württemberg"]}'),
    ('PL', 'Poland', 'fallback', 'PLN', 'January', '["monthly"]', 'active',
     '{"zus_enabled": true}'),
    ('US', 'United States', 'fallback', 'USD', 'January', '["weekly", "biweekly", "semimonthly", "monthly"]', 'active',
     '{"federal_only": true, "note": "State taxes require ONESOURCE"}'),
    ('CN', 'China', 'fallback', 'CNY', 'January', '["monthly"]', 'active',
     '{"city": "Beijing", "note": "Rates vary by city"}'),
    ('AE', 'United Arab Emirates', 'fallback', 'AED', 'January', '["monthly"]', 'active',
     '{"no_income_tax": true, "gratuity_enabled": true}')
ON CONFLICT DO NOTHING;

-- Insert UK tax tables for 2025/26
INSERT INTO payroll_tax_tables (country_code, tax_year, tax_type, bracket_name, lower_bound, upper_bound, rate_percentage, applies_to, effective_from, notes)
VALUES
    -- UK Income Tax (England/Wales/NI)
    ('GB', '2025/26', 'income_tax', 'Personal Allowance', 0, 12570, 0, 'employee', '2025-04-06', 'Tax-free allowance'),
    ('GB', '2025/26', 'income_tax', 'Basic Rate', 12570, 50270, 20, 'employee', '2025-04-06', '20% on £12,571 to £50,270'),
    ('GB', '2025/26', 'income_tax', 'Higher Rate', 50270, 125140, 40, 'employee', '2025-04-06', '40% on £50,271 to £125,140'),
    ('GB', '2025/26', 'income_tax', 'Additional Rate', 125140, NULL, 45, 'employee', '2025-04-06', '45% over £125,140'),

    -- Scottish Income Tax
    ('GB', '2025/26', 'income_tax', 'Scottish Starter Rate', 12570, 14876, 19, 'employee', '2025-04-06', 'Scotland only'),
    ('GB', '2025/26', 'income_tax', 'Scottish Basic Rate', 14876, 26561, 20, 'employee', '2025-04-06', 'Scotland only'),
    ('GB', '2025/26', 'income_tax', 'Scottish Intermediate Rate', 26561, 43662, 21, 'employee', '2025-04-06', 'Scotland only'),
    ('GB', '2025/26', 'income_tax', 'Scottish Higher Rate', 43662, 75000, 42, 'employee', '2025-04-06', 'Scotland only'),
    ('GB', '2025/26', 'income_tax', 'Scottish Advanced Rate', 75000, 125140, 45, 'employee', '2025-04-06', 'Scotland only'),
    ('GB', '2025/26', 'income_tax', 'Scottish Top Rate', 125140, NULL, 48, 'employee', '2025-04-06', 'Scotland only'),

    -- Employee NI
    ('GB', '2025/26', 'national_insurance', 'Primary Threshold', 0, 12570, 0, 'employee', '2025-04-06', 'No NI below PT'),
    ('GB', '2025/26', 'national_insurance', 'Main Rate', 12570, 50270, 8, 'employee', '2025-04-06', '8% between PT and UEL'),
    ('GB', '2025/26', 'national_insurance', 'Upper Rate', 50270, NULL, 2, 'employee', '2025-04-06', '2% above UEL'),

    -- Employer NI (2025/26 changes)
    ('GB', '2025/26', 'national_insurance', 'Secondary Threshold', 0, 5000, 0, 'employer', '2025-04-06', 'Reduced from £9,100'),
    ('GB', '2025/26', 'national_insurance', 'Employer Rate', 5000, NULL, 15, 'employer', '2025-04-06', 'Increased from 13.8%'),

    -- Student Loan thresholds
    ('GB', '2025/26', 'student_loan', 'Plan 1 Threshold', 24990, NULL, 9, 'employee', '2025-04-06', 'Pre-2012 loans'),
    ('GB', '2025/26', 'student_loan', 'Plan 2 Threshold', 27295, NULL, 9, 'employee', '2025-04-06', 'Post-2012 loans'),
    ('GB', '2025/26', 'student_loan', 'Plan 4 Threshold', 31395, NULL, 9, 'employee', '2025-04-06', 'Scotland'),
    ('GB', '2025/26', 'student_loan', 'Plan 5 Threshold', 25000, NULL, 9, 'employee', '2025-04-06', 'Post-2023 loans'),
    ('GB', '2025/26', 'student_loan', 'Postgraduate Loan', 21000, NULL, 6, 'employee', '2025-04-06', 'Postgraduate loans'),

    -- Pension Auto-Enrolment
    ('GB', '2025/26', 'pension', 'Lower Qualifying Earnings', 6240, NULL, 0, 'both', '2025-04-06', 'Lower threshold for QE'),
    ('GB', '2025/26', 'pension', 'Upper Qualifying Earnings', 50270, NULL, 0, 'both', '2025-04-06', 'Upper threshold for QE'),
    ('GB', '2025/26', 'pension', 'Minimum Employee', 0, NULL, 5, 'employee', '2025-04-06', 'Minimum 5% employee'),
    ('GB', '2025/26', 'pension', 'Minimum Employer', 0, NULL, 3, 'employer', '2025-04-06', 'Minimum 3% employer')
ON CONFLICT DO NOTHING;

-- Insert German tax tables for 2025
INSERT INTO payroll_tax_tables (country_code, tax_year, tax_type, bracket_name, lower_bound, upper_bound, rate_percentage, applies_to, effective_from, notes)
VALUES
    -- German Income Tax (simplified)
    ('DE', '2025', 'income_tax', 'Grundfreibetrag', 0, 11784, 0, 'employee', '2025-01-01', 'Tax-free allowance'),
    ('DE', '2025', 'income_tax', 'Progressive Zone 1', 11784, 17005, 14, 'employee', '2025-01-01', 'Progressive 14-24%'),
    ('DE', '2025', 'income_tax', 'Progressive Zone 2', 17005, 66760, 24, 'employee', '2025-01-01', 'Progressive 24-42%'),
    ('DE', '2025', 'income_tax', 'Top Rate', 66760, 277825, 42, 'employee', '2025-01-01', '42% rate'),
    ('DE', '2025', 'income_tax', 'Rich Tax', 277825, NULL, 45, 'employee', '2025-01-01', 'Reichensteuer 45%'),

    -- German Social Insurance
    ('DE', '2025', 'health_insurance', 'KV Employee', 0, 66150, 7.3, 'employee', '2025-01-01', 'Health insurance'),
    ('DE', '2025', 'health_insurance', 'KV Employer', 0, 66150, 7.3, 'employer', '2025-01-01', 'Health insurance'),
    ('DE', '2025', 'pension', 'RV Employee', 0, 90600, 9.3, 'employee', '2025-01-01', 'Pension insurance'),
    ('DE', '2025', 'pension', 'RV Employer', 0, 90600, 9.3, 'employer', '2025-01-01', 'Pension insurance'),
    ('DE', '2025', 'unemployment', 'AV Employee', 0, 90600, 1.3, 'employee', '2025-01-01', 'Unemployment'),
    ('DE', '2025', 'unemployment', 'AV Employer', 0, 90600, 1.3, 'employer', '2025-01-01', 'Unemployment'),
    ('DE', '2025', 'nursing_care', 'PV Employee', 0, 66150, 1.7, 'employee', '2025-01-01', 'Nursing care'),
    ('DE', '2025', 'nursing_care', 'PV Employer', 0, 66150, 1.7, 'employer', '2025-01-01', 'Nursing care')
ON CONFLICT DO NOTHING;

-- Add updated_at trigger for new tables
CREATE OR REPLACE FUNCTION update_payroll_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_payroll_country_configs_timestamp
    BEFORE UPDATE ON payroll_country_configs
    FOR EACH ROW EXECUTE FUNCTION update_payroll_timestamp();

CREATE TRIGGER update_payroll_runs_timestamp
    BEFORE UPDATE ON payroll_runs
    FOR EACH ROW EXECUTE FUNCTION update_payroll_timestamp();

CREATE TRIGGER update_employee_payroll_settings_timestamp
    BEFORE UPDATE ON employee_payroll_settings
    FOR EACH ROW EXECUTE FUNCTION update_payroll_timestamp();
