-- =============================================================================
-- Edeviser Platform — Demo Data Seed Script
-- =============================================================================
-- Creates 50 realistic student profiles with full gamification, OBE, and
-- activity data for AI Co-Pilot training. Idempotent — safe to re-run.
--
-- Data distribution:
--   10 at-risk     (low login, declining attainment, few badges)
--   15 high perf   (daily logins, high scores, long streaks, many badges)
--   25 average     (mixed patterns)
--
-- Run via: psql or `supabase db reset`
-- =============================================================================

DO $$
DECLARE
  -- Sentinel: skip if seed data already exists
  _seed_exists boolean;

  -- Institution & staff IDs
  v_inst_id       uuid;
  v_admin_id      uuid;
  v_coord_id      uuid;
  v_teacher_id    uuid;
  v_program_id    uuid;

  -- Course IDs (4 courses)
  v_course_ids    uuid[] := ARRAY[
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid()
  ];

  -- Outcome IDs
  v_ilo_ids       uuid[] := ARRAY[gen_random_uuid(), gen_random_uuid(), gen_random_uuid()];
  v_plo_ids       uuid[] := ARRAY[gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid()];
  -- CLOs: 3 per course = 12 total
  v_clo_ids       uuid[];

  -- Rubric / criteria
  v_rubric_ids    uuid[];
  v_criteria_ids  uuid[];

  -- Assignment IDs: 5 per course = 20 total
  v_assignment_ids uuid[];

  -- Student arrays
  v_student_ids   uuid[];

  -- Bloom's levels for CLOs
  v_blooms        text[] := ARRAY['remembering','understanding','applying','analyzing','evaluating','creating'];

  -- Loop variables
  v_sid           uuid;
  v_cid           uuid;
  v_aid           uuid;
  v_sub_id        uuid;
  v_grade_id      uuid;
  v_clo_id        uuid;
  v_plo_id        uuid;
  v_ilo_id        uuid;
  v_rubric_id     uuid;
  v_crit_id       uuid;

  v_tier          text;  -- 'at_risk', 'high', 'average'
  v_score         numeric;
  v_score_pct     numeric;
  v_att_level     text;
  v_is_late       boolean;
  v_sub_count     int;
  v_xp_count      int;
  v_badge_count   int;
  v_journal_count int;
  v_habit_days    int;
  v_streak        int;
  v_xp_total      int;
  v_level         int;

  -- Time range: 4 months ending now
  v_start_date    timestamptz := now() - interval '120 days';
  v_end_date      timestamptz := now();
  v_ts            timestamptz;
  v_day           date;

  -- Temp counters
  i               int;
  j               int;
  k               int;
  v_num_courses   int;
  v_enrolled      uuid[];

  -- Student names
  v_first_names   text[] := ARRAY[
    'Aisha','Omar','Fatima','Yusuf','Zara','Hassan','Maryam','Ali','Noor','Ibrahim',
    'Sara','Ahmed','Layla','Khalid','Hana','Tariq','Amina','Bilal','Dina','Faisal',
    'Rania','Samir','Lina','Jamal','Nadia','Rashid','Salma','Waleed','Yasmin','Hamza',
    'Rana','Idris','Leena','Kareem','Huda','Zain','Mariam','Sami','Dalal','Majid',
    'Noura','Adel','Farah','Rami','Ghada','Tamer','Lubna','Wael','Asma','Faris'
  ];
  v_last_names    text[] := ARRAY[
    'Al-Rashid','Khan','Hassan','Mahmoud','Al-Farsi','Nasser','Qureshi','Saleh','Bakr','Jaber',
    'Othman','Sharif','Haddad','Mansour','Khalil','Darwish','Farouk','Amin','Sabbagh','Khoury',
    'Nassar','Hamdan','Rizk','Taha','Barakat','Awad','Mustafa','Suleiman','Habib','Younis',
    'Abboud','Saeed','Hariri','Fawzi','Nasr','Bishara','Ghazi','Samara','Halabi','Dagher',
    'Masri','Shami','Ayyad','Kanaan','Obeid','Hajj','Issa','Moussa','Karam','Zidan'
  ];

  -- XP sources
  v_xp_sources    text[] := ARRAY['login','submission','badge','perfect_day','first_attempt_bonus','perfect_rubric','streak_milestone','journal'];

  -- Activity event types
  v_event_types   text[] := ARRAY['login','page_view','submission','journal','assignment_view'];

  -- Course names
  v_course_names  text[] := ARRAY['Data Structures & Algorithms','Software Engineering','Database Systems','Computer Networks'];
  v_course_codes  text[] := ARRAY['CS201','CS301','CS302','CS303'];

BEGIN
  -- =========================================================================
  -- IDEMPOTENCY CHECK
  -- =========================================================================
  SELECT EXISTS(
    SELECT 1 FROM institutions WHERE name = 'Seed Demo University'
  ) INTO _seed_exists;

  IF _seed_exists THEN
    RAISE NOTICE 'Seed data already exists — skipping.';
    RETURN;
  END IF;

  RAISE NOTICE 'Seeding demo data for 50 students...';

  -- =========================================================================
  -- 1. INSTITUTION
  -- =========================================================================
  v_inst_id := gen_random_uuid();
  INSERT INTO institutions (id, name, settings)
  VALUES (v_inst_id, 'Seed Demo University', '{}');

  -- =========================================================================
  -- 2. STAFF PROFILES (admin, coordinator, teacher)
  -- =========================================================================
  v_admin_id  := gen_random_uuid();
  v_coord_id  := gen_random_uuid();
  v_teacher_id := gen_random_uuid();

  INSERT INTO profiles (id, email, full_name, role, institution_id, is_active, onboarding_completed)
  VALUES
    (v_admin_id,   'seed.admin@demo.edu',   'Dr. Admin Seed',       'admin',       v_inst_id, true, true),
    (v_coord_id,   'seed.coord@demo.edu',   'Dr. Coord Seed',       'coordinator', v_inst_id, true, true),
    (v_teacher_id, 'seed.teacher@demo.edu', 'Prof. Teacher Seed',   'teacher',     v_inst_id, true, true);

  -- =========================================================================
  -- 3. PROGRAM
  -- =========================================================================
  v_program_id := gen_random_uuid();
  INSERT INTO programs (id, name, code, institution_id, coordinator_id, is_active)
  VALUES (v_program_id, 'Computer Science', 'CS', v_inst_id, v_coord_id, true);

  -- =========================================================================
  -- 4. COURSES (4 courses)
  -- =========================================================================
  FOR i IN 1..4 LOOP
    INSERT INTO courses (id, name, code, program_id, teacher_id, semester, academic_year, is_active)
    VALUES (
      v_course_ids[i],
      v_course_names[i],
      v_course_codes[i],
      v_program_id,
      v_teacher_id,
      'Fall 2024',
      '2024-2025',
      true
    );
  END LOOP;

  -- =========================================================================
  -- 5. LEARNING OUTCOMES (ILO → PLO → CLO)
  -- =========================================================================
  -- 3 ILOs
  INSERT INTO learning_outcomes (id, title, description, type, institution_id, sort_order) VALUES
    (v_ilo_ids[1], 'Critical Thinking & Problem Solving', 'Apply analytical reasoning to complex problems', 'ILO', v_inst_id, 1),
    (v_ilo_ids[2], 'Technical Competence', 'Demonstrate mastery of core CS concepts', 'ILO', v_inst_id, 2),
    (v_ilo_ids[3], 'Communication & Collaboration', 'Communicate technical ideas effectively', 'ILO', v_inst_id, 3);

  -- 4 PLOs
  INSERT INTO learning_outcomes (id, title, description, type, institution_id, program_id, sort_order) VALUES
    (v_plo_ids[1], 'Algorithm Design', 'Design efficient algorithms for computational problems', 'PLO', v_inst_id, v_program_id, 1),
    (v_plo_ids[2], 'Software Development', 'Build reliable software systems', 'PLO', v_inst_id, v_program_id, 2),
    (v_plo_ids[3], 'Data Management', 'Manage and query structured data effectively', 'PLO', v_inst_id, v_program_id, 3),
    (v_plo_ids[4], 'Systems & Networks', 'Understand networked and distributed systems', 'PLO', v_inst_id, v_program_id, 4);

  -- PLO → ILO mappings
  INSERT INTO outcome_mappings (source_outcome_id, target_outcome_id, weight) VALUES
    (v_plo_ids[1], v_ilo_ids[1], 0.6), (v_plo_ids[1], v_ilo_ids[2], 0.4),
    (v_plo_ids[2], v_ilo_ids[2], 0.5), (v_plo_ids[2], v_ilo_ids[3], 0.5),
    (v_plo_ids[3], v_ilo_ids[2], 0.7), (v_plo_ids[3], v_ilo_ids[1], 0.3),
    (v_plo_ids[4], v_ilo_ids[2], 0.6), (v_plo_ids[4], v_ilo_ids[3], 0.4);

  -- 12 CLOs (3 per course), each with a Bloom's level
  v_clo_ids := ARRAY[]::uuid[];
  FOR i IN 1..4 LOOP
    FOR j IN 1..3 LOOP
      v_clo_id := gen_random_uuid();
      v_clo_ids := v_clo_ids || v_clo_id;
      INSERT INTO learning_outcomes (
        id, title, description, type, institution_id, course_id,
        blooms_level, sort_order
      ) VALUES (
        v_clo_id,
        'CLO-' || i || '.' || j || ': ' ||
          CASE j
            WHEN 1 THEN 'Identify key concepts'
            WHEN 2 THEN 'Apply techniques to problems'
            WHEN 3 THEN 'Evaluate and design solutions'
          END,
        'Course ' || i || ' learning outcome ' || j,
        'CLO',
        v_inst_id,
        v_course_ids[i],
        v_blooms[((i - 1) * 3 + j - 1) % 6 + 1]::blooms_level,
        j
      );
      -- CLO → PLO mapping
      INSERT INTO outcome_mappings (source_outcome_id, target_outcome_id, weight)
      VALUES (v_clo_id, v_plo_ids[i], round((1.0 / 3)::numeric, 2));
    END LOOP;
  END LOOP;

  -- =========================================================================
  -- 6. RUBRICS & CRITERIA (one rubric per CLO)
  -- =========================================================================
  v_rubric_ids := ARRAY[]::uuid[];
  v_criteria_ids := ARRAY[]::uuid[];
  FOR i IN 1..array_length(v_clo_ids, 1) LOOP
    v_rubric_id := gen_random_uuid();
    v_rubric_ids := v_rubric_ids || v_rubric_id;
    INSERT INTO rubrics (id, title, clo_id, created_by, is_template)
    VALUES (v_rubric_id, 'Rubric for CLO ' || i, v_clo_ids[i], v_teacher_id, false);

    -- 2 criteria per rubric
    FOR j IN 1..2 LOOP
      v_crit_id := gen_random_uuid();
      v_criteria_ids := v_criteria_ids || v_crit_id;
      INSERT INTO rubric_criteria (id, rubric_id, criterion_name, max_points, sort_order, levels)
      VALUES (
        v_crit_id,
        v_rubric_id,
        CASE j WHEN 1 THEN 'Understanding' ELSE 'Application' END,
        50,
        j,
        '[{"label":"Excellent","description":"Exceeds expectations","points":50},{"label":"Good","description":"Meets expectations","points":35},{"label":"Developing","description":"Approaching expectations","points":20},{"label":"Beginning","description":"Below expectations","points":10}]'::jsonb
      );
    END LOOP;
  END LOOP;

  -- =========================================================================
  -- 7. ASSIGNMENTS (5 per course = 20 total)
  -- =========================================================================
  v_assignment_ids := ARRAY[]::uuid[];
  FOR i IN 1..4 LOOP
    FOR j IN 1..5 LOOP
      v_aid := gen_random_uuid();
      v_assignment_ids := v_assignment_ids || v_aid;
      -- Spread due dates across the 4-month window
      v_ts := v_start_date + (interval '1 day' * (20 * j + i * 3));
      INSERT INTO assignments (
        id, title, description, course_id, due_date, total_marks,
        clo_weights, is_late_allowed, late_window_hours, created_by
      ) VALUES (
        v_aid,
        v_course_names[i] || ' — Assignment ' || j,
        'Demo assignment ' || j || ' for ' || v_course_names[i],
        v_course_ids[i],
        v_ts,
        100,
        jsonb_build_object(v_clo_ids[(i-1)*3 + ((j-1) % 3) + 1]::text, 100),
        true,
        24,
        v_teacher_id
      );
    END LOOP;
  END LOOP;

  -- =========================================================================
  -- 8. STUDENT PROFILES (50 students)
  -- =========================================================================
  v_student_ids := ARRAY[]::uuid[];
  FOR i IN 1..50 LOOP
    v_sid := gen_random_uuid();
    v_student_ids := v_student_ids || v_sid;
    INSERT INTO profiles (id, email, full_name, role, institution_id, is_active, onboarding_completed)
    VALUES (
      v_sid,
      lower(v_first_names[i]) || '.' || lower(v_last_names[i]) || '@demo.edu',
      v_first_names[i] || ' ' || v_last_names[i],
      'student',
      v_inst_id,
      true,
      true
    );
  END LOOP;


  -- =========================================================================
  -- 9. ENROLLMENTS (2–4 courses per student)
  -- =========================================================================
  FOR i IN 1..50 LOOP
    v_sid := v_student_ids[i];
    -- Determine tier
    IF i <= 10 THEN v_tier := 'at_risk';
    ELSIF i <= 25 THEN v_tier := 'high';
    ELSE v_tier := 'average';
    END IF;

    -- Number of courses: at_risk 2, high 4, average 2-3
    v_num_courses := CASE v_tier
      WHEN 'at_risk' THEN 2
      WHEN 'high'    THEN 4
      ELSE 2 + (i % 2)  -- 2 or 3
    END;

    -- Pick courses (always include first, then sequential)
    v_enrolled := ARRAY[]::uuid[];
    FOR j IN 1..v_num_courses LOOP
      v_enrolled := v_enrolled || v_course_ids[j];
      INSERT INTO student_courses (student_id, course_id, status)
      VALUES (v_sid, v_course_ids[j], 'active');
    END LOOP;

    -- =====================================================================
    -- 10. SUBMISSIONS & GRADES per student
    -- =====================================================================
    v_sub_count := CASE v_tier
      WHEN 'at_risk' THEN 10 + (i % 5)       -- 10-14
      WHEN 'high'    THEN 18 + (i % 13)      -- 18-30
      ELSE 12 + (i % 10)                      -- 12-21
    END;

    k := 0;
    FOR j IN 1..array_length(v_assignment_ids, 1) LOOP
      EXIT WHEN k >= v_sub_count;
      v_aid := v_assignment_ids[j];

      -- Only submit to assignments in enrolled courses
      SELECT a.course_id INTO v_cid FROM assignments a WHERE a.id = v_aid;
      CONTINUE WHEN NOT (v_cid = ANY(v_enrolled));

      k := k + 1;

      -- Score based on tier
      v_score := CASE v_tier
        WHEN 'at_risk' THEN 25 + (random() * 40)::int   -- 25-65
        WHEN 'high'    THEN 75 + (random() * 25)::int    -- 75-100
        ELSE 45 + (random() * 40)::int                    -- 45-85
      END;
      v_score_pct := v_score;

      -- Timing pattern
      v_is_late := CASE v_tier
        WHEN 'at_risk' THEN random() < 0.4   -- 40% late
        WHEN 'high'    THEN random() < 0.05  -- 5% late
        ELSE random() < 0.15                   -- 15% late
      END;

      -- Submission timestamp relative to due date
      SELECT a.due_date INTO v_ts FROM assignments a WHERE a.id = v_aid;
      IF v_is_late THEN
        v_ts := v_ts + interval '1 hour' * (1 + (random() * 20)::int);
      ELSE
        v_ts := v_ts - interval '1 hour' * (2 + (random() * 72)::int);
      END IF;

      -- Attainment level
      v_att_level := CASE
        WHEN v_score_pct >= 85 THEN 'excellent'
        WHEN v_score_pct >= 70 THEN 'satisfactory'
        WHEN v_score_pct >= 50 THEN 'developing'
        ELSE 'not_yet'
      END;

      -- Insert submission
      v_sub_id := gen_random_uuid();
      INSERT INTO submissions (id, assignment_id, student_id, submitted_at, is_late, status, file_url)
      VALUES (v_sub_id, v_aid, v_sid, v_ts, v_is_late, 'graded', 'seed/demo-file.pdf');

      -- Insert grade
      v_grade_id := gen_random_uuid();
      INSERT INTO grades (id, submission_id, graded_by, total_score, score_percent, rubric_selections, overall_feedback, graded_at)
      VALUES (
        v_grade_id,
        v_sub_id,
        v_teacher_id,
        v_score,
        v_score_pct,
        '[{"criterion_id":"seed","level_index":0,"points":' || (v_score / 2)::int || '},{"criterion_id":"seed","level_index":1,"points":' || (v_score / 2)::int || '}]'::jsonb,
        CASE
          WHEN v_score_pct >= 85 THEN 'Excellent work! Keep it up.'
          WHEN v_score_pct >= 70 THEN 'Good effort. Some areas to improve.'
          WHEN v_score_pct >= 50 THEN 'Needs improvement in key areas.'
          ELSE 'Significant gaps identified. Please seek help.'
        END,
        v_ts + interval '2 days'
      );

      -- Determine CLO for this assignment (first key from clo_weights jsonb)
      SELECT (k)::uuid INTO v_clo_id
        FROM jsonb_object_keys((SELECT clo_weights::jsonb FROM assignments WHERE id = v_aid)) AS k
        LIMIT 1;

      -- Find mapped PLO and ILO for evidence
      SELECT om.target_outcome_id INTO v_plo_id
        FROM outcome_mappings om WHERE om.source_outcome_id = v_clo_id LIMIT 1;
      SELECT om.target_outcome_id INTO v_ilo_id
        FROM outcome_mappings om WHERE om.source_outcome_id = v_plo_id LIMIT 1;

      -- Fallback if mappings not found
      IF v_plo_id IS NULL THEN v_plo_id := v_plo_ids[1]; END IF;
      IF v_ilo_id IS NULL THEN v_ilo_id := v_ilo_ids[1]; END IF;

      -- Insert evidence record
      INSERT INTO evidence (id, submission_id, grade_id, student_id, clo_id, plo_id, ilo_id, score_percent, attainment_level)
      VALUES (
        gen_random_uuid(), v_sub_id, v_grade_id, v_sid,
        v_clo_id, v_plo_id, v_ilo_id,
        v_score_pct, v_att_level::attainment_level
      );
    END LOOP;


    -- =====================================================================
    -- 11. OUTCOME ATTAINMENT (CLO, PLO, ILO levels)
    -- =====================================================================
    -- CLO attainment for each enrolled course
    FOR j IN 1..v_num_courses LOOP
      FOR k IN 1..3 LOOP
        v_clo_id := v_clo_ids[(j-1)*3 + k];
        v_score_pct := CASE v_tier
          WHEN 'at_risk' THEN 30 + (random() * 30)::int
          WHEN 'high'    THEN 78 + (random() * 22)::int
          ELSE 50 + (random() * 35)::int
        END;
        -- Declining trend for at-risk: later CLOs score lower
        IF v_tier = 'at_risk' AND k > 1 THEN
          v_score_pct := GREATEST(20, v_score_pct - (k * 5));
        END IF;

        INSERT INTO outcome_attainment (outcome_id, student_id, course_id, attainment_percent, sample_count, scope)
        VALUES (v_clo_id, v_sid, v_course_ids[j], v_score_pct, 2 + (random() * 3)::int, 'student_course')
        ON CONFLICT DO NOTHING;
      END LOOP;
    END LOOP;

    -- PLO attainment
    FOR j IN 1..v_num_courses LOOP
      v_score_pct := CASE v_tier
        WHEN 'at_risk' THEN 30 + (random() * 25)::int
        WHEN 'high'    THEN 80 + (random() * 20)::int
        ELSE 55 + (random() * 30)::int
      END;
      INSERT INTO outcome_attainment (outcome_id, student_id, course_id, attainment_percent, sample_count, scope)
      VALUES (v_plo_ids[j], v_sid, v_course_ids[j], v_score_pct, 3 + (random() * 5)::int, 'student_course')
      ON CONFLICT DO NOTHING;
    END LOOP;

    -- ILO attainment (institution-wide per student)
    FOR j IN 1..3 LOOP
      v_score_pct := CASE v_tier
        WHEN 'at_risk' THEN 28 + (random() * 25)::int
        WHEN 'high'    THEN 82 + (random() * 18)::int
        ELSE 52 + (random() * 30)::int
      END;
      INSERT INTO outcome_attainment (outcome_id, student_id, attainment_percent, sample_count, scope)
      VALUES (v_ilo_ids[j], v_sid, v_score_pct, 5 + (random() * 8)::int, 'student_course')
      ON CONFLICT DO NOTHING;
    END LOOP;

    -- =====================================================================
    -- 12. XP TRANSACTIONS (50–200 per student)
    -- =====================================================================
    v_xp_count := CASE v_tier
      WHEN 'at_risk' THEN 50 + (i * 2)          -- 52-70
      WHEN 'high'    THEN 130 + (i * 4)         -- 174-230 (capped at 200)
      ELSE 70 + (i * 3)                          -- 148-220 (capped at 200)
    END;
    v_xp_count := LEAST(v_xp_count, 200);
    v_xp_total := 0;

    FOR j IN 1..v_xp_count LOOP
      -- Spread timestamps across the 4-month window
      v_ts := v_start_date + (random() * extract(epoch from (v_end_date - v_start_date))) * interval '1 second';

      -- Pick source and amount
      DECLARE
        v_src text := v_xp_sources[1 + (random() * (array_length(v_xp_sources, 1) - 1))::int];
        v_xp  int := CASE v_src
          WHEN 'login'               THEN 10
          WHEN 'submission'          THEN 25
          WHEN 'badge'               THEN 15 + (random() * 35)::int
          WHEN 'perfect_day'         THEN 50
          WHEN 'first_attempt_bonus' THEN 10
          WHEN 'perfect_rubric'      THEN 30
          WHEN 'streak_milestone'    THEN 50
          WHEN 'journal'             THEN 20
          ELSE 10
        END;
      BEGIN
        INSERT INTO xp_transactions (student_id, xp_amount, source, created_at, note)
        VALUES (v_sid, v_xp, v_src, v_ts, 'Seed data');
        v_xp_total := v_xp_total + v_xp;
      END;
    END LOOP;

    -- =====================================================================
    -- 13. STUDENT GAMIFICATION (streak, level, xp_total)
    -- =====================================================================
    v_streak := CASE v_tier
      WHEN 'at_risk' THEN (random() * 5)::int           -- 0-5
      WHEN 'high'    THEN 20 + (random() * 60)::int     -- 20-80
      ELSE 5 + (random() * 25)::int                      -- 5-30
    END;

    -- Calculate level from XP (50 * N^1.5)
    v_level := 1;
    WHILE (50 * power(v_level + 1, 1.5))::int <= v_xp_total LOOP
      v_level := v_level + 1;
    END LOOP;

    INSERT INTO student_gamification (student_id, xp_total, level, streak_count, streak_longest, last_login_date, streak_freezes_available)
    VALUES (
      v_sid,
      v_xp_total,
      v_level,
      v_streak,
      CASE v_tier
        WHEN 'high' THEN v_streak + (random() * 20)::int
        ELSE v_streak
      END,
      CASE v_tier
        WHEN 'at_risk' THEN (now() - interval '5 days')::date
        WHEN 'high'    THEN now()::date
        ELSE (now() - interval '1 day' * (random() * 3)::int)::date
      END,
      CASE v_tier WHEN 'high' THEN 2 WHEN 'average' THEN 1 ELSE 0 END
    );

    -- =====================================================================
    -- 14. BADGE AWARDS (0–15 per student)
    -- =====================================================================
    v_badge_count := CASE v_tier
      WHEN 'at_risk' THEN (random() * 3)::int            -- 0-3
      WHEN 'high'    THEN 8 + (random() * 7)::int        -- 8-15
      ELSE 3 + (random() * 6)::int                        -- 3-9
    END;

    DECLARE
      v_badge_keys text[] := ARRAY[
        'first_login','first_submission','streak_7','streak_14','streak_30',
        'streak_60','perfect_day','journal_master','speed_demon','night_owl',
        'perfectionist','level_5','level_10','early_bird','consistent_learner'
      ];
      v_badge_names text[] := ARRAY[
        'First Login','First Submission','7-Day Streak','14-Day Streak','30-Day Legend',
        '60-Day Warrior','Perfect Day','Journal Master','Speed Demon','Night Owl',
        'Perfectionist','Level 5','Level 10','Early Bird','Consistent Learner'
      ];
      v_badge_emojis text[] := ARRAY[
        '🎉','📝','🔥','🔥','🏆',
        '⚡','✨','📖','⚡','🌙',
        '💎','⭐','🌟','🌅','📚'
      ];
    BEGIN
      FOR j IN 1..v_badge_count LOOP
        v_ts := v_start_date + (random() * extract(epoch from (v_end_date - v_start_date))) * interval '1 second';
        INSERT INTO badges (student_id, badge_key, badge_name, emoji, awarded_at)
        VALUES (v_sid, v_badge_keys[j], v_badge_names[j], v_badge_emojis[j], v_ts);
      END LOOP;
    END;


    -- =====================================================================
    -- 15. JOURNAL ENTRIES (0–20 per student)
    -- =====================================================================
    v_journal_count := CASE v_tier
      WHEN 'at_risk' THEN (random() * 5)::int            -- 0-5
      WHEN 'high'    THEN 12 + (random() * 8)::int       -- 12-20
      ELSE 4 + (random() * 10)::int                       -- 4-14
    END;

    FOR j IN 1..v_journal_count LOOP
      v_ts := v_start_date + (random() * extract(epoch from (v_end_date - v_start_date))) * interval '1 second';
      DECLARE
        v_word_count int := CASE v_tier
          WHEN 'at_risk' THEN 30 + (random() * 50)::int   -- 30-80 words
          WHEN 'high'    THEN 100 + (random() * 200)::int  -- 100-300 words
          ELSE 50 + (random() * 150)::int                   -- 50-200 words
        END;
        v_content text := 'Today I reflected on my learning journey. ';
      BEGIN
        -- Build content to approximate word count
        FOR k IN 1..(v_word_count / 10) LOOP
          v_content := v_content || 'I explored new concepts and practiced applying them to real problems. ';
        END LOOP;

        INSERT INTO journal_entries (student_id, course_id, content, created_at, clo_id)
        VALUES (
          v_sid,
          v_enrolled[1 + ((j - 1) % v_num_courses)],
          v_content,
          v_ts,
          v_clo_ids[1 + ((j - 1) % array_length(v_clo_ids, 1))]
        );
      END;
    END LOOP;

    -- =====================================================================
    -- 16. HABIT LOGS (90–120 days, using habit_tracking table)
    -- =====================================================================
    v_habit_days := CASE v_tier
      WHEN 'at_risk' THEN 90
      WHEN 'high'    THEN 120
      ELSE 100 + (i % 20)
    END;

    FOR j IN 0..(v_habit_days - 1) LOOP
      v_day := (v_end_date - (j * interval '1 day'))::date;

      DECLARE
        v_login_done  boolean;
        v_submit_done boolean;
        v_journal_done boolean;
        v_read_done   boolean;
        v_perfect     boolean;
        v_completion_rate numeric := CASE v_tier
          WHEN 'at_risk' THEN 0.25 + (random() * 0.2)  -- 25-45%
          WHEN 'high'    THEN 0.80 + (random() * 0.2)   -- 80-100%
          ELSE 0.45 + (random() * 0.3)                    -- 45-75%
        END;
      BEGIN
        v_login_done   := random() < v_completion_rate;
        v_submit_done  := random() < (v_completion_rate * 0.6);
        v_journal_done := random() < (v_completion_rate * 0.5);
        v_read_done    := random() < (v_completion_rate * 0.7);
        v_perfect      := v_login_done AND v_submit_done AND v_journal_done AND v_read_done;

        INSERT INTO habit_tracking (student_id, habit_date, login, submit, journal, read_content, is_perfect_day)
        VALUES (v_sid, v_day, v_login_done, v_submit_done, v_journal_done, v_read_done, v_perfect)
        ON CONFLICT DO NOTHING;
      END;
    END LOOP;

    -- =====================================================================
    -- 17. STUDENT ACTIVITY LOG
    -- =====================================================================
    DECLARE
      v_activity_count int := CASE v_tier
        WHEN 'at_risk' THEN 40 + (random() * 30)::int    -- 40-70
        WHEN 'high'    THEN 150 + (random() * 100)::int   -- 150-250
        ELSE 70 + (random() * 80)::int                     -- 70-150
      END;
    BEGIN
      FOR j IN 1..v_activity_count LOOP
        v_ts := v_start_date + (random() * extract(epoch from (v_end_date - v_start_date))) * interval '1 second';
        DECLARE
          v_evt text := v_event_types[1 + (random() * (array_length(v_event_types, 1) - 1))::int];
        BEGIN
          INSERT INTO student_activity_log (student_id, event_type, created_at, metadata)
          VALUES (
            v_sid,
            v_evt,
            v_ts,
            CASE v_evt
              WHEN 'login'           THEN '{"source":"web"}'::jsonb
              WHEN 'page_view'       THEN ('{"page":"dashboard","duration_seconds":' || (10 + (random() * 300)::int) || '}')::jsonb
              WHEN 'submission'      THEN '{"type":"assignment"}'::jsonb
              WHEN 'journal'         THEN ('{"word_count":' || (50 + (random() * 250)::int) || '}')::jsonb
              WHEN 'assignment_view' THEN ('{"assignment_id":"' || v_assignment_ids[1 + ((j - 1) % array_length(v_assignment_ids, 1))] || '"}')::jsonb
              ELSE '{}'::jsonb
            END
          );
        END;
      END LOOP;
    END;

  END LOOP; -- end student loop

  RAISE NOTICE 'Seed complete: 50 students, 4 courses, 20 assignments seeded.';

END $$;
