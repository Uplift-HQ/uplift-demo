-- ============================================================
-- SURVEYS SCHEMA
-- Employee engagement surveys, eNPS, lifecycle surveys
-- ============================================================

-- Survey templates
CREATE TABLE IF NOT EXISTS survey_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

    -- Template info
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL, -- engagement, pulse, onboarding, exit, dei, manager, anniversary, change, custom

    -- Questions stored as JSONB array
    questions JSONB DEFAULT '[]'::jsonb,

    -- Settings
    is_system BOOLEAN DEFAULT FALSE, -- System templates are read-only
    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_survey_templates_org ON survey_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_survey_templates_type ON survey_templates(type);

-- Surveys
CREATE TABLE IF NOT EXISTS surveys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    template_id UUID REFERENCES survey_templates(id),

    -- Survey info
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL, -- engagement, pulse, onboarding, exit, dei, manager, anniversary, change, custom

    -- Status
    status VARCHAR(20) DEFAULT 'draft', -- draft, scheduled, active, closed, archived

    -- Questions (copied from template or custom)
    questions JSONB DEFAULT '[]'::jsonb,

    -- Targeting
    target_type VARCHAR(50) DEFAULT 'all', -- all, department, location, role, custom
    target_ids UUID[] DEFAULT '{}',
    target_count INTEGER DEFAULT 0,

    -- Scheduling
    scheduled_start TIMESTAMPTZ,
    scheduled_end TIMESTAMPTZ,
    closes_on DATE,

    -- Reminders
    reminder_enabled BOOLEAN DEFAULT TRUE,
    reminder_days INTEGER[] DEFAULT '{3, 7}',
    last_reminder_sent TIMESTAMPTZ,

    -- Settings
    is_anonymous BOOLEAN DEFAULT TRUE,
    allow_comments BOOLEAN DEFAULT TRUE,
    show_progress BOOLEAN DEFAULT TRUE,

    -- Results
    response_count INTEGER DEFAULT 0,
    participation_rate DECIMAL(5,2) DEFAULT 0,
    enps_score INTEGER,

    -- Audit
    created_by UUID REFERENCES users(id),
    published_by UUID REFERENCES users(id),
    published_at TIMESTAMPTZ,
    closed_by UUID REFERENCES users(id),
    closed_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_surveys_org ON surveys(organization_id);
CREATE INDEX IF NOT EXISTS idx_surveys_status ON surveys(status);
CREATE INDEX IF NOT EXISTS idx_surveys_type ON surveys(type);
CREATE INDEX IF NOT EXISTS idx_surveys_closes ON surveys(closes_on);

-- Survey responses
CREATE TABLE IF NOT EXISTS survey_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,

    -- Anonymous identifier (for anonymous surveys)
    anonymous_id VARCHAR(100),

    -- Response data
    answers JSONB NOT NULL DEFAULT '{}',

    -- Calculated scores
    enps_response INTEGER, -- -100 to 100 based on NPS question
    overall_score DECIMAL(3,2), -- Average of all scored questions

    -- Completion
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    is_complete BOOLEAN DEFAULT FALSE,

    -- Metadata
    user_agent TEXT,
    ip_address INET,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_survey_responses_survey ON survey_responses(survey_id);
CREATE INDEX IF NOT EXISTS idx_survey_responses_employee ON survey_responses(employee_id);
CREATE INDEX IF NOT EXISTS idx_survey_responses_complete ON survey_responses(is_complete);

-- Survey invitations (for tracking who was invited)
CREATE TABLE IF NOT EXISTS survey_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,

    -- Token for anonymous access
    token VARCHAR(100) UNIQUE,

    -- Status
    status VARCHAR(20) DEFAULT 'pending', -- pending, sent, opened, started, completed

    -- Tracking
    sent_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    -- Reminders
    reminder_count INTEGER DEFAULT 0,
    last_reminded_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(survey_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_survey_invitations_survey ON survey_invitations(survey_id);
CREATE INDEX IF NOT EXISTS idx_survey_invitations_employee ON survey_invitations(employee_id);
CREATE INDEX IF NOT EXISTS idx_survey_invitations_token ON survey_invitations(token);

-- eNPS history (for tracking trends)
CREATE TABLE IF NOT EXISTS enps_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Period
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    period_type VARCHAR(20) DEFAULT 'month', -- week, month, quarter

    -- Scores
    enps_score INTEGER NOT NULL,
    promoters_count INTEGER DEFAULT 0,
    passives_count INTEGER DEFAULT 0,
    detractors_count INTEGER DEFAULT 0,
    total_responses INTEGER DEFAULT 0,

    -- Breakdown by department (optional)
    department_scores JSONB DEFAULT '{}'::jsonb,

    -- Source survey
    survey_id UUID REFERENCES surveys(id),

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_enps_history_org ON enps_history(organization_id);
CREATE INDEX IF NOT EXISTS idx_enps_history_period ON enps_history(period_start, period_end);

-- Insert default system templates
INSERT INTO survey_templates (name, description, type, is_system, questions) VALUES
('Employee Engagement', 'Comprehensive engagement survey covering satisfaction, growth, and belonging', 'engagement', TRUE, '[
  {"id": "1", "type": "rating", "text": "I feel valued at this organization", "category": "Engagement", "required": true},
  {"id": "2", "type": "rating", "text": "My manager supports my professional growth", "category": "Leadership", "required": true},
  {"id": "3", "type": "rating", "text": "I have the tools and resources to do my job well", "category": "Engagement", "required": true},
  {"id": "4", "type": "rating", "text": "I see a clear career path at this company", "category": "Growth", "required": true},
  {"id": "5", "type": "rating", "text": "Our company culture is inclusive and welcoming", "category": "Culture", "required": true},
  {"id": "6", "type": "rating", "text": "I am fairly compensated for my work", "category": "Compensation", "required": true},
  {"id": "7", "type": "rating", "text": "I have a healthy work-life balance", "category": "Work-Life Balance", "required": true},
  {"id": "8", "type": "nps", "text": "How likely are you to recommend this company as a great place to work?", "category": "eNPS", "required": true},
  {"id": "9", "type": "text", "text": "What could we do to improve your experience?", "category": "Feedback", "required": false}
]'::jsonb),
('Quick Pulse', 'Short weekly or monthly check-in to gauge team morale', 'pulse', TRUE, '[
  {"id": "1", "type": "rating", "text": "How are you feeling about work this week?", "category": "Wellbeing", "required": true},
  {"id": "2", "type": "rating", "text": "Do you have what you need to be productive?", "category": "Resources", "required": true},
  {"id": "3", "type": "rating", "text": "Do you feel supported by your team?", "category": "Team", "required": true},
  {"id": "4", "type": "text", "text": "Anything you want to share?", "category": "Feedback", "required": false}
]'::jsonb),
('Onboarding Experience', 'Evaluate the new hire experience at 30, 60, and 90 days', 'onboarding', TRUE, '[
  {"id": "1", "type": "rating", "text": "My onboarding process was well-organized", "category": "Process", "required": true},
  {"id": "2", "type": "rating", "text": "I received adequate training for my role", "category": "Training", "required": true},
  {"id": "3", "type": "rating", "text": "I feel welcomed by my team", "category": "Team", "required": true},
  {"id": "4", "type": "rating", "text": "My manager has been accessible and supportive", "category": "Leadership", "required": true},
  {"id": "5", "type": "rating", "text": "I understand my role and responsibilities", "category": "Clarity", "required": true},
  {"id": "6", "type": "text", "text": "What could improve the onboarding experience?", "category": "Feedback", "required": false}
]'::jsonb),
('Exit Interview', 'Understand why employees leave and capture departure insights', 'exit', TRUE, '[
  {"id": "1", "type": "choice", "text": "What is your primary reason for leaving?", "category": "Reason", "required": true, "options": ["Career growth", "Compensation", "Work-life balance", "Management", "Culture", "Personal reasons", "Other"]},
  {"id": "2", "type": "rating", "text": "Overall, how satisfied were you with your job?", "category": "Satisfaction", "required": true},
  {"id": "3", "type": "rating", "text": "How would you rate management support?", "category": "Leadership", "required": true},
  {"id": "4", "type": "rating", "text": "Did you have opportunities for growth?", "category": "Growth", "required": true},
  {"id": "5", "type": "nps", "text": "Would you recommend this company to others?", "category": "eNPS", "required": true},
  {"id": "6", "type": "text", "text": "What could the company have done differently to retain you?", "category": "Feedback", "required": false}
]'::jsonb);

-- RLS policies
ALTER TABLE survey_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE enps_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_survey_templates ON survey_templates
  USING (organization_id IS NULL OR organization_id = current_setting('app.organization_id', true)::uuid);

CREATE POLICY tenant_isolation_surveys ON surveys
  USING (organization_id = current_setting('app.organization_id', true)::uuid);

CREATE POLICY tenant_isolation_survey_responses ON survey_responses
  USING (survey_id IN (SELECT id FROM surveys WHERE organization_id = current_setting('app.organization_id', true)::uuid));

CREATE POLICY tenant_isolation_survey_invitations ON survey_invitations
  USING (survey_id IN (SELECT id FROM surveys WHERE organization_id = current_setting('app.organization_id', true)::uuid));

CREATE POLICY tenant_isolation_enps_history ON enps_history
  USING (organization_id = current_setting('app.organization_id', true)::uuid);

CREATE POLICY service_bypass_survey_templates ON survey_templates TO uplift_service USING (true);
CREATE POLICY service_bypass_surveys ON surveys TO uplift_service USING (true);
CREATE POLICY service_bypass_survey_responses ON survey_responses TO uplift_service USING (true);
CREATE POLICY service_bypass_survey_invitations ON survey_invitations TO uplift_service USING (true);
CREATE POLICY service_bypass_enps_history ON enps_history TO uplift_service USING (true);
