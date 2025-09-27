export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          email: string
          first_name: string
          last_name: string
          role: 'admin' | 'coordinator' | 'teacher' | 'student'
          is_active: boolean
          profile_image: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          username: string
          email: string
          first_name: string
          last_name: string
          role?: 'admin' | 'coordinator' | 'teacher' | 'student'
          is_active?: boolean
          profile_image?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          email?: string
          first_name?: string
          last_name?: string
          role?: 'admin' | 'coordinator' | 'teacher' | 'student'
          is_active?: boolean
          profile_image?: string | null
          updated_at?: string
        }
      }
      programs: {
        Row: {
          id: string
          name: string
          description: string | null
          code: string
          level: string
          coordinator_id: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          code: string
          level: string
          coordinator_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          code?: string
          level?: string
          coordinator_id?: string | null
          is_active?: boolean
          updated_at?: string
        }
      }
      courses: {
        Row: {
          id: string
          name: string
          description: string | null
          code: string
          credits: number
          program_id: string
          teacher_id: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          code: string
          credits?: number
          program_id: string
          teacher_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          code?: string
          credits?: number
          program_id?: string
          teacher_id?: string | null
          is_active?: boolean
          updated_at?: string
        }
      }
      learning_outcomes: {
        Row: {
          id: string
          code: string
          title: string
          description: string
          type: 'ILO' | 'PLO' | 'CLO'
          blooms_level: 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create'
          program_id: string | null
          course_id: string | null
          owner_id: string
          last_edited_by: string
          version: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          code: string
          title: string
          description: string
          type: 'ILO' | 'PLO' | 'CLO'
          blooms_level: 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create'
          program_id?: string | null
          course_id?: string | null
          owner_id: string
          last_edited_by: string
          version?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          code?: string
          title?: string
          description?: string
          type?: 'ILO' | 'PLO' | 'CLO'
          blooms_level?: 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create'
          program_id?: string | null
          course_id?: string | null
          owner_id?: string
          last_edited_by?: string
          version?: number
          is_active?: boolean
          updated_at?: string
        }
      }
      assignments: {
        Row: {
          id: string
          title: string
          description: string | null
          course_id: string
          teacher_id: string
          total_points: number
          due_date: string | null
          is_active: boolean
          rubric_data: any | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          course_id: string
          teacher_id: string
          total_points?: number
          due_date?: string | null
          is_active?: boolean
          rubric_data?: any | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          course_id?: string
          teacher_id?: string
          total_points?: number
          due_date?: string | null
          is_active?: boolean
          rubric_data?: any | null
          updated_at?: string
        }
      }
      student_progress: {
        Row: {
          id: string
          student_id: string
          total_xp: number
          current_level: number
          current_streak: number
          longest_streak: number
          last_activity_date: string | null
          total_badges: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          student_id: string
          total_xp?: number
          current_level?: number
          current_streak?: number
          longest_streak?: number
          last_activity_date?: string | null
          total_badges?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          total_xp?: number
          current_level?: number
          current_streak?: number
          longest_streak?: number
          last_activity_date?: string | null
          total_badges?: number
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      role: 'admin' | 'coordinator' | 'teacher' | 'student'
      blooms_level: 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create'
      outcome_type: 'ILO' | 'PLO' | 'CLO'
      badge_type: 'achievement' | 'mastery' | 'streak' | 'special'
      mascot_type: 'fox' | 'owl' | 'penguin'
      alert_type: 'low_performance' | 'inactivity' | 'missed_deadline' | 'help_request' | 'achievement' | 'streak_break'
      alert_priority: 'low' | 'medium' | 'high' | 'critical'
      alert_status: 'active' | 'acknowledged' | 'resolved' | 'dismissed'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}