-- ============================================================
-- HSBC CORPORATE CARD INTEGRATION VIA TRUELAYER
-- Complete expense card workflow: swipe → import → claim → approve → payroll
-- ============================================================

-- ============================================================
-- 1A: TRUELAYER CONNECTIONS
-- Stores OAuth tokens for Open Banking connections
-- ============================================================

CREATE TABLE IF NOT EXISTS truelayer_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    connection_name VARCHAR(255) NOT NULL, -- e.g. "HSBC Corporate Account"
    provider_id VARCHAR(100) NOT NULL, -- e.g. "uk-ob-hsbc"
    access_token TEXT, -- encrypted TrueLayer access token
    refresh_token TEXT, -- encrypted TrueLayer refresh token
    token_expires_at TIMESTAMPTZ,
    consent_expires_at TIMESTAMPTZ, -- 90 days in UK Open Banking
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'expired', 'revoked', 'error')),
    connected_by UUID REFERENCES users(id),
    last_synced_at TIMESTAMPTZ,
    sync_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_truelayer_connections_org ON truelayer_connections(organization_id);
CREATE INDEX IF NOT EXISTS idx_truelayer_connections_status ON truelayer_connections(organization_id, status);

-- ============================================================
-- 1B: CORPORATE CARDS REGISTRY
-- Maps physical cards to employees
-- ============================================================

CREATE TABLE IF NOT EXISTS corporate_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    truelayer_connection_id UUID REFERENCES truelayer_connections(id) ON DELETE SET NULL,
    card_provider VARCHAR(50) NOT NULL DEFAULT 'hsbc',
    card_last_four VARCHAR(4) NOT NULL,
    card_network VARCHAR(20), -- VISA, MASTERCARD, AMEX
    card_type VARCHAR(20) DEFAULT 'CREDIT' CHECK (card_type IN ('CREDIT', 'DEBIT', 'PREPAID')),
    cardholder_name VARCHAR(255),
    truelayer_card_id VARCHAR(255), -- TrueLayer account_id for this card
    is_active BOOLEAN DEFAULT true,
    spending_limit DECIMAL(12,2), -- Optional monthly spending limit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, card_last_four, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_corporate_cards_org ON corporate_cards(organization_id);
CREATE INDEX IF NOT EXISTS idx_corporate_cards_employee ON corporate_cards(employee_id);
CREATE INDEX IF NOT EXISTS idx_corporate_cards_active ON corporate_cards(organization_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_corporate_cards_truelayer ON corporate_cards(truelayer_card_id);

-- ============================================================
-- 1C: CARD TRANSACTIONS (Imported from TrueLayer)
-- Raw transactions from bank, linked to claims when submitted
-- ============================================================

CREATE TABLE IF NOT EXISTS card_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    corporate_card_id UUID NOT NULL REFERENCES corporate_cards(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    truelayer_transaction_id VARCHAR(255) UNIQUE, -- dedup key from TrueLayer

    -- Transaction details
    transaction_date TIMESTAMPTZ NOT NULL,
    posted_date TIMESTAMPTZ, -- When it cleared (if different from transaction_date)
    description TEXT,
    merchant_name VARCHAR(255),
    merchant_category_code VARCHAR(10), -- MCC code if available

    -- Amounts
    amount DECIMAL(12,2) NOT NULL, -- positive = spend, negative = refund
    currency VARCHAR(3) DEFAULT 'GBP',
    original_amount DECIMAL(12,2), -- if foreign currency
    original_currency VARCHAR(3),

    -- TrueLayer categorisation
    transaction_category VARCHAR(100), -- from TrueLayer: PURCHASE, ATM, TRANSFER, etc.
    transaction_classification JSONB, -- TrueLayer's ["Shopping", "Groceries"] etc.

    -- Uplift categorisation
    expense_category_id UUID REFERENCES expense_categories(id),
    auto_categorized BOOLEAN DEFAULT false, -- true if category was set by mapping rules

    -- Status workflow
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'approved', 'rejected', 'paid', 'excluded')),

    -- Link to expense claim when submitted
    expense_claim_id UUID REFERENCES expense_claims(id) ON DELETE SET NULL,

    -- Receipt handling
    receipt_url TEXT,
    receipt_uploaded_at TIMESTAMPTZ,
    receipt_verified BOOLEAN DEFAULT false,
    receipt_required BOOLEAN DEFAULT false, -- set based on category/amount rules

    -- Notes and audit
    notes TEXT,
    employee_notes TEXT, -- employee can add their own notes
    raw_data JSONB, -- full TrueLayer response for audit

    -- Timestamps
    imported_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_card_transactions_org ON card_transactions(organization_id);
CREATE INDEX IF NOT EXISTS idx_card_transactions_employee ON card_transactions(employee_id);
CREATE INDEX IF NOT EXISTS idx_card_transactions_card ON card_transactions(corporate_card_id);
CREATE INDEX IF NOT EXISTS idx_card_transactions_status ON card_transactions(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_card_transactions_date ON card_transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_card_transactions_claim ON card_transactions(expense_claim_id) WHERE expense_claim_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_card_transactions_pending ON card_transactions(organization_id, employee_id, status) WHERE status = 'pending';

-- ============================================================
-- 1D: EXTEND EXPENSE_CLAIMS WITH PAYROLL FIELDS
-- Add columns needed for payroll export workflow
-- ============================================================

DO $$
BEGIN
    -- Add claim_number for human-readable reference
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'expense_claims' AND column_name = 'claim_number') THEN
        ALTER TABLE expense_claims ADD COLUMN claim_number VARCHAR(50);
    END IF;

    -- Add title for grouped claims
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'expense_claims' AND column_name = 'title') THEN
        ALTER TABLE expense_claims ADD COLUMN title VARCHAR(255);
    END IF;

    -- Add submitted_at timestamp
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'expense_claims' AND column_name = 'submitted_at') THEN
        ALTER TABLE expense_claims ADD COLUMN submitted_at TIMESTAMPTZ;
    END IF;

    -- Add payroll period reference
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'expense_claims' AND column_name = 'payroll_period') THEN
        ALTER TABLE expense_claims ADD COLUMN payroll_period VARCHAR(20); -- e.g. "2026-02"
    END IF;

    -- Add payroll export tracking
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'expense_claims' AND column_name = 'payroll_exported') THEN
        ALTER TABLE expense_claims ADD COLUMN payroll_exported BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'expense_claims' AND column_name = 'payroll_export_date') THEN
        ALTER TABLE expense_claims ADD COLUMN payroll_export_date TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'expense_claims' AND column_name = 'payroll_export_id') THEN
        ALTER TABLE expense_claims ADD COLUMN payroll_export_id UUID;
    END IF;
END $$;

-- Add index for payroll queries
CREATE INDEX IF NOT EXISTS idx_expense_claims_payroll ON expense_claims(payroll_period, payroll_exported) WHERE payroll_exported = false;
CREATE INDEX IF NOT EXISTS idx_expense_claims_claim_number ON expense_claims(organization_id, claim_number);

-- ============================================================
-- 1E: EXPENSE CATEGORY MAPPINGS
-- Auto-categorisation rules based on TrueLayer data
-- ============================================================

CREATE TABLE IF NOT EXISTS expense_category_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    expense_category_id UUID NOT NULL REFERENCES expense_categories(id) ON DELETE CASCADE,

    -- Matching criteria (any combination)
    truelayer_category VARCHAR(100), -- TrueLayer transaction_category (PURCHASE, ATM, etc.)
    truelayer_classification VARCHAR(255), -- TrueLayer classification e.g. "Shopping > Groceries"
    merchant_pattern VARCHAR(255), -- regex/LIKE pattern for merchant name
    mcc_code VARCHAR(10), -- Merchant Category Code

    -- Priority for when multiple rules match (lower = higher priority)
    priority INTEGER DEFAULT 100,
    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expense_category_mappings_org ON expense_category_mappings(organization_id);
CREATE INDEX IF NOT EXISTS idx_expense_category_mappings_active ON expense_category_mappings(organization_id, is_active) WHERE is_active = true;

-- ============================================================
-- 1F: PAYROLL EXPORTS
-- Records of expense data exported to payroll systems
-- ============================================================

CREATE TABLE IF NOT EXISTS payroll_exports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    payroll_period VARCHAR(20) NOT NULL, -- "2026-02"

    -- Export details
    export_format VARCHAR(20) DEFAULT 'csv' CHECK (export_format IN ('csv', 'json', 'api', 'sage', 'xero')),
    file_url TEXT, -- generated CSV/file location
    file_name VARCHAR(255),

    -- Summary
    total_amount DECIMAL(12,2) NOT NULL,
    total_claims INTEGER NOT NULL,
    total_employees INTEGER NOT NULL,

    -- Breakdown by employee (for quick reference)
    breakdown JSONB, -- [{employee_id, name, amount, claims_count}, ...]

    -- Audit
    exported_by UUID REFERENCES users(id),
    exported_at TIMESTAMPTZ DEFAULT NOW(),

    -- Integration status (for API exports)
    integration_status VARCHAR(20) DEFAULT 'completed',
    integration_reference VARCHAR(255),
    integration_error TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payroll_exports_org ON payroll_exports(organization_id);
CREATE INDEX IF NOT EXISTS idx_payroll_exports_period ON payroll_exports(organization_id, payroll_period);

-- Add FK from expense_claims to payroll_exports
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                   WHERE constraint_name = 'fk_expense_claims_payroll_export') THEN
        ALTER TABLE expense_claims
        ADD CONSTRAINT fk_expense_claims_payroll_export
        FOREIGN KEY (payroll_export_id) REFERENCES payroll_exports(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ============================================================
-- 1G: INTEGRATION SYNC LOGS
-- Track all TrueLayer API interactions for debugging
-- ============================================================

CREATE TABLE IF NOT EXISTS integration_sync_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    integration_type VARCHAR(50) NOT NULL DEFAULT 'truelayer',
    connection_id UUID REFERENCES truelayer_connections(id) ON DELETE SET NULL,

    -- Sync details
    sync_type VARCHAR(50) NOT NULL, -- 'cards', 'transactions', 'token_refresh', 'auth_callback'
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,

    -- Results
    status VARCHAR(20) DEFAULT 'running' CHECK (status IN ('running', 'success', 'partial', 'failed')),
    records_fetched INTEGER DEFAULT 0,
    records_created INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    records_skipped INTEGER DEFAULT 0,

    -- Error tracking
    error_message TEXT,
    error_details JSONB,

    -- Request/Response logging (sanitized - no tokens)
    request_summary JSONB,
    response_summary JSONB,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_integration_sync_logs_org ON integration_sync_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_integration_sync_logs_connection ON integration_sync_logs(connection_id);
CREATE INDEX IF NOT EXISTS idx_integration_sync_logs_time ON integration_sync_logs(created_at DESC);

-- ============================================================
-- 1H: SEQUENCE FOR CLAIM NUMBERS
-- Auto-generate claim numbers: EXP-2026-001
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS expense_claim_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_expense_claim_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.claim_number IS NULL THEN
        NEW.claim_number := 'EXP-' || EXTRACT(YEAR FROM NOW())::TEXT || '-' ||
                           LPAD(nextval('expense_claim_number_seq')::TEXT, 5, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_expense_claim_number ON expense_claims;
CREATE TRIGGER set_expense_claim_number
    BEFORE INSERT ON expense_claims
    FOR EACH ROW
    EXECUTE FUNCTION generate_expense_claim_number();

-- ============================================================
-- 1I: UPDATED_AT TRIGGERS
-- ============================================================

CREATE TRIGGER update_truelayer_connections_ts
    BEFORE UPDATE ON truelayer_connections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_corporate_cards_ts
    BEFORE UPDATE ON corporate_cards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_card_transactions_ts
    BEFORE UPDATE ON card_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_expense_category_mappings_ts
    BEFORE UPDATE ON expense_category_mappings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 1J: ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE truelayer_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE corporate_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_category_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_truelayer_connections ON truelayer_connections
    USING (organization_id = current_setting('app.organization_id', true)::uuid);

CREATE POLICY tenant_isolation_corporate_cards ON corporate_cards
    USING (organization_id = current_setting('app.organization_id', true)::uuid);

CREATE POLICY tenant_isolation_card_transactions ON card_transactions
    USING (organization_id = current_setting('app.organization_id', true)::uuid);

CREATE POLICY tenant_isolation_expense_category_mappings ON expense_category_mappings
    USING (organization_id = current_setting('app.organization_id', true)::uuid);

CREATE POLICY tenant_isolation_payroll_exports ON payroll_exports
    USING (organization_id = current_setting('app.organization_id', true)::uuid);

CREATE POLICY tenant_isolation_integration_sync_logs ON integration_sync_logs
    USING (organization_id = current_setting('app.organization_id', true)::uuid);

-- Service role bypass
CREATE POLICY service_bypass_truelayer_connections ON truelayer_connections TO uplift_service USING (true);
CREATE POLICY service_bypass_corporate_cards ON corporate_cards TO uplift_service USING (true);
CREATE POLICY service_bypass_card_transactions ON card_transactions TO uplift_service USING (true);
CREATE POLICY service_bypass_expense_category_mappings ON expense_category_mappings TO uplift_service USING (true);
CREATE POLICY service_bypass_payroll_exports ON payroll_exports TO uplift_service USING (true);
CREATE POLICY service_bypass_integration_sync_logs ON integration_sync_logs TO uplift_service USING (true);

-- ============================================================
-- 1K: SEED DEFAULT EXPENSE CATEGORY MAPPINGS
-- Auto-categorisation rules for common TrueLayer categories
-- ============================================================

-- Insert mappings for each organization (will match category by name)
INSERT INTO expense_category_mappings (organization_id, expense_category_id, truelayer_category, truelayer_classification, merchant_pattern, priority)
SELECT
    o.id,
    ec.id,
    mapping.tl_category,
    mapping.tl_classification,
    mapping.merchant_pattern,
    mapping.priority
FROM organizations o
CROSS JOIN LATERAL (VALUES
    -- Travel mappings
    ('PURCHASE', 'Transport%', NULL, 'Travel', 10),
    ('PURCHASE', NULL, '%UBER%', 'Travel', 15),
    ('PURCHASE', NULL, '%LYFT%', 'Travel', 15),
    ('PURCHASE', NULL, '%TAXI%', 'Travel', 15),
    ('PURCHASE', NULL, '%RAILWAY%', 'Travel', 15),
    ('PURCHASE', NULL, '%AIRLINES%', 'Travel', 15),
    ('PURCHASE', NULL, '%TRAINLINE%', 'Travel', 15),

    -- Meals mappings
    ('PURCHASE', 'Food & Drink%', NULL, 'Meals', 20),
    ('PURCHASE', 'Shopping > Groceries', NULL, 'Meals', 25),
    ('PURCHASE', NULL, '%RESTAURANT%', 'Meals', 25),
    ('PURCHASE', NULL, '%PRET%', 'Meals', 25),
    ('PURCHASE', NULL, '%COSTA%', 'Meals', 25),
    ('PURCHASE', NULL, '%STARBUCKS%', 'Meals', 25),

    -- Accommodation mappings
    ('PURCHASE', 'Leisure > Hotels', NULL, 'Accommodation', 30),
    ('PURCHASE', NULL, '%HOTEL%', 'Accommodation', 35),
    ('PURCHASE', NULL, '%MARRIOTT%', 'Accommodation', 35),
    ('PURCHASE', NULL, '%HILTON%', 'Accommodation', 35),
    ('PURCHASE', NULL, '%TRAVELODGE%', 'Accommodation', 35),
    ('PURCHASE', NULL, '%PREMIER INN%', 'Accommodation', 35),

    -- Equipment/Supplies mappings
    ('PURCHASE', 'Shopping%', NULL, 'Equipment', 50),
    ('PURCHASE', NULL, '%AMAZON%', 'Equipment', 55),
    ('PURCHASE', NULL, '%ARGOS%', 'Equipment', 55),
    ('PURCHASE', NULL, '%SCREWFIX%', 'Equipment', 55),

    -- Parking mappings
    ('PURCHASE', NULL, '%PARKING%', 'Parking', 40),
    ('PURCHASE', NULL, '%NCP%', 'Parking', 40),
    ('PURCHASE', NULL, '%RINGO%', 'Parking', 40),

    -- Software mappings
    ('PURCHASE', NULL, '%MICROSOFT%', 'Software', 45),
    ('PURCHASE', NULL, '%GOOGLE%', 'Software', 45),
    ('PURCHASE', NULL, '%APPLE.COM%', 'Software', 45),
    ('PURCHASE', NULL, '%ADOBE%', 'Software', 45),

    -- ATM defaults to Other
    ('ATM', NULL, NULL, 'Other', 90)
) AS mapping(tl_category, tl_classification, merchant_pattern, category_name, priority)
JOIN expense_categories ec ON ec.organization_id = o.id AND ec.name = mapping.category_name
WHERE NOT EXISTS (
    SELECT 1 FROM expense_category_mappings ecm
    WHERE ecm.organization_id = o.id
    AND COALESCE(ecm.truelayer_category, '') = COALESCE(mapping.tl_category, '')
    AND COALESCE(ecm.truelayer_classification, '') = COALESCE(mapping.tl_classification, '')
    AND COALESCE(ecm.merchant_pattern, '') = COALESCE(mapping.merchant_pattern, '')
);
