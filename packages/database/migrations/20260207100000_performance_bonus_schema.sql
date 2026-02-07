-- ============================================================
-- PERFORMANCE BONUS SCHEMA
-- External site performance scores drive employee bonus payouts
-- Formula: payout = employee.bonus_amount × (location_score / 100)
-- ============================================================

-- Add bonus_amount to employees table
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS bonus_amount DECIMAL(10,2) DEFAULT NULL;

COMMENT ON COLUMN employees.bonus_amount IS 'Annual or periodic bonus amount eligible for performance-based payout';

-- ============================================================
-- PERFORMANCE SCORES TABLE
-- Stores external site/location performance scores by period
-- ============================================================
CREATE TABLE IF NOT EXISTS performance_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    period VARCHAR(20) NOT NULL, -- e.g., "2025-Q4", "2025-12"
    score_percentage DECIMAL(5,2) NOT NULL CHECK (score_percentage >= 0 AND score_percentage <= 100),
    uploaded_by UUID REFERENCES users(id),
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source VARCHAR(20) NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'csv', 'api')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, location_id, period)
);

CREATE INDEX IF NOT EXISTS idx_performance_scores_org_period
ON performance_scores(organization_id, period);

CREATE INDEX IF NOT EXISTS idx_performance_scores_location
ON performance_scores(location_id);

COMMENT ON TABLE performance_scores IS 'External site performance scores that determine bonus payouts';

-- ============================================================
-- BONUS PAYOUTS TABLE
-- Calculated payouts per employee based on their bonus and site score
-- ============================================================
CREATE TABLE IF NOT EXISTS bonus_payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    performance_score_id UUID REFERENCES performance_scores(id) ON DELETE SET NULL,
    period VARCHAR(20) NOT NULL,
    bonus_amount DECIMAL(10,2) NOT NULL, -- Employee's eligible bonus amount
    score_percentage DECIMAL(5,2) NOT NULL, -- Location score at time of calculation
    payout_amount DECIMAL(10,2) NOT NULL, -- Calculated: bonus_amount × (score / 100)
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    payroll_run_id UUID, -- Link to payroll run when paid
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, employee_id, period)
);

CREATE INDEX IF NOT EXISTS idx_bonus_payouts_org_period
ON bonus_payouts(organization_id, period);

CREATE INDEX IF NOT EXISTS idx_bonus_payouts_employee
ON bonus_payouts(employee_id);

CREATE INDEX IF NOT EXISTS idx_bonus_payouts_status
ON bonus_payouts(status);

COMMENT ON TABLE bonus_payouts IS 'Calculated bonus payouts based on employee bonus amount and site performance score';

-- ============================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_performance_scores_updated_at ON performance_scores;
CREATE TRIGGER update_performance_scores_updated_at
    BEFORE UPDATE ON performance_scores
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bonus_payouts_updated_at ON bonus_payouts;
CREATE TRIGGER update_bonus_payouts_updated_at
    BEFORE UPDATE ON bonus_payouts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
