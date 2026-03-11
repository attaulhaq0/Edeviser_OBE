export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      institutions: {
        Row: {
          created_at: string
          id: string
          name: string
          settings: Json
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          settings?: Json
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          settings?: Json
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          role: string
          institution_id: string
          avatar_url: string | null
          is_active: boolean
          onboarding_completed: boolean
          portfolio_public: boolean
          theme_preference: string
          language_preference: string
          email_preferences: Json | null
          notification_preferences: Json | null
          leaderboard_anonymous: boolean
          last_login_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          full_name: string
          role: string
          institution_id: string
          avatar_url?: string | null
          is_active?: boolean
          onboarding_completed?: boolean
          portfolio_public?: boolean
          theme_preference?: string
          language_preference?: string
          email_preferences?: Json | null
          notification_preferences?: Json | null
          leaderboard_anonymous?: boolean
          last_login_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          role?: string
          institution_id?: string
          avatar_url?: string | null
          is_active?: boolean
          onboarding_completed?: boolean
          portfolio_public?: boolean
          theme_preference?: string
          language_preference?: string
          email_preferences?: Json | null
          notification_preferences?: Json | null
          leaderboard_anonymous?: boolean
          last_login_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          id: string
          name: string
          code: string
          description: string | null
          institution_id: string
          coordinator_id: string | null
          department_id: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          code: string
          description?: string | null
          institution_id: string
          coordinator_id?: string | null
          department_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          code?: string
          description?: string | null
          institution_id?: string
          coordinator_id?: string | null
          department_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "programs_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programs_coordinator_id_fkey"
            columns: ["coordinator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          id: string
          name: string
          code: string
          program_id: string
          semester_id: string
          teacher_id: string
          institution_id: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          code: string
          program_id: string
          semester_id: string
          teacher_id: string
          institution_id: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          code?: string
          program_id?: string
          semester_id?: string
          teacher_id?: string
          institution_id?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_outcomes: {
        Row: {
          id: string
          type: string
          title: string
          description: string | null
          institution_id: string
          program_id: string | null
          course_id: string | null
          blooms_level: string | null
          sort_order: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          type: string
          title: string
          description?: string | null
          institution_id: string
          program_id?: string | null
          course_id?: string | null
          blooms_level?: string | null
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          type?: string
          title?: string
          description?: string | null
          institution_id?: string
          program_id?: string | null
          course_id?: string | null
          blooms_level?: string | null
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_outcomes_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_outcomes_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_outcomes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      outcome_mappings: {
        Row: {
          id: string
          source_outcome_id: string
          target_outcome_id: string
          parent_outcome_id: string
          child_outcome_id: string
          weight: number
          created_at: string
        }
        Insert: {
          id?: string
          source_outcome_id: string
          target_outcome_id: string
          parent_outcome_id: string
          child_outcome_id: string
          weight: number
          created_at?: string
        }
        Update: {
          id?: string
          source_outcome_id?: string
          target_outcome_id?: string
          parent_outcome_id?: string
          child_outcome_id?: string
          weight?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "outcome_mappings_source_outcome_id_fkey"
            columns: ["source_outcome_id"]
            isOneToOne: false
            referencedRelation: "learning_outcomes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outcome_mappings_target_outcome_id_fkey"
            columns: ["target_outcome_id"]
            isOneToOne: false
            referencedRelation: "learning_outcomes"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          id: string
          title: string
          description: string | null
          course_id: string
          due_date: string
          total_marks: number
          rubric_id: string | null
          clo_weights: Json
          late_window_hours: number
          prerequisites: Json | null
          institution_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          course_id: string
          due_date: string
          total_marks: number
          rubric_id?: string | null
          clo_weights?: Json
          late_window_hours?: number
          prerequisites?: Json | null
          institution_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          course_id?: string
          due_date?: string
          total_marks?: number
          rubric_id?: string | null
          clo_weights?: Json
          late_window_hours?: number
          prerequisites?: Json | null
          institution_id?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_rubric_id_fkey"
            columns: ["rubric_id"]
            isOneToOne: false
            referencedRelation: "rubrics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      submissions: {
        Row: {
          id: string
          assignment_id: string
          student_id: string
          file_url: string
          is_late: boolean
          status: string
          submitted_at: string | null
          institution_id: string
          created_at: string
        }
        Insert: {
          id?: string
          assignment_id: string
          student_id: string
          file_url: string
          is_late?: boolean
          status?: string
          submitted_at?: string | null
          institution_id: string
          created_at?: string
        }
        Update: {
          id?: string
          assignment_id?: string
          student_id?: string
          file_url?: string
          is_late?: boolean
          status?: string
          submitted_at?: string | null
          institution_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      grades: {
        Row: {
          id: string
          submission_id: string
          assignment_id: string | null
          rubric_selections: Json
          total_score: number
          score_percent: number
          overall_feedback: string | null
          graded_by: string
          graded_at: string | null
          institution_id: string
          created_at: string
        }
        Insert: {
          id?: string
          submission_id: string
          assignment_id?: string | null
          rubric_selections?: Json
          total_score: number
          score_percent: number
          overall_feedback?: string | null
          graded_by: string
          graded_at?: string | null
          institution_id?: string
          created_at?: string
        }
        Update: {
          id?: string
          submission_id?: string
          assignment_id?: string | null
          rubric_selections?: Json
          total_score?: number
          score_percent?: number
          overall_feedback?: string | null
          graded_by?: string
          graded_at?: string | null
          institution_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "grades_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_graded_by_fkey"
            columns: ["graded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rubrics: {
        Row: {
          id: string
          title: string
          clo_id: string
          is_template: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          clo_id: string
          is_template?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          clo_id?: string
          is_template?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rubrics_clo_id_fkey"
            columns: ["clo_id"]
            isOneToOne: false
            referencedRelation: "learning_outcomes"
            referencedColumns: ["id"]
          },
        ]
      }
      rubric_criteria: {
        Row: {
          id: string
          rubric_id: string
          criterion_name: string
          sort_order: number
          levels: Json
          max_points: number
          created_at: string
        }
        Insert: {
          id?: string
          rubric_id: string
          criterion_name: string
          sort_order?: number
          levels?: Json
          max_points: number
          created_at?: string
        }
        Update: {
          id?: string
          rubric_id?: string
          criterion_name?: string
          sort_order?: number
          levels?: Json
          max_points?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rubric_criteria_rubric_id_fkey"
            columns: ["rubric_id"]
            isOneToOne: false
            referencedRelation: "rubrics"
            referencedColumns: ["id"]
          },
        ]
      }
      student_courses: {
        Row: {
          id: string
          student_id: string
          course_id: string
          section_id: string | null
          enrolled_at: string
          status: string
          institution_id: string
          created_at: string
        }
        Insert: {
          id?: string
          student_id: string
          course_id: string
          section_id?: string | null
          enrolled_at?: string
          status?: string
          institution_id?: string
          created_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          course_id?: string
          section_id?: string | null
          enrolled_at?: string
          status?: string
          institution_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_courses_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_courses_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      student_gamification: {
        Row: {
          id: string
          student_id: string
          xp_total: number
          level: number
          streak_count: number
          last_login_date: string | null
          streak_freezes_available: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          student_id: string
          xp_total?: number
          level?: number
          streak_count?: number
          last_login_date?: string | null
          streak_freezes_available?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          xp_total?: number
          level?: number
          streak_count?: number
          last_login_date?: string | null
          streak_freezes_available?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_gamification_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      outcome_attainment: {
        Row: {
          id: string
          outcome_id: string
          student_id: string
          course_id: string | null
          scope: string
          attainment_percent: number
          sample_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          outcome_id: string
          student_id: string
          course_id?: string | null
          scope: string
          attainment_percent: number
          sample_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          outcome_id?: string
          student_id?: string
          course_id?: string | null
          scope?: string
          attainment_percent?: number
          sample_count?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "outcome_attainment_outcome_id_fkey"
            columns: ["outcome_id"]
            isOneToOne: false
            referencedRelation: "learning_outcomes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outcome_attainment_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outcome_attainment_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence: {
        Row: {
          id: string
          student_id: string
          clo_id: string
          assignment_id: string
          grade_id: string
          score_percent: number
          created_at: string
        }
        Insert: {
          id?: string
          student_id: string
          clo_id: string
          assignment_id: string
          grade_id: string
          score_percent: number
          created_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          clo_id?: string
          assignment_id?: string
          grade_id?: string
          score_percent?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evidence_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_clo_id_fkey"
            columns: ["clo_id"]
            isOneToOne: false
            referencedRelation: "learning_outcomes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_grade_id_fkey"
            columns: ["grade_id"]
            isOneToOne: false
            referencedRelation: "grades"
            referencedColumns: ["id"]
          },
        ]
      }
      xp_transactions: {
        Row: {
          id: string
          student_id: string
          source: string
          xp_amount: number
          multiplier: number
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          student_id: string
          source: string
          xp_amount: number
          multiplier?: number
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          source?: string
          xp_amount?: number
          multiplier?: number
          metadata?: Json | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "xp_transactions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bonus_xp_events: {
        Row: {
          id: string
          title: string
          multiplier: number
          start_date: string
          end_date: string
          starts_at: string
          ends_at: string
          is_active: boolean
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          multiplier: number
          start_date?: string
          end_date?: string
          starts_at?: string
          ends_at?: string
          is_active?: boolean
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          multiplier?: number
          start_date?: string
          end_date?: string
          starts_at?: string
          ends_at?: string
          is_active?: boolean
          created_by?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bonus_xp_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          id: string
          actor_id: string
          action: string
          target_type: string
          target_id: string
          entity_type: string | null
          entity_id: string | null
          performed_by: string | null
          diff: Json | null
          ip_address: string | null
          created_at: string
        }
        Insert: {
          id?: string
          actor_id: string
          action: string
          target_type: string
          target_id: string
          entity_type?: string | null
          entity_id?: string | null
          performed_by?: string | null
          diff?: Json | null
          ip_address?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          actor_id?: string
          action?: string
          target_type?: string
          target_id?: string
          entity_type?: string | null
          entity_id?: string | null
          performed_by?: string | null
          diff?: Json | null
          ip_address?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string
          body: string
          metadata: Json | null
          read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          title: string
          body: string
          metadata?: Json | null
          read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          title?: string
          body?: string
          metadata?: Json | null
          read?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_student_links: {
        Row: {
          id: string
          parent_id: string
          student_id: string
          relationship: string
          verified: boolean
          created_at: string
        }
        Insert: {
          id?: string
          parent_id: string
          student_id: string
          relationship: string
          verified?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          parent_id?: string
          student_id?: string
          relationship?: string
          verified?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_student_links_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_student_links_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_badges: {
        Row: {
          id: string
          student_id: string
          badge_id: string
          awarded_at: string
          created_at: string
        }
        Insert: {
          id?: string
          student_id: string
          badge_id: string
          awarded_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          badge_id?: string
          awarded_at?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_badges_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          id: string
          student_id: string
          content: string
          word_count: number
          created_at: string
        }
        Insert: {
          id?: string
          student_id: string
          content: string
          word_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          content?: string
          word_count?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      habit_logs: {
        Row: {
          id: string
          student_id: string
          date: string
          habit_type: string
          created_at: string
        }
        Insert: {
          id?: string
          student_id: string
          date: string
          habit_type: string
          created_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          date?: string
          habit_type?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "habit_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_activity_log: {
        Row: {
          id: string
          student_id: string
          event_type: string
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          student_id: string
          event_type: string
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          event_type?: string
          metadata?: Json | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_activity_log_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auth_user_role: {
        Args: Record<string, never>
        Returns: string
      }
      auth_institution_id: {
        Args: Record<string, never>
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
