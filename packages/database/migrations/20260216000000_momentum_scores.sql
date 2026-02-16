-- ============================================================
-- MOMENTUM SCORES SCHEMA
-- Real-time workforce engagement scoring
-- ============================================================

-- Momentum scores cache table
CREATE TABLE IF NOT EXISTS momentum_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Overall score (0-100)
    score DECIMAL(5,2) NOT NULL DEFAULT 0,

    -- Dimension scores (0-100 each)
    attendance_score DECIMAL(5,2) DEFAULT 0,      -- On-time clock-ins
    punctuality_score DECIMAL(5,2) DEFAULT 0,     -- Average minutes early/late
    shift_completion_score DECIMAL(5,2) DEFAULT 0, -- Completed vs assigned
    skills_growth_score DECIMAL(5,2) DEFAULT 0,   -- New skills/certs
    recognition_score DECIMAL(5,2) DEFAULT 0,     -- Peer recognition received
    engagement_score DECIMAL(5,2) DEFAULT 0,      -- Surveys + learning

    -- Trend
    trend VARCHAR(10) DEFAULT 'stable', -- 'up', 'down', 'stable'
    previous_score DECIMAL(5,2),

    -- Period
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,

    -- Metadata
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(employee_id, period_start, period_end)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_momentum_scores_employee ON momentum_scores(employee_id);
CREATE INDEX IF NOT EXISTS idx_momentum_scores_org ON momentum_scores(organization_id);
CREATE INDEX IF NOT EXISTS idx_momentum_scores_calculated ON momentum_scores(calculated_at DESC);
CREATE INDEX IF NOT EXISTS idx_momentum_scores_score ON momentum_scores(organization_id, score DESC);

-- Momentum history for trend analysis
CREATE TABLE IF NOT EXISTS momentum_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    score DECIMAL(5,2) NOT NULL,
    recorded_at DATE NOT NULL DEFAULT CURRENT_DATE,

    UNIQUE(employee_id, recorded_at)
);

CREATE INDEX IF NOT EXISTS idx_momentum_history_employee ON momentum_history(employee_id, recorded_at DESC);

-- Comments
COMMENT ON TABLE momentum_scores IS 'Cached momentum scores calculated from 6 engagement dimensions';
COMMENT ON COLUMN momentum_scores.attendance_score IS '20% weight - On-time clock-ins / scheduled shifts';
COMMENT ON COLUMN momentum_scores.punctuality_score IS '15% weight - Average early/late minutes';
COMMENT ON COLUMN momentum_scores.shift_completion_score IS '15% weight - Shifts completed vs assigned';
COMMENT ON COLUMN momentum_scores.skills_growth_score IS '15% weight - New skills/certs in 90 days';
COMMENT ON COLUMN momentum_scores.recognition_score IS '15% weight - Peer recognition received';
COMMENT ON COLUMN momentum_scores.engagement_score IS '20% weight - Survey responses + learning completion';
