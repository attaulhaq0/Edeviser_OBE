-- Add accessibility_preferences JSONB column to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS accessibility_preferences JSONB DEFAULT '{
    "font_size": "default",
    "high_contrast": false,
    "reduced_animations": false,
    "dyslexia_font": false,
    "simplified_view": false
  }'::jsonb;
