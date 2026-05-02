-- Seed default marketplace items function (called per institution)
CREATE OR REPLACE FUNCTION seed_marketplace_items(p_institution_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Cosmetic: Profile Themes
  INSERT INTO marketplace_items (institution_id, name, description, category, sub_category, xp_price, level_requirement, stock_type, icon_identifier, metadata) VALUES
    (p_institution_id, 'Ocean Blue', 'A calming ocean-inspired theme with deep blue accents', 'cosmetic', 'profile_theme', 500, 3, 'one_per_student', 'palette', '{"accent": "#0ea5e9", "accentDark": "#0284c7", "gradientStart": "#0ea5e9", "gradientEnd": "#2563eb"}'),
    (p_institution_id, 'Forest Green', 'A nature-inspired theme with lush green tones', 'cosmetic', 'profile_theme', 500, 3, 'one_per_student', 'trees', '{"accent": "#22c55e", "accentDark": "#16a34a", "gradientStart": "#22c55e", "gradientEnd": "#059669"}'),
    (p_institution_id, 'Sunset Orange', 'A warm sunset theme with orange and amber accents', 'cosmetic', 'profile_theme', 750, 5, 'one_per_student', 'sunset', '{"accent": "#f97316", "accentDark": "#ea580c", "gradientStart": "#f97316", "gradientEnd": "#dc2626"}'),
    (p_institution_id, 'Midnight Purple', 'A sleek dark theme with purple highlights', 'cosmetic', 'profile_theme', 1000, 8, 'one_per_student', 'moon', '{"accent": "#8b5cf6", "accentDark": "#7c3aed", "gradientStart": "#8b5cf6", "gradientEnd": "#6d28d9"}');

  -- Cosmetic: Avatar Frames
  INSERT INTO marketplace_items (institution_id, name, description, category, sub_category, xp_price, level_requirement, stock_type, icon_identifier, metadata) VALUES
    (p_institution_id, 'Bronze Ring', 'A simple bronze frame for your avatar', 'cosmetic', 'avatar_frame', 300, 2, 'one_per_student', 'circle', '{"borderColor": "#d97706", "borderWidth": 3}'),
    (p_institution_id, 'Silver Glow', 'A shimmering silver frame with subtle glow', 'cosmetic', 'avatar_frame', 600, 5, 'one_per_student', 'sparkles', '{"borderColor": "#9ca3af", "borderWidth": 3, "glow": true}'),
    (p_institution_id, 'Gold Crown', 'A prestigious gold frame with crown accent', 'cosmetic', 'avatar_frame', 1200, 10, 'one_per_student', 'crown', '{"borderColor": "#fbbf24", "borderWidth": 4, "glow": true}');

  -- Cosmetic: Display Titles
  INSERT INTO marketplace_items (institution_id, name, description, category, sub_category, xp_price, level_requirement, stock_type, icon_identifier, metadata) VALUES
    (p_institution_id, 'The Scholar', 'Display "The Scholar" on the leaderboard', 'cosmetic', 'display_title', 400, 3, 'one_per_student', 'book-open', '{"title": "The Scholar"}'),
    (p_institution_id, 'Night Owl', 'Display "Night Owl" on the leaderboard', 'cosmetic', 'display_title', 400, 3, 'one_per_student', 'moon', '{"title": "Night Owl"}'),
    (p_institution_id, 'Trailblazer', 'Display "Trailblazer" on the leaderboard', 'cosmetic', 'display_title', 800, 7, 'one_per_student', 'compass', '{"title": "Trailblazer"}'),
    (p_institution_id, 'Grandmaster', 'Display "Grandmaster" on the leaderboard', 'cosmetic', 'display_title', 1500, 12, 'one_per_student', 'trophy', '{"title": "Grandmaster"}');

  -- Educational Perks
  INSERT INTO marketplace_items (institution_id, name, description, category, sub_category, xp_price, level_requirement, stock_type, icon_identifier, metadata) VALUES
    (p_institution_id, 'Extra Quiz Attempt', 'Get one additional attempt on any quiz', 'educational_perk', 'extra_quiz_attempt', 300, 2, 'unlimited', 'refresh-cw', '{"attempts": 1}'),
    (p_institution_id, 'Deadline Extension', 'Extend any assignment deadline by 24 hours', 'educational_perk', 'deadline_extension', 400, 3, 'unlimited', 'clock', '{"hours": 24}'),
    (p_institution_id, 'AI Tutor Hint Pack', '5 extra AI Tutor messages for today', 'educational_perk', 'hint_token', 200, 1, 'unlimited', 'message-circle', '{"messages": 5}');

  -- Power-ups
  INSERT INTO marketplace_items (institution_id, name, description, category, sub_category, xp_price, level_requirement, stock_type, icon_identifier, metadata) VALUES
    (p_institution_id, '2x XP Boost (1hr)', 'Double all XP earned for 1 hour', 'power_up', 'xp_boost', 500, 4, 'unlimited', 'zap', '{"multiplier": 2.0, "duration_minutes": 60}'),
    (p_institution_id, 'Streak Shield', 'Protect your streak for one missed day', 'power_up', 'streak_shield', 200, 1, 'unlimited', 'shield', '{"protection_days": 1}');
END;
$$;;
