-- Step 4: Create triggers and functions
-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_programs_updated_at BEFORE UPDATE ON public.programs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_learning_outcomes_updated_at BEFORE UPDATE ON public.learning_outcomes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON public.assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_student_progress_updated_at BEFORE UPDATE ON public.student_progress FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email, first_name, last_name, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', SPLIT_PART(new.email, '@', 1)),
    new.email,
    COALESCE(new.raw_user_meta_data->>'first_name', 'User'),
    COALESCE(new.raw_user_meta_data->>'last_name', 'Name'),
    COALESCE((new.raw_user_meta_data->>'role')::role, 'student')
  );
  
  -- Create student progress if user is a student
  IF COALESCE((new.raw_user_meta_data->>'role')::role, 'student') = 'student' THEN
    INSERT INTO public.student_progress (student_id)
    VALUES (new.id);
  END IF;
  
  RETURN new;
END;
$$ language plpgsql security definer;

-- Trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();