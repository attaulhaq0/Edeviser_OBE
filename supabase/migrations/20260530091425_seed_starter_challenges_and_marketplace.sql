-- Seed starter challenges and marketplace items (Task 3.2, Requirements 12.1/12.2/12.5/12.7)
-- Build-Over-Defer: a real catalog CAN be seeded for both surfaces, so working
-- starter content is delivered (no coming-soon placeholders). Shared EmptyState
-- components remain the genuine zero-data fallback only.
-- Idempotent via NOT EXISTS guards.

-- Starter marketplace items (per institution); valid enum category, xp_price > 0
INSERT INTO marketplace_items (
  institution_id, name, description, category, sub_category,
  xp_price, level_requirement, stock_type, icon_identifier, metadata
)
SELECT
  i.id, cat.name, cat.description,
  cat.category::marketplace_item_category,
  cat.sub_category::marketplace_item_sub_category,
  cat.xp_price, cat.level_requirement,
  cat.stock_type::marketplace_stock_type,
  cat.icon_identifier, cat.metadata::jsonb
FROM institutions i
CROSS JOIN (VALUES
  ('Ocean Blue', 'A calming ocean-inspired theme with deep blue accents.', 'cosmetic', 'profile_theme', 500, 3, 'one_per_student', 'palette', '{"accent": "#0ea5e9", "accentDark": "#0284c7", "gradientStart": "#0ea5e9", "gradientEnd": "#2563eb"}'),
  ('Forest Green', 'A nature-inspired theme with lush green tones.', 'cosmetic', 'profile_theme', 500, 3, 'one_per_student', 'palette', '{"accent": "#22c55e", "accentDark": "#16a34a", "gradientStart": "#22c55e", "gradientEnd": "#059669"}'),
  ('Sunset Orange', 'A warm sunset theme with orange and amber accents.', 'cosmetic', 'profile_theme', 750, 5, 'one_per_student', 'palette', '{"accent": "#f97316", "accentDark": "#ea580c", "gradientStart": "#f97316", "gradientEnd": "#dc2626"}'),
  ('Gold Crown', 'A prestigious gold frame with a crown accent.', 'cosmetic', 'avatar_frame', 1200, 10, 'one_per_student', 'crown', '{"borderColor": "#fbbf24", "borderWidth": 4, "glow": true}'),
  ('Bronze Star', 'A classic bronze frame with a star accent.', 'cosmetic', 'avatar_frame', 300, 2, 'one_per_student', 'star', '{"borderColor": "#d97706", "borderWidth": 3, "glow": false}'),
  ('The Scholar', 'Display "The Scholar" next to your name on the leaderboard.', 'cosmetic', 'display_title', 400, 3, 'one_per_student', 'book-open', '{"title": "The Scholar"}'),
  ('Extra Quiz Attempt', 'Get one additional attempt on any quiz.', 'educational_perk', 'extra_quiz_attempt', 50, 2, 'unlimited', 'refresh-cw', '{"attempts": 1}'),
  ('Deadline Extension', 'Extend any assignment deadline by 24 hours.', 'educational_perk', 'deadline_extension', 75, 3, 'unlimited', 'clock', '{"hours": 24}'),
  ('AI Tutor Hint Pack', 'Unlock 5 extra AI Tutor messages for today.', 'educational_perk', 'hint_token', 30, 1, 'unlimited', 'message-circle', '{"messages": 5}'),
  ('2x XP Boost (1hr)', 'Double all XP you earn for one hour.', 'power_up', 'xp_boost', 100, 4, 'unlimited', 'zap', '{"multiplier": 2.0, "duration_minutes": 60}'),
  ('Streak Shield', 'Protect your login streak for one missed day.', 'power_up', 'streak_shield', 200, 1, 'unlimited', 'shield', '{"protection_days": 1}')
) AS cat(name, description, category, sub_category, xp_price, level_requirement, stock_type, icon_identifier, metadata)
WHERE NOT EXISTS (
  SELECT 1 FROM marketplace_items mi
  WHERE mi.institution_id = i.id AND mi.name = cat.name
);

-- Starter social challenges (per course); valid challenge_type, goal_target > 0,
-- status='active', valid created_by (course teacher, else institution admin/teacher)
INSERT INTO social_challenges (
  title, description, challenge_type, course_id, institution_id,
  start_date, end_date, goal_target, status, created_by,
  participation_mode, reward_xp
)
SELECT
  cat.title, cat.description, cat.challenge_type, c.id, pr.institution_id,
  now(), now() + (cat.duration_days || ' days')::interval,
  cat.goal_target, 'active', creator.creator_id,
  cat.participation_mode, cat.reward_xp
FROM courses c
JOIN programs pr ON pr.id = c.program_id
CROSS JOIN LATERAL (
  SELECT COALESCE(
    c.teacher_id,
    (SELECT p.id FROM profiles p
     WHERE p.institution_id = pr.institution_id
       AND p.role IN ('admin', 'teacher')
     ORDER BY p.role DESC
     LIMIT 1)
  ) AS creator_id
) AS creator
CROSS JOIN (VALUES
  ('3-Day Study Streak', 'Log in and study for 3 days in a row to build a strong learning habit.', 'habit', 3, 3, 'individual', 50),
  ('Finish 2 Assignments This Week', 'Submit 2 assignments before the week ends to stay on track.', 'academic', 7, 2, 'individual', 100),
  ('Class XP Race', 'Earn 500 XP this week and climb the class rankings.', 'xp_race', 7, 500, 'individual', 150)
) AS cat(title, description, challenge_type, duration_days, goal_target, participation_mode, reward_xp)
WHERE creator.creator_id IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM social_challenges sc
  WHERE sc.course_id = c.id AND sc.title = cat.title
);;
