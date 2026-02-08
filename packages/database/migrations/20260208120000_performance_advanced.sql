-- ============================================================
-- ADVANCED PERFORMANCE SCHEMA
-- Review cycles, 1-on-1s, development plans, OKRs
-- ============================================================

-- Review cycles (grouping reviews together)
CREATE TABLE IF NOT EXISTS review_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('annual', 'quarterly', '360', 'probation')),
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'in_review', 'calibration', 'completed')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  self_assessment BOOLEAN DEFAULT true,
  manager_review BOOLEAN DEFAULT true,
  peer_review BOOLEAN DEFAULT false,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Review cycle participants
CREATE TABLE IF NOT EXISTS review_cycle_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES review_cycles(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  self_done BOOLEAN DEFAULT false,
  manager_done BOOLEAN DEFAULT false,
  peer_done BOOLEAN DEFAULT false,
  rating DECIMAL(2,1) CHECK (rating >= 1 AND rating <= 5),
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(cycle_id, employee_id)
);

-- 1-on-1 meetings
CREATE TABLE IF NOT EXISTS one_on_ones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  manager_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  scheduled_time TIME,
  recurring VARCHAR(20) CHECK (recurring IN ('weekly', 'biweekly', 'monthly', 'none')),
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'rescheduled')),
  agenda JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  mood INTEGER CHECK (mood >= 1 AND mood <= 5),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1-on-1 action items
CREATE TABLE IF NOT EXISTS one_on_one_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  one_on_one_id UUID NOT NULL REFERENCES one_on_ones(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  assigned_to UUID REFERENCES users(id),
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Development plans
CREATE TABLE IF NOT EXISTS development_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'archived')),
  review_date DATE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Development plan focus areas
CREATE TABLE IF NOT EXISTS development_focus_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES development_plans(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Development plan actions
CREATE TABLE IF NOT EXISTS development_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  focus_area_id UUID NOT NULL REFERENCES development_focus_areas(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('training', 'stretch', 'mentoring', 'reading', 'other')),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  completed_at TIMESTAMPTZ,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- OKRs (Objectives and Key Results)
CREATE TABLE IF NOT EXISTS okrs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  level VARCHAR(20) NOT NULL CHECK (level IN ('company', 'department', 'team', 'individual')),
  owner_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  department VARCHAR(100),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  status VARCHAR(20) NOT NULL DEFAULT 'on_track' CHECK (status IN ('on_track', 'at_risk', 'off_track', 'completed')),
  period VARCHAR(20) NOT NULL, -- e.g., 'Q1 2026', 'H1 2026'
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Key results for OKRs
CREATE TABLE IF NOT EXISTS key_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  okr_id UUID NOT NULL REFERENCES okrs(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  target VARCHAR(100) NOT NULL,
  current VARCHAR(100),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Public feedback with reactions
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS reactions JSONB DEFAULT '{"thumbsUp": 0, "heart": 0, "sparkle": 0}'::jsonb;
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS value_tag VARCHAR(50);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_review_cycles_org ON review_cycles(organization_id);
CREATE INDEX IF NOT EXISTS idx_review_cycles_status ON review_cycles(status);
CREATE INDEX IF NOT EXISTS idx_review_cycle_participants_cycle ON review_cycle_participants(cycle_id);
CREATE INDEX IF NOT EXISTS idx_review_cycle_participants_emp ON review_cycle_participants(employee_id);
CREATE INDEX IF NOT EXISTS idx_one_on_ones_manager ON one_on_ones(manager_id);
CREATE INDEX IF NOT EXISTS idx_one_on_ones_employee ON one_on_ones(employee_id);
CREATE INDEX IF NOT EXISTS idx_one_on_ones_date ON one_on_ones(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_one_on_one_actions_meeting ON one_on_one_actions(one_on_one_id);
CREATE INDEX IF NOT EXISTS idx_development_plans_emp ON development_plans(employee_id);
CREATE INDEX IF NOT EXISTS idx_development_focus_plan ON development_focus_areas(plan_id);
CREATE INDEX IF NOT EXISTS idx_development_actions_focus ON development_actions(focus_area_id);
CREATE INDEX IF NOT EXISTS idx_okrs_org ON okrs(organization_id);
CREATE INDEX IF NOT EXISTS idx_okrs_level ON okrs(level);
CREATE INDEX IF NOT EXISTS idx_okrs_owner ON okrs(owner_id);
CREATE INDEX IF NOT EXISTS idx_key_results_okr ON key_results(okr_id);

-- Triggers
DROP TRIGGER IF EXISTS review_cycles_updated ON review_cycles;
CREATE TRIGGER review_cycles_updated BEFORE UPDATE ON review_cycles
  FOR EACH ROW EXECUTE FUNCTION update_learning_timestamp();

DROP TRIGGER IF EXISTS review_cycle_participants_updated ON review_cycle_participants;
CREATE TRIGGER review_cycle_participants_updated BEFORE UPDATE ON review_cycle_participants
  FOR EACH ROW EXECUTE FUNCTION update_learning_timestamp();

DROP TRIGGER IF EXISTS one_on_ones_updated ON one_on_ones;
CREATE TRIGGER one_on_ones_updated BEFORE UPDATE ON one_on_ones
  FOR EACH ROW EXECUTE FUNCTION update_learning_timestamp();

DROP TRIGGER IF EXISTS one_on_one_actions_updated ON one_on_one_actions;
CREATE TRIGGER one_on_one_actions_updated BEFORE UPDATE ON one_on_one_actions
  FOR EACH ROW EXECUTE FUNCTION update_learning_timestamp();

DROP TRIGGER IF EXISTS development_plans_updated ON development_plans;
CREATE TRIGGER development_plans_updated BEFORE UPDATE ON development_plans
  FOR EACH ROW EXECUTE FUNCTION update_learning_timestamp();

DROP TRIGGER IF EXISTS development_actions_updated ON development_actions;
CREATE TRIGGER development_actions_updated BEFORE UPDATE ON development_actions
  FOR EACH ROW EXECUTE FUNCTION update_learning_timestamp();

DROP TRIGGER IF EXISTS okrs_updated ON okrs;
CREATE TRIGGER okrs_updated BEFORE UPDATE ON okrs
  FOR EACH ROW EXECUTE FUNCTION update_learning_timestamp();

DROP TRIGGER IF EXISTS key_results_updated ON key_results;
CREATE TRIGGER key_results_updated BEFORE UPDATE ON key_results
  FOR EACH ROW EXECUTE FUNCTION update_learning_timestamp();
