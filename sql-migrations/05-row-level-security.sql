-- Step 5: Row Level Security (RLS) Policies
-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badge_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_badges ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Programs policies  
CREATE POLICY "Everyone can view active programs" ON public.programs
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins and coordinators can manage programs" ON public.programs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'coordinator')
    )
  );

-- Courses policies
CREATE POLICY "Everyone can view active courses" ON public.courses
  FOR SELECT USING (is_active = true);

CREATE POLICY "Teachers can manage their courses" ON public.courses
  FOR ALL USING (
    teacher_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'coordinator')
    )
  );

-- Learning outcomes policies
CREATE POLICY "Everyone can view active learning outcomes" ON public.learning_outcomes
  FOR SELECT USING (is_active = true);

CREATE POLICY "Owners can manage their learning outcomes" ON public.learning_outcomes
  FOR ALL USING (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'coordinator')
    )
  );

-- Student progress policies
CREATE POLICY "Students can view their own progress" ON public.student_progress
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Students can update their own progress" ON public.student_progress
  FOR ALL USING (
    student_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'coordinator', 'teacher')
    )
  );

-- Badge templates policies
CREATE POLICY "Everyone can view active badge templates" ON public.badge_templates
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage badge templates" ON public.badge_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Student badges policies
CREATE POLICY "Students can view their own badges" ON public.student_badges
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "System can award badges" ON public.student_badges
  FOR INSERT WITH CHECK (true);