-- ============================================================
-- LEARNING PATHS SCHEMA
-- Career development paths with sequenced courses
-- ============================================================

-- Learning paths (curated sequences of courses)
CREATE TABLE IF NOT EXISTS learning_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  target_audience VARCHAR(100),
  difficulty VARCHAR(20) DEFAULT 'beginner' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  estimated_hours INTEGER DEFAULT 0,
  is_mandatory BOOLEAN DEFAULT false,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Junction table for courses in learning paths
CREATE TABLE IF NOT EXISTS learning_path_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  learning_path_id UUID NOT NULL REFERENCES learning_paths(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_required BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(learning_path_id, course_id)
);

-- Add last_reminder_sent to enrollments for tracking reminders
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS last_reminder_sent TIMESTAMPTZ;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_learning_paths_org ON learning_paths(organization_id);
CREATE INDEX IF NOT EXISTS idx_learning_paths_status ON learning_paths(status);
CREATE INDEX IF NOT EXISTS idx_learning_path_courses_path ON learning_path_courses(learning_path_id);
CREATE INDEX IF NOT EXISTS idx_learning_path_courses_course ON learning_path_courses(course_id);
CREATE INDEX IF NOT EXISTS idx_learning_path_courses_sort ON learning_path_courses(learning_path_id, sort_order);

-- Trigger to update updated_at
DROP TRIGGER IF EXISTS learning_paths_updated ON learning_paths;
CREATE TRIGGER learning_paths_updated BEFORE UPDATE ON learning_paths
  FOR EACH ROW EXECUTE FUNCTION update_learning_timestamp();
