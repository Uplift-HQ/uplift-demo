-- ============================================================
-- ONBOARDING SCHEMA
-- Track customer onboarding progress and step completion
-- ============================================================

-- Onboarding progress tracking per organization
CREATE TABLE IF NOT EXISTS onboarding_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    current_step VARCHAR(50) NOT NULL DEFAULT 'welcome',
    completed_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
    skipped_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_completed BOOLEAN NOT NULL DEFAULT false,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id)
);

-- Detailed log of each step completion
CREATE TABLE IF NOT EXISTS onboarding_step_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    step_name VARCHAR(50) NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('completed', 'skipped', 'revisited')),
    step_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_org ON onboarding_progress(organization_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_completed ON onboarding_progress(is_completed);
CREATE INDEX IF NOT EXISTS idx_onboarding_step_log_org ON onboarding_step_log(organization_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_step_log_user ON onboarding_step_log(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_step_log_step ON onboarding_step_log(step_name);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_onboarding_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_onboarding_progress_updated_at ON onboarding_progress;
CREATE TRIGGER trigger_onboarding_progress_updated_at
    BEFORE UPDATE ON onboarding_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_onboarding_progress_updated_at();
