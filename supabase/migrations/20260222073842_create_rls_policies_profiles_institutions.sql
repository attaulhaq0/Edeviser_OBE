-- ==============================
-- INSTITUTIONS RLS
-- ==============================
-- Members can read their own institution
CREATE POLICY "institutions_read_own" ON public.institutions
  FOR SELECT USING (id = auth_institution_id());

-- Admins can manage their institution
CREATE POLICY "institutions_admin_write" ON public.institutions
  FOR ALL USING (
    auth_user_role() = 'admin'
    AND id = auth_institution_id()
  );

-- ==============================
-- PROFILES RLS
-- ==============================
-- Users can read their own profile
CREATE POLICY "profiles_read_own" ON public.profiles
  FOR SELECT USING (id = auth.uid());

-- Admins can read all profiles in their institution
CREATE POLICY "profiles_admin_read_institution" ON public.profiles
  FOR SELECT USING (
    auth_user_role() = 'admin'
    AND institution_id = auth_institution_id()
  );

-- Admins can insert/update profiles in their institution
CREATE POLICY "profiles_admin_write" ON public.profiles
  FOR ALL USING (
    auth_user_role() = 'admin'
    AND institution_id = auth_institution_id()
  );

-- Teachers can read students in their courses
CREATE POLICY "profiles_teacher_read_students" ON public.profiles
  FOR SELECT USING (
    auth_user_role() = 'teacher'
    AND id IN (
      SELECT sc.student_id FROM public.student_courses sc
      JOIN public.courses c ON c.id = sc.course_id
      WHERE c.teacher_id = auth.uid()
    )
  );

-- Coordinators can read profiles in their programs
CREATE POLICY "profiles_coordinator_read" ON public.profiles
  FOR SELECT USING (
    auth_user_role() = 'coordinator'
    AND institution_id = auth_institution_id()
  );;
