-- ============================================================
-- COMPENSATION SCHEMA
-- Salary tracking, history, and review cycles
-- ============================================================

-- Add salary fields to employees
ALTER TABLE employees ADD COLUMN IF NOT EXISTS annual_salary DECIMAL(15,2);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS pay_frequency VARCHAR(20) DEFAULT 'monthly';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'GBP';
ALTER TABLE employees ADD COLUMN IF NOT EXISTS last_salary_review DATE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS next_salary_review DATE;

-- Salary history tracking
CREATE TABLE IF NOT EXISTS salary_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,

    -- Salary change
    previous_salary DECIMAL(15,2),
    new_salary DECIMAL(15,2) NOT NULL,
    change_percentage DECIMAL(5,2),

    -- Details
    effective_date DATE NOT NULL,
    reason VARCHAR(100), -- annual_review, promotion, adjustment, starting_salary
    notes TEXT,

    -- Audit
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_salary_history_employee ON salary_history(employee_id);
CREATE INDEX IF NOT EXISTS idx_salary_history_org ON salary_history(organization_id);
CREATE INDEX IF NOT EXISTS idx_salary_history_date ON salary_history(effective_date DESC);

-- Compensation review cycles
CREATE TABLE IF NOT EXISTS compensation_cycles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Cycle info
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'draft', -- draft, active, completed, cancelled

    -- Budget
    budget DECIMAL(15,2),
    allocated DECIMAL(15,2) DEFAULT 0,

    -- Timing
    effective_date DATE NOT NULL,
    start_date DATE,
    end_date DATE,

    -- Participants
    participant_count INTEGER DEFAULT 0,

    -- Audit
    created_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compensation_cycles_org ON compensation_cycles(organization_id);
CREATE INDEX IF NOT EXISTS idx_compensation_cycles_status ON compensation_cycles(status);

-- Cycle participants (employees being reviewed)
CREATE TABLE IF NOT EXISTS compensation_cycle_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cycle_id UUID NOT NULL REFERENCES compensation_cycles(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,

    -- Current values
    current_salary DECIMAL(15,2),
    proposed_salary DECIMAL(15,2),
    proposed_change_percent DECIMAL(5,2),

    -- Status
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
    manager_notes TEXT,
    hr_notes TEXT,

    -- Approval
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(cycle_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_cycle_participants_cycle ON compensation_cycle_participants(cycle_id);
CREATE INDEX IF NOT EXISTS idx_cycle_participants_employee ON compensation_cycle_participants(employee_id);

-- RLS policies
ALTER TABLE salary_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE compensation_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE compensation_cycle_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_salary_history ON salary_history
  USING (organization_id = current_setting('app.organization_id', true)::uuid);

CREATE POLICY tenant_isolation_compensation_cycles ON compensation_cycles
  USING (organization_id = current_setting('app.organization_id', true)::uuid);

CREATE POLICY tenant_isolation_cycle_participants ON compensation_cycle_participants
  USING (cycle_id IN (SELECT id FROM compensation_cycles WHERE organization_id = current_setting('app.organization_id', true)::uuid));

CREATE POLICY service_bypass_salary_history ON salary_history TO uplift_service USING (true);
CREATE POLICY service_bypass_compensation_cycles ON compensation_cycles TO uplift_service USING (true);
CREATE POLICY service_bypass_cycle_participants ON compensation_cycle_participants TO uplift_service USING (true);
