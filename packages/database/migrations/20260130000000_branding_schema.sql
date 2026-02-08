-- ============================================================
-- WHITE-LABEL BRANDING COLUMNS
-- Adds branding customization fields to organizations table
-- ============================================================

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS secondary_color VARCHAR(7);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS logo_dark_url TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS favicon_url TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS brand_name TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS login_background_url TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS custom_css TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS email_logo_url TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS branding_updated_at TIMESTAMPTZ;
