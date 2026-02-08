-- Gamification Schema Migration
-- Created: 2026-01-28
-- Description: Complete gamification system with points, badges, rewards, and affiliate offers

-- =============================================================================
-- 1. POINTS LEDGER - Append-only audit trail
-- =============================================================================
CREATE TABLE points_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    employee_id UUID NOT NULL,
    amount INTEGER NOT NULL,
    balance_after INTEGER,
    type VARCHAR(50) NOT NULL,
    reference_type VARCHAR(50),
    reference_id UUID,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 2. EMPLOYEE POINTS - Materialized balance
-- =============================================================================
CREATE TABLE employee_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    employee_id UUID NOT NULL UNIQUE,
    balance INTEGER DEFAULT 0,
    total_earned INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_activity_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 3. BADGES - Badge definitions
-- =============================================================================
CREATE TABLE badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    requirement_type VARCHAR(50) NOT NULL,
    requirement_value INTEGER NOT NULL,
    category VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 4. EMPLOYEE BADGES - Earned badges
-- =============================================================================
CREATE TABLE employee_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    employee_id UUID NOT NULL,
    badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(employee_id, badge_id)
);

-- =============================================================================
-- 5. REWARD CATALOG - Employer-defined rewards
-- =============================================================================
CREATE TABLE reward_catalog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    points_cost INTEGER NOT NULL,
    quantity_available INTEGER,
    quantity_redeemed INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 6. REWARD REDEMPTIONS - Redemption tracking
-- =============================================================================
CREATE TABLE reward_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    employee_id UUID NOT NULL,
    reward_id UUID REFERENCES reward_catalog(id) ON DELETE SET NULL,
    points_spent INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
        'pending',
        'approved',
        'fulfilled',
        'rejected'
    )),
    reviewed_by UUID,
    reviewed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 7. AFFILIATE OFFERS - External partner discounts
-- =============================================================================
CREATE TABLE affiliate_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID,
    brand VARCHAR(200) NOT NULL,
    description TEXT,
    discount_text VARCHAR(100),
    affiliate_url TEXT NOT NULL,
    logo_url TEXT,
    category VARCHAR(50),
    is_featured BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Points Ledger indexes
CREATE INDEX idx_points_ledger_org_employee ON points_ledger(organization_id, employee_id);
CREATE INDEX idx_points_ledger_employee ON points_ledger(employee_id);
CREATE INDEX idx_points_ledger_type ON points_ledger(type);
CREATE INDEX idx_points_ledger_created_at ON points_ledger(created_at DESC);

-- Employee Points indexes
CREATE INDEX idx_employee_points_org_employee ON employee_points(organization_id, employee_id);
CREATE INDEX idx_employee_points_employee ON employee_points(employee_id);
CREATE INDEX idx_employee_points_balance ON employee_points(balance DESC);

-- Badges indexes
CREATE INDEX idx_badges_organization ON badges(organization_id);
CREATE INDEX idx_badges_category ON badges(category);
CREATE INDEX idx_badges_is_active ON badges(is_active);

-- Employee Badges indexes
CREATE INDEX idx_employee_badges_org_employee ON employee_badges(organization_id, employee_id);
CREATE INDEX idx_employee_badges_employee ON employee_badges(employee_id);
CREATE INDEX idx_employee_badges_badge ON employee_badges(badge_id);
CREATE INDEX idx_employee_badges_earned_at ON employee_badges(earned_at DESC);

-- Reward Catalog indexes
CREATE INDEX idx_reward_catalog_org ON reward_catalog(organization_id);
CREATE INDEX idx_reward_catalog_category ON reward_catalog(category);
CREATE INDEX idx_reward_catalog_is_active ON reward_catalog(is_active);
CREATE INDEX idx_reward_catalog_points_cost ON reward_catalog(points_cost);

-- Reward Redemptions indexes
CREATE INDEX idx_reward_redemptions_org_employee ON reward_redemptions(organization_id, employee_id);
CREATE INDEX idx_reward_redemptions_employee ON reward_redemptions(employee_id);
CREATE INDEX idx_reward_redemptions_reward ON reward_redemptions(reward_id);
CREATE INDEX idx_reward_redemptions_status ON reward_redemptions(status);
CREATE INDEX idx_reward_redemptions_created_at ON reward_redemptions(created_at DESC);

-- Affiliate Offers indexes
CREATE INDEX idx_affiliate_offers_org ON affiliate_offers(organization_id);
CREATE INDEX idx_affiliate_offers_category ON affiliate_offers(category);
CREATE INDEX idx_affiliate_offers_is_active ON affiliate_offers(is_active);
CREATE INDEX idx_affiliate_offers_is_featured ON affiliate_offers(is_featured);
CREATE INDEX idx_affiliate_offers_sort_order ON affiliate_offers(sort_order);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE points_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_offers ENABLE ROW LEVEL SECURITY;

-- Points Ledger policies
CREATE POLICY points_ledger_select_policy ON points_ledger
    FOR SELECT USING (true);

CREATE POLICY points_ledger_insert_policy ON points_ledger
    FOR INSERT WITH CHECK (true);

-- Employee Points policies
CREATE POLICY employee_points_select_policy ON employee_points
    FOR SELECT USING (true);

CREATE POLICY employee_points_insert_policy ON employee_points
    FOR INSERT WITH CHECK (true);

CREATE POLICY employee_points_update_policy ON employee_points
    FOR UPDATE USING (true);

-- Badges policies
CREATE POLICY badges_select_policy ON badges
    FOR SELECT USING (true);

CREATE POLICY badges_insert_policy ON badges
    FOR INSERT WITH CHECK (true);

CREATE POLICY badges_update_policy ON badges
    FOR UPDATE USING (true);

-- Employee Badges policies
CREATE POLICY employee_badges_select_policy ON employee_badges
    FOR SELECT USING (true);

CREATE POLICY employee_badges_insert_policy ON employee_badges
    FOR INSERT WITH CHECK (true);

-- Reward Catalog policies
CREATE POLICY reward_catalog_select_policy ON reward_catalog
    FOR SELECT USING (true);

CREATE POLICY reward_catalog_insert_policy ON reward_catalog
    FOR INSERT WITH CHECK (true);

CREATE POLICY reward_catalog_update_policy ON reward_catalog
    FOR UPDATE USING (true);

-- Reward Redemptions policies
CREATE POLICY reward_redemptions_select_policy ON reward_redemptions
    FOR SELECT USING (true);

CREATE POLICY reward_redemptions_insert_policy ON reward_redemptions
    FOR INSERT WITH CHECK (true);

CREATE POLICY reward_redemptions_update_policy ON reward_redemptions
    FOR UPDATE USING (true);

-- Affiliate Offers policies
CREATE POLICY affiliate_offers_select_policy ON affiliate_offers
    FOR SELECT USING (true);

CREATE POLICY affiliate_offers_insert_policy ON affiliate_offers
    FOR INSERT WITH CHECK (true);

CREATE POLICY affiliate_offers_update_policy ON affiliate_offers
    FOR UPDATE USING (true);

-- =============================================================================
-- SEED DATA - Global Badges
-- =============================================================================

INSERT INTO badges (id, organization_id, name, description, icon, requirement_type, requirement_value, category, is_active)
VALUES
    (
        gen_random_uuid(),
        NULL,
        'First Shift',
        'Complete your first shift',
        'star',
        'shifts_completed',
        1,
        'milestones',
        TRUE
    ),
    (
        gen_random_uuid(),
        NULL,
        'Week Warrior',
        'Complete 5 shifts',
        'zap',
        'shifts_completed',
        5,
        'milestones',
        TRUE
    ),
    (
        gen_random_uuid(),
        NULL,
        'Streak Master',
        'Maintain a 7-day activity streak',
        'flame',
        'streak_days',
        7,
        'streaks',
        TRUE
    ),
    (
        gen_random_uuid(),
        NULL,
        'Team Player',
        'Receive 3 peer recognitions',
        'heart',
        'peer_recognitions',
        3,
        'social',
        TRUE
    ),
    (
        gen_random_uuid(),
        NULL,
        'Point Collector',
        'Earn 1000 total points',
        'trophy',
        'points_earned',
        1000,
        'milestones',
        TRUE
    );

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE points_ledger IS 'Append-only audit trail of all point transactions';
COMMENT ON TABLE employee_points IS 'Materialized view of employee point balances and streaks';
COMMENT ON TABLE badges IS 'Badge definitions (global and organization-specific)';
COMMENT ON TABLE employee_badges IS 'Badges earned by employees';
COMMENT ON TABLE reward_catalog IS 'Employer-defined rewards that can be redeemed with points';
COMMENT ON TABLE reward_redemptions IS 'Employee reward redemption requests and status';
COMMENT ON TABLE affiliate_offers IS 'External partner offers and discounts';
