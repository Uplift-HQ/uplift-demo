-- ============================================================
-- PERFORMANCE MANAGEMENT ENHANCEMENTS
-- Competency frameworks, calibration sessions, 360-degree reviews
-- ============================================================

-- -------------------- COMPETENCY FRAMEWORKS --------------------

-- Competency framework templates
CREATE TABLE IF NOT EXISTS competency_frameworks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_framework_name UNIQUE (organization_id, name)
);

-- Competencies within a framework
CREATE TABLE IF NOT EXISTS competencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_id UUID NOT NULL REFERENCES competency_frameworks(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100), -- 'technical', 'leadership', 'behavioral', 'organizational'
  weight DECIMAL(3,2) DEFAULT 1.0 CHECK (weight > 0 AND weight <= 5),
  sort_order INTEGER DEFAULT 0,
  is_required BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_competency_in_framework UNIQUE (framework_id, name)
);

-- Competency level definitions (what does 1-5 mean for this competency)
CREATE TABLE IF NOT EXISTS competency_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competency_id UUID NOT NULL REFERENCES competencies(id) ON DELETE CASCADE,
  level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 5),
  label VARCHAR(100) NOT NULL, -- 'Developing', 'Competent', 'Proficient', 'Expert', 'Mastery'
  description TEXT NOT NULL,
  behavioral_indicators TEXT[], -- Array of example behaviors at this level

  CONSTRAINT unique_competency_level UNIQUE (competency_id, level)
);

-- Role-specific competency expectations
CREATE TABLE IF NOT EXISTS role_competency_expectations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  role_id UUID REFERENCES roles(id),
  job_level VARCHAR(50), -- 'junior', 'mid', 'senior', 'lead', 'principal'
  competency_id UUID NOT NULL REFERENCES competencies(id),
  expected_level INTEGER NOT NULL CHECK (expected_level BETWEEN 1 AND 5),
  weight_override DECIMAL(3,2), -- Override framework weight for this role

  CONSTRAINT unique_role_competency UNIQUE (role_id, job_level, competency_id)
);

-- -------------------- 360-DEGREE REVIEWS --------------------

-- 360 review configurations per cycle
CREATE TABLE IF NOT EXISTS review_360_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES review_cycles(id) ON DELETE CASCADE,
  min_peer_reviewers INTEGER DEFAULT 3,
  max_peer_reviewers INTEGER DEFAULT 5,
  include_direct_reports BOOLEAN DEFAULT true,
  include_cross_functional BOOLEAN DEFAULT true,
  anonymize_peer_feedback BOOLEAN DEFAULT true,
  peer_selection_mode VARCHAR(50) DEFAULT 'employee_selected', -- 'manager_assigned', 'employee_selected', 'mixed'
  peer_selection_deadline DATE,

  CONSTRAINT unique_360_config_per_cycle UNIQUE (cycle_id)
);

-- 360 peer nominations
CREATE TABLE IF NOT EXISTS review_360_nominations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES review_cycles(id) ON DELETE CASCADE,
  reviewee_id UUID NOT NULL REFERENCES employees(id),
  reviewer_id UUID NOT NULL REFERENCES employees(id),
  relationship VARCHAR(50) NOT NULL, -- 'peer', 'direct_report', 'cross_functional', 'manager', 'skip_level'
  nominated_by VARCHAR(50) NOT NULL, -- 'employee', 'manager', 'system'
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'accepted', 'declined', 'completed'
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,

  CONSTRAINT unique_360_nomination UNIQUE (cycle_id, reviewee_id, reviewer_id)
);

-- 360 peer feedback responses
CREATE TABLE IF NOT EXISTS review_360_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nomination_id UUID NOT NULL REFERENCES review_360_nominations(id) ON DELETE CASCADE,
  feedback_text TEXT,
  strengths TEXT,
  development_areas TEXT,
  overall_rating INTEGER CHECK (overall_rating BETWEEN 1 AND 5),
  competency_ratings JSONB DEFAULT '{}', -- {competency_id: rating}
  submitted_at TIMESTAMP WITH TIME ZONE,

  CONSTRAINT unique_360_response UNIQUE (nomination_id)
);

-- -------------------- CALIBRATION SESSIONS --------------------

-- Calibration sessions
CREATE TABLE IF NOT EXISTS calibration_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  cycle_id UUID REFERENCES review_cycles(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  scheduled_date DATE,
  scheduled_time TIME,
  duration_minutes INTEGER DEFAULT 60,
  status VARCHAR(50) DEFAULT 'scheduled', -- 'scheduled', 'in_progress', 'completed', 'cancelled'
  meeting_link VARCHAR(500),
  facilitator_id UUID REFERENCES users(id),
  department_id UUID REFERENCES departments(id),
  location_id UUID REFERENCES locations(id),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Calibration session participants (managers who calibrate)
CREATE TABLE IF NOT EXISTS calibration_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES calibration_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  role VARCHAR(50) DEFAULT 'participant', -- 'facilitator', 'participant', 'observer'
  attendance_status VARCHAR(50) DEFAULT 'invited', -- 'invited', 'confirmed', 'attended', 'absent'

  CONSTRAINT unique_calibration_participant UNIQUE (session_id, user_id)
);

-- Employees being calibrated in session
CREATE TABLE IF NOT EXISTS calibration_employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES calibration_sessions(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id),
  review_id UUID REFERENCES performance_reviews(id),

  -- Pre-calibration ratings from manager
  pre_overall_rating INTEGER CHECK (pre_overall_rating BETWEEN 1 AND 5),
  pre_potential_rating VARCHAR(50), -- 'low', 'medium', 'high'
  pre_promotion_ready BOOLEAN,

  -- Post-calibration adjustments
  post_overall_rating INTEGER CHECK (post_overall_rating BETWEEN 1 AND 5),
  post_potential_rating VARCHAR(50),
  post_promotion_ready BOOLEAN,

  -- Discussion notes
  discussion_points TEXT[],
  calibration_notes TEXT,
  rating_changed BOOLEAN DEFAULT false,
  change_justification TEXT,

  calibrated_by UUID REFERENCES users(id),
  calibrated_at TIMESTAMP WITH TIME ZONE,

  CONSTRAINT unique_calibration_employee UNIQUE (session_id, employee_id)
);

-- Rating distribution for calibration visualization
CREATE TABLE IF NOT EXISTS calibration_distributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES calibration_sessions(id) ON DELETE CASCADE,
  snapshot_type VARCHAR(50) NOT NULL, -- 'pre_calibration', 'post_calibration'
  rating_1_count INTEGER DEFAULT 0,
  rating_2_count INTEGER DEFAULT 0,
  rating_3_count INTEGER DEFAULT 0,
  rating_4_count INTEGER DEFAULT 0,
  rating_5_count INTEGER DEFAULT 0,
  total_employees INTEGER DEFAULT 0,
  mean_rating DECIMAL(3,2),
  median_rating DECIMAL(3,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_distribution_snapshot UNIQUE (session_id, snapshot_type)
);

-- -------------------- CONTINUOUS FEEDBACK ENHANCEMENTS --------------------

-- Feedback templates for quick feedback
CREATE TABLE IF NOT EXISTS feedback_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100), -- 'recognition', 'constructive', 'milestone', 'values'
  template_text TEXT NOT NULL,
  is_public BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Feedback requests (ask for feedback)
CREATE TABLE IF NOT EXISTS feedback_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  requester_id UUID NOT NULL REFERENCES users(id),
  target_id UUID NOT NULL REFERENCES users(id), -- Person being asked
  subject TEXT NOT NULL, -- What feedback is about
  context TEXT, -- Additional context
  due_date DATE,
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'completed', 'declined', 'expired'
  feedback_id UUID REFERENCES feedback(id), -- Link to actual feedback when submitted
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- -------------------- ADD COLUMNS TO EXISTING TABLES --------------------

-- Enhance performance_reviews with calibration fields
ALTER TABLE performance_reviews ADD COLUMN IF NOT EXISTS calibration_session_id UUID REFERENCES calibration_sessions(id);
ALTER TABLE performance_reviews ADD COLUMN IF NOT EXISTS pre_calibration_rating INTEGER CHECK (pre_calibration_rating BETWEEN 1 AND 5);
ALTER TABLE performance_reviews ADD COLUMN IF NOT EXISTS is_calibrated BOOLEAN DEFAULT false;
ALTER TABLE performance_reviews ADD COLUMN IF NOT EXISTS calibrated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE performance_reviews ADD COLUMN IF NOT EXISTS calibrated_by UUID REFERENCES users(id);

-- Enhance review_cycles with 360 settings
ALTER TABLE review_cycles ADD COLUMN IF NOT EXISTS include_360 BOOLEAN DEFAULT false;
ALTER TABLE review_cycles ADD COLUMN IF NOT EXISTS framework_id UUID REFERENCES competency_frameworks(id);
ALTER TABLE review_cycles ADD COLUMN IF NOT EXISTS calibration_required BOOLEAN DEFAULT false;

-- Enhance employees with performance metadata
ALTER TABLE employees ADD COLUMN IF NOT EXISTS current_performance_rating INTEGER CHECK (current_performance_rating BETWEEN 1 AND 5);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS potential_rating VARCHAR(50);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS flight_risk VARCHAR(50);
ALTER TABLE employees ADD COLUMN IF NOT EXISTS last_review_date DATE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS next_review_date DATE;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_competencies_framework ON competencies(framework_id);
CREATE INDEX IF NOT EXISTS idx_360_nominations_cycle ON review_360_nominations(cycle_id);
CREATE INDEX IF NOT EXISTS idx_360_nominations_reviewee ON review_360_nominations(reviewee_id);
CREATE INDEX IF NOT EXISTS idx_calibration_sessions_org ON calibration_sessions(organization_id);
CREATE INDEX IF NOT EXISTS idx_calibration_sessions_cycle ON calibration_sessions(cycle_id);
CREATE INDEX IF NOT EXISTS idx_calibration_employees_session ON calibration_employees(session_id);
CREATE INDEX IF NOT EXISTS idx_feedback_requests_requester ON feedback_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_feedback_requests_target ON feedback_requests(target_id);
