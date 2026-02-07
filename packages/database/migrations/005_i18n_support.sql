-- ============================================================
-- MIGRATION: Add Internationalization (i18n) Support
-- Adds language preferences and translation caching
-- ============================================================

-- Add preferred_language column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(10) DEFAULT 'en';

-- Create index for language preference queries
CREATE INDEX IF NOT EXISTS idx_users_preferred_language 
ON users(preferred_language);

-- Translation cache table for frequently translated content
CREATE TABLE IF NOT EXISTS translation_cache (
  id SERIAL PRIMARY KEY,
  source_text_hash VARCHAR(64) NOT NULL,
  source_language VARCHAR(10) NOT NULL,
  target_language VARCHAR(10) NOT NULL,
  translated_text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days'),
  hit_count INTEGER DEFAULT 0,
  UNIQUE(source_text_hash, source_language, target_language)
);

-- Index for cache lookups
CREATE INDEX IF NOT EXISTS idx_translation_cache_lookup 
ON translation_cache(source_text_hash, target_language);

-- Index for cache cleanup
CREATE INDEX IF NOT EXISTS idx_translation_cache_expires 
ON translation_cache(expires_at);

-- Supported languages reference table
CREATE TABLE IF NOT EXISTS supported_languages (
  code VARCHAR(10) PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  native_name VARCHAR(50) NOT NULL,
  is_rtl BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 100
);

-- Insert supported languages (40+ languages)
INSERT INTO supported_languages (code, name, native_name, is_rtl, sort_order) VALUES
  ('en', 'English', 'English', FALSE, 1),
  ('es', 'Spanish', 'Español', FALSE, 2),
  ('fr', 'French', 'Français', FALSE, 3),
  ('de', 'German', 'Deutsch', FALSE, 4),
  ('it', 'Italian', 'Italiano', FALSE, 5),
  ('pt', 'Portuguese', 'Português', FALSE, 6),
  ('nl', 'Dutch', 'Nederlands', FALSE, 7),
  ('pl', 'Polish', 'Polski', FALSE, 8),
  ('ro', 'Romanian', 'Română', FALSE, 9),
  ('hu', 'Hungarian', 'Magyar', FALSE, 10),
  ('cs', 'Czech', 'Čeština', FALSE, 11),
  ('sk', 'Slovak', 'Slovenčina', FALSE, 12),
  ('bg', 'Bulgarian', 'Български', FALSE, 13),
  ('hr', 'Croatian', 'Hrvatski', FALSE, 14),
  ('sl', 'Slovenian', 'Slovenščina', FALSE, 15),
  ('el', 'Greek', 'Ελληνικά', FALSE, 16),
  ('tr', 'Turkish', 'Türkçe', FALSE, 17),
  ('ru', 'Russian', 'Русский', FALSE, 18),
  ('uk', 'Ukrainian', 'Українська', FALSE, 19),
  ('ar', 'Arabic', 'العربية', TRUE, 20),
  ('he', 'Hebrew', 'עברית', TRUE, 21),
  ('fa', 'Persian', 'فارسی', TRUE, 22),
  ('ur', 'Urdu', 'اردو', TRUE, 23),
  ('hi', 'Hindi', 'हिन्दी', FALSE, 24),
  ('bn', 'Bengali', 'বাংলা', FALSE, 25),
  ('pa', 'Punjabi', 'ਪੰਜਾਬੀ', FALSE, 26),
  ('gu', 'Gujarati', 'ગુજરાતી', FALSE, 27),
  ('ta', 'Tamil', 'தமிழ்', FALSE, 28),
  ('te', 'Telugu', 'తెలుగు', FALSE, 29),
  ('kn', 'Kannada', 'ಕನ್ನಡ', FALSE, 30),
  ('ml', 'Malayalam', 'മലയാളം', FALSE, 31),
  ('th', 'Thai', 'ไทย', FALSE, 32),
  ('vi', 'Vietnamese', 'Tiếng Việt', FALSE, 33),
  ('id', 'Indonesian', 'Bahasa Indonesia', FALSE, 34),
  ('ms', 'Malay', 'Bahasa Melayu', FALSE, 35),
  ('tl', 'Filipino', 'Filipino', FALSE, 36),
  ('zh', 'Chinese (Simplified)', '简体中文', FALSE, 37),
  ('zh-TW', 'Chinese (Traditional)', '繁體中文', FALSE, 38),
  ('ja', 'Japanese', '日本語', FALSE, 39),
  ('ko', 'Korean', '한국어', FALSE, 40),
  ('sv', 'Swedish', 'Svenska', FALSE, 41),
  ('da', 'Danish', 'Dansk', FALSE, 42),
  ('no', 'Norwegian', 'Norsk', FALSE, 43),
  ('fi', 'Finnish', 'Suomi', FALSE, 44),
  ('lt', 'Lithuanian', 'Lietuvių', FALSE, 45),
  ('lv', 'Latvian', 'Latviešu', FALSE, 46),
  ('et', 'Estonian', 'Eesti', FALSE, 47)
ON CONFLICT (code) DO NOTHING;

-- Function to clean up expired translation cache
CREATE OR REPLACE FUNCTION cleanup_translation_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM translation_cache 
  WHERE expires_at < CURRENT_TIMESTAMP;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Add comment for documentation
COMMENT ON TABLE supported_languages IS 'Reference table of supported UI languages for internationalization';
COMMENT ON TABLE translation_cache IS 'Cache for translated user-generated content to reduce API calls';
COMMENT ON COLUMN users.preferred_language IS 'User preferred UI language code (ISO 639-1)';
