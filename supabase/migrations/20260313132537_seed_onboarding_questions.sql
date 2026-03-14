-- Step 1: Alter dimension CHECK constraint to support self-efficacy and study strategy dimensions
ALTER TABLE onboarding_questions DROP CONSTRAINT IF EXISTS onboarding_questions_dimension_check;
ALTER TABLE onboarding_questions ADD CONSTRAINT onboarding_questions_dimension_check
  CHECK (dimension::text = ANY (ARRAY[
    'openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism',
    'general_academic', 'course_specific', 'self_regulated_learning',
    'time_management', 'elaboration', 'self_testing', 'help_seeking'
  ]::text[]));

-- Step 2: Seed default onboarding questions using a CTE for institution_id
WITH inst AS (
  SELECT id FROM institutions LIMIT 1
)

-- ============================================================
-- Big Five Personality Questions (25 total, 5 per dimension)
-- Based on IPIP (International Personality Item Pool) items
-- ============================================================
INSERT INTO onboarding_questions (institution_id, assessment_type, question_text, dimension, weight, sort_order)
SELECT inst.id, q.assessment_type, q.question_text, q.dimension, q.weight, q.sort_order
FROM inst, (VALUES
  -- Openness (5 questions)
  ('personality', 'I have a vivid imagination.', 'openness', 1, 1),
  ('personality', 'I am not interested in abstract ideas.', 'openness', -1, 2),
  ('personality', 'I enjoy hearing new ideas.', 'openness', 1, 3),
  ('personality', 'I tend to vote for conservative political candidates.', 'openness', -1, 4),
  ('personality', 'I enjoy thinking about things.', 'openness', 1, 5),
  -- Conscientiousness (5 questions)
  ('personality', 'I am always prepared.', 'conscientiousness', 1, 6),
  ('personality', 'I leave my belongings around.', 'conscientiousness', -1, 7),
  ('personality', 'I pay attention to details.', 'conscientiousness', 1, 8),
  ('personality', 'I make a mess of things.', 'conscientiousness', -1, 9),
  ('personality', 'I get chores done right away.', 'conscientiousness', 1, 10),
  -- Extraversion (5 questions)
  ('personality', 'I am the life of the party.', 'extraversion', 1, 11),
  ('personality', 'I don''t talk a lot.', 'extraversion', -1, 12),
  ('personality', 'I feel comfortable around people.', 'extraversion', 1, 13),
  ('personality', 'I keep in the background.', 'extraversion', -1, 14),
  ('personality', 'I start conversations.', 'extraversion', 1, 15),
  -- Agreeableness (5 questions)
  ('personality', 'I am interested in people.', 'agreeableness', 1, 16),
  ('personality', 'I insult people.', 'agreeableness', -1, 17),
  ('personality', 'I sympathize with others'' feelings.', 'agreeableness', 1, 18),
  ('personality', 'I am not interested in other people''s problems.', 'agreeableness', -1, 19),
  ('personality', 'I have a soft heart.', 'agreeableness', 1, 20),
  -- Neuroticism (5 questions)
  ('personality', 'I get stressed out easily.', 'neuroticism', 1, 21),
  ('personality', 'I am relaxed most of the time.', 'neuroticism', -1, 22),
  ('personality', 'I worry about things.', 'neuroticism', 1, 23),
  ('personality', 'I seldom feel blue.', 'neuroticism', -1, 24),
  ('personality', 'I get upset easily.', 'neuroticism', 1, 25)
) AS q(assessment_type, question_text, dimension, weight, sort_order)
ON CONFLICT DO NOTHING;

-- ============================================================
-- VARK Learning Style Questions (16 total, 4 per modality)
-- Based on standard VARK questionnaire items
-- ============================================================
WITH inst AS (
  SELECT id FROM institutions LIMIT 1
)
INSERT INTO onboarding_questions (institution_id, assessment_type, question_text, options, sort_order)
SELECT inst.id, 'learning_style', q.question_text, q.options::jsonb, q.sort_order
FROM inst, (VALUES
  ('When learning how to use a new software application, I prefer to:',
   '[{"option_text": "Watch a video demonstration", "modality": "visual"}, {"option_text": "Listen to someone explain it", "modality": "auditory"}, {"option_text": "Read the user manual or documentation", "modality": "read_write"}, {"option_text": "Try it out hands-on by experimenting", "modality": "kinesthetic"}]',
   101),
  ('When I need to remember directions to a new place, I:',
   '[{"option_text": "Look at a map or use GPS with a visual display", "modality": "visual"}, {"option_text": "Ask someone to tell me the directions verbally", "modality": "auditory"}, {"option_text": "Write down the step-by-step directions", "modality": "read_write"}, {"option_text": "Drive there once to learn the route by experience", "modality": "kinesthetic"}]',
   102),
  ('When studying for an exam, I find it most helpful to:',
   '[{"option_text": "Review diagrams, charts, and highlighted notes", "modality": "visual"}, {"option_text": "Discuss the material with classmates or listen to recordings", "modality": "auditory"}, {"option_text": "Re-read my notes and textbook passages", "modality": "read_write"}, {"option_text": "Practice problems or create physical models", "modality": "kinesthetic"}]',
   103),
  ('When a teacher explains a new concept, I understand best when they:',
   '[{"option_text": "Draw a diagram or show a visual example", "modality": "visual"}, {"option_text": "Explain it verbally with detailed descriptions", "modality": "auditory"}, {"option_text": "Provide written notes or a textbook reference", "modality": "read_write"}, {"option_text": "Give a hands-on demonstration or activity", "modality": "kinesthetic"}]',
   104),
  ('When choosing a restaurant, I prefer to:',
   '[{"option_text": "Look at photos of the food and ambiance online", "modality": "visual"}, {"option_text": "Ask friends for their verbal recommendations", "modality": "auditory"}, {"option_text": "Read reviews and the menu descriptions", "modality": "read_write"}, {"option_text": "Visit the restaurant to experience the atmosphere firsthand", "modality": "kinesthetic"}]',
   105),
  ('When assembling furniture or equipment, I prefer to:',
   '[{"option_text": "Follow the illustrated diagrams", "modality": "visual"}, {"option_text": "Have someone talk me through the steps", "modality": "auditory"}, {"option_text": "Read the written instructions carefully", "modality": "read_write"}, {"option_text": "Figure it out by trying to put pieces together", "modality": "kinesthetic"}]',
   106),
  ('When I want to learn about a historical event, I prefer to:',
   '[{"option_text": "Watch a documentary with visual footage", "modality": "visual"}, {"option_text": "Listen to a podcast or lecture about it", "modality": "auditory"}, {"option_text": "Read a book or article about the event", "modality": "read_write"}, {"option_text": "Visit a museum or historical site", "modality": "kinesthetic"}]',
   107),
  ('When giving a presentation, I rely most on:',
   '[{"option_text": "Slides with images, graphs, and visual aids", "modality": "visual"}, {"option_text": "Speaking clearly and using vocal emphasis", "modality": "auditory"}, {"option_text": "Detailed notes and written handouts", "modality": "read_write"}, {"option_text": "Live demonstrations and audience participation", "modality": "kinesthetic"}]',
   108),
  ('When I need to understand a complex process, I prefer:',
   '[{"option_text": "A flowchart or process diagram", "modality": "visual"}, {"option_text": "A verbal walkthrough from an expert", "modality": "auditory"}, {"option_text": "A detailed written description of each step", "modality": "read_write"}, {"option_text": "Walking through the process myself step by step", "modality": "kinesthetic"}]',
   109),
  ('When learning a new language, I find it easiest to:',
   '[{"option_text": "Use flashcards with images and visual associations", "modality": "visual"}, {"option_text": "Listen to native speakers and repeat phrases", "modality": "auditory"}, {"option_text": "Study grammar rules and vocabulary lists", "modality": "read_write"}, {"option_text": "Practice conversations and role-play scenarios", "modality": "kinesthetic"}]',
   110),
  ('When I receive feedback on my work, I prefer it:',
   '[{"option_text": "Marked up visually with highlights and annotations", "modality": "visual"}, {"option_text": "Discussed verbally in a face-to-face meeting", "modality": "auditory"}, {"option_text": "Written in detailed comments", "modality": "read_write"}, {"option_text": "Demonstrated through examples of improved work", "modality": "kinesthetic"}]',
   111),
  ('When planning a project, I prefer to:',
   '[{"option_text": "Create a visual timeline or mind map", "modality": "visual"}, {"option_text": "Talk through the plan with team members", "modality": "auditory"}, {"option_text": "Write a detailed project plan document", "modality": "read_write"}, {"option_text": "Start working on tasks and adjust as I go", "modality": "kinesthetic"}]',
   112),
  ('When trying to remember something important, I:',
   '[{"option_text": "Visualize it in my mind as an image or scene", "modality": "visual"}, {"option_text": "Repeat it to myself out loud or in my head", "modality": "auditory"}, {"option_text": "Write it down in a list or note", "modality": "read_write"}, {"option_text": "Associate it with a physical action or gesture", "modality": "kinesthetic"}]',
   113),
  ('When choosing an online course, I look for one that has:',
   '[{"option_text": "Rich visual content like infographics and animations", "modality": "visual"}, {"option_text": "Audio lectures and discussion forums", "modality": "auditory"}, {"option_text": "Comprehensive reading materials and transcripts", "modality": "read_write"}, {"option_text": "Interactive exercises and hands-on projects", "modality": "kinesthetic"}]',
   114),
  ('When explaining something to a friend, I tend to:',
   '[{"option_text": "Draw a picture or show them a diagram", "modality": "visual"}, {"option_text": "Describe it verbally with analogies", "modality": "auditory"}, {"option_text": "Write out the explanation or send a text message", "modality": "read_write"}, {"option_text": "Show them by doing it or using gestures", "modality": "kinesthetic"}]',
   115),
  ('When I encounter a problem I cannot solve, I:',
   '[{"option_text": "Look for visual examples of similar solved problems", "modality": "visual"}, {"option_text": "Talk it through with someone to hear different perspectives", "modality": "auditory"}, {"option_text": "Search for written guides or documentation", "modality": "read_write"}, {"option_text": "Experiment with different approaches until something works", "modality": "kinesthetic"}]',
   116)
) AS q(question_text, options, sort_order)
ON CONFLICT DO NOTHING;

-- ============================================================
-- Self-Efficacy Scale (6 items)
-- Based on Bandura (1997) academic self-efficacy constructs
-- Domains: general_academic, course_specific, self_regulated_learning
-- ============================================================
WITH inst AS (
  SELECT id FROM institutions LIMIT 1
)
INSERT INTO onboarding_questions (institution_id, assessment_type, question_text, dimension, weight, sort_order)
SELECT inst.id, 'self_efficacy', q.question_text, q.dimension, q.weight, q.sort_order
FROM inst, (VALUES
  -- General Academic (2 items)
  ('I am confident I can understand the most complex material presented in my courses.', 'general_academic', 1, 201),
  ('I am confident I can do an excellent job on assignments and tests in my courses.', 'general_academic', 1, 202),
  -- Course-Specific (2 items)
  ('I am confident I can learn the content taught in even the most difficult courses.', 'course_specific', 1, 203),
  ('I am confident I can master the skills being taught in my classes.', 'course_specific', 1, 204),
  -- Self-Regulated Learning (2 items)
  ('I am confident I can organize my study time effectively to accomplish my academic goals.', 'self_regulated_learning', 1, 205),
  ('I am confident I can motivate myself to complete academic work even when I find it uninteresting.', 'self_regulated_learning', 1, 206)
) AS q(question_text, dimension, weight, sort_order)
ON CONFLICT DO NOTHING;

-- ============================================================
-- Study Strategy Inventory (8 items, 2 per dimension)
-- Based on MSLQ (Motivated Strategies for Learning Questionnaire)
-- Dimensions: time_management, elaboration, self_testing, help_seeking
-- ============================================================
WITH inst AS (
  SELECT id FROM institutions LIMIT 1
)
INSERT INTO onboarding_questions (institution_id, assessment_type, question_text, dimension, weight, sort_order)
SELECT inst.id, 'study_strategy', q.question_text, q.dimension, q.weight, q.sort_order
FROM inst, (VALUES
  -- Time Management (2 items)
  ('I set aside regular times each week for studying and stick to my schedule.', 'time_management', 1, 301),
  ('I plan my study sessions in advance so I can cover all the material before exams.', 'time_management', 1, 302),
  -- Elaboration (2 items)
  ('When studying, I try to connect new information to what I already know.', 'elaboration', 1, 303),
  ('I try to relate ideas from one course to ideas from other courses when possible.', 'elaboration', 1, 304),
  -- Self-Testing (2 items)
  ('I test myself on course material to check my understanding before exams.', 'self_testing', 1, 305),
  ('I make up practice questions or use flashcards to prepare for tests.', 'self_testing', 1, 306),
  -- Help-Seeking (2 items)
  ('When I don''t understand something, I ask the instructor or a classmate for help.', 'help_seeking', 1, 307),
  ('I make use of office hours, tutoring services, or study groups when I need support.', 'help_seeking', 1, 308)
) AS q(question_text, dimension, weight, sort_order)
ON CONFLICT DO NOTHING;;
