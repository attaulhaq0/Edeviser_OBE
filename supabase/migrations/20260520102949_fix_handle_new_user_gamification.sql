-- FIX #5: handle_new_user should create student_gamification + onboarding_progress for students
-- Get the current function source to append to it
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  meta_full_name      text;
  meta_institution_id uuid;
  meta_role           text;
  meta_invitation_id  uuid;
  institution_row     public.institutions%ROWTYPE;
  final_role          public.user_role;
  final_status        text;
  email_domain        text;
BEGIN
  meta_full_name      := COALESCE(NEW.raw_user_meta_data ->> 'full_name', '');
  meta_institution_id := NULLIF(NEW.raw_user_meta_data ->> 'institution_id', '')::uuid;
  meta_role           := COALESCE(NEW.raw_user_meta_data ->> 'role', 'student');
  meta_invitation_id  := NULLIF(NEW.raw_user_meta_data ->> 'invitation_id', '')::uuid;

  -- Determine role
  IF meta_role IN ('admin','coordinator','teacher','student','parent') THEN
    final_role := meta_role::public.user_role;
  ELSE
    final_role := 'student'::public.user_role;
  END IF;

  -- Determine status
  IF meta_invitation_id IS NOT NULL THEN
    final_status := 'active';
  ELSIF final_role = 'student' THEN
    final_status := 'active';
  ELSE
    final_status := 'pending_verification';
  END IF;

  -- Try to find institution by domain if not provided
  IF meta_institution_id IS NULL THEN
    email_domain := split_part(NEW.email, '@', 2);
    SELECT * INTO institution_row FROM institutions
    WHERE domain = email_domain LIMIT 1;
    IF institution_row.id IS NOT NULL THEN
      meta_institution_id := institution_row.id;
    END IF;
  END IF;

  -- Create profile
  INSERT INTO public.profiles (id, email, full_name, role, institution_id, status, is_active)
  VALUES (NEW.id, NEW.email, meta_full_name, final_role, meta_institution_id, final_status, true)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), profiles.full_name),
    role = EXCLUDED.role,
    institution_id = COALESCE(EXCLUDED.institution_id, profiles.institution_id),
    status = EXCLUDED.status;

  -- Create student_gamification for students (FIX: was missing)
  IF final_role = 'student' THEN
    INSERT INTO public.student_gamification (student_id, xp_total, level, streak_current, streak_longest, last_login_date)
    VALUES (NEW.id, 0, 1, 0, 0, NULL)
    ON CONFLICT DO NOTHING;

    INSERT INTO public.onboarding_progress (student_id, current_step, is_complete)
    VALUES (NEW.id, 'welcome', false)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Consume invitation if provided
  IF meta_invitation_id IS NOT NULL THEN
    UPDATE invitations SET status = 'accepted', accepted_by = NEW.id, accepted_at = now()
    WHERE id = meta_invitation_id AND status = 'pending';
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user failed: %', SQLERRM;
  RETURN NEW;
END;
$func$;;
