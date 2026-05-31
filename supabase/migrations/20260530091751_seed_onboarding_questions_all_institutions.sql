-- Corrective seed: onboarding question banks for EVERY institution (R11.1, R11.5).

-- 1. Bilingual columns (idempotent; existing RLS covers them)
ALTER TABLE onboarding_questions ADD COLUMN IF NOT EXISTS question_text_ar TEXT;
ALTER TABLE onboarding_questions ADD COLUMN IF NOT EXISTS options_ar JSONB;

-- 2. Natural-key uniqueness so ON CONFLICT DO NOTHING is genuinely idempotent
CREATE UNIQUE INDEX IF NOT EXISTS onboarding_questions_seed_key
  ON onboarding_questions (institution_id, assessment_type, sort_order)
  WHERE assessment_type <> 'baseline';

-- 3. Canonical bilingual dataset (defined once, reused for insert + backfill)
CREATE TEMP TABLE _onboarding_seed (
  assessment_type TEXT NOT NULL,
  question_text   TEXT NOT NULL,
  question_text_ar TEXT NOT NULL,
  dimension       TEXT,
  weight          SMALLINT,
  options         JSONB,
  options_ar      JSONB,
  sort_order      INTEGER NOT NULL
) ON COMMIT DROP;

-- 3a. Big Five Personality (25 items)
INSERT INTO _onboarding_seed
  (assessment_type, question_text, question_text_ar, dimension, weight, options, options_ar, sort_order)
VALUES
  ('personality', 'I have a vivid imagination.', 'لدي خيال واسع.', 'openness', 1, NULL, NULL, 1),
  ('personality', 'I am not interested in abstract ideas.', 'لا تهمني الأفكار المجردة.', 'openness', -1, NULL, NULL, 2),
  ('personality', 'I enjoy hearing new ideas.', 'أستمتع بسماع الأفكار الجديدة.', 'openness', 1, NULL, NULL, 3),
  ('personality', 'I tend to vote for conservative political candidates.', 'أميل إلى التصويت للمرشحين السياسيين المحافظين.', 'openness', -1, NULL, NULL, 4),
  ('personality', 'I enjoy thinking about things.', 'أستمتع بالتفكير في الأمور.', 'openness', 1, NULL, NULL, 5),
  ('personality', 'I am always prepared.', 'أكون دائمًا مستعدًا.', 'conscientiousness', 1, NULL, NULL, 6),
  ('personality', 'I leave my belongings around.', 'أترك أغراضي مبعثرة.', 'conscientiousness', -1, NULL, NULL, 7),
  ('personality', 'I pay attention to details.', 'أنتبه إلى التفاصيل.', 'conscientiousness', 1, NULL, NULL, 8),
  ('personality', 'I make a mess of things.', 'أُحدث فوضى في الأمور.', 'conscientiousness', -1, NULL, NULL, 9),
  ('personality', 'I get chores done right away.', 'أنجز المهام على الفور.', 'conscientiousness', 1, NULL, NULL, 10),
  ('personality', 'I am the life of the party.', 'أنا محور الحفلة.', 'extraversion', 1, NULL, NULL, 11),
  ('personality', 'I don''t talk a lot.', 'لا أتحدث كثيرًا.', 'extraversion', -1, NULL, NULL, 12),
  ('personality', 'I feel comfortable around people.', 'أشعر بالراحة بين الناس.', 'extraversion', 1, NULL, NULL, 13),
  ('personality', 'I keep in the background.', 'أبقى في الخلفية.', 'extraversion', -1, NULL, NULL, 14),
  ('personality', 'I start conversations.', 'أبدأ المحادثات.', 'extraversion', 1, NULL, NULL, 15),
  ('personality', 'I am interested in people.', 'أهتم بالناس.', 'agreeableness', 1, NULL, NULL, 16),
  ('personality', 'I insult people.', 'أهين الآخرين.', 'agreeableness', -1, NULL, NULL, 17),
  ('personality', 'I sympathize with others'' feelings.', 'أتعاطف مع مشاعر الآخرين.', 'agreeableness', 1, NULL, NULL, 18),
  ('personality', 'I am not interested in other people''s problems.', 'لا تهمني مشاكل الآخرين.', 'agreeableness', -1, NULL, NULL, 19),
  ('personality', 'I have a soft heart.', 'لدي قلب رحيم.', 'agreeableness', 1, NULL, NULL, 20),
  ('personality', 'I get stressed out easily.', 'أتوتر بسهولة.', 'neuroticism', 1, NULL, NULL, 21),
  ('personality', 'I am relaxed most of the time.', 'أكون مسترخيًا معظم الوقت.', 'neuroticism', -1, NULL, NULL, 22),
  ('personality', 'I worry about things.', 'أقلق بشأن الأمور.', 'neuroticism', 1, NULL, NULL, 23),
  ('personality', 'I seldom feel blue.', 'نادرًا ما أشعر بالحزن.', 'neuroticism', -1, NULL, NULL, 24),
  ('personality', 'I get upset easily.', 'أنزعج بسهولة.', 'neuroticism', 1, NULL, NULL, 25);

-- 3b. VARK Learning Style (16 items)
INSERT INTO _onboarding_seed
  (assessment_type, question_text, question_text_ar, dimension, weight, options, options_ar, sort_order)
VALUES
  ('learning_style', 'When learning how to use a new software application, I prefer to:', 'عند تعلّم استخدام تطبيق برمجي جديد، أفضّل أن:', NULL, NULL,
   '[{"option_text": "Watch a video demonstration", "modality": "visual"}, {"option_text": "Listen to someone explain it", "modality": "auditory"}, {"option_text": "Read the user manual or documentation", "modality": "read_write"}, {"option_text": "Try it out hands-on by experimenting", "modality": "kinesthetic"}]'::jsonb,
   '[{"option_text": "أشاهد عرضًا توضيحيًا بالفيديو", "modality": "visual"}, {"option_text": "أستمع إلى شخص يشرحه", "modality": "auditory"}, {"option_text": "أقرأ دليل المستخدم أو الوثائق", "modality": "read_write"}, {"option_text": "أجرّبه عمليًا بنفسي", "modality": "kinesthetic"}]'::jsonb, 101),
  ('learning_style', 'When I need to remember directions to a new place, I:', 'عندما أحتاج إلى تذكّر الطريق إلى مكان جديد، فإنني:', NULL, NULL,
   '[{"option_text": "Look at a map or use GPS with a visual display", "modality": "visual"}, {"option_text": "Ask someone to tell me the directions verbally", "modality": "auditory"}, {"option_text": "Write down the step-by-step directions", "modality": "read_write"}, {"option_text": "Drive there once to learn the route by experience", "modality": "kinesthetic"}]'::jsonb,
   '[{"option_text": "أنظر إلى خريطة أو أستخدم نظام تحديد المواقع بعرض مرئي", "modality": "visual"}, {"option_text": "أطلب من شخص أن يخبرني بالاتجاهات شفهيًا", "modality": "auditory"}, {"option_text": "أكتب الاتجاهات خطوة بخطوة", "modality": "read_write"}, {"option_text": "أقود إلى هناك مرة لأتعلّم الطريق بالتجربة", "modality": "kinesthetic"}]'::jsonb, 102),
  ('learning_style', 'When studying for an exam, I find it most helpful to:', 'عند الدراسة لامتحان، أجد أنه من الأنفع أن:', NULL, NULL,
   '[{"option_text": "Review diagrams, charts, and highlighted notes", "modality": "visual"}, {"option_text": "Discuss the material with classmates or listen to recordings", "modality": "auditory"}, {"option_text": "Re-read my notes and textbook passages", "modality": "read_write"}, {"option_text": "Practice problems or create physical models", "modality": "kinesthetic"}]'::jsonb,
   '[{"option_text": "أراجع الرسوم البيانية والمخططات والملاحظات المميّزة", "modality": "visual"}, {"option_text": "أناقش المادة مع الزملاء أو أستمع إلى التسجيلات", "modality": "auditory"}, {"option_text": "أعيد قراءة ملاحظاتي ومقاطع الكتاب الدراسي", "modality": "read_write"}, {"option_text": "أحل المسائل أو أصنع نماذج ملموسة", "modality": "kinesthetic"}]'::jsonb, 103),
  ('learning_style', 'When a teacher explains a new concept, I understand best when they:', 'عندما يشرح المعلّم مفهومًا جديدًا، أفهم بشكل أفضل عندما:', NULL, NULL,
   '[{"option_text": "Draw a diagram or show a visual example", "modality": "visual"}, {"option_text": "Explain it verbally with detailed descriptions", "modality": "auditory"}, {"option_text": "Provide written notes or a textbook reference", "modality": "read_write"}, {"option_text": "Give a hands-on demonstration or activity", "modality": "kinesthetic"}]'::jsonb,
   '[{"option_text": "يرسم رسمًا توضيحيًا أو يعرض مثالًا مرئيًا", "modality": "visual"}, {"option_text": "يشرحه شفهيًا بوصف تفصيلي", "modality": "auditory"}, {"option_text": "يقدّم ملاحظات مكتوبة أو مرجعًا من الكتاب", "modality": "read_write"}, {"option_text": "يقدّم عرضًا عمليًا أو نشاطًا تطبيقيًا", "modality": "kinesthetic"}]'::jsonb, 104),
  ('learning_style', 'When choosing a restaurant, I prefer to:', 'عند اختيار مطعم، أفضّل أن:', NULL, NULL,
   '[{"option_text": "Look at photos of the food and ambiance online", "modality": "visual"}, {"option_text": "Ask friends for their verbal recommendations", "modality": "auditory"}, {"option_text": "Read reviews and the menu descriptions", "modality": "read_write"}, {"option_text": "Visit the restaurant to experience the atmosphere firsthand", "modality": "kinesthetic"}]'::jsonb,
   '[{"option_text": "أنظر إلى صور الطعام والأجواء عبر الإنترنت", "modality": "visual"}, {"option_text": "أسأل الأصدقاء عن توصياتهم الشفهية", "modality": "auditory"}, {"option_text": "أقرأ التقييمات ووصف قائمة الطعام", "modality": "read_write"}, {"option_text": "أزور المطعم لأختبر الأجواء بنفسي", "modality": "kinesthetic"}]'::jsonb, 105),
  ('learning_style', 'When assembling furniture or equipment, I prefer to:', 'عند تركيب الأثاث أو المعدات، أفضّل أن:', NULL, NULL,
   '[{"option_text": "Follow the illustrated diagrams", "modality": "visual"}, {"option_text": "Have someone talk me through the steps", "modality": "auditory"}, {"option_text": "Read the written instructions carefully", "modality": "read_write"}, {"option_text": "Figure it out by trying to put pieces together", "modality": "kinesthetic"}]'::jsonb,
   '[{"option_text": "أتبع الرسوم التوضيحية المصوّرة", "modality": "visual"}, {"option_text": "يرشدني شخص عبر الخطوات شفهيًا", "modality": "auditory"}, {"option_text": "أقرأ التعليمات المكتوبة بعناية", "modality": "read_write"}, {"option_text": "أكتشف ذلك بمحاولة تجميع القطع معًا", "modality": "kinesthetic"}]'::jsonb, 106),
  ('learning_style', 'When I want to learn about a historical event, I prefer to:', 'عندما أريد التعرّف على حدث تاريخي، أفضّل أن:', NULL, NULL,
   '[{"option_text": "Watch a documentary with visual footage", "modality": "visual"}, {"option_text": "Listen to a podcast or lecture about it", "modality": "auditory"}, {"option_text": "Read a book or article about the event", "modality": "read_write"}, {"option_text": "Visit a museum or historical site", "modality": "kinesthetic"}]'::jsonb,
   '[{"option_text": "أشاهد فيلمًا وثائقيًا بمشاهد مرئية", "modality": "visual"}, {"option_text": "أستمع إلى بودكاست أو محاضرة عنه", "modality": "auditory"}, {"option_text": "أقرأ كتابًا أو مقالًا عن الحدث", "modality": "read_write"}, {"option_text": "أزور متحفًا أو موقعًا تاريخيًا", "modality": "kinesthetic"}]'::jsonb, 107),
  ('learning_style', 'When giving a presentation, I rely most on:', 'عند تقديم عرض تقديمي، أعتمد بشكل أكبر على:', NULL, NULL,
   '[{"option_text": "Slides with images, graphs, and visual aids", "modality": "visual"}, {"option_text": "Speaking clearly and using vocal emphasis", "modality": "auditory"}, {"option_text": "Detailed notes and written handouts", "modality": "read_write"}, {"option_text": "Live demonstrations and audience participation", "modality": "kinesthetic"}]'::jsonb,
   '[{"option_text": "شرائح تتضمّن صورًا ورسومًا بيانية ووسائل بصرية", "modality": "visual"}, {"option_text": "التحدّث بوضوح واستخدام التأكيد الصوتي", "modality": "auditory"}, {"option_text": "ملاحظات تفصيلية ونشرات مكتوبة", "modality": "read_write"}, {"option_text": "عروض حية ومشاركة الجمهور", "modality": "kinesthetic"}]'::jsonb, 108),
  ('learning_style', 'When I need to understand a complex process, I prefer:', 'عندما أحتاج إلى فهم عملية معقّدة، أفضّل:', NULL, NULL,
   '[{"option_text": "A flowchart or process diagram", "modality": "visual"}, {"option_text": "A verbal walkthrough from an expert", "modality": "auditory"}, {"option_text": "A detailed written description of each step", "modality": "read_write"}, {"option_text": "Walking through the process myself step by step", "modality": "kinesthetic"}]'::jsonb,
   '[{"option_text": "مخطّط انسيابي أو رسم توضيحي للعملية", "modality": "visual"}, {"option_text": "شرح شفهي من خبير", "modality": "auditory"}, {"option_text": "وصف مكتوب تفصيلي لكل خطوة", "modality": "read_write"}, {"option_text": "أن أمرّ بالعملية بنفسي خطوة بخطوة", "modality": "kinesthetic"}]'::jsonb, 109),
  ('learning_style', 'When learning a new language, I find it easiest to:', 'عند تعلّم لغة جديدة، أجد أنه من الأسهل أن:', NULL, NULL,
   '[{"option_text": "Use flashcards with images and visual associations", "modality": "visual"}, {"option_text": "Listen to native speakers and repeat phrases", "modality": "auditory"}, {"option_text": "Study grammar rules and vocabulary lists", "modality": "read_write"}, {"option_text": "Practice conversations and role-play scenarios", "modality": "kinesthetic"}]'::jsonb,
   '[{"option_text": "أستخدم بطاقات تعليمية بصور وارتباطات بصرية", "modality": "visual"}, {"option_text": "أستمع إلى المتحدّثين الأصليين وأكرّر العبارات", "modality": "auditory"}, {"option_text": "أدرس قواعد النحو وقوائم المفردات", "modality": "read_write"}, {"option_text": "أتدرّب على المحادثات وأداء الأدوار", "modality": "kinesthetic"}]'::jsonb, 110),
  ('learning_style', 'When I receive feedback on my work, I prefer it:', 'عند تلقّي ملاحظات على عملي، أفضّلها أن تكون:', NULL, NULL,
   '[{"option_text": "Marked up visually with highlights and annotations", "modality": "visual"}, {"option_text": "Discussed verbally in a face-to-face meeting", "modality": "auditory"}, {"option_text": "Written in detailed comments", "modality": "read_write"}, {"option_text": "Demonstrated through examples of improved work", "modality": "kinesthetic"}]'::jsonb,
   '[{"option_text": "موضّحة بصريًا بالتمييز والتعليقات التوضيحية", "modality": "visual"}, {"option_text": "تُناقَش شفهيًا في اجتماع مباشر", "modality": "auditory"}, {"option_text": "مكتوبة في تعليقات تفصيلية", "modality": "read_write"}, {"option_text": "موضّحة من خلال أمثلة على عمل محسّن", "modality": "kinesthetic"}]'::jsonb, 111),
  ('learning_style', 'When planning a project, I prefer to:', 'عند التخطيط لمشروع، أفضّل أن:', NULL, NULL,
   '[{"option_text": "Create a visual timeline or mind map", "modality": "visual"}, {"option_text": "Talk through the plan with team members", "modality": "auditory"}, {"option_text": "Write a detailed project plan document", "modality": "read_write"}, {"option_text": "Start working on tasks and adjust as I go", "modality": "kinesthetic"}]'::jsonb,
   '[{"option_text": "أنشئ جدولًا زمنيًا مرئيًا أو خريطة ذهنية", "modality": "visual"}, {"option_text": "أناقش الخطة مع أعضاء الفريق", "modality": "auditory"}, {"option_text": "أكتب وثيقة خطة مشروع تفصيلية", "modality": "read_write"}, {"option_text": "أبدأ العمل على المهام وأعدّل أثناء التقدّم", "modality": "kinesthetic"}]'::jsonb, 112),
  ('learning_style', 'When trying to remember something important, I:', 'عند محاولة تذكّر شيء مهم، فإنني:', NULL, NULL,
   '[{"option_text": "Visualize it in my mind as an image or scene", "modality": "visual"}, {"option_text": "Repeat it to myself out loud or in my head", "modality": "auditory"}, {"option_text": "Write it down in a list or note", "modality": "read_write"}, {"option_text": "Associate it with a physical action or gesture", "modality": "kinesthetic"}]'::jsonb,
   '[{"option_text": "أتخيّله في ذهني كصورة أو مشهد", "modality": "visual"}, {"option_text": "أكرّره لنفسي بصوت عالٍ أو في ذهني", "modality": "auditory"}, {"option_text": "أدوّنه في قائمة أو ملاحظة", "modality": "read_write"}, {"option_text": "أربطه بحركة أو إيماءة جسدية", "modality": "kinesthetic"}]'::jsonb, 113),
  ('learning_style', 'When choosing an online course, I look for one that has:', 'عند اختيار دورة عبر الإنترنت، أبحث عن دورة تحتوي على:', NULL, NULL,
   '[{"option_text": "Rich visual content like infographics and animations", "modality": "visual"}, {"option_text": "Audio lectures and discussion forums", "modality": "auditory"}, {"option_text": "Comprehensive reading materials and transcripts", "modality": "read_write"}, {"option_text": "Interactive exercises and hands-on projects", "modality": "kinesthetic"}]'::jsonb,
   '[{"option_text": "محتوى بصري غني مثل الرسوم المعلوماتية والرسوم المتحركة", "modality": "visual"}, {"option_text": "محاضرات صوتية ومنتديات نقاش", "modality": "auditory"}, {"option_text": "مواد قراءة شاملة ونصوص مكتوبة", "modality": "read_write"}, {"option_text": "تمارين تفاعلية ومشاريع تطبيقية", "modality": "kinesthetic"}]'::jsonb, 114),
  ('learning_style', 'When explaining something to a friend, I tend to:', 'عند شرح شيء ما لصديق، أميل إلى أن:', NULL, NULL,
   '[{"option_text": "Draw a picture or show them a diagram", "modality": "visual"}, {"option_text": "Describe it verbally with analogies", "modality": "auditory"}, {"option_text": "Write out the explanation or send a text message", "modality": "read_write"}, {"option_text": "Show them by doing it or using gestures", "modality": "kinesthetic"}]'::jsonb,
   '[{"option_text": "أرسم صورة أو أعرض لهم رسمًا توضيحيًا", "modality": "visual"}, {"option_text": "أصفه شفهيًا باستخدام التشبيهات", "modality": "auditory"}, {"option_text": "أكتب الشرح أو أرسل رسالة نصية", "modality": "read_write"}, {"option_text": "أريهم بالقيام به أو باستخدام الإيماءات", "modality": "kinesthetic"}]'::jsonb, 115),
  ('learning_style', 'When I encounter a problem I cannot solve, I:', 'عندما أواجه مشكلة لا أستطيع حلّها، فإنني:', NULL, NULL,
   '[{"option_text": "Look for visual examples of similar solved problems", "modality": "visual"}, {"option_text": "Talk it through with someone to hear different perspectives", "modality": "auditory"}, {"option_text": "Search for written guides or documentation", "modality": "read_write"}, {"option_text": "Experiment with different approaches until something works", "modality": "kinesthetic"}]'::jsonb,
   '[{"option_text": "أبحث عن أمثلة مرئية لمسائل مماثلة تم حلّها", "modality": "visual"}, {"option_text": "أناقشها مع شخص لسماع وجهات نظر مختلفة", "modality": "auditory"}, {"option_text": "أبحث عن أدلة مكتوبة أو وثائق", "modality": "read_write"}, {"option_text": "أجرّب أساليب مختلفة حتى ينجح أحدها", "modality": "kinesthetic"}]'::jsonb, 116);

-- 3c. Self-Efficacy Scale (6 items)
INSERT INTO _onboarding_seed
  (assessment_type, question_text, question_text_ar, dimension, weight, options, options_ar, sort_order)
VALUES
  ('self_efficacy', 'I am confident I can understand the most complex material presented in my courses.', 'أنا واثق من قدرتي على فهم أكثر المواد تعقيدًا التي تُقدَّم في مقرراتي.', 'general_academic', 1, NULL, NULL, 201),
  ('self_efficacy', 'I am confident I can do an excellent job on assignments and tests in my courses.', 'أنا واثق من قدرتي على أداء التكليفات والاختبارات في مقرراتي بشكل ممتاز.', 'general_academic', 1, NULL, NULL, 202),
  ('self_efficacy', 'I am confident I can learn the content taught in even the most difficult courses.', 'أنا واثق من قدرتي على تعلّم المحتوى الذي يُدرَّس حتى في أصعب المقررات.', 'course_specific', 1, NULL, NULL, 203),
  ('self_efficacy', 'I am confident I can master the skills being taught in my classes.', 'أنا واثق من قدرتي على إتقان المهارات التي تُدرَّس في صفوفي.', 'course_specific', 1, NULL, NULL, 204),
  ('self_efficacy', 'I am confident I can organize my study time effectively to accomplish my academic goals.', 'أنا واثق من قدرتي على تنظيم وقت دراستي بفعالية لتحقيق أهدافي الأكاديمية.', 'self_regulated_learning', 1, NULL, NULL, 205),
  ('self_efficacy', 'I am confident I can motivate myself to complete academic work even when I find it uninteresting.', 'أنا واثق من قدرتي على تحفيز نفسي لإنجاز العمل الأكاديمي حتى عندما أجده غير ممتع.', 'self_regulated_learning', 1, NULL, NULL, 206);

-- 3d. Study Strategy Inventory (8 items)
INSERT INTO _onboarding_seed
  (assessment_type, question_text, question_text_ar, dimension, weight, options, options_ar, sort_order)
VALUES
  ('study_strategy', 'I set aside regular times each week for studying and stick to my schedule.', 'أخصّص أوقاتًا منتظمة كل أسبوع للدراسة وألتزم بجدولي.', 'time_management', 1, NULL, NULL, 301),
  ('study_strategy', 'I plan my study sessions in advance so I can cover all the material before exams.', 'أخطّط لجلسات دراستي مسبقًا حتى أتمكّن من تغطية جميع المواد قبل الامتحانات.', 'time_management', 1, NULL, NULL, 302),
  ('study_strategy', 'When studying, I try to connect new information to what I already know.', 'عند الدراسة، أحاول ربط المعلومات الجديدة بما أعرفه بالفعل.', 'elaboration', 1, NULL, NULL, 303),
  ('study_strategy', 'I try to relate ideas from one course to ideas from other courses when possible.', 'أحاول ربط الأفكار من مقرر بأفكار من مقررات أخرى عندما يكون ذلك ممكنًا.', 'elaboration', 1, NULL, NULL, 304),
  ('study_strategy', 'I test myself on course material to check my understanding before exams.', 'أختبر نفسي في مادة المقرر للتحقق من فهمي قبل الامتحانات.', 'self_testing', 1, NULL, NULL, 305),
  ('study_strategy', 'I make up practice questions or use flashcards to prepare for tests.', 'أضع أسئلة تدريبية أو أستخدم البطاقات التعليمية للاستعداد للاختبارات.', 'self_testing', 1, NULL, NULL, 306),
  ('study_strategy', 'When I don''t understand something, I ask the instructor or a classmate for help.', 'عندما لا أفهم شيئًا ما، أطلب المساعدة من المدرّس أو أحد الزملاء.', 'help_seeking', 1, NULL, NULL, 307),
  ('study_strategy', 'I make use of office hours, tutoring services, or study groups when I need support.', 'أستفيد من الساعات المكتبية أو خدمات الدروس الخصوصية أو مجموعات الدراسة عندما أحتاج إلى الدعم.', 'help_seeking', 1, NULL, NULL, 308);

-- 4. Seed every institution from the canonical dataset (CROSS JOIN), idempotent
INSERT INTO onboarding_questions
  (institution_id, assessment_type, question_text, question_text_ar,
   dimension, weight, options, options_ar, sort_order)
SELECT i.id, s.assessment_type, s.question_text, s.question_text_ar,
       s.dimension, s.weight, s.options, s.options_ar, s.sort_order
FROM institutions i
CROSS JOIN _onboarding_seed s
ON CONFLICT (institution_id, assessment_type, sort_order)
  WHERE assessment_type <> 'baseline'
  DO NOTHING;

-- 5. Backfill Arabic for the original single-institution rows
UPDATE onboarding_questions oq
SET question_text_ar = s.question_text_ar,
    options_ar = s.options_ar
FROM _onboarding_seed s
WHERE oq.assessment_type = s.assessment_type
  AND oq.sort_order = s.sort_order
  AND oq.assessment_type <> 'baseline'
  AND oq.question_text_ar IS NULL;;
