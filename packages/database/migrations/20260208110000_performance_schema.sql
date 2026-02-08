-- ============================================================
-- PERFORMANCE MODULE SCHEMA
-- Reviews, goals, feedback, and competency tracking
-- ============================================================

-- Performance reviews
CREATE TABLE IF NOT EXISTS performance_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES users(id) ON DELETE SET NULL,
  review_period VARCHAR(50) NOT NULL, -- e.g., "Q1 2026", "Annual 2025"
  type VARCHAR(20) NOT NULL DEFAULT 'annual' CHECK (type IN ('annual', 'quarterly', 'probation', 'mid_year', 'ad_hoc')),
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'self_review', 'manager_review', 'calibration', 'complete')),
  self_assessment_text TEXT,
  manager_assessment_text TEXT,
  overall_rating INTEGER CHECK (overall_rating >= 1 AND overall_rating <= 5),
  -- 1: Unsatisfactory, 2: Needs Improvement, 3: Meets Expectations, 4: Exceeds Expectations, 5: Outstanding
  strengths TEXT,
  development_areas TEXT,
  submitted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Goals
CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(20) NOT NULL DEFAULT 'performance' CHECK (category IN ('performance', 'development', 'stretch')),
  status VARCHAR(20) NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'cancelled')),
  priority VARCHAR(10) NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
  target_date DATE,
  completed_date DATE,
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Goal updates (progress tracking)
CREATE TABLE IF NOT EXISTS goal_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  update_text TEXT NOT NULL,
  progress_percentage INTEGER CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Competency ratings (part of reviews)
CREATE TABLE IF NOT EXISTS competency_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES performance_reviews(id) ON DELETE CASCADE,
  competency_name VARCHAR(100) NOT NULL,
  competency_category VARCHAR(50) NOT NULL CHECK (competency_category IN ('core', 'role_specific', 'leadership')),
  self_rating INTEGER CHECK (self_rating >= 1 AND self_rating <= 5),
  manager_rating INTEGER CHECK (manager_rating >= 1 AND manager_rating <= 5),
  comments TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Feedback (peer and manager feedback)
CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feedback_text TEXT NOT NULL,
  feedback_type VARCHAR(20) NOT NULL DEFAULT 'general' CHECK (feedback_type IN ('praise', 'constructive', 'general')),
  is_anonymous BOOLEAN DEFAULT false,
  visibility VARCHAR(30) NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'shared_with_manager')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reviews_org ON performance_reviews(organization_id);
CREATE INDEX IF NOT EXISTS idx_reviews_employee ON performance_reviews(employee_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer ON performance_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON performance_reviews(status);
CREATE INDEX IF NOT EXISTS idx_reviews_period ON performance_reviews(review_period);
CREATE INDEX IF NOT EXISTS idx_goals_employee ON goals(employee_id);
CREATE INDEX IF NOT EXISTS idx_goals_org ON goals(organization_id);
CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status);
CREATE INDEX IF NOT EXISTS idx_goals_target ON goals(target_date);
CREATE INDEX IF NOT EXISTS idx_goal_updates_goal ON goal_updates(goal_id);
CREATE INDEX IF NOT EXISTS idx_competencies_review ON competency_ratings(review_id);
CREATE INDEX IF NOT EXISTS idx_feedback_to ON feedback(to_user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_from ON feedback(from_user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_org ON feedback(organization_id);

-- Triggers for updated_at
DROP TRIGGER IF EXISTS performance_reviews_updated ON performance_reviews;
CREATE TRIGGER performance_reviews_updated BEFORE UPDATE ON performance_reviews
  FOR EACH ROW EXECUTE FUNCTION update_learning_timestamp();

DROP TRIGGER IF EXISTS goals_updated ON goals;
CREATE TRIGGER goals_updated BEFORE UPDATE ON goals
  FOR EACH ROW EXECUTE FUNCTION update_learning_timestamp();

DROP TRIGGER IF EXISTS competency_ratings_updated ON competency_ratings;
CREATE TRIGGER competency_ratings_updated BEFORE UPDATE ON competency_ratings
  FOR EACH ROW EXECUTE FUNCTION update_learning_timestamp();
