import { supabase } from '../lib/supabase'
import { createClient } from '@supabase/supabase-js'
import { Database } from '../../../shared/supabase-types'

// Admin client for service role operations
const supabaseAdmin = createClient<Database>(
  'https://farydblfbtxtzwjbpsuk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhcnlkYmxmYnR4dHp3amJwc3VrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNzc0NzU1MywiZXhwIjoyMDUzMzIzNTUzfQ.jcPh6pWmpOtCB5vWnVNUhXTcG1IxPMFlJi8sYdYVfJc',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

type Profile = Database['public']['Tables']['profiles']['Row']
type Program = Database['public']['Tables']['programs']['Row']
type Course = Database['public']['Tables']['courses']['Row']
type LearningOutcome = Database['public']['Tables']['learning_outcomes']['Row']
type Assignment = Database['public']['Tables']['assignments']['Row']
type StudentProgress = Database['public']['Tables']['student_progress']['Row']

export class SupabaseStorage {
  // User/Profile operations
  async getProfile(id: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching profile:', error)
      return null
    }

    return data
  }

  async getProfileByUsername(username: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .single()

    if (error) {
      console.error('Error fetching profile by username:', error)
      return null
    }

    return data
  }

  async getProfileByEmail(email: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single()

    if (error) {
      console.error('Error fetching profile by email:', error)
      return null
    }

    return data
  }

  async updateProfile(id: string, updates: Partial<Profile>): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating profile:', error)
      return null
    }

    return data
  }

  async getAllProfiles(): Promise<Profile[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching all profiles:', error)
      return []
    }

    return data || []
  }

  async getProfilesByRole(role: Profile['role']): Promise<Profile[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', role)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching profiles by role:', error)
      return []
    }

    return data || []
  }

  // Program operations
  async getPrograms(): Promise<Program[]> {
    const { data, error } = await supabase
      .from('programs')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching programs:', error)
      return []
    }

    return data || []
  }

  async getProgram(id: string): Promise<Program | null> {
    const { data, error } = await supabase
      .from('programs')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching program:', error)
      return null
    }

    return data
  }

  async createProgram(program: Database['public']['Tables']['programs']['Insert']): Promise<Program | null> {
    const { data, error } = await supabase
      .from('programs')
      .insert(program)
      .select()
      .single()

    if (error) {
      console.error('Error creating program:', error)
      return null
    }

    return data
  }

  async updateProgram(id: string, updates: Partial<Program>): Promise<Program | null> {
    const { data, error } = await supabase
      .from('programs')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating program:', error)
      return null
    }

    return data
  }

  // Course operations
  async getCourses(): Promise<Course[]> {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching courses:', error)
      return []
    }

    return data || []
  }

  async getCourse(id: string): Promise<Course | null> {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching course:', error)
      return null
    }

    return data
  }

  async getCoursesByProgram(programId: string): Promise<Course[]> {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .eq('program_id', programId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching courses by program:', error)
      return []
    }

    return data || []
  }

  async createCourse(course: Database['public']['Tables']['courses']['Insert']): Promise<Course | null> {
    const { data, error } = await supabase
      .from('courses')
      .insert(course)
      .select()
      .single()

    if (error) {
      console.error('Error creating course:', error)
      return null
    }

    return data
  }

  // Learning Outcomes operations
  async getLearningOutcomes(): Promise<LearningOutcome[]> {
    const { data, error } = await supabase
      .from('learning_outcomes')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching learning outcomes:', error)
      return []
    }

    return data || []
  }

  async getLearningOutcome(id: string): Promise<LearningOutcome | null> {
    const { data, error } = await supabase
      .from('learning_outcomes')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching learning outcome:', error)
      return null
    }

    return data
  }

  async createLearningOutcome(outcome: Database['public']['Tables']['learning_outcomes']['Insert']): Promise<LearningOutcome | null> {
    const { data, error } = await supabase
      .from('learning_outcomes')
      .insert(outcome)
      .select()
      .single()

    if (error) {
      console.error('Error creating learning outcome:', error)
      return null
    }

    return data
  }

  // Assignment operations
  async getAssignments(): Promise<Assignment[]> {
    const { data, error } = await supabase
      .from('assignments')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching assignments:', error)
      return []
    }

    return data || []
  }

  async getAssignmentsByCourse(courseId: string): Promise<Assignment[]> {
    const { data, error } = await supabase
      .from('assignments')
      .select('*')
      .eq('course_id', courseId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching assignments by course:', error)
      return []
    }

    return data || []
  }

  // Student Progress operations
  async getStudentProgress(studentId: string): Promise<StudentProgress | null> {
    const { data, error } = await supabase
      .from('student_progress')
      .select('*')
      .eq('student_id', studentId)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching student progress:', error)
      return null
    }

    return data
  }

  async createStudentProgress(progress: Database['public']['Tables']['student_progress']['Insert']): Promise<StudentProgress | null> {
    const { data, error } = await supabase
      .from('student_progress')
      .insert(progress)
      .select()
      .single()

    if (error) {
      console.error('Error creating student progress:', error)
      return null
    }

    return data
  }

  async updateStudentProgress(studentId: string, updates: Partial<StudentProgress>): Promise<StudentProgress | null> {
    const { data, error } = await supabase
      .from('student_progress')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('student_id', studentId)
      .select()
      .single()

    if (error) {
      console.error('Error updating student progress:', error)
      return null
    }

    return data
  }

  // Admin operations using service role
  async createDemoProfile(profileData: Database['public']['Tables']['profiles']['Insert'], password: string): Promise<Profile | null> {
    // Create auth user first
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: profileData.email,
      password: password,
      email_confirm: true,
      user_metadata: {
        username: profileData.username,
        first_name: profileData.first_name,
        last_name: profileData.last_name,
        role: profileData.role
      }
    })

    if (authError) {
      console.error('Error creating auth user:', authError)
      return null
    }

    // Create profile
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .insert({
        ...profileData,
        id: authData.user.id
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating profile:', error)
      return null
    }

    return data
  }
}

export const supabaseStorage = new SupabaseStorage()