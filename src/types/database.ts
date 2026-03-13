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
      academic_calendar_events: {
        Row: {
          created_at: string
          end_date: string
          event_type: string
          id: string
          institution_id: string
          is_recurring: boolean
          semester_id: string | null
          start_date: string
          title: string
        }
        Insert: {
          created_at?: string
          end_date: string
          event_type: string
          id?: string
          institution_id: string
          is_recurring?: boolean
          semester_id?: string | null
          start_date: string
          title: string
        }
        Update: {
          created_at?: string
          end_date?: string
          event_type?: string
          id?: string
          institution_id?: string
          is_recurring?: boolean
          semester_id?: string | null
          start_date?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "academic_calendar_events_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_calendar_events_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "semesters"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_feedback: {
        Row: {
          created_at: string
          feedback: string | null
          id: string
          student_id: string
          suggestion_data: Json | null
          suggestion_text: string
          suggestion_type: string
          validated_outcome: string | null
        }
        Insert: {
          created_at?: string
          feedback?: string | null
          id?: string
          student_id: string
          suggestion_data?: Json | null
          suggestion_text: string
          suggestion_type: string
          validated_outcome?: string | null
        }
        Update: {
          created_at?: string
          feedback?: string | null
          id?: string
          student_id?: string
          suggestion_data?: Json | null
          suggestion_text?: string
          suggestion_type?: string
          validated_outcome?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_feedback_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          author_id: string
          content: string
          course_id: string
          created_at: string
          id: string
          is_pinned: boolean
          search_vector: unknown
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          course_id: string
          created_at?: string
          id?: string
          is_pinned?: boolean
          search_vector?: unknown
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          course_id?: string
          created_at?: string
          id?: string
          is_pinned?: boolean
          search_vector?: unknown
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          clo_weights: Json
          course_id: string
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string
          id: string
          is_late_allowed: boolean
          late_window_hours: number
          prerequisites: Json | null
          search_vector: unknown
          title: string
          total_marks: number
          type: Database["public"]["Enums"]["assignment_type"]
        }
        Insert: {
          clo_weights?: Json
          course_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date: string
          id?: string
          is_late_allowed?: boolean
          late_window_hours?: number
          prerequisites?: Json | null
          search_vector?: unknown
          title: string
          total_marks: number
          type?: Database["public"]["Enums"]["assignment_type"]
        }
        Update: {
          clo_weights?: Json
          course_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string
          id?: string
          is_late_allowed?: boolean
          late_window_hours?: number
          prerequisites?: Json | null
          search_vector?: unknown
          title?: string
          total_marks?: number
          type?: Database["public"]["Enums"]["assignment_type"]
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
            foreignKeyName: "assignments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_records: {
        Row: {
          created_at: string
          id: string
          marked_by: string
          session_id: string
          status: string
          student_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          marked_by: string
          session_id: string
          status: string
          student_id: string
        }
        Update: {
          created_at?: string
          id?: string
          marked_by?: string
          session_id?: string
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_marked_by_fkey"
            columns: ["marked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "class_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          diff: Json | null
          id: string
          ip_address: unknown
          target_id: string | null
          target_type: string
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          diff?: Json | null
          id?: string
          ip_address?: unknown
          target_id?: string | null
          target_type: string
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          diff?: Json | null
          id?: string
          ip_address?: unknown
          target_id?: string | null
          target_type?: string
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
      badges: {
        Row: {
          awarded_at: string
          badge_key: string
          badge_name: string
          emoji: string
          id: string
          student_id: string
        }
        Insert: {
          awarded_at?: string
          badge_key: string
          badge_name: string
          emoji?: string
          id?: string
          student_id: string
        }
        Update: {
          awarded_at?: string
          badge_key?: string
          badge_name?: string
          emoji?: string
          id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "badges_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      baseline_attainment: {
        Row: {
          assessment_version: number
          clo_id: string
          correct_count: number
          course_id: string
          created_at: string
          id: string
          question_count: number
          score: number
          student_id: string
        }
        Insert: {
          assessment_version?: number
          clo_id: string
          correct_count: number
          course_id: string
          created_at?: string
          id?: string
          question_count: number
          score: number
          student_id: string
        }
        Update: {
          assessment_version?: number
          clo_id?: string
          correct_count?: number
          course_id?: string
          created_at?: string
          id?: string
          question_count?: number
          score?: number
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "baseline_attainment_clo_id_fkey"
            columns: ["clo_id"]
            isOneToOne: false
            referencedRelation: "learning_outcomes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "baseline_attainment_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "baseline_attainment_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      baseline_test_config: {
        Row: {
          course_id: string
          created_at: string
          id: string
          is_active: boolean
          min_questions_per_clo: number
          time_limit_minutes: number
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          min_questions_per_clo?: number
          time_limit_minutes?: number
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          min_questions_per_clo?: number
          time_limit_minutes?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "baseline_test_config_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: true
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      class_sessions: {
        Row: {
          created_at: string
          id: string
          section_id: string
          session_date: string
          session_type: string
          topic: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          section_id: string
          session_date: string
          session_type: string
          topic?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          section_id?: string
          session_date?: string
          session_type?: string
          topic?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "class_sessions_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "course_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      course_materials: {
        Row: {
          clo_ids: Json | null
          content_url: string | null
          created_at: string
          description: string | null
          file_path: string | null
          id: string
          is_published: boolean
          module_id: string
          search_vector: unknown
          sort_order: number
          title: string
          type: string
        }
        Insert: {
          clo_ids?: Json | null
          content_url?: string | null
          created_at?: string
          description?: string | null
          file_path?: string | null
          id?: string
          is_published?: boolean
          module_id: string
          search_vector?: unknown
          sort_order?: number
          title: string
          type: string
        }
        Update: {
          clo_ids?: Json | null
          content_url?: string | null
          created_at?: string
          description?: string | null
          file_path?: string | null
          id?: string
          is_published?: boolean
          module_id?: string
          search_vector?: unknown
          sort_order?: number
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_materials_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      course_modules: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          id: string
          is_published: boolean
          sort_order: number
          title: string
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          sort_order?: number
          title: string
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          sort_order?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_sections: {
        Row: {
          capacity: number
          course_id: string
          created_at: string
          id: string
          is_active: boolean
          section_code: string
          teacher_id: string
        }
        Insert: {
          capacity?: number
          course_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          section_code: string
          teacher_id: string
        }
        Update: {
          capacity?: number
          course_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          section_code?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_sections_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_sections_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          academic_year: string
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          program_id: string
          search_vector: unknown
          semester: string
          semester_id: string | null
          teacher_id: string | null
        }
        Insert: {
          academic_year: string
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          program_id: string
          search_vector?: unknown
          semester: string
          semester_id?: string | null
          teacher_id?: string | null
        }
        Update: {
          academic_year?: string
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          program_id?: string
          search_vector?: unknown
          semester?: string
          semester_id?: string | null
          teacher_id?: string | null
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
            foreignKeyName: "courses_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "semesters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cqi_action_plans: {
        Row: {
          action_description: string
          baseline_attainment: number
          created_at: string
          id: string
          outcome_id: string
          outcome_type: string
          program_id: string
          responsible_person: string
          result_attainment: number | null
          semester_id: string
          status: string
          target_attainment: number
          updated_at: string
        }
        Insert: {
          action_description: string
          baseline_attainment: number
          created_at?: string
          id?: string
          outcome_id: string
          outcome_type: string
          program_id: string
          responsible_person: string
          result_attainment?: number | null
          semester_id: string
          status?: string
          target_attainment: number
          updated_at?: string
        }
        Update: {
          action_description?: string
          baseline_attainment?: number
          created_at?: string
          id?: string
          outcome_id?: string
          outcome_type?: string
          program_id?: string
          responsible_person?: string
          result_attainment?: number | null
          semester_id?: string
          status?: string
          target_attainment?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cqi_action_plans_outcome_id_fkey"
            columns: ["outcome_id"]
            isOneToOne: false
            referencedRelation: "learning_outcomes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cqi_action_plans_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cqi_action_plans_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "semesters"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          code: string
          created_at: string
          head_of_department_id: string | null
          id: string
          institution_id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          head_of_department_id?: string | null
          id?: string
          institution_id: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          head_of_department_id?: string | null
          id?: string
          institution_id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_head_of_department_id_fkey"
            columns: ["head_of_department_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      discussion_replies: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          is_answer: boolean
          thread_id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          is_answer?: boolean
          thread_id: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          is_answer?: boolean
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discussion_replies_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussion_replies_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "discussion_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      discussion_threads: {
        Row: {
          author_id: string
          content: string
          course_id: string
          created_at: string
          id: string
          is_pinned: boolean
          is_resolved: boolean
          title: string
        }
        Insert: {
          author_id: string
          content: string
          course_id: string
          created_at?: string
          id?: string
          is_pinned?: boolean
          is_resolved?: boolean
          title: string
        }
        Update: {
          author_id?: string
          content?: string
          course_id?: string
          created_at?: string
          id?: string
          is_pinned?: boolean
          is_resolved?: boolean
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "discussion_threads_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussion_threads_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence: {
        Row: {
          attainment_level: Database["public"]["Enums"]["attainment_level"]
          clo_id: string
          created_at: string
          grade_id: string
          id: string
          ilo_id: string
          plo_id: string
          score_percent: number
          student_id: string
          submission_id: string
        }
        Insert: {
          attainment_level: Database["public"]["Enums"]["attainment_level"]
          clo_id: string
          created_at?: string
          grade_id: string
          id?: string
          ilo_id: string
          plo_id: string
          score_percent: number
          student_id: string
          submission_id: string
        }
        Update: {
          attainment_level?: Database["public"]["Enums"]["attainment_level"]
          clo_id?: string
          created_at?: string
          grade_id?: string
          id?: string
          ilo_id?: string
          plo_id?: string
          score_percent?: number
          student_id?: string
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "evidence_clo_id_fkey"
            columns: ["clo_id"]
            isOneToOne: false
            referencedRelation: "learning_outcomes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_grade_id_fkey"
            columns: ["grade_id"]
            isOneToOne: false
            referencedRelation: "grades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_ilo_id_fkey"
            columns: ["ilo_id"]
            isOneToOne: false
            referencedRelation: "learning_outcomes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_plo_id_fkey"
            columns: ["plo_id"]
            isOneToOne: false
            referencedRelation: "learning_outcomes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_payments: {
        Row: {
          amount_paid: number
          created_at: string
          fee_structure_id: string
          id: string
          payment_date: string
          payment_method: string | null
          receipt_number: string | null
          status: string
          student_id: string
        }
        Insert: {
          amount_paid: number
          created_at?: string
          fee_structure_id: string
          id?: string
          payment_date: string
          payment_method?: string | null
          receipt_number?: string | null
          status?: string
          student_id: string
        }
        Update: {
          amount_paid?: number
          created_at?: string
          fee_structure_id?: string
          id?: string
          payment_date?: string
          payment_method?: string | null
          receipt_number?: string | null
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_payments_fee_structure_id_fkey"
            columns: ["fee_structure_id"]
            isOneToOne: false
            referencedRelation: "fee_structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_structures: {
        Row: {
          amount: number
          created_at: string
          currency: string
          due_date: string
          fee_type: string
          id: string
          program_id: string
          semester_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          due_date: string
          fee_type: string
          id?: string
          program_id: string
          semester_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          due_date?: string
          fee_type?: string
          id?: string
          program_id?: string
          semester_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_structures_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_structures_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "semesters"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_suggestions: {
        Row: {
          cohort_completion_rate: number | null
          created_at: string
          difficulty: string
          goal_text: string
          id: string
          smart_achievable: string | null
          smart_measurable: string | null
          smart_relevant: string | null
          smart_specific: string | null
          smart_timebound: string | null
          status: string
          student_id: string
          week_start: string
        }
        Insert: {
          cohort_completion_rate?: number | null
          created_at?: string
          difficulty: string
          goal_text: string
          id?: string
          smart_achievable?: string | null
          smart_measurable?: string | null
          smart_relevant?: string | null
          smart_specific?: string | null
          smart_timebound?: string | null
          status?: string
          student_id: string
          week_start: string
        }
        Update: {
          cohort_completion_rate?: number | null
          created_at?: string
          difficulty?: string
          goal_text?: string
          id?: string
          smart_achievable?: string | null
          smart_measurable?: string | null
          smart_relevant?: string | null
          smart_specific?: string | null
          smart_timebound?: string | null
          status?: string
          student_id?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_suggestions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      grade_categories: {
        Row: {
          course_id: string
          created_at: string
          id: string
          name: string
          sort_order: number
          weight_percent: number
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          weight_percent: number
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          weight_percent?: number
        }
        Relationships: [
          {
            foreignKeyName: "grade_categories_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      grades: {
        Row: {
          graded_at: string
          graded_by: string
          id: string
          overall_feedback: string | null
          rubric_selections: Json
          score_percent: number
          submission_id: string
          total_score: number
        }
        Insert: {
          graded_at?: string
          graded_by: string
          id?: string
          overall_feedback?: string | null
          rubric_selections?: Json
          score_percent: number
          submission_id: string
          total_score: number
        }
        Update: {
          graded_at?: string
          graded_by?: string
          id?: string
          overall_feedback?: string | null
          rubric_selections?: Json
          score_percent?: number
          submission_id?: string
          total_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "grades_graded_by_fkey"
            columns: ["graded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: true
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      habit_tracking: {
        Row: {
          created_at: string
          habit_date: string
          id: string
          is_perfect_day: boolean
          journal: boolean
          login: boolean
          read_content: boolean
          student_id: string
          submit: boolean
        }
        Insert: {
          created_at?: string
          habit_date: string
          id?: string
          is_perfect_day?: boolean
          journal?: boolean
          login?: boolean
          read_content?: boolean
          student_id: string
          submit?: boolean
        }
        Update: {
          created_at?: string
          habit_date?: string
          id?: string
          is_perfect_day?: boolean
          journal?: boolean
          login?: boolean
          read_content?: boolean
          student_id?: string
          submit?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "habit_tracking_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      institution_settings: {
        Row: {
          accreditation_body: string
          attainment_thresholds: Json
          created_at: string
          grade_scales: Json
          id: string
          institution_id: string
          success_threshold: number
        }
        Insert: {
          accreditation_body?: string
          attainment_thresholds?: Json
          created_at?: string
          grade_scales?: Json
          id?: string
          institution_id: string
          success_threshold?: number
        }
        Update: {
          accreditation_body?: string
          attainment_thresholds?: Json
          created_at?: string
          grade_scales?: Json
          id?: string
          institution_id?: string
          success_threshold?: number
        }
        Relationships: [
          {
            foreignKeyName: "institution_settings_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: true
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      institutions: {
        Row: {
          accreditation_body: string | null
          created_at: string
          id: string
          logo_url: string | null
          name: string
          settings: Json
        }
        Insert: {
          accreditation_body?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          settings?: Json
        }
        Update: {
          accreditation_body?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          settings?: Json
        }
        Relationships: []
      }
      journal_entries: {
        Row: {
          clo_id: string | null
          content: string
          course_id: string
          created_at: string
          id: string
          is_shared: boolean
          student_id: string
        }
        Insert: {
          clo_id?: string | null
          content: string
          course_id: string
          created_at?: string
          id?: string
          is_shared?: boolean
          student_id: string
        }
        Update: {
          clo_id?: string | null
          content?: string
          course_id?: string
          created_at?: string
          id?: string
          is_shared?: boolean
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_clo_id_fkey"
            columns: ["clo_id"]
            isOneToOne: false
            referencedRelation: "learning_outcomes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_outcomes: {
        Row: {
          blooms_level: Database["public"]["Enums"]["blooms_level"] | null
          course_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          institution_id: string
          program_id: string | null
          sort_order: number
          title: string
          type: Database["public"]["Enums"]["outcome_type"]
          updated_at: string
        }
        Insert: {
          blooms_level?: Database["public"]["Enums"]["blooms_level"] | null
          course_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          institution_id: string
          program_id?: string | null
          sort_order?: number
          title: string
          type: Database["public"]["Enums"]["outcome_type"]
          updated_at?: string
        }
        Update: {
          blooms_level?: Database["public"]["Enums"]["blooms_level"] | null
          course_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          institution_id?: string
          program_id?: string | null
          sort_order?: number
          title?: string
          type?: Database["public"]["Enums"]["outcome_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_outcomes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_outcomes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
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
        ]
      }
      learning_path_nodes: {
        Row: {
          assignment_id: string
          course_id: string
          created_at: string
          id: string
          prerequisite_node_id: string | null
          sort_order: number
          unlock_threshold: number
        }
        Insert: {
          assignment_id: string
          course_id: string
          created_at?: string
          id?: string
          prerequisite_node_id?: string | null
          sort_order?: number
          unlock_threshold?: number
        }
        Update: {
          assignment_id?: string
          course_id?: string
          created_at?: string
          id?: string
          prerequisite_node_id?: string | null
          sort_order?: number
          unlock_threshold?: number
        }
        Relationships: [
          {
            foreignKeyName: "learning_path_nodes_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_path_nodes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_path_nodes_prerequisite_node_id_fkey"
            columns: ["prerequisite_node_id"]
            isOneToOne: false
            referencedRelation: "learning_path_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      micro_assessment_schedule: {
        Row: {
          assessment_type: string
          completed_at: string | null
          created_at: string
          dismissal_count: number
          id: string
          question_ids: string[]
          scheduled_at: string
          scheduled_day: number
          status: string
          student_id: string
        }
        Insert: {
          assessment_type: string
          completed_at?: string | null
          created_at?: string
          dismissal_count?: number
          id?: string
          question_ids?: string[]
          scheduled_at: string
          scheduled_day: number
          status?: string
          student_id: string
        }
        Update: {
          assessment_type?: string
          completed_at?: string | null
          created_at?: string
          dismissal_count?: number
          id?: string
          question_ids?: string[]
          scheduled_at?: string
          scheduled_day?: number
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "micro_assessment_schedule_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          metadata: Json | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          metadata?: Json | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          metadata?: Json | null
          title?: string
          type?: string
          user_id?: string
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
      onboarding_progress: {
        Row: {
          assessment_version: number
          baseline_completed: boolean
          baseline_course_ids: string[] | null
          created_at: string
          current_step: string
          day1_completed: boolean
          id: string
          learning_style_completed: boolean
          micro_assessment_day: number
          micro_assessment_dismissals: number
          personality_completed: boolean
          profile_completeness: number
          self_efficacy_completed: boolean
          skipped_sections: string[] | null
          student_id: string
          study_strategy_completed: boolean
          updated_at: string
        }
        Insert: {
          assessment_version?: number
          baseline_completed?: boolean
          baseline_course_ids?: string[] | null
          created_at?: string
          current_step?: string
          day1_completed?: boolean
          id?: string
          learning_style_completed?: boolean
          micro_assessment_day?: number
          micro_assessment_dismissals?: number
          personality_completed?: boolean
          profile_completeness?: number
          self_efficacy_completed?: boolean
          skipped_sections?: string[] | null
          student_id: string
          study_strategy_completed?: boolean
          updated_at?: string
        }
        Update: {
          assessment_version?: number
          baseline_completed?: boolean
          baseline_course_ids?: string[] | null
          created_at?: string
          current_step?: string
          day1_completed?: boolean
          id?: string
          learning_style_completed?: boolean
          micro_assessment_day?: number
          micro_assessment_dismissals?: number
          personality_completed?: boolean
          profile_completeness?: number
          self_efficacy_completed?: boolean
          skipped_sections?: string[] | null
          student_id?: string
          study_strategy_completed?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_progress_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_questions: {
        Row: {
          assessment_type: string
          clo_id: string | null
          correct_option: number | null
          course_id: string | null
          created_at: string
          difficulty_level: string | null
          dimension: string | null
          id: string
          institution_id: string
          is_active: boolean
          options: Json | null
          question_text: string
          sort_order: number
          updated_at: string
          weight: number | null
        }
        Insert: {
          assessment_type: string
          clo_id?: string | null
          correct_option?: number | null
          course_id?: string | null
          created_at?: string
          difficulty_level?: string | null
          dimension?: string | null
          id?: string
          institution_id: string
          is_active?: boolean
          options?: Json | null
          question_text: string
          sort_order?: number
          updated_at?: string
          weight?: number | null
        }
        Update: {
          assessment_type?: string
          clo_id?: string | null
          correct_option?: number | null
          course_id?: string | null
          created_at?: string
          difficulty_level?: string | null
          dimension?: string | null
          id?: string
          institution_id?: string
          is_active?: boolean
          options?: Json | null
          question_text?: string
          sort_order?: number
          updated_at?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_questions_clo_id_fkey"
            columns: ["clo_id"]
            isOneToOne: false
            referencedRelation: "learning_outcomes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_questions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_questions_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_responses: {
        Row: {
          assessment_version: number
          created_at: string
          id: string
          question_id: string
          score_contribution: number | null
          selected_option: number
          student_id: string
        }
        Insert: {
          assessment_version?: number
          created_at?: string
          id?: string
          question_id: string
          score_contribution?: number | null
          selected_option: number
          student_id: string
        }
        Update: {
          assessment_version?: number
          created_at?: string
          id?: string
          question_id?: string
          score_contribution?: number | null
          selected_option?: number
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "onboarding_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "onboarding_responses_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      outcome_attainment: {
        Row: {
          attainment_percent: number
          course_id: string | null
          id: string
          last_calculated_at: string
          outcome_id: string
          sample_count: number
          scope: Database["public"]["Enums"]["attainment_scope"]
          student_id: string | null
        }
        Insert: {
          attainment_percent?: number
          course_id?: string | null
          id?: string
          last_calculated_at?: string
          outcome_id: string
          sample_count?: number
          scope: Database["public"]["Enums"]["attainment_scope"]
          student_id?: string | null
        }
        Update: {
          attainment_percent?: number
          course_id?: string | null
          id?: string
          last_calculated_at?: string
          outcome_id?: string
          sample_count?: number
          scope?: Database["public"]["Enums"]["attainment_scope"]
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "outcome_attainment_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
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
        ]
      }
      outcome_mappings: {
        Row: {
          created_at: string
          id: string
          source_outcome_id: string
          target_outcome_id: string
          weight: number
        }
        Insert: {
          created_at?: string
          id?: string
          source_outcome_id: string
          target_outcome_id: string
          weight?: number
        }
        Update: {
          created_at?: string
          id?: string
          source_outcome_id?: string
          target_outcome_id?: string
          weight?: number
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
      parent_student_links: {
        Row: {
          created_at: string
          id: string
          parent_id: string
          relationship: string
          student_id: string
          verified: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          parent_id: string
          relationship: string
          student_id: string
          verified?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          parent_id?: string
          relationship?: string
          student_id?: string
          verified?: boolean
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
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          institution_id: string
          is_active: boolean
          language_preference: string
          last_seen_at: string | null
          notification_preferences: Json
          onboarding_completed: boolean
          portfolio_public: boolean
          role: Database["public"]["Enums"]["user_role"]
          search_vector: unknown
          theme_preference: string
          tos_accepted_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name: string
          id: string
          institution_id: string
          is_active?: boolean
          language_preference?: string
          last_seen_at?: string | null
          notification_preferences?: Json
          onboarding_completed?: boolean
          portfolio_public?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          search_vector?: unknown
          theme_preference?: string
          tos_accepted_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          institution_id?: string
          is_active?: boolean
          language_preference?: string
          last_seen_at?: string | null
          notification_preferences?: Json
          onboarding_completed?: boolean
          portfolio_public?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          search_vector?: unknown
          theme_preference?: string
          tos_accepted_at?: string | null
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
      program_accreditations: {
        Row: {
          accreditation_body: string
          accreditation_date: string | null
          created_at: string
          framework_version: string | null
          id: string
          next_review_date: string | null
          program_id: string
          status: string
        }
        Insert: {
          accreditation_body: string
          accreditation_date?: string | null
          created_at?: string
          framework_version?: string | null
          id?: string
          next_review_date?: string | null
          program_id: string
          status?: string
        }
        Update: {
          accreditation_body?: string
          accreditation_date?: string | null
          created_at?: string
          framework_version?: string | null
          id?: string
          next_review_date?: string | null
          program_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_accreditations_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          code: string
          coordinator_id: string | null
          created_at: string
          department_id: string | null
          description: string | null
          id: string
          institution_id: string
          is_active: boolean
          name: string
        }
        Insert: {
          code: string
          coordinator_id?: string | null
          created_at?: string
          department_id?: string | null
          description?: string | null
          id?: string
          institution_id: string
          is_active?: boolean
          name: string
        }
        Update: {
          code?: string
          coordinator_id?: string | null
          created_at?: string
          department_id?: string | null
          description?: string | null
          id?: string
          institution_id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "programs_coordinator_id_fkey"
            columns: ["coordinator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programs_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programs_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_attempts: {
        Row: {
          answers: Json
          attempt_number: number
          id: string
          quiz_id: string
          score: number | null
          started_at: string
          student_id: string
          submitted_at: string | null
        }
        Insert: {
          answers?: Json
          attempt_number?: number
          id?: string
          quiz_id: string
          score?: number | null
          started_at?: string
          student_id: string
          submitted_at?: string | null
        }
        Update: {
          answers?: Json
          attempt_number?: number
          id?: string
          quiz_id?: string
          score?: number | null
          started_at?: string
          student_id?: string
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          correct_answer: Json
          id: string
          options: Json | null
          points: number
          question_text: string
          question_type: string
          quiz_id: string
          sort_order: number
        }
        Insert: {
          correct_answer: Json
          id?: string
          options?: Json | null
          points?: number
          question_text: string
          question_type: string
          quiz_id: string
          sort_order?: number
        }
        Update: {
          correct_answer?: Json
          id?: string
          options?: Json | null
          points?: number
          question_text?: string
          question_type?: string
          quiz_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          clo_ids: Json
          course_id: string
          created_at: string
          description: string | null
          due_date: string
          id: string
          is_published: boolean
          max_attempts: number
          time_limit_minutes: number | null
          title: string
        }
        Insert: {
          clo_ids?: Json
          course_id: string
          created_at?: string
          description?: string | null
          due_date: string
          id?: string
          is_published?: boolean
          max_attempts?: number
          time_limit_minutes?: number | null
          title: string
        }
        Update: {
          clo_ids?: Json
          course_id?: string
          created_at?: string
          description?: string | null
          due_date?: string
          id?: string
          is_published?: boolean
          max_attempts?: number
          time_limit_minutes?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      rubric_criteria: {
        Row: {
          criterion_name: string
          id: string
          levels: Json
          max_points: number
          rubric_id: string
          sort_order: number
        }
        Insert: {
          criterion_name: string
          id?: string
          levels?: Json
          max_points: number
          rubric_id: string
          sort_order?: number
        }
        Update: {
          criterion_name?: string
          id?: string
          levels?: Json
          max_points?: number
          rubric_id?: string
          sort_order?: number
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
      rubrics: {
        Row: {
          clo_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_template: boolean
          title: string
        }
        Insert: {
          clo_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_template?: boolean
          title: string
        }
        Update: {
          clo_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_template?: boolean
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "rubrics_clo_id_fkey"
            columns: ["clo_id"]
            isOneToOne: false
            referencedRelation: "learning_outcomes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rubrics_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      semesters: {
        Row: {
          code: string
          created_at: string
          end_date: string
          id: string
          institution_id: string
          is_active: boolean
          name: string
          start_date: string
        }
        Insert: {
          code: string
          created_at?: string
          end_date: string
          id?: string
          institution_id: string
          is_active?: boolean
          name: string
          start_date: string
        }
        Update: {
          code?: string
          created_at?: string
          end_date?: string
          id?: string
          institution_id?: string
          is_active?: boolean
          name?: string
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "semesters_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      starter_week_sessions: {
        Row: {
          course_id: string | null
          created_at: string
          description: string
          duration_minutes: number
          id: string
          planner_entry_id: string | null
          session_type: string
          status: string
          student_id: string
          suggested_date: string
          suggested_time_slot: string
          updated_at: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          description: string
          duration_minutes: number
          id?: string
          planner_entry_id?: string | null
          session_type: string
          status?: string
          student_id: string
          suggested_date: string
          suggested_time_slot: string
          updated_at?: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          description?: string
          duration_minutes?: number
          id?: string
          planner_entry_id?: string | null
          session_type?: string
          status?: string
          student_id?: string
          suggested_date?: string
          suggested_time_slot?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "starter_week_sessions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "starter_week_sessions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_activity_log: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          student_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          student_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          student_id?: string
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
      student_courses: {
        Row: {
          course_id: string
          enrolled_at: string
          id: string
          section_id: string | null
          status: string
          student_id: string
        }
        Insert: {
          course_id: string
          enrolled_at?: string
          id?: string
          section_id?: string | null
          status?: string
          student_id: string
        }
        Update: {
          course_id?: string
          enrolled_at?: string
          id?: string
          section_id?: string | null
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_courses_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "course_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_courses_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_gamification: {
        Row: {
          id: string
          last_login_date: string | null
          leaderboard_anonymous: boolean
          level: number
          streak_current: number
          streak_freezes_available: number
          streak_longest: number
          student_id: string
          updated_at: string
          xp_total: number
        }
        Insert: {
          id?: string
          last_login_date?: string | null
          leaderboard_anonymous?: boolean
          level?: number
          streak_current?: number
          streak_freezes_available?: number
          streak_longest?: number
          student_id: string
          updated_at?: string
          xp_total?: number
        }
        Update: {
          id?: string
          last_login_date?: string | null
          leaderboard_anonymous?: boolean
          level?: number
          streak_current?: number
          streak_freezes_available?: number
          streak_longest?: number
          student_id?: string
          updated_at?: string
          xp_total?: number
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
      student_profiles: {
        Row: {
          assessment_version: number
          completed_at: string
          created_at: string
          id: string
          institution_id: string
          learning_style: Json | null
          personality_traits: Json | null
          profile_completeness: number
          self_efficacy: Json | null
          student_id: string
          study_strategies: Json | null
        }
        Insert: {
          assessment_version?: number
          completed_at?: string
          created_at?: string
          id?: string
          institution_id: string
          learning_style?: Json | null
          personality_traits?: Json | null
          profile_completeness?: number
          self_efficacy?: Json | null
          student_id: string
          study_strategies?: Json | null
        }
        Update: {
          assessment_version?: number
          completed_at?: string
          created_at?: string
          id?: string
          institution_id?: string
          learning_style?: Json | null
          personality_traits?: Json | null
          profile_completeness?: number
          self_efficacy?: Json | null
          student_id?: string
          study_strategies?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "student_profiles_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_profiles_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      submissions: {
        Row: {
          assignment_id: string
          file_url: string | null
          id: string
          is_late: boolean
          plagiarism_score: number | null
          status: Database["public"]["Enums"]["submission_status"]
          student_id: string
          submitted_at: string
          text_content: string | null
        }
        Insert: {
          assignment_id: string
          file_url?: string | null
          id?: string
          is_late?: boolean
          plagiarism_score?: number | null
          status?: Database["public"]["Enums"]["submission_status"]
          student_id: string
          submitted_at?: string
          text_content?: string | null
        }
        Update: {
          assignment_id?: string
          file_url?: string | null
          id?: string
          is_late?: boolean
          plagiarism_score?: number | null
          status?: Database["public"]["Enums"]["submission_status"]
          student_id?: string
          submitted_at?: string
          text_content?: string | null
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
        ]
      }
      survey_questions: {
        Row: {
          id: string
          options: Json | null
          question_text: string
          question_type: string
          sort_order: number
          survey_id: string
        }
        Insert: {
          id?: string
          options?: Json | null
          question_text: string
          question_type: string
          sort_order?: number
          survey_id: string
        }
        Update: {
          id?: string
          options?: Json | null
          question_text?: string
          question_type?: string
          sort_order?: number
          survey_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_questions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_responses: {
        Row: {
          created_at: string
          id: string
          question_id: string
          respondent_id: string
          response_value: string
          survey_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          question_id: string
          respondent_id: string
          response_value: string
          survey_id: string
        }
        Update: {
          created_at?: string
          id?: string
          question_id?: string
          respondent_id?: string
          response_value?: string
          survey_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "survey_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_responses_respondent_id_fkey"
            columns: ["respondent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      surveys: {
        Row: {
          created_at: string
          id: string
          institution_id: string
          is_active: boolean
          target_outcomes: Json
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          institution_id: string
          is_active?: boolean
          target_outcomes?: Json
          title: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          institution_id?: string
          is_active?: boolean
          target_outcomes?: Json
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "surveys_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      timetable_slots: {
        Row: {
          day_of_week: number
          end_time: string
          id: string
          room: string | null
          section_id: string
          slot_type: string
          start_time: string
        }
        Insert: {
          day_of_week: number
          end_time: string
          id?: string
          room?: string | null
          section_id: string
          slot_type: string
          start_time: string
        }
        Update: {
          day_of_week?: number
          end_time?: string
          id?: string
          room?: string | null
          section_id?: string
          slot_type?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "timetable_slots_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "course_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      xp_events: {
        Row: {
          bonus_xp: number
          created_at: string
          description: string | null
          ends_at: string | null
          event_type: string
          id: string
          institution_id: string | null
          is_active: boolean
          name: string
          starts_at: string | null
          xp_multiplier: number
        }
        Insert: {
          bonus_xp?: number
          created_at?: string
          description?: string | null
          ends_at?: string | null
          event_type: string
          id?: string
          institution_id?: string | null
          is_active?: boolean
          name: string
          starts_at?: string | null
          xp_multiplier?: number
        }
        Update: {
          bonus_xp?: number
          created_at?: string
          description?: string | null
          ends_at?: string | null
          event_type?: string
          id?: string
          institution_id?: string | null
          is_active?: boolean
          name?: string
          starts_at?: string | null
          xp_multiplier?: number
        }
        Relationships: [
          {
            foreignKeyName: "xp_events_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      xp_transactions: {
        Row: {
          created_at: string
          id: string
          note: string | null
          reference_id: string | null
          source: string
          student_id: string
          xp_amount: number
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          reference_id?: string | null
          source: string
          student_id: string
          xp_amount: number
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          reference_id?: string | null
          source?: string
          student_id?: string
          xp_amount?: number
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
    }
    Views: {
      leaderboard_weekly: {
        Row: {
          full_name: string | null
          global_rank: number | null
          institution_id: string | null
          level: number | null
          streak_current: number | null
          student_id: string | null
          xp_total: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_gamification_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      auth_institution_id: { Args: never; Returns: string }
      auth_user_role: { Args: never; Returns: string }
    }
    Enums: {
      assignment_type: "assignment" | "quiz" | "project" | "exam"
      attainment_level: "excellent" | "satisfactory" | "developing" | "not_yet"
      attainment_scope: "student_course" | "course" | "program" | "institution"
      blooms_level:
        | "remembering"
        | "understanding"
        | "applying"
        | "analyzing"
        | "evaluating"
        | "creating"
      outcome_type: "ILO" | "PLO" | "CLO"
      submission_status: "submitted" | "graded"
      user_role: "admin" | "coordinator" | "teacher" | "student" | "parent"
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
    Enums: {
      assignment_type: ["assignment", "quiz", "project", "exam"],
      attainment_level: ["excellent", "satisfactory", "developing", "not_yet"],
      attainment_scope: ["student_course", "course", "program", "institution"],
      blooms_level: [
        "remembering",
        "understanding",
        "applying",
        "analyzing",
        "evaluating",
        "creating",
      ],
      outcome_type: ["ILO", "PLO", "CLO"],
      submission_status: ["submitted", "graded"],
      user_role: ["admin", "coordinator", "teacher", "student", "parent"],
    },
  },
} as const
