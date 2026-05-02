ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(5) DEFAULT 'en';
ALTER TABLE institution_settings ADD COLUMN IF NOT EXISTS default_language VARCHAR(5) NOT NULL DEFAULT 'en';
ALTER TABLE institution_settings ADD COLUMN IF NOT EXISTS streak_sabbatical_enabled BOOLEAN DEFAULT false;
ALTER TABLE institution_settings ADD COLUMN IF NOT EXISTS league_thresholds JSONB;
ALTER TABLE learning_outcomes ADD COLUMN IF NOT EXISTS title_ar TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS name_ar TEXT;
ALTER TABLE programs ADD COLUMN IF NOT EXISTS name_ar TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS accessibility_preferences JSONB DEFAULT '{"font_size": "default", "high_contrast": false, "reduced_animations": false, "dyslexia_font": false, "simplified_view": false}'::jsonb;;
