-- Feed and Tasks Schema Migration
-- Created: 2026-02-05
-- Description: Social feed and task management for mobile app

-- =============================================================================
-- 1. FEED POSTS - Social feed posts
-- =============================================================================
CREATE TABLE IF NOT EXISTS feed_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'post' CHECK (type IN (
        'post',
        'recognition',
        'achievement',
        'announcement',
        'milestone'
    )),
    mentioned JSONB DEFAULT '[]',
    is_pinned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 2. FEED LIKES - Post likes
-- =============================================================================
CREATE TABLE IF NOT EXISTS feed_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(post_id, user_id)
);

-- =============================================================================
-- 3. FEED COMMENTS - Post comments
-- =============================================================================
CREATE TABLE IF NOT EXISTS feed_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 4. TASKS - Employee task assignments
-- =============================================================================
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES employees(id) ON DELETE SET NULL,
    assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
    location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    due_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    completion_notes TEXT,
    xp_reward INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 5. JOB REQUIRED SKILLS - Skills required for job postings
-- =============================================================================
CREATE TABLE IF NOT EXISTS job_required_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
    skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
    is_required BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(job_id, skill_id)
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Feed Posts indexes
CREATE INDEX IF NOT EXISTS idx_feed_posts_org ON feed_posts(organization_id);
CREATE INDEX IF NOT EXISTS idx_feed_posts_user ON feed_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_feed_posts_type ON feed_posts(type);
CREATE INDEX IF NOT EXISTS idx_feed_posts_created_at ON feed_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feed_posts_is_pinned ON feed_posts(is_pinned DESC, created_at DESC);

-- Feed Likes indexes
CREATE INDEX IF NOT EXISTS idx_feed_likes_post ON feed_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_feed_likes_user ON feed_likes(user_id);

-- Feed Comments indexes
CREATE INDEX IF NOT EXISTS idx_feed_comments_post ON feed_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_feed_comments_user ON feed_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_feed_comments_created_at ON feed_comments(created_at);

-- Tasks indexes
CREATE INDEX IF NOT EXISTS idx_tasks_org ON tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_location ON tasks(location_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_at ON tasks(due_at);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);

-- Job Required Skills indexes
CREATE INDEX IF NOT EXISTS idx_job_required_skills_job ON job_required_skills(job_id);
CREATE INDEX IF NOT EXISTS idx_job_required_skills_skill ON job_required_skills(skill_id);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE feed_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_required_skills ENABLE ROW LEVEL SECURITY;

-- Feed Posts policies
CREATE POLICY feed_posts_select_policy ON feed_posts FOR SELECT USING (true);
CREATE POLICY feed_posts_insert_policy ON feed_posts FOR INSERT WITH CHECK (true);
CREATE POLICY feed_posts_update_policy ON feed_posts FOR UPDATE USING (true);
CREATE POLICY feed_posts_delete_policy ON feed_posts FOR DELETE USING (true);

-- Feed Likes policies
CREATE POLICY feed_likes_select_policy ON feed_likes FOR SELECT USING (true);
CREATE POLICY feed_likes_insert_policy ON feed_likes FOR INSERT WITH CHECK (true);
CREATE POLICY feed_likes_delete_policy ON feed_likes FOR DELETE USING (true);

-- Feed Comments policies
CREATE POLICY feed_comments_select_policy ON feed_comments FOR SELECT USING (true);
CREATE POLICY feed_comments_insert_policy ON feed_comments FOR INSERT WITH CHECK (true);
CREATE POLICY feed_comments_update_policy ON feed_comments FOR UPDATE USING (true);
CREATE POLICY feed_comments_delete_policy ON feed_comments FOR DELETE USING (true);

-- Tasks policies
CREATE POLICY tasks_select_policy ON tasks FOR SELECT USING (true);
CREATE POLICY tasks_insert_policy ON tasks FOR INSERT WITH CHECK (true);
CREATE POLICY tasks_update_policy ON tasks FOR UPDATE USING (true);
CREATE POLICY tasks_delete_policy ON tasks FOR DELETE USING (true);

-- Job Required Skills policies
CREATE POLICY job_required_skills_select_policy ON job_required_skills FOR SELECT USING (true);
CREATE POLICY job_required_skills_insert_policy ON job_required_skills FOR INSERT WITH CHECK (true);
CREATE POLICY job_required_skills_delete_policy ON job_required_skills FOR DELETE USING (true);

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE feed_posts IS 'Social feed posts from users within an organization';
COMMENT ON TABLE feed_likes IS 'Likes on feed posts';
COMMENT ON TABLE feed_comments IS 'Comments on feed posts';
COMMENT ON TABLE tasks IS 'Tasks assigned to employees with location and due date';
COMMENT ON TABLE job_required_skills IS 'Skills required for job postings';
