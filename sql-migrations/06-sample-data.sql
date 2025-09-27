-- Step 6: Insert Sample Data for Testing
-- Insert sample programs
INSERT INTO public.programs (name, description, code, level, is_active) VALUES
('Computer Science', 'Bachelor of Science in Computer Science', 'CS', 'Bachelor', true),
('Information Technology', 'Bachelor of Science in Information Technology', 'IT', 'Bachelor', true),
('Software Engineering', 'Bachelor of Software Engineering', 'SE', 'Bachelor', true)
ON CONFLICT (code) DO NOTHING;

-- Insert sample courses (will need to update program_id after programs are created)
INSERT INTO public.courses (name, description, code, credits, program_id, is_active) VALUES
('Database Systems', 'Introduction to Database Management Systems', 'CS301', 3, (SELECT id FROM public.programs WHERE code = 'CS' LIMIT 1), true),
('Web Development', 'Full Stack Web Development', 'IT201', 4, (SELECT id FROM public.programs WHERE code = 'IT' LIMIT 1), true),
('Software Architecture', 'Design Patterns and Software Architecture', 'SE401', 3, (SELECT id FROM public.programs WHERE code = 'SE' LIMIT 1), true)
ON CONFLICT (code) DO NOTHING;

-- Insert sample badge templates
INSERT INTO public.badge_templates (name, description, type, requirements, xp_reward, is_active) VALUES
('First Login', 'Welcome to E-Deviser! You''ve logged in for the first time.', 'achievement', '{"action": "first_login"}', 50, true),
('Assignment Master', 'Completed 10 assignments successfully', 'mastery', '{"assignments_completed": 10}', 200, true),
('Streak Champion', 'Maintained a 7-day learning streak', 'streak', '{"streak_days": 7}', 150, true),
('Level Up', 'Reached level 5', 'achievement', '{"level_reached": 5}', 100, true)
ON CONFLICT DO NOTHING;

-- Note: Learning outcomes and assignments will be created by users through the application
-- as they require specific user IDs as owners/creators