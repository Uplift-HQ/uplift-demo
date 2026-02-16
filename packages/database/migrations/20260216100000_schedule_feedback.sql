-- ============================================================
-- SCHEDULE FEEDBACK TABLE
-- Historical data for ML-based scheduling optimization
-- ============================================================

CREATE TABLE IF NOT EXISTS schedule_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  schedule_period_id UUID,
  employee_id UUID NOT NULL REFERENCES employees(id),
  shift_id UUID NOT NULL REFERENCES shifts(id),

  -- Prediction vs Reality
  predicted_attendance BOOLEAN DEFAULT true,
  actual_attendance BOOLEAN,

  -- Quality metrics
  was_swapped BOOLEAN DEFAULT false,
  overtime_minutes INTEGER DEFAULT 0,
  quality_rating INTEGER CHECK (quality_rating BETWEEN 1 AND 5),

  -- Metadata
  feedback_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Indexes
  CONSTRAINT unique_shift_feedback UNIQUE (shift_id)
);

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_schedule_feedback_org
  ON schedule_feedback(organization_id);
CREATE INDEX IF NOT EXISTS idx_schedule_feedback_employee
  ON schedule_feedback(employee_id);
CREATE INDEX IF NOT EXISTS idx_schedule_feedback_created
  ON schedule_feedback(created_at DESC);

-- Location shift requirements for skill-based scheduling
CREATE TABLE IF NOT EXISTS location_shift_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  location_id UUID NOT NULL REFERENCES locations(id),
  shift_type VARCHAR(50) NOT NULL, -- 'morning', 'afternoon', 'evening', 'night'
  required_skills UUID[] DEFAULT '{}',
  min_staff INTEGER DEFAULT 1,
  preferred_staff INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_location_shift_type UNIQUE (location_id, shift_type)
);

-- Special events for demand adjustment
CREATE TABLE IF NOT EXISTS special_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  location_id UUID REFERENCES locations(id), -- NULL = applies to all locations
  event_name VARCHAR(255) NOT NULL,
  event_date DATE NOT NULL,
  demand_factor DECIMAL(3,2) DEFAULT 1.0, -- 1.5 = 50% more demand, 0.5 = 50% less
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_special_events_date
  ON special_events(event_date);
CREATE INDEX IF NOT EXISTS idx_special_events_org
  ON special_events(organization_id);

-- Add AI scheduling columns to shifts table
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN DEFAULT FALSE;
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS ai_confidence_score DECIMAL(3,2);
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS ai_reasoning TEXT;

-- Add AI optimization columns to schedule_periods table
ALTER TABLE schedule_periods ADD COLUMN IF NOT EXISTS ai_optimized BOOLEAN DEFAULT FALSE;
ALTER TABLE schedule_periods ADD COLUMN IF NOT EXISTS ai_optimized_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE schedule_periods ADD COLUMN IF NOT EXISTS ai_fitness_score DECIMAL(4,2);
ALTER TABLE schedule_periods ADD COLUMN IF NOT EXISTS ai_alternatives_count INTEGER DEFAULT 0;
