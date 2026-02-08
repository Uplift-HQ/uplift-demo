-- ============================================================
-- RECOGNITION MODULE SCHEMA
-- Kudos, awards, badges, and peer recognition
-- ============================================================

-- Recognition/Kudos table
CREATE TABLE IF NOT EXISTS recognitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'kudos' CHECK (category IN ('kudos', 'teamwork', 'innovation', 'customer_service', 'leadership', 'going_extra_mile', 'mentorship')),
  points_awarded INTEGER DEFAULT 10 CHECK (points_awarded >= 0),
  is_public BOOLEAN DEFAULT true,
  reactions JSONB DEFAULT '[]'::jsonb, -- [{"user_id": "...", "emoji": "..."}]
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Badges (organization-defined achievements)
CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon_url TEXT,
  category VARCHAR(50) NOT NULL DEFAULT 'achievement' CHECK (category IN ('achievement', 'milestone', 'skill', 'special', 'seasonal')),
  points_value INTEGER DEFAULT 50,
  criteria JSONB DEFAULT '{}'::jsonb, -- Automation rules for auto-award
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User badges (awarded badges)
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  awarded_by UUID REFERENCES users(id),
  awarded_reason TEXT,
  awarded_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

-- Awards (formal recognition programs)
CREATE TABLE IF NOT EXISTS awards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  award_type VARCHAR(50) NOT NULL DEFAULT 'monthly' CHECK (award_type IN ('spot', 'monthly', 'quarterly', 'annual', 'special')),
  prize_description TEXT,
  prize_value DECIMAL(10,2),
  nomination_required BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Award nominations
CREATE TABLE IF NOT EXISTS award_nominations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  award_id UUID NOT NULL REFERENCES awards(id) ON DELETE CASCADE,
  nominee_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nominator_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nomination_reason TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'shortlisted', 'winner', 'rejected')),
  period VARCHAR(50), -- e.g., "February 2026", "Q1 2026"
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Award winners (historical record)
CREATE TABLE IF NOT EXISTS award_winners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  award_id UUID NOT NULL REFERENCES awards(id) ON DELETE CASCADE,
  nomination_id UUID REFERENCES award_nominations(id) ON DELETE SET NULL,
  winner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period VARCHAR(50) NOT NULL,
  announcement_text TEXT,
  announced_at TIMESTAMPTZ DEFAULT NOW(),
  announced_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recognition points balance (gamification integration)
CREATE TABLE IF NOT EXISTS recognition_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  points_balance INTEGER DEFAULT 0,
  points_earned_total INTEGER DEFAULT 0,
  points_redeemed_total INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, organization_id)
);

-- Points transactions (audit trail)
CREATE TABLE IF NOT EXISTS points_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  transaction_type VARCHAR(30) NOT NULL CHECK (transaction_type IN ('earned_kudos', 'earned_badge', 'earned_award', 'redeemed', 'bonus', 'adjustment')),
  points INTEGER NOT NULL,
  reference_type VARCHAR(30), -- 'recognition', 'badge', 'award', 'redemption'
  reference_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_recognitions_org ON recognitions(organization_id);
CREATE INDEX IF NOT EXISTS idx_recognitions_to ON recognitions(to_user_id);
CREATE INDEX IF NOT EXISTS idx_recognitions_from ON recognitions(from_user_id);
CREATE INDEX IF NOT EXISTS idx_recognitions_created ON recognitions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recognitions_category ON recognitions(category);
CREATE INDEX IF NOT EXISTS idx_badges_org ON badges(organization_id);
CREATE INDEX IF NOT EXISTS idx_badges_active ON badges(is_active);
CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge ON user_badges(badge_id);
CREATE INDEX IF NOT EXISTS idx_awards_org ON awards(organization_id);
CREATE INDEX IF NOT EXISTS idx_nominations_award ON award_nominations(award_id);
CREATE INDEX IF NOT EXISTS idx_nominations_nominee ON award_nominations(nominee_user_id);
CREATE INDEX IF NOT EXISTS idx_nominations_status ON award_nominations(status);
CREATE INDEX IF NOT EXISTS idx_winners_award ON award_winners(award_id);
CREATE INDEX IF NOT EXISTS idx_winners_period ON award_winners(period);
CREATE INDEX IF NOT EXISTS idx_recognition_points_user ON recognition_points(user_id);
CREATE INDEX IF NOT EXISTS idx_points_transactions_user ON points_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_points_transactions_created ON points_transactions(created_at DESC);

-- Triggers for updated_at
DROP TRIGGER IF EXISTS badges_updated ON badges;
CREATE TRIGGER badges_updated BEFORE UPDATE ON badges
  FOR EACH ROW EXECUTE FUNCTION update_learning_timestamp();

DROP TRIGGER IF EXISTS awards_updated ON awards;
CREATE TRIGGER awards_updated BEFORE UPDATE ON awards
  FOR EACH ROW EXECUTE FUNCTION update_learning_timestamp();

DROP TRIGGER IF EXISTS nominations_updated ON award_nominations;
CREATE TRIGGER nominations_updated BEFORE UPDATE ON award_nominations
  FOR EACH ROW EXECUTE FUNCTION update_learning_timestamp();

DROP TRIGGER IF EXISTS recognition_points_updated ON recognition_points;
CREATE TRIGGER recognition_points_updated BEFORE UPDATE ON recognition_points
  FOR EACH ROW EXECUTE FUNCTION update_learning_timestamp();
