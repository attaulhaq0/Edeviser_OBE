export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4";
  };
  public: {
    Tables: {
      academic_calendar_events: {
        Row: {
          created_at: string;
          end_date: string;
          event_type: string;
          id: string;
          institution_id: string;
          is_recurring: boolean;
          semester_id: string | null;
          start_date: string;
          title: string;
        };
        Insert: {
          created_at?: string;
          end_date: string;
          event_type: string;
          id?: string;
          institution_id: string;
          is_recurring?: boolean;
          semester_id?: string | null;
          start_date: string;
          title: string;
        };
        Update: {
          created_at?: string;
          end_date?: string;
          event_type?: string;
          id?: string;
          institution_id?: string;
          is_recurring?: boolean;
          semester_id?: string | null;
          start_date?: string;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "academic_calendar_events_institution_id_fkey";
            columns: ["institution_id"];
            isOneToOne: false;
            referencedRelation: "institutions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "academic_calendar_events_semester_id_fkey";
            columns: ["semester_id"];
            isOneToOne: false;
            referencedRelation: "semesters";
            referencedColumns: ["id"];
          }
        ];
      };
      ai_feedback: {
        Row: {
          created_at: string;
          feedback: string | null;
          id: string;
          student_id: string;
          suggestion_data: Json | null;
          suggestion_text: string;
          suggestion_type: string;
          validated_outcome: string | null;
        };
        Insert: {
          created_at?: string;
          feedback?: string | null;
          id?: string;
          student_id: string;
          suggestion_data?: Json | null;
          suggestion_text: string;
          suggestion_type: string;
          validated_outcome?: string | null;
        };
        Update: {
          created_at?: string;
          feedback?: string | null;
          id?: string;
          student_id?: string;
          suggestion_data?: Json | null;
          suggestion_text?: string;
          suggestion_type?: string;
          validated_outcome?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "ai_feedback_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      announcements: {
        Row: {
          author_id: string;
          content: string;
          course_id: string;
          created_at: string;
          id: string;
          is_pinned: boolean;
          search_vector: unknown;
          title: string;
          updated_at: string;
        };
        Insert: {
          author_id: string;
          content: string;
          course_id: string;
          created_at?: string;
          id?: string;
          is_pinned?: boolean;
          search_vector?: unknown;
          title: string;
          updated_at?: string;
        };
        Update: {
          author_id?: string;
          content?: string;
          course_id?: string;
          created_at?: string;
          id?: string;
          is_pinned?: boolean;
          search_vector?: unknown;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "announcements_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "announcements_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          }
        ];
      };
      assignments: {
        Row: {
          clo_weights: Json;
          course_id: string;
          created_at: string;
          created_by: string | null;
          description: string | null;
          due_date: string;
          id: string;
          is_late_allowed: boolean;
          late_window_hours: number;
          prerequisites: Json | null;
          search_vector: unknown;
          title: string;
          total_marks: number;
          tutor_autonomy_level: string | null;
          type: Database["public"]["Enums"]["assignment_type"];
        };
        Insert: {
          clo_weights?: Json;
          course_id: string;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          due_date: string;
          id?: string;
          is_late_allowed?: boolean;
          late_window_hours?: number;
          prerequisites?: Json | null;
          search_vector?: unknown;
          title: string;
          total_marks: number;
          tutor_autonomy_level?: string | null;
          type?: Database["public"]["Enums"]["assignment_type"];
        };
        Update: {
          clo_weights?: Json;
          course_id?: string;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          due_date?: string;
          id?: string;
          is_late_allowed?: boolean;
          late_window_hours?: number;
          prerequisites?: Json | null;
          search_vector?: unknown;
          title?: string;
          total_marks?: number;
          tutor_autonomy_level?: string | null;
          type?: Database["public"]["Enums"]["assignment_type"];
        };
        Relationships: [
          {
            foreignKeyName: "assignments_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "assignments_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      attendance_records: {
        Row: {
          created_at: string;
          id: string;
          marked_by: string;
          session_id: string;
          status: string;
          student_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          marked_by: string;
          session_id: string;
          status: string;
          student_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          marked_by?: string;
          session_id?: string;
          status?: string;
          student_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "attendance_records_marked_by_fkey";
            columns: ["marked_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attendance_records_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "class_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "attendance_records_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      audit_findings: {
        Row: {
          audit_run_id: string;
          created_at: string;
          detail: Json | null;
          id: string;
          location_file: string | null;
          location_line: number | null;
          message: string;
          requirement_id: string;
          severity: string;
          stage: string | null;
        };
        Insert: {
          audit_run_id: string;
          created_at?: string;
          detail?: Json | null;
          id?: string;
          location_file?: string | null;
          location_line?: number | null;
          message: string;
          requirement_id: string;
          severity: string;
          stage?: string | null;
        };
        Update: {
          audit_run_id?: string;
          created_at?: string;
          detail?: Json | null;
          id?: string;
          location_file?: string | null;
          location_line?: number | null;
          message?: string;
          requirement_id?: string;
          severity?: string;
          stage?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "audit_findings_audit_run_id_fkey";
            columns: ["audit_run_id"];
            isOneToOne: false;
            referencedRelation: "audit_runs";
            referencedColumns: ["id"];
          }
        ];
      };
      audit_logs: {
        Row: {
          action: string;
          actor_id: string;
          created_at: string;
          diff: Json | null;
          id: string;
          ip_address: unknown;
          target_id: string | null;
          target_type: string;
        };
        Insert: {
          action: string;
          actor_id: string;
          created_at?: string;
          diff?: Json | null;
          id?: string;
          ip_address?: unknown;
          target_id?: string | null;
          target_type: string;
        };
        Update: {
          action?: string;
          actor_id?: string;
          created_at?: string;
          diff?: Json | null;
          id?: string;
          ip_address?: unknown;
          target_id?: string | null;
          target_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      audit_runs: {
        Row: {
          blocker_count: number;
          commit_sha: string | null;
          created_at: string;
          critical_count: number;
          env_id: string;
          finished_at: string | null;
          id: string;
          major_count: number;
          migration_head: string | null;
          minor_count: number;
          run_id: string;
          started_at: string;
          trivial_count: number;
          verdict: string;
        };
        Insert: {
          blocker_count?: number;
          commit_sha?: string | null;
          created_at?: string;
          critical_count?: number;
          env_id: string;
          finished_at?: string | null;
          id?: string;
          major_count?: number;
          migration_head?: string | null;
          minor_count?: number;
          run_id: string;
          started_at?: string;
          trivial_count?: number;
          verdict: string;
        };
        Update: {
          blocker_count?: number;
          commit_sha?: string | null;
          created_at?: string;
          critical_count?: number;
          env_id?: string;
          finished_at?: string | null;
          id?: string;
          major_count?: number;
          migration_head?: string | null;
          minor_count?: number;
          run_id?: string;
          started_at?: string;
          trivial_count?: number;
          verdict?: string;
        };
        Relationships: [];
      };
      badge_definitions: {
        Row: {
          badge_key: string;
          category: string | null;
          created_at: string;
          description: string;
          emoji: string;
          id: string;
          institution_id: string;
          is_archived: boolean;
          name: string;
          tier_conditions: Json | null;
          updated_at: string;
        };
        Insert: {
          badge_key: string;
          category?: string | null;
          created_at?: string;
          description?: string;
          emoji?: string;
          id?: string;
          institution_id: string;
          is_archived?: boolean;
          name: string;
          tier_conditions?: Json | null;
          updated_at?: string;
        };
        Update: {
          badge_key?: string;
          category?: string | null;
          created_at?: string;
          description?: string;
          emoji?: string;
          id?: string;
          institution_id?: string;
          is_archived?: boolean;
          name?: string;
          tier_conditions?: Json | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "badge_definitions_institution_id_fkey";
            columns: ["institution_id"];
            isOneToOne: false;
            referencedRelation: "institutions";
            referencedColumns: ["id"];
          }
        ];
      };
      badge_spotlight_schedule: {
        Row: {
          category: string;
          created_at: string;
          id: string;
          institution_id: string;
          is_manual: boolean;
          week_start: string;
        };
        Insert: {
          category: string;
          created_at?: string;
          id?: string;
          institution_id: string;
          is_manual?: boolean;
          week_start: string;
        };
        Update: {
          category?: string;
          created_at?: string;
          id?: string;
          institution_id?: string;
          is_manual?: boolean;
          week_start?: string;
        };
        Relationships: [
          {
            foreignKeyName: "badge_spotlight_schedule_institution_id_fkey";
            columns: ["institution_id"];
            isOneToOne: false;
            referencedRelation: "institutions";
            referencedColumns: ["id"];
          }
        ];
      };
      badges: {
        Row: {
          archived_at: string | null;
          awarded_at: string;
          badge_key: string;
          badge_name: string;
          category: string | null;
          emoji: string;
          id: string;
          is_pinned: boolean;
          scope: string;
          student_id: string;
          team_id: string | null;
          tier: string;
        };
        Insert: {
          archived_at?: string | null;
          awarded_at?: string;
          badge_key: string;
          badge_name: string;
          category?: string | null;
          emoji?: string;
          id?: string;
          is_pinned?: boolean;
          scope?: string;
          student_id: string;
          team_id?: string | null;
          tier?: string;
        };
        Update: {
          archived_at?: string | null;
          awarded_at?: string;
          badge_key?: string;
          badge_name?: string;
          category?: string | null;
          emoji?: string;
          id?: string;
          is_pinned?: boolean;
          scope?: string;
          student_id?: string;
          team_id?: string | null;
          tier?: string;
        };
        Relationships: [
          {
            foreignKeyName: "badges_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "badges_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          }
        ];
      };
      baseline_attainment: {
        Row: {
          assessment_version: number;
          clo_id: string;
          correct_count: number;
          course_id: string;
          created_at: string;
          id: string;
          question_count: number;
          score: number;
          student_id: string;
        };
        Insert: {
          assessment_version?: number;
          clo_id: string;
          correct_count: number;
          course_id: string;
          created_at?: string;
          id?: string;
          question_count: number;
          score: number;
          student_id: string;
        };
        Update: {
          assessment_version?: number;
          clo_id?: string;
          correct_count?: number;
          course_id?: string;
          created_at?: string;
          id?: string;
          question_count?: number;
          score?: number;
          student_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "baseline_attainment_clo_id_fkey";
            columns: ["clo_id"];
            isOneToOne: false;
            referencedRelation: "learning_outcomes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "baseline_attainment_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "baseline_attainment_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      baseline_test_config: {
        Row: {
          course_id: string;
          created_at: string;
          id: string;
          is_active: boolean;
          min_questions_per_clo: number;
          time_limit_minutes: number;
          updated_at: string;
        };
        Insert: {
          course_id: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          min_questions_per_clo?: number;
          time_limit_minutes?: number;
          updated_at?: string;
        };
        Update: {
          course_id?: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          min_questions_per_clo?: number;
          time_limit_minutes?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "baseline_test_config_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: true;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          }
        ];
      };
      blooms_progression: {
        Row: {
          bloom_challenger_awarded: boolean;
          bloom_explorer_awarded: boolean;
          bloom_pioneer_awarded: boolean;
          clo_id: string;
          correct_count_at_highest: number;
          course_id: string;
          highest_bloom_level: number;
          id: string;
          institution_id: string;
          student_id: string;
          updated_at: string;
        };
        Insert: {
          bloom_challenger_awarded?: boolean;
          bloom_explorer_awarded?: boolean;
          bloom_pioneer_awarded?: boolean;
          clo_id: string;
          correct_count_at_highest?: number;
          course_id: string;
          highest_bloom_level?: number;
          id?: string;
          institution_id: string;
          student_id: string;
          updated_at?: string;
        };
        Update: {
          bloom_challenger_awarded?: boolean;
          bloom_explorer_awarded?: boolean;
          bloom_pioneer_awarded?: boolean;
          clo_id?: string;
          correct_count_at_highest?: number;
          course_id?: string;
          highest_bloom_level?: number;
          id?: string;
          institution_id?: string;
          student_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "blooms_progression_clo_id_fkey";
            columns: ["clo_id"];
            isOneToOne: false;
            referencedRelation: "learning_outcomes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "blooms_progression_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "blooms_progression_institution_id_fkey";
            columns: ["institution_id"];
            isOneToOne: false;
            referencedRelation: "institutions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "blooms_progression_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      challenge_participants: {
        Row: {
          challenge_id: string;
          created_at: string;
          current_progress: number;
          id: string;
          participant_id: string;
          participant_type: string;
        };
        Insert: {
          challenge_id: string;
          created_at?: string;
          current_progress?: number;
          id?: string;
          participant_id: string;
          participant_type: string;
        };
        Update: {
          challenge_id?: string;
          created_at?: string;
          current_progress?: number;
          id?: string;
          participant_id?: string;
          participant_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "challenge_participants_challenge_id_fkey";
            columns: ["challenge_id"];
            isOneToOne: false;
            referencedRelation: "social_challenges";
            referencedColumns: ["id"];
          }
        ];
      };
      challenge_progress: {
        Row: {
          challenge_id: string;
          completed_at: string | null;
          current_progress: number;
          id: string;
          participant_id: string;
          participant_type: string;
          reward_granted: boolean;
          updated_at: string;
        };
        Insert: {
          challenge_id: string;
          completed_at?: string | null;
          current_progress?: number;
          id?: string;
          participant_id: string;
          participant_type?: string;
          reward_granted?: boolean;
          updated_at?: string;
        };
        Update: {
          challenge_id?: string;
          completed_at?: string | null;
          current_progress?: number;
          id?: string;
          participant_id?: string;
          participant_type?: string;
          reward_granted?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "challenge_progress_challenge_id_fkey";
            columns: ["challenge_id"];
            isOneToOne: false;
            referencedRelation: "social_challenges";
            referencedColumns: ["id"];
          }
        ];
      };
      class_donation_contributions: {
        Row: {
          contributed_at: string;
          donation_id: string;
          id: string;
          purchase_id: string | null;
          student_id: string;
          xp_amount: number;
        };
        Insert: {
          contributed_at?: string;
          donation_id: string;
          id?: string;
          purchase_id?: string | null;
          student_id: string;
          xp_amount: number;
        };
        Update: {
          contributed_at?: string;
          donation_id?: string;
          id?: string;
          purchase_id?: string | null;
          student_id?: string;
          xp_amount?: number;
        };
        Relationships: [
          {
            foreignKeyName: "class_donation_contributions_donation_id_fkey";
            columns: ["donation_id"];
            isOneToOne: false;
            referencedRelation: "class_donations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "class_donation_contributions_purchase_id_fkey";
            columns: ["purchase_id"];
            isOneToOne: false;
            referencedRelation: "xp_purchases";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "class_donation_contributions_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      class_donations: {
        Row: {
          completed_at: string | null;
          course_id: string;
          created_at: string;
          created_by: string;
          current_total: number;
          goal_amount: number;
          id: string;
          institution_id: string;
          resource_description: string;
          status: string;
        };
        Insert: {
          completed_at?: string | null;
          course_id: string;
          created_at?: string;
          created_by: string;
          current_total?: number;
          goal_amount: number;
          id?: string;
          institution_id: string;
          resource_description: string;
          status?: string;
        };
        Update: {
          completed_at?: string | null;
          course_id?: string;
          created_at?: string;
          created_by?: string;
          current_total?: number;
          goal_amount?: number;
          id?: string;
          institution_id?: string;
          resource_description?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "class_donations_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "class_donations_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "class_donations_institution_id_fkey";
            columns: ["institution_id"];
            isOneToOne: false;
            referencedRelation: "institutions";
            referencedColumns: ["id"];
          }
        ];
      };
      class_sessions: {
        Row: {
          created_at: string;
          id: string;
          section_id: string;
          session_date: string;
          session_type: string;
          topic: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          section_id: string;
          session_date: string;
          session_type: string;
          topic?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          section_id?: string;
          session_date?: string;
          session_type?: string;
          topic?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "class_sessions_section_id_fkey";
            columns: ["section_id"];
            isOneToOne: false;
            referencedRelation: "course_sections";
            referencedColumns: ["id"];
          }
        ];
      };
      competency_frameworks: {
        Row: {
          created_at: string | null;
          description: string | null;
          id: string;
          institution_id: string;
          is_active: boolean | null;
          name: string;
          version: string | null;
        };
        Insert: {
          created_at?: string | null;
          description?: string | null;
          id?: string;
          institution_id: string;
          is_active?: boolean | null;
          name: string;
          version?: string | null;
        };
        Update: {
          created_at?: string | null;
          description?: string | null;
          id?: string;
          institution_id?: string;
          is_active?: boolean | null;
          name?: string;
          version?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "competency_frameworks_institution_id_fkey";
            columns: ["institution_id"];
            isOneToOne: false;
            referencedRelation: "institutions";
            referencedColumns: ["id"];
          }
        ];
      };
      competency_items: {
        Row: {
          created_at: string | null;
          description: string | null;
          framework_id: string;
          id: string;
          level: number | null;
          name: string;
          parent_id: string | null;
          sort_order: number | null;
        };
        Insert: {
          created_at?: string | null;
          description?: string | null;
          framework_id: string;
          id?: string;
          level?: number | null;
          name: string;
          parent_id?: string | null;
          sort_order?: number | null;
        };
        Update: {
          created_at?: string | null;
          description?: string | null;
          framework_id?: string;
          id?: string;
          level?: number | null;
          name?: string;
          parent_id?: string | null;
          sort_order?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "competency_items_framework_id_fkey";
            columns: ["framework_id"];
            isOneToOne: false;
            referencedRelation: "competency_frameworks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "competency_items_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "competency_items";
            referencedColumns: ["id"];
          }
        ];
      };
      competency_outcome_mappings: {
        Row: {
          competency_item_id: string;
          created_at: string | null;
          id: string;
          outcome_id: string;
          weight: number | null;
        };
        Insert: {
          competency_item_id: string;
          created_at?: string | null;
          id?: string;
          outcome_id: string;
          weight?: number | null;
        };
        Update: {
          competency_item_id?: string;
          created_at?: string | null;
          id?: string;
          outcome_id?: string;
          weight?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "competency_outcome_mappings_competency_item_id_fkey";
            columns: ["competency_item_id"];
            isOneToOne: false;
            referencedRelation: "competency_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "competency_outcome_mappings_outcome_id_fkey";
            columns: ["outcome_id"];
            isOneToOne: false;
            referencedRelation: "learning_outcomes";
            referencedColumns: ["id"];
          }
        ];
      };
      course_material_embeddings: {
        Row: {
          bloom_level: string | null;
          chunk_index: number;
          chunk_text: string;
          clo_ids: string[] | null;
          course_id: string;
          created_at: string;
          embedding: string;
          id: string;
          indexing_status: string;
          institution_id: string;
          material_type: string;
          source_filename: string;
          source_material_id: string | null;
          token_count: number;
          updated_at: string;
        };
        Insert: {
          bloom_level?: string | null;
          chunk_index: number;
          chunk_text: string;
          clo_ids?: string[] | null;
          course_id: string;
          created_at?: string;
          embedding: string;
          id?: string;
          indexing_status?: string;
          institution_id: string;
          material_type: string;
          source_filename: string;
          source_material_id?: string | null;
          token_count: number;
          updated_at?: string;
        };
        Update: {
          bloom_level?: string | null;
          chunk_index?: number;
          chunk_text?: string;
          clo_ids?: string[] | null;
          course_id?: string;
          created_at?: string;
          embedding?: string;
          id?: string;
          indexing_status?: string;
          institution_id?: string;
          material_type?: string;
          source_filename?: string;
          source_material_id?: string | null;
          token_count?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "course_material_embeddings_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "course_material_embeddings_institution_id_fkey";
            columns: ["institution_id"];
            isOneToOne: false;
            referencedRelation: "institutions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "course_material_embeddings_source_material_id_fkey";
            columns: ["source_material_id"];
            isOneToOne: false;
            referencedRelation: "course_materials";
            referencedColumns: ["id"];
          }
        ];
      };
      course_materials: {
        Row: {
          clo_ids: Json | null;
          content_url: string | null;
          created_at: string;
          description: string | null;
          file_path: string | null;
          id: string;
          is_published: boolean;
          module_id: string;
          search_vector: unknown;
          sort_order: number;
          title: string;
          type: string;
        };
        Insert: {
          clo_ids?: Json | null;
          content_url?: string | null;
          created_at?: string;
          description?: string | null;
          file_path?: string | null;
          id?: string;
          is_published?: boolean;
          module_id: string;
          search_vector?: unknown;
          sort_order?: number;
          title: string;
          type: string;
        };
        Update: {
          clo_ids?: Json | null;
          content_url?: string | null;
          created_at?: string;
          description?: string | null;
          file_path?: string | null;
          id?: string;
          is_published?: boolean;
          module_id?: string;
          search_vector?: unknown;
          sort_order?: number;
          title?: string;
          type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "course_materials_module_id_fkey";
            columns: ["module_id"];
            isOneToOne: false;
            referencedRelation: "course_modules";
            referencedColumns: ["id"];
          }
        ];
      };
      course_modules: {
        Row: {
          course_id: string;
          created_at: string;
          description: string | null;
          id: string;
          is_published: boolean;
          sort_order: number;
          title: string;
        };
        Insert: {
          course_id: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_published?: boolean;
          sort_order?: number;
          title: string;
        };
        Update: {
          course_id?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          is_published?: boolean;
          sort_order?: number;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "course_modules_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          }
        ];
      };
      course_sections: {
        Row: {
          capacity: number;
          course_id: string;
          created_at: string;
          id: string;
          is_active: boolean;
          section_code: string;
          teacher_id: string;
        };
        Insert: {
          capacity?: number;
          course_id: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          section_code: string;
          teacher_id: string;
        };
        Update: {
          capacity?: number;
          course_id?: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          section_code?: string;
          teacher_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "course_sections_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "course_sections_teacher_id_fkey";
            columns: ["teacher_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      courses: {
        Row: {
          academic_year: string;
          code: string;
          created_at: string;
          id: string;
          is_active: boolean;
          name: string;
          name_ar: string | null;
          program_id: string;
          search_vector: unknown;
          semester: string;
          semester_id: string | null;
          teacher_id: string | null;
          team_formation_mode: string;
        };
        Insert: {
          academic_year: string;
          code: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name: string;
          name_ar?: string | null;
          program_id: string;
          search_vector?: unknown;
          semester: string;
          semester_id?: string | null;
          teacher_id?: string | null;
          team_formation_mode?: string;
        };
        Update: {
          academic_year?: string;
          code?: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          name_ar?: string | null;
          program_id?: string;
          search_vector?: unknown;
          semester?: string;
          semester_id?: string | null;
          teacher_id?: string | null;
          team_formation_mode?: string;
        };
        Relationships: [
          {
            foreignKeyName: "courses_program_id_fkey";
            columns: ["program_id"];
            isOneToOne: false;
            referencedRelation: "programs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "courses_semester_id_fkey";
            columns: ["semester_id"];
            isOneToOne: false;
            referencedRelation: "semesters";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "courses_teacher_id_fkey";
            columns: ["teacher_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      cqi_action_plans: {
        Row: {
          action_description: string;
          baseline_attainment: number;
          created_at: string;
          id: string;
          outcome_id: string;
          outcome_type: string;
          program_id: string;
          responsible_person: string;
          result_attainment: number | null;
          semester_id: string;
          status: string;
          target_attainment: number;
          updated_at: string;
        };
        Insert: {
          action_description: string;
          baseline_attainment: number;
          created_at?: string;
          id?: string;
          outcome_id: string;
          outcome_type: string;
          program_id: string;
          responsible_person: string;
          result_attainment?: number | null;
          semester_id: string;
          status?: string;
          target_attainment: number;
          updated_at?: string;
        };
        Update: {
          action_description?: string;
          baseline_attainment?: number;
          created_at?: string;
          id?: string;
          outcome_id?: string;
          outcome_type?: string;
          program_id?: string;
          responsible_person?: string;
          result_attainment?: number | null;
          semester_id?: string;
          status?: string;
          target_attainment?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cqi_action_plans_outcome_id_fkey";
            columns: ["outcome_id"];
            isOneToOne: false;
            referencedRelation: "learning_outcomes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cqi_action_plans_program_id_fkey";
            columns: ["program_id"];
            isOneToOne: false;
            referencedRelation: "programs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cqi_action_plans_semester_id_fkey";
            columns: ["semester_id"];
            isOneToOne: false;
            referencedRelation: "semesters";
            referencedColumns: ["id"];
          }
        ];
      };
      deadline_extensions: {
        Row: {
          assignment_id: string;
          created_at: string;
          extended_deadline: string;
          id: string;
          original_deadline: string;
          purchase_id: string;
          revoked: boolean;
          revoked_by: string | null;
          student_id: string;
        };
        Insert: {
          assignment_id: string;
          created_at?: string;
          extended_deadline: string;
          id?: string;
          original_deadline: string;
          purchase_id: string;
          revoked?: boolean;
          revoked_by?: string | null;
          student_id: string;
        };
        Update: {
          assignment_id?: string;
          created_at?: string;
          extended_deadline?: string;
          id?: string;
          original_deadline?: string;
          purchase_id?: string;
          revoked?: boolean;
          revoked_by?: string | null;
          student_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "deadline_extensions_assignment_id_fkey";
            columns: ["assignment_id"];
            isOneToOne: false;
            referencedRelation: "assignments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deadline_extensions_purchase_id_fkey";
            columns: ["purchase_id"];
            isOneToOne: false;
            referencedRelation: "xp_purchases";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deadline_extensions_revoked_by_fkey";
            columns: ["revoked_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "deadline_extensions_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      departments: {
        Row: {
          code: string;
          created_at: string;
          head_of_department_id: string | null;
          id: string;
          institution_id: string;
          name: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          head_of_department_id?: string | null;
          id?: string;
          institution_id: string;
          name: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          head_of_department_id?: string | null;
          id?: string;
          institution_id?: string;
          name?: string;
        };
        Relationships: [
          {
            foreignKeyName: "departments_head_of_department_id_fkey";
            columns: ["head_of_department_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "departments_institution_id_fkey";
            columns: ["institution_id"];
            isOneToOne: false;
            referencedRelation: "institutions";
            referencedColumns: ["id"];
          }
        ];
      };
      discussion_replies: {
        Row: {
          author_id: string;
          content: string;
          created_at: string;
          id: string;
          is_answer: boolean;
          thread_id: string;
        };
        Insert: {
          author_id: string;
          content: string;
          created_at?: string;
          id?: string;
          is_answer?: boolean;
          thread_id: string;
        };
        Update: {
          author_id?: string;
          content?: string;
          created_at?: string;
          id?: string;
          is_answer?: boolean;
          thread_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "discussion_replies_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "discussion_replies_thread_id_fkey";
            columns: ["thread_id"];
            isOneToOne: false;
            referencedRelation: "discussion_threads";
            referencedColumns: ["id"];
          }
        ];
      };
      discussion_threads: {
        Row: {
          author_id: string;
          content: string;
          course_id: string;
          created_at: string;
          id: string;
          is_pinned: boolean;
          is_resolved: boolean;
          title: string;
        };
        Insert: {
          author_id: string;
          content: string;
          course_id: string;
          created_at?: string;
          id?: string;
          is_pinned?: boolean;
          is_resolved?: boolean;
          title: string;
        };
        Update: {
          author_id?: string;
          content?: string;
          course_id?: string;
          created_at?: string;
          id?: string;
          is_pinned?: boolean;
          is_resolved?: boolean;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "discussion_threads_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "discussion_threads_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          }
        ];
      };
      evidence: {
        Row: {
          attainment_level: Database["public"]["Enums"]["attainment_level"];
          clo_id: string;
          created_at: string;
          grade_id: string;
          id: string;
          ilo_id: string;
          plo_id: string;
          score_percent: number;
          student_id: string;
          submission_id: string;
        };
        Insert: {
          attainment_level: Database["public"]["Enums"]["attainment_level"];
          clo_id: string;
          created_at?: string;
          grade_id: string;
          id?: string;
          ilo_id: string;
          plo_id: string;
          score_percent: number;
          student_id: string;
          submission_id: string;
        };
        Update: {
          attainment_level?: Database["public"]["Enums"]["attainment_level"];
          clo_id?: string;
          created_at?: string;
          grade_id?: string;
          id?: string;
          ilo_id?: string;
          plo_id?: string;
          score_percent?: number;
          student_id?: string;
          submission_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "evidence_clo_id_fkey";
            columns: ["clo_id"];
            isOneToOne: false;
            referencedRelation: "learning_outcomes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "evidence_grade_id_fkey";
            columns: ["grade_id"];
            isOneToOne: false;
            referencedRelation: "grades";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "evidence_ilo_id_fkey";
            columns: ["ilo_id"];
            isOneToOne: false;
            referencedRelation: "learning_outcomes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "evidence_plo_id_fkey";
            columns: ["plo_id"];
            isOneToOne: false;
            referencedRelation: "learning_outcomes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "evidence_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "evidence_submission_id_fkey";
            columns: ["submission_id"];
            isOneToOne: false;
            referencedRelation: "submissions";
            referencedColumns: ["id"];
          }
        ];
      };
      fee_payments: {
        Row: {
          amount_paid: number;
          created_at: string;
          fee_structure_id: string;
          id: string;
          payment_date: string;
          payment_method: string | null;
          receipt_number: string | null;
          status: string;
          student_id: string;
        };
        Insert: {
          amount_paid: number;
          created_at?: string;
          fee_structure_id: string;
          id?: string;
          payment_date: string;
          payment_method?: string | null;
          receipt_number?: string | null;
          status?: string;
          student_id: string;
        };
        Update: {
          amount_paid?: number;
          created_at?: string;
          fee_structure_id?: string;
          id?: string;
          payment_date?: string;
          payment_method?: string | null;
          receipt_number?: string | null;
          status?: string;
          student_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fee_payments_fee_structure_id_fkey";
            columns: ["fee_structure_id"];
            isOneToOne: false;
            referencedRelation: "fee_structures";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fee_payments_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      fee_structures: {
        Row: {
          amount: number;
          created_at: string;
          currency: string;
          due_date: string;
          fee_type: string;
          id: string;
          program_id: string;
          semester_id: string;
        };
        Insert: {
          amount: number;
          created_at?: string;
          currency?: string;
          due_date: string;
          fee_type: string;
          id?: string;
          program_id: string;
          semester_id: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          currency?: string;
          due_date?: string;
          fee_type?: string;
          id?: string;
          program_id?: string;
          semester_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fee_structures_program_id_fkey";
            columns: ["program_id"];
            isOneToOne: false;
            referencedRelation: "programs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fee_structures_semester_id_fkey";
            columns: ["semester_id"];
            isOneToOne: false;
            referencedRelation: "semesters";
            referencedColumns: ["id"];
          }
        ];
      };
      flow_check_ins: {
        Row: {
          created_at: string;
          id: string;
          interval_number: number;
          response: Database["public"]["Enums"]["flow_response_type"];
          session_id: string;
          student_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          interval_number: number;
          response: Database["public"]["Enums"]["flow_response_type"];
          session_id: string;
          student_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          interval_number?: number;
          response?: Database["public"]["Enums"]["flow_response_type"];
          session_id?: string;
          student_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "flow_check_ins_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "study_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "flow_check_ins_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      goal_suggestions: {
        Row: {
          cohort_completion_rate: number | null;
          created_at: string;
          difficulty: string;
          goal_text: string;
          id: string;
          smart_achievable: string | null;
          smart_measurable: string | null;
          smart_relevant: string | null;
          smart_specific: string | null;
          smart_timebound: string | null;
          status: string;
          student_id: string;
          week_start: string;
        };
        Insert: {
          cohort_completion_rate?: number | null;
          created_at?: string;
          difficulty: string;
          goal_text: string;
          id?: string;
          smart_achievable?: string | null;
          smart_measurable?: string | null;
          smart_relevant?: string | null;
          smart_specific?: string | null;
          smart_timebound?: string | null;
          status?: string;
          student_id: string;
          week_start: string;
        };
        Update: {
          cohort_completion_rate?: number | null;
          created_at?: string;
          difficulty?: string;
          goal_text?: string;
          id?: string;
          smart_achievable?: string | null;
          smart_measurable?: string | null;
          smart_relevant?: string | null;
          smart_specific?: string | null;
          smart_timebound?: string | null;
          status?: string;
          student_id?: string;
          week_start?: string;
        };
        Relationships: [
          {
            foreignKeyName: "goal_suggestions_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      grade_categories: {
        Row: {
          course_id: string;
          created_at: string;
          id: string;
          name: string;
          sort_order: number;
          weight_percent: number;
        };
        Insert: {
          course_id: string;
          created_at?: string;
          id?: string;
          name: string;
          sort_order?: number;
          weight_percent: number;
        };
        Update: {
          course_id?: string;
          created_at?: string;
          id?: string;
          name?: string;
          sort_order?: number;
          weight_percent?: number;
        };
        Relationships: [
          {
            foreignKeyName: "grade_categories_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          }
        ];
      };
      grades: {
        Row: {
          graded_at: string;
          graded_by: string;
          id: string;
          overall_feedback: string | null;
          rubric_selections: Json;
          score_percent: number;
          submission_id: string;
          total_score: number;
        };
        Insert: {
          graded_at?: string;
          graded_by: string;
          id?: string;
          overall_feedback?: string | null;
          rubric_selections?: Json;
          score_percent: number;
          submission_id: string;
          total_score: number;
        };
        Update: {
          graded_at?: string;
          graded_by?: string;
          id?: string;
          overall_feedback?: string | null;
          rubric_selections?: Json;
          score_percent?: number;
          submission_id?: string;
          total_score?: number;
        };
        Relationships: [
          {
            foreignKeyName: "grades_graded_by_fkey";
            columns: ["graded_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "grades_submission_id_fkey";
            columns: ["submission_id"];
            isOneToOne: true;
            referencedRelation: "submissions";
            referencedColumns: ["id"];
          }
        ];
      };
      graduate_attribute_mappings: {
        Row: {
          created_at: string | null;
          graduate_attribute_id: string;
          id: string;
          outcome_id: string;
          weight: number | null;
        };
        Insert: {
          created_at?: string | null;
          graduate_attribute_id: string;
          id?: string;
          outcome_id: string;
          weight?: number | null;
        };
        Update: {
          created_at?: string | null;
          graduate_attribute_id?: string;
          id?: string;
          outcome_id?: string;
          weight?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "graduate_attribute_mappings_graduate_attribute_id_fkey";
            columns: ["graduate_attribute_id"];
            isOneToOne: false;
            referencedRelation: "graduate_attributes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "graduate_attribute_mappings_outcome_id_fkey";
            columns: ["outcome_id"];
            isOneToOne: false;
            referencedRelation: "learning_outcomes";
            referencedColumns: ["id"];
          }
        ];
      };
      graduate_attributes: {
        Row: {
          created_at: string | null;
          description: string | null;
          id: string;
          institution_id: string;
          name: string;
          sort_order: number | null;
        };
        Insert: {
          created_at?: string | null;
          description?: string | null;
          id?: string;
          institution_id: string;
          name: string;
          sort_order?: number | null;
        };
        Update: {
          created_at?: string | null;
          description?: string | null;
          id?: string;
          institution_id?: string;
          name?: string;
          sort_order?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "graduate_attributes_institution_id_fkey";
            columns: ["institution_id"];
            isOneToOne: false;
            referencedRelation: "institutions";
            referencedColumns: ["id"];
          }
        ];
      };
      habit_correlations: {
        Row: {
          computed_at: string | null;
          correlated_metric: string;
          correlation_coefficient: number | null;
          habit_type: string;
          id: string;
          sample_size: number | null;
          student_id: string;
        };
        Insert: {
          computed_at?: string | null;
          correlated_metric: string;
          correlation_coefficient?: number | null;
          habit_type: string;
          id?: string;
          sample_size?: number | null;
          student_id: string;
        };
        Update: {
          computed_at?: string | null;
          correlated_metric?: string;
          correlation_coefficient?: number | null;
          habit_type?: string;
          id?: string;
          sample_size?: number | null;
          student_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "habit_correlations_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      habit_logs: {
        Row: {
          completed_at: string | null;
          created_at: string;
          date: string;
          habit_type: string;
          id: string;
          student_id: string;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string;
          date: string;
          habit_type: string;
          id?: string;
          student_id: string;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string;
          date?: string;
          habit_type?: string;
          id?: string;
          student_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "habit_logs_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      habit_tracking: {
        Row: {
          created_at: string;
          habit_date: string;
          id: string;
          is_perfect_day: boolean;
          journal: boolean;
          login: boolean;
          read_content: boolean;
          student_id: string;
          submit: boolean;
        };
        Insert: {
          created_at?: string;
          habit_date: string;
          id?: string;
          is_perfect_day?: boolean;
          journal?: boolean;
          login?: boolean;
          read_content?: boolean;
          student_id: string;
          submit?: boolean;
        };
        Update: {
          created_at?: string;
          habit_date?: string;
          id?: string;
          is_perfect_day?: boolean;
          journal?: boolean;
          login?: boolean;
          read_content?: boolean;
          student_id?: string;
          submit?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "habit_tracking_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      institution_settings: {
        Row: {
          accreditation_body: string;
          attainment_thresholds: Json;
          created_at: string;
          default_language: string;
          grade_scales: Json;
          id: string;
          institution_id: string;
          league_thresholds: Json | null;
          streak_sabbatical_enabled: boolean | null;
          success_threshold: number;
          wellness_xp_amount: number;
        };
        Insert: {
          accreditation_body?: string;
          attainment_thresholds?: Json;
          created_at?: string;
          default_language?: string;
          grade_scales?: Json;
          id?: string;
          institution_id: string;
          league_thresholds?: Json | null;
          streak_sabbatical_enabled?: boolean | null;
          success_threshold?: number;
          wellness_xp_amount?: number;
        };
        Update: {
          accreditation_body?: string;
          attainment_thresholds?: Json;
          created_at?: string;
          default_language?: string;
          grade_scales?: Json;
          id?: string;
          institution_id?: string;
          league_thresholds?: Json | null;
          streak_sabbatical_enabled?: boolean | null;
          success_threshold?: number;
          wellness_xp_amount?: number;
        };
        Relationships: [
          {
            foreignKeyName: "institution_settings_institution_id_fkey";
            columns: ["institution_id"];
            isOneToOne: true;
            referencedRelation: "institutions";
            referencedColumns: ["id"];
          }
        ];
      };
      institutions: {
        Row: {
          accreditation_body: string | null;
          created_at: string;
          id: string;
          logo_url: string | null;
          name: string;
          settings: Json;
        };
        Insert: {
          accreditation_body?: string | null;
          created_at?: string;
          id?: string;
          logo_url?: string | null;
          name: string;
          settings?: Json;
        };
        Update: {
          accreditation_body?: string | null;
          created_at?: string;
          id?: string;
          logo_url?: string | null;
          name?: string;
          settings?: Json;
        };
        Relationships: [];
      };
      journal_entries: {
        Row: {
          clo_id: string | null;
          content: string;
          course_id: string;
          created_at: string;
          id: string;
          is_shared: boolean;
          student_id: string;
        };
        Insert: {
          clo_id?: string | null;
          content: string;
          course_id: string;
          created_at?: string;
          id?: string;
          is_shared?: boolean;
          student_id: string;
        };
        Update: {
          clo_id?: string | null;
          content?: string;
          course_id?: string;
          created_at?: string;
          id?: string;
          is_shared?: boolean;
          student_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "journal_entries_clo_id_fkey";
            columns: ["clo_id"];
            isOneToOne: false;
            referencedRelation: "learning_outcomes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "journal_entries_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "journal_entries_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      knowledge_quests: {
        Row: {
          created_at: string;
          created_by: string;
          description: string;
          end_date: string;
          id: string;
          institution_id: string;
          is_active: boolean;
          max_participants: number | null;
          quest_type: string;
          reward_item_id: string | null;
          reward_type: string;
          reward_xp_amount: number | null;
          start_date: string;
          target_clo_ids: string[] | null;
          title: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          description: string;
          end_date: string;
          id?: string;
          institution_id: string;
          is_active?: boolean;
          max_participants?: number | null;
          quest_type: string;
          reward_item_id?: string | null;
          reward_type: string;
          reward_xp_amount?: number | null;
          start_date: string;
          target_clo_ids?: string[] | null;
          title: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          description?: string;
          end_date?: string;
          id?: string;
          institution_id?: string;
          is_active?: boolean;
          max_participants?: number | null;
          quest_type?: string;
          reward_item_id?: string | null;
          reward_type?: string;
          reward_xp_amount?: number | null;
          start_date?: string;
          target_clo_ids?: string[] | null;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "knowledge_quests_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "knowledge_quests_institution_id_fkey";
            columns: ["institution_id"];
            isOneToOne: false;
            referencedRelation: "institutions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "knowledge_quests_reward_item_id_fkey";
            columns: ["reward_item_id"];
            isOneToOne: false;
            referencedRelation: "marketplace_items";
            referencedColumns: ["id"];
          }
        ];
      };
      learning_outcomes: {
        Row: {
          blooms_level: Database["public"]["Enums"]["blooms_level"] | null;
          course_id: string | null;
          created_at: string;
          created_by: string | null;
          description: string | null;
          id: string;
          institution_id: string;
          program_id: string | null;
          sort_order: number;
          title: string;
          title_ar: string | null;
          tutor_autonomy_level: string | null;
          type: Database["public"]["Enums"]["outcome_type"];
          updated_at: string;
          weight: number | null;
        };
        Insert: {
          blooms_level?: Database["public"]["Enums"]["blooms_level"] | null;
          course_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          institution_id: string;
          program_id?: string | null;
          sort_order?: number;
          title: string;
          title_ar?: string | null;
          tutor_autonomy_level?: string | null;
          type: Database["public"]["Enums"]["outcome_type"];
          updated_at?: string;
          weight?: number | null;
        };
        Update: {
          blooms_level?: Database["public"]["Enums"]["blooms_level"] | null;
          course_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          institution_id?: string;
          program_id?: string | null;
          sort_order?: number;
          title?: string;
          title_ar?: string | null;
          tutor_autonomy_level?: string | null;
          type?: Database["public"]["Enums"]["outcome_type"];
          updated_at?: string;
          weight?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "learning_outcomes_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "learning_outcomes_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "learning_outcomes_institution_id_fkey";
            columns: ["institution_id"];
            isOneToOne: false;
            referencedRelation: "institutions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "learning_outcomes_program_id_fkey";
            columns: ["program_id"];
            isOneToOne: false;
            referencedRelation: "programs";
            referencedColumns: ["id"];
          }
        ];
      };
      learning_path_nodes: {
        Row: {
          assignment_id: string;
          course_id: string;
          created_at: string;
          id: string;
          prerequisite_node_id: string | null;
          sort_order: number;
          unlock_threshold: number;
        };
        Insert: {
          assignment_id: string;
          course_id: string;
          created_at?: string;
          id?: string;
          prerequisite_node_id?: string | null;
          sort_order?: number;
          unlock_threshold?: number;
        };
        Update: {
          assignment_id?: string;
          course_id?: string;
          created_at?: string;
          id?: string;
          prerequisite_node_id?: string | null;
          sort_order?: number;
          unlock_threshold?: number;
        };
        Relationships: [
          {
            foreignKeyName: "learning_path_nodes_assignment_id_fkey";
            columns: ["assignment_id"];
            isOneToOne: false;
            referencedRelation: "assignments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "learning_path_nodes_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "learning_path_nodes_prerequisite_node_id_fkey";
            columns: ["prerequisite_node_id"];
            isOneToOne: false;
            referencedRelation: "learning_path_nodes";
            referencedColumns: ["id"];
          }
        ];
      };
      login_attempts: {
        Row: {
          attempt_count: number;
          email: string;
          locked_until: string | null;
          updated_at: string;
        };
        Insert: {
          attempt_count?: number;
          email: string;
          locked_until?: string | null;
          updated_at?: string;
        };
        Update: {
          attempt_count?: number;
          email?: string;
          locked_until?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      marketplace_items: {
        Row: {
          category: Database["public"]["Enums"]["marketplace_item_category"];
          created_at: string;
          description: string;
          dynamic_price_override: number | null;
          icon_identifier: string;
          id: string;
          institution_id: string;
          is_active: boolean;
          level_requirement: number;
          metadata: Json | null;
          name: string;
          stock_quantity: number | null;
          stock_type: Database["public"]["Enums"]["marketplace_stock_type"];
          sub_category: Database["public"]["Enums"]["marketplace_item_sub_category"];
          updated_at: string;
          xp_price: number;
        };
        Insert: {
          category: Database["public"]["Enums"]["marketplace_item_category"];
          created_at?: string;
          description: string;
          dynamic_price_override?: number | null;
          icon_identifier: string;
          id?: string;
          institution_id: string;
          is_active?: boolean;
          level_requirement?: number;
          metadata?: Json | null;
          name: string;
          stock_quantity?: number | null;
          stock_type?: Database["public"]["Enums"]["marketplace_stock_type"];
          sub_category: Database["public"]["Enums"]["marketplace_item_sub_category"];
          updated_at?: string;
          xp_price: number;
        };
        Update: {
          category?: Database["public"]["Enums"]["marketplace_item_category"];
          created_at?: string;
          description?: string;
          dynamic_price_override?: number | null;
          icon_identifier?: string;
          id?: string;
          institution_id?: string;
          is_active?: boolean;
          level_requirement?: number;
          metadata?: Json | null;
          name?: string;
          stock_quantity?: number | null;
          stock_type?: Database["public"]["Enums"]["marketplace_stock_type"];
          sub_category?: Database["public"]["Enums"]["marketplace_item_sub_category"];
          updated_at?: string;
          xp_price?: number;
        };
        Relationships: [
          {
            foreignKeyName: "marketplace_items_institution_id_fkey";
            columns: ["institution_id"];
            isOneToOne: false;
            referencedRelation: "institutions";
            referencedColumns: ["id"];
          }
        ];
      };
      mastery_recovery_pathways: {
        Row: {
          activated_at: string;
          ai_tutor_completed: boolean;
          ai_tutor_completed_at: string | null;
          clo_id: string;
          completed_at: string | null;
          course_id: string;
          created_at: string;
          expired_at: string | null;
          failure_count: number;
          id: string;
          institution_id: string;
          peer_suggestion_applicable: boolean;
          peer_suggestion_shown: boolean;
          practice_completed: boolean;
          practice_completed_at: string | null;
          retry_outcome: string | null;
          retry_quiz_attempt_id: string | null;
          status: string;
          student_id: string;
          updated_at: string;
        };
        Insert: {
          activated_at?: string;
          ai_tutor_completed?: boolean;
          ai_tutor_completed_at?: string | null;
          clo_id: string;
          completed_at?: string | null;
          course_id: string;
          created_at?: string;
          expired_at?: string | null;
          failure_count?: number;
          id?: string;
          institution_id: string;
          peer_suggestion_applicable?: boolean;
          peer_suggestion_shown?: boolean;
          practice_completed?: boolean;
          practice_completed_at?: string | null;
          retry_outcome?: string | null;
          retry_quiz_attempt_id?: string | null;
          status?: string;
          student_id: string;
          updated_at?: string;
        };
        Update: {
          activated_at?: string;
          ai_tutor_completed?: boolean;
          ai_tutor_completed_at?: string | null;
          clo_id?: string;
          completed_at?: string | null;
          course_id?: string;
          created_at?: string;
          expired_at?: string | null;
          failure_count?: number;
          id?: string;
          institution_id?: string;
          peer_suggestion_applicable?: boolean;
          peer_suggestion_shown?: boolean;
          practice_completed?: boolean;
          practice_completed_at?: string | null;
          retry_outcome?: string | null;
          retry_quiz_attempt_id?: string | null;
          status?: string;
          student_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "mastery_recovery_pathways_clo_id_fkey";
            columns: ["clo_id"];
            isOneToOne: false;
            referencedRelation: "learning_outcomes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "mastery_recovery_pathways_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "mastery_recovery_pathways_institution_id_fkey";
            columns: ["institution_id"];
            isOneToOne: false;
            referencedRelation: "institutions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "mastery_recovery_pathways_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      micro_assessment_schedule: {
        Row: {
          assessment_type: string;
          completed_at: string | null;
          created_at: string;
          dismissal_count: number;
          id: string;
          question_ids: string[];
          scheduled_at: string;
          scheduled_day: number;
          status: string;
          student_id: string;
        };
        Insert: {
          assessment_type: string;
          completed_at?: string | null;
          created_at?: string;
          dismissal_count?: number;
          id?: string;
          question_ids?: string[];
          scheduled_at: string;
          scheduled_day: number;
          status?: string;
          student_id: string;
        };
        Update: {
          assessment_type?: string;
          completed_at?: string | null;
          created_at?: string;
          dismissal_count?: number;
          id?: string;
          question_ids?: string[];
          scheduled_at?: string;
          scheduled_day?: number;
          status?: string;
          student_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "micro_assessment_schedule_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      notifications: {
        Row: {
          body: string | null;
          created_at: string;
          id: string;
          is_read: boolean;
          metadata: Json | null;
          title: string;
          type: string;
          user_id: string;
        };
        Insert: {
          body?: string | null;
          created_at?: string;
          id?: string;
          is_read?: boolean;
          metadata?: Json | null;
          title: string;
          type: string;
          user_id: string;
        };
        Update: {
          body?: string | null;
          created_at?: string;
          id?: string;
          is_read?: boolean;
          metadata?: Json | null;
          title?: string;
          type?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      onboarding_progress: {
        Row: {
          assessment_version: number;
          baseline_completed: boolean;
          baseline_course_ids: string[] | null;
          created_at: string;
          current_step: string;
          day1_completed: boolean;
          id: string;
          learning_style_completed: boolean;
          micro_assessment_day: number;
          micro_assessment_dismissals: number;
          personality_completed: boolean;
          profile_completeness: number;
          self_efficacy_completed: boolean;
          skipped_sections: string[] | null;
          student_id: string;
          study_strategy_completed: boolean;
          updated_at: string;
        };
        Insert: {
          assessment_version?: number;
          baseline_completed?: boolean;
          baseline_course_ids?: string[] | null;
          created_at?: string;
          current_step?: string;
          day1_completed?: boolean;
          id?: string;
          learning_style_completed?: boolean;
          micro_assessment_day?: number;
          micro_assessment_dismissals?: number;
          personality_completed?: boolean;
          profile_completeness?: number;
          self_efficacy_completed?: boolean;
          skipped_sections?: string[] | null;
          student_id: string;
          study_strategy_completed?: boolean;
          updated_at?: string;
        };
        Update: {
          assessment_version?: number;
          baseline_completed?: boolean;
          baseline_course_ids?: string[] | null;
          created_at?: string;
          current_step?: string;
          day1_completed?: boolean;
          id?: string;
          learning_style_completed?: boolean;
          micro_assessment_day?: number;
          micro_assessment_dismissals?: number;
          personality_completed?: boolean;
          profile_completeness?: number;
          self_efficacy_completed?: boolean;
          skipped_sections?: string[] | null;
          student_id?: string;
          study_strategy_completed?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "onboarding_progress_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      onboarding_questions: {
        Row: {
          assessment_type: string;
          clo_id: string | null;
          correct_option: number | null;
          course_id: string | null;
          created_at: string;
          difficulty_level: string | null;
          dimension: string | null;
          id: string;
          institution_id: string;
          is_active: boolean;
          options: Json | null;
          question_text: string;
          sort_order: number;
          updated_at: string;
          weight: number | null;
        };
        Insert: {
          assessment_type: string;
          clo_id?: string | null;
          correct_option?: number | null;
          course_id?: string | null;
          created_at?: string;
          difficulty_level?: string | null;
          dimension?: string | null;
          id?: string;
          institution_id: string;
          is_active?: boolean;
          options?: Json | null;
          question_text: string;
          sort_order?: number;
          updated_at?: string;
          weight?: number | null;
        };
        Update: {
          assessment_type?: string;
          clo_id?: string | null;
          correct_option?: number | null;
          course_id?: string | null;
          created_at?: string;
          difficulty_level?: string | null;
          dimension?: string | null;
          id?: string;
          institution_id?: string;
          is_active?: boolean;
          options?: Json | null;
          question_text?: string;
          sort_order?: number;
          updated_at?: string;
          weight?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "onboarding_questions_clo_id_fkey";
            columns: ["clo_id"];
            isOneToOne: false;
            referencedRelation: "learning_outcomes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "onboarding_questions_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "onboarding_questions_institution_id_fkey";
            columns: ["institution_id"];
            isOneToOne: false;
            referencedRelation: "institutions";
            referencedColumns: ["id"];
          }
        ];
      };
      onboarding_responses: {
        Row: {
          assessment_version: number;
          created_at: string;
          id: string;
          question_id: string;
          score_contribution: number | null;
          selected_option: number;
          student_id: string;
        };
        Insert: {
          assessment_version?: number;
          created_at?: string;
          id?: string;
          question_id: string;
          score_contribution?: number | null;
          selected_option: number;
          student_id: string;
        };
        Update: {
          assessment_version?: number;
          created_at?: string;
          id?: string;
          question_id?: string;
          score_contribution?: number | null;
          selected_option?: number;
          student_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "onboarding_responses_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: false;
            referencedRelation: "onboarding_questions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "onboarding_responses_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      outcome_attainment: {
        Row: {
          attainment_percent: number;
          course_id: string | null;
          id: string;
          last_calculated_at: string;
          outcome_id: string;
          sample_count: number;
          scope: Database["public"]["Enums"]["attainment_scope"];
          student_id: string | null;
        };
        Insert: {
          attainment_percent?: number;
          course_id?: string | null;
          id?: string;
          last_calculated_at?: string;
          outcome_id: string;
          sample_count?: number;
          scope: Database["public"]["Enums"]["attainment_scope"];
          student_id?: string | null;
        };
        Update: {
          attainment_percent?: number;
          course_id?: string | null;
          id?: string;
          last_calculated_at?: string;
          outcome_id?: string;
          sample_count?: number;
          scope?: Database["public"]["Enums"]["attainment_scope"];
          student_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "outcome_attainment_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "outcome_attainment_outcome_id_fkey";
            columns: ["outcome_id"];
            isOneToOne: false;
            referencedRelation: "learning_outcomes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "outcome_attainment_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      outcome_mappings: {
        Row: {
          created_at: string;
          id: string;
          source_outcome_id: string;
          target_outcome_id: string;
          weight: number;
        };
        Insert: {
          created_at?: string;
          id?: string;
          source_outcome_id: string;
          target_outcome_id: string;
          weight?: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          source_outcome_id?: string;
          target_outcome_id?: string;
          weight?: number;
        };
        Relationships: [
          {
            foreignKeyName: "outcome_mappings_source_outcome_id_fkey";
            columns: ["source_outcome_id"];
            isOneToOne: false;
            referencedRelation: "learning_outcomes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "outcome_mappings_target_outcome_id_fkey";
            columns: ["target_outcome_id"];
            isOneToOne: false;
            referencedRelation: "learning_outcomes";
            referencedColumns: ["id"];
          }
        ];
      };
      parent_student_links: {
        Row: {
          created_at: string;
          id: string;
          parent_id: string;
          relationship: string;
          student_id: string;
          verified: boolean;
        };
        Insert: {
          created_at?: string;
          id?: string;
          parent_id: string;
          relationship: string;
          student_id: string;
          verified?: boolean;
        };
        Update: {
          created_at?: string;
          id?: string;
          parent_id?: string;
          relationship?: string;
          student_id?: string;
          verified?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "parent_student_links_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "parent_student_links_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      peer_teaching_moments: {
        Row: {
          author_id: string;
          avg_clarity_rating: number | null;
          avg_helpfulness_rating: number | null;
          clo_id: string;
          created_at: string;
          explanation_text: string;
          id: string;
          media_url: string | null;
          status: string;
          team_id: string;
          title: string;
          view_count: number;
        };
        Insert: {
          author_id: string;
          avg_clarity_rating?: number | null;
          avg_helpfulness_rating?: number | null;
          clo_id: string;
          created_at?: string;
          explanation_text: string;
          id?: string;
          media_url?: string | null;
          status?: string;
          team_id: string;
          title: string;
          view_count?: number;
        };
        Update: {
          author_id?: string;
          avg_clarity_rating?: number | null;
          avg_helpfulness_rating?: number | null;
          clo_id?: string;
          created_at?: string;
          explanation_text?: string;
          id?: string;
          media_url?: string | null;
          status?: string;
          team_id?: string;
          title?: string;
          view_count?: number;
        };
        Relationships: [
          {
            foreignKeyName: "peer_teaching_moments_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "peer_teaching_moments_clo_id_fkey";
            columns: ["clo_id"];
            isOneToOne: false;
            referencedRelation: "learning_outcomes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "peer_teaching_moments_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          }
        ];
      };
      planner_tasks: {
        Row: {
          assignment_id: string | null;
          clo_id: string | null;
          completed_at: string | null;
          course_id: string | null;
          created_at: string | null;
          description: string | null;
          due_date: string | null;
          id: string;
          planned_date: string | null;
          priority: string | null;
          sort_order: number | null;
          status: string | null;
          student_id: string;
          title: string;
          updated_at: string | null;
        };
        Insert: {
          assignment_id?: string | null;
          clo_id?: string | null;
          completed_at?: string | null;
          course_id?: string | null;
          created_at?: string | null;
          description?: string | null;
          due_date?: string | null;
          id?: string;
          planned_date?: string | null;
          priority?: string | null;
          sort_order?: number | null;
          status?: string | null;
          student_id: string;
          title: string;
          updated_at?: string | null;
        };
        Update: {
          assignment_id?: string | null;
          clo_id?: string | null;
          completed_at?: string | null;
          course_id?: string | null;
          created_at?: string | null;
          description?: string | null;
          due_date?: string | null;
          id?: string;
          planned_date?: string | null;
          priority?: string | null;
          sort_order?: number | null;
          status?: string | null;
          student_id?: string;
          title?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "planner_tasks_assignment_id_fkey";
            columns: ["assignment_id"];
            isOneToOne: false;
            referencedRelation: "assignments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "planner_tasks_clo_id_fkey";
            columns: ["clo_id"];
            isOneToOne: false;
            referencedRelation: "learning_outcomes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "planner_tasks_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "planner_tasks_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      profiles: {
        Row: {
          accessibility_preferences: Json | null;
          avatar_url: string | null;
          created_at: string;
          email: string;
          full_name: string;
          id: string;
          institution_id: string;
          is_active: boolean;
          language_preference: string;
          last_seen_at: string | null;
          notification_preferences: Json;
          onboarding_completed: boolean;
          portfolio_public: boolean;
          preferred_language: string | null;
          role: Database["public"]["Enums"]["user_role"];
          search_vector: unknown;
          theme_preference: string;
          tos_accepted_at: string | null;
        };
        Insert: {
          accessibility_preferences?: Json | null;
          avatar_url?: string | null;
          created_at?: string;
          email: string;
          full_name: string;
          id: string;
          institution_id: string;
          is_active?: boolean;
          language_preference?: string;
          last_seen_at?: string | null;
          notification_preferences?: Json;
          onboarding_completed?: boolean;
          portfolio_public?: boolean;
          preferred_language?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          search_vector?: unknown;
          theme_preference?: string;
          tos_accepted_at?: string | null;
        };
        Update: {
          accessibility_preferences?: Json | null;
          avatar_url?: string | null;
          created_at?: string;
          email?: string;
          full_name?: string;
          id?: string;
          institution_id?: string;
          is_active?: boolean;
          language_preference?: string;
          last_seen_at?: string | null;
          notification_preferences?: Json;
          onboarding_completed?: boolean;
          portfolio_public?: boolean;
          preferred_language?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          search_vector?: unknown;
          theme_preference?: string;
          tos_accepted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_institution_id_fkey";
            columns: ["institution_id"];
            isOneToOne: false;
            referencedRelation: "institutions";
            referencedColumns: ["id"];
          }
        ];
      };
      program_accreditations: {
        Row: {
          accreditation_body: string;
          accreditation_date: string | null;
          created_at: string;
          framework_version: string | null;
          id: string;
          next_review_date: string | null;
          program_id: string;
          status: string;
        };
        Insert: {
          accreditation_body: string;
          accreditation_date?: string | null;
          created_at?: string;
          framework_version?: string | null;
          id?: string;
          next_review_date?: string | null;
          program_id: string;
          status?: string;
        };
        Update: {
          accreditation_body?: string;
          accreditation_date?: string | null;
          created_at?: string;
          framework_version?: string | null;
          id?: string;
          next_review_date?: string | null;
          program_id?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "program_accreditations_program_id_fkey";
            columns: ["program_id"];
            isOneToOne: false;
            referencedRelation: "programs";
            referencedColumns: ["id"];
          }
        ];
      };
      programs: {
        Row: {
          code: string;
          coordinator_id: string | null;
          created_at: string;
          department_id: string | null;
          description: string | null;
          id: string;
          institution_id: string;
          is_active: boolean;
          name: string;
          name_ar: string | null;
        };
        Insert: {
          code: string;
          coordinator_id?: string | null;
          created_at?: string;
          department_id?: string | null;
          description?: string | null;
          id?: string;
          institution_id: string;
          is_active?: boolean;
          name: string;
          name_ar?: string | null;
        };
        Update: {
          code?: string;
          coordinator_id?: string | null;
          created_at?: string;
          department_id?: string | null;
          description?: string | null;
          id?: string;
          institution_id?: string;
          is_active?: boolean;
          name?: string;
          name_ar?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "programs_coordinator_id_fkey";
            columns: ["coordinator_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "programs_department_id_fkey";
            columns: ["department_id"];
            isOneToOne: false;
            referencedRelation: "departments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "programs_institution_id_fkey";
            columns: ["institution_id"];
            isOneToOne: false;
            referencedRelation: "institutions";
            referencedColumns: ["id"];
          }
        ];
      };
      question_analytics: {
        Row: {
          avg_response_time_seconds: number | null;
          calibrated_difficulty: number | null;
          correct_count: number;
          discrimination_index: number | null;
          id: string;
          last_calculated_at: string;
          quality_flag: string | null;
          question_id: string;
          success_rate: number | null;
          total_attempts: number;
        };
        Insert: {
          avg_response_time_seconds?: number | null;
          calibrated_difficulty?: number | null;
          correct_count?: number;
          discrimination_index?: number | null;
          id?: string;
          last_calculated_at?: string;
          quality_flag?: string | null;
          question_id: string;
          success_rate?: number | null;
          total_attempts?: number;
        };
        Update: {
          avg_response_time_seconds?: number | null;
          calibrated_difficulty?: number | null;
          correct_count?: number;
          discrimination_index?: number | null;
          id?: string;
          last_calculated_at?: string;
          quality_flag?: string | null;
          question_id?: string;
          success_rate?: number | null;
          total_attempts?: number;
        };
        Relationships: [
          {
            foreignKeyName: "question_analytics_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: true;
            referencedRelation: "question_bank";
            referencedColumns: ["id"];
          }
        ];
      };
      question_bank: {
        Row: {
          bloom_level: number;
          clo_id: string;
          correct_answer: Json;
          course_id: string;
          created_at: string;
          created_by: string;
          difficulty_rating: number;
          explanation: string | null;
          explanation_confidence: number | null;
          generation_request_id: string | null;
          generation_source: string;
          id: string;
          institution_id: string;
          labels: string[] | null;
          options: Json | null;
          parent_question_id: string | null;
          question_text: string;
          question_type: string;
          source_chunks: Json | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          bloom_level: number;
          clo_id: string;
          correct_answer: Json;
          course_id: string;
          created_at?: string;
          created_by: string;
          difficulty_rating: number;
          explanation?: string | null;
          explanation_confidence?: number | null;
          generation_request_id?: string | null;
          generation_source: string;
          id?: string;
          institution_id: string;
          labels?: string[] | null;
          options?: Json | null;
          parent_question_id?: string | null;
          question_text: string;
          question_type: string;
          source_chunks?: Json | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          bloom_level?: number;
          clo_id?: string;
          correct_answer?: Json;
          course_id?: string;
          created_at?: string;
          created_by?: string;
          difficulty_rating?: number;
          explanation?: string | null;
          explanation_confidence?: number | null;
          generation_request_id?: string | null;
          generation_source?: string;
          id?: string;
          institution_id?: string;
          labels?: string[] | null;
          options?: Json | null;
          parent_question_id?: string | null;
          question_text?: string;
          question_type?: string;
          source_chunks?: Json | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "question_bank_clo_id_fkey";
            columns: ["clo_id"];
            isOneToOne: false;
            referencedRelation: "learning_outcomes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "question_bank_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "question_bank_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "question_bank_institution_id_fkey";
            columns: ["institution_id"];
            isOneToOne: false;
            referencedRelation: "institutions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "question_bank_parent_question_id_fkey";
            columns: ["parent_question_id"];
            isOneToOne: false;
            referencedRelation: "question_bank";
            referencedColumns: ["id"];
          }
        ];
      };
      quiz_attempts: {
        Row: {
          answers: Json;
          attempt_number: number;
          blooms_climb_state: Json | null;
          difficulty_trajectory: Json | null;
          id: string;
          mode: string;
          per_question_times: Json | null;
          question_sequence: Json | null;
          quiz_id: string;
          score: number | null;
          started_at: string;
          student_id: string;
          submitted_at: string | null;
        };
        Insert: {
          answers?: Json;
          attempt_number?: number;
          blooms_climb_state?: Json | null;
          difficulty_trajectory?: Json | null;
          id?: string;
          mode?: string;
          per_question_times?: Json | null;
          question_sequence?: Json | null;
          quiz_id: string;
          score?: number | null;
          started_at?: string;
          student_id: string;
          submitted_at?: string | null;
        };
        Update: {
          answers?: Json;
          attempt_number?: number;
          blooms_climb_state?: Json | null;
          difficulty_trajectory?: Json | null;
          id?: string;
          mode?: string;
          per_question_times?: Json | null;
          question_sequence?: Json | null;
          quiz_id?: string;
          score?: number | null;
          started_at?: string;
          student_id?: string;
          submitted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey";
            columns: ["quiz_id"];
            isOneToOne: false;
            referencedRelation: "quizzes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quiz_attempts_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      quiz_generation_logs: {
        Row: {
          chunks_retrieved: number;
          completion_tokens: number;
          course_id: string;
          created_at: string;
          error_message: string | null;
          generation_request_id: string;
          id: string;
          institution_id: string;
          latency_ms: number;
          model_used: string;
          prompt_tokens: number;
          question_count_generated: number;
          question_count_requested: number;
          status: string;
          teacher_id: string;
          total_tokens: number;
        };
        Insert: {
          chunks_retrieved: number;
          completion_tokens: number;
          course_id: string;
          created_at?: string;
          error_message?: string | null;
          generation_request_id: string;
          id?: string;
          institution_id: string;
          latency_ms: number;
          model_used: string;
          prompt_tokens: number;
          question_count_generated: number;
          question_count_requested: number;
          status: string;
          teacher_id: string;
          total_tokens: number;
        };
        Update: {
          chunks_retrieved?: number;
          completion_tokens?: number;
          course_id?: string;
          created_at?: string;
          error_message?: string | null;
          generation_request_id?: string;
          id?: string;
          institution_id?: string;
          latency_ms?: number;
          model_used?: string;
          prompt_tokens?: number;
          question_count_generated?: number;
          question_count_requested?: number;
          status?: string;
          teacher_id?: string;
          total_tokens?: number;
        };
        Relationships: [
          {
            foreignKeyName: "quiz_generation_logs_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quiz_generation_logs_institution_id_fkey";
            columns: ["institution_id"];
            isOneToOne: false;
            referencedRelation: "institutions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quiz_generation_logs_teacher_id_fkey";
            columns: ["teacher_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      quiz_questions: {
        Row: {
          correct_answer: Json;
          id: string;
          options: Json | null;
          points: number;
          question_text: string;
          question_type: string;
          quiz_id: string;
          sort_order: number;
        };
        Insert: {
          correct_answer: Json;
          id?: string;
          options?: Json | null;
          points?: number;
          question_text: string;
          question_type: string;
          quiz_id: string;
          sort_order?: number;
        };
        Update: {
          correct_answer?: Json;
          id?: string;
          options?: Json | null;
          points?: number;
          question_text?: string;
          question_type?: string;
          quiz_id?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey";
            columns: ["quiz_id"];
            isOneToOne: false;
            referencedRelation: "quizzes";
            referencedColumns: ["id"];
          }
        ];
      };
      quizzes: {
        Row: {
          adaptation_config: Json | null;
          clo_ids: Json;
          course_id: string;
          created_at: string;
          description: string | null;
          due_date: string;
          id: string;
          is_adaptive: boolean;
          is_published: boolean;
          max_attempts: number;
          practice_mode_enabled: boolean;
          time_limit_minutes: number | null;
          title: string;
        };
        Insert: {
          adaptation_config?: Json | null;
          clo_ids?: Json;
          course_id: string;
          created_at?: string;
          description?: string | null;
          due_date: string;
          id?: string;
          is_adaptive?: boolean;
          is_published?: boolean;
          max_attempts?: number;
          practice_mode_enabled?: boolean;
          time_limit_minutes?: number | null;
          title: string;
        };
        Update: {
          adaptation_config?: Json | null;
          clo_ids?: Json;
          course_id?: string;
          created_at?: string;
          description?: string | null;
          due_date?: string;
          id?: string;
          is_adaptive?: boolean;
          is_published?: boolean;
          max_attempts?: number;
          practice_mode_enabled?: boolean;
          time_limit_minutes?: number | null;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "quizzes_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          }
        ];
      };
      reflection_digests: {
        Row: {
          emotional_trends: Json;
          generated_at: string;
          growth_patterns: Json;
          id: string;
          month: string;
          shared_with: Json;
          student_id: string;
          suggested_focus: Json;
          themes: Json;
        };
        Insert: {
          emotional_trends?: Json;
          generated_at?: string;
          growth_patterns?: Json;
          id?: string;
          month: string;
          shared_with?: Json;
          student_id: string;
          suggested_focus?: Json;
          themes?: Json;
        };
        Update: {
          emotional_trends?: Json;
          generated_at?: string;
          growth_patterns?: Json;
          id?: string;
          month?: string;
          shared_with?: Json;
          student_id?: string;
          suggested_focus?: Json;
          themes?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "reflection_digests_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      reflection_quality_scores: {
        Row: {
          depth_score: number;
          flags: Json;
          id: string;
          originality_score: number;
          reflection_id: string;
          reflection_type: Database["public"]["Enums"]["reflection_type_enum"];
          relevance_score: number;
          score: number;
          scored_at: string;
          student_id: string;
        };
        Insert: {
          depth_score: number;
          flags?: Json;
          id?: string;
          originality_score: number;
          reflection_id: string;
          reflection_type: Database["public"]["Enums"]["reflection_type_enum"];
          relevance_score: number;
          score: number;
          scored_at?: string;
          student_id: string;
        };
        Update: {
          depth_score?: number;
          flags?: Json;
          id?: string;
          originality_score?: number;
          reflection_id?: string;
          reflection_type?: Database["public"]["Enums"]["reflection_type_enum"];
          relevance_score?: number;
          score?: number;
          scored_at?: string;
          student_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reflection_quality_scores_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      replacement_votes: {
        Row: {
          created_at: string;
          expires_at: string;
          id: string;
          initiated_by: string;
          resolved_at: string | null;
          status: string;
          target_member_id: string;
          teacher_override: boolean;
          team_id: string;
          votes_against: number;
          votes_for: number;
        };
        Insert: {
          created_at?: string;
          expires_at: string;
          id?: string;
          initiated_by: string;
          resolved_at?: string | null;
          status?: string;
          target_member_id: string;
          teacher_override?: boolean;
          team_id: string;
          votes_against?: number;
          votes_for?: number;
        };
        Update: {
          created_at?: string;
          expires_at?: string;
          id?: string;
          initiated_by?: string;
          resolved_at?: string | null;
          status?: string;
          target_member_id?: string;
          teacher_override?: boolean;
          team_id?: string;
          votes_against?: number;
          votes_for?: number;
        };
        Relationships: [
          {
            foreignKeyName: "replacement_votes_initiated_by_fkey";
            columns: ["initiated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "replacement_votes_target_member_id_fkey";
            columns: ["target_member_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "replacement_votes_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          }
        ];
      };
      review_schedules: {
        Row: {
          clo_id: string;
          course_id: string | null;
          created_at: string;
          id: string;
          interval_days: number;
          review_date: string;
          review_session_id: string | null;
          source_session_id: string | null;
          status: Database["public"]["Enums"]["review_status_type"];
          student_id: string;
          updated_at: string;
        };
        Insert: {
          clo_id: string;
          course_id?: string | null;
          created_at?: string;
          id?: string;
          interval_days: number;
          review_date: string;
          review_session_id?: string | null;
          source_session_id?: string | null;
          status?: Database["public"]["Enums"]["review_status_type"];
          student_id: string;
          updated_at?: string;
        };
        Update: {
          clo_id?: string;
          course_id?: string | null;
          created_at?: string;
          id?: string;
          interval_days?: number;
          review_date?: string;
          review_session_id?: string | null;
          source_session_id?: string | null;
          status?: Database["public"]["Enums"]["review_status_type"];
          student_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "review_schedules_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "review_schedules_review_session_id_fkey";
            columns: ["review_session_id"];
            isOneToOne: false;
            referencedRelation: "study_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "review_schedules_source_session_id_fkey";
            columns: ["source_session_id"];
            isOneToOne: false;
            referencedRelation: "study_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "review_schedules_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      rubric_criteria: {
        Row: {
          criterion_name: string;
          id: string;
          levels: Json;
          max_points: number;
          rubric_id: string;
          sort_order: number;
        };
        Insert: {
          criterion_name: string;
          id?: string;
          levels?: Json;
          max_points: number;
          rubric_id: string;
          sort_order?: number;
        };
        Update: {
          criterion_name?: string;
          id?: string;
          levels?: Json;
          max_points?: number;
          rubric_id?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "rubric_criteria_rubric_id_fkey";
            columns: ["rubric_id"];
            isOneToOne: false;
            referencedRelation: "rubrics";
            referencedColumns: ["id"];
          }
        ];
      };
      rubrics: {
        Row: {
          clo_id: string | null;
          created_at: string;
          created_by: string | null;
          description: string | null;
          id: string;
          is_template: boolean;
          title: string;
        };
        Insert: {
          clo_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          is_template?: boolean;
          title: string;
        };
        Update: {
          clo_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          is_template?: boolean;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "rubrics_clo_id_fkey";
            columns: ["clo_id"];
            isOneToOne: false;
            referencedRelation: "learning_outcomes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rubrics_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      sale_event_items: {
        Row: {
          item_id: string;
          sale_event_id: string;
        };
        Insert: {
          item_id: string;
          sale_event_id: string;
        };
        Update: {
          item_id?: string;
          sale_event_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sale_event_items_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "marketplace_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sale_event_items_sale_event_id_fkey";
            columns: ["sale_event_id"];
            isOneToOne: false;
            referencedRelation: "sale_events";
            referencedColumns: ["id"];
          }
        ];
      };
      sale_events: {
        Row: {
          created_at: string;
          created_by: string;
          discount_percentage: number;
          end_date: string;
          id: string;
          institution_id: string;
          name: string;
          start_date: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          discount_percentage: number;
          end_date: string;
          id?: string;
          institution_id: string;
          name: string;
          start_date: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          discount_percentage?: number;
          end_date?: string;
          id?: string;
          institution_id?: string;
          name?: string;
          start_date?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sale_events_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sale_events_institution_id_fkey";
            columns: ["institution_id"];
            isOneToOne: false;
            referencedRelation: "institutions";
            referencedColumns: ["id"];
          }
        ];
      };
      semesters: {
        Row: {
          code: string;
          created_at: string;
          end_date: string;
          id: string;
          institution_id: string;
          is_active: boolean;
          name: string;
          start_date: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          end_date: string;
          id?: string;
          institution_id: string;
          is_active?: boolean;
          name: string;
          start_date: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          end_date?: string;
          id?: string;
          institution_id?: string;
          is_active?: boolean;
          name?: string;
          start_date?: string;
        };
        Relationships: [
          {
            foreignKeyName: "semesters_institution_id_fkey";
            columns: ["institution_id"];
            isOneToOne: false;
            referencedRelation: "institutions";
            referencedColumns: ["id"];
          }
        ];
      };
      session_evidence: {
        Row: {
          content: string | null;
          created_at: string | null;
          evidence_type: string;
          file_name: string | null;
          file_size_bytes: number | null;
          file_url: string | null;
          id: string;
          mime_type: string | null;
          notes: string | null;
          session_id: string;
          student_id: string | null;
        };
        Insert: {
          content?: string | null;
          created_at?: string | null;
          evidence_type: string;
          file_name?: string | null;
          file_size_bytes?: number | null;
          file_url?: string | null;
          id?: string;
          mime_type?: string | null;
          notes?: string | null;
          session_id: string;
          student_id?: string | null;
        };
        Update: {
          content?: string | null;
          created_at?: string | null;
          evidence_type?: string;
          file_name?: string | null;
          file_size_bytes?: number | null;
          file_url?: string | null;
          id?: string;
          mime_type?: string | null;
          notes?: string | null;
          session_id?: string;
          student_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "session_evidence_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "study_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "session_evidence_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      session_intents: {
        Row: {
          concept: string;
          created_at: string;
          id: string;
          is_auto_suggested: boolean;
          session_id: string;
          student_id: string;
          success_criterion: string;
        };
        Insert: {
          concept: string;
          created_at?: string;
          id?: string;
          is_auto_suggested?: boolean;
          session_id: string;
          student_id: string;
          success_criterion: string;
        };
        Update: {
          concept?: string;
          created_at?: string;
          id?: string;
          is_auto_suggested?: boolean;
          session_id?: string;
          student_id?: string;
          success_criterion?: string;
        };
        Relationships: [
          {
            foreignKeyName: "session_intents_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: true;
            referencedRelation: "study_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "session_intents_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      session_reflections: {
        Row: {
          content: string;
          created_at: string;
          id: string;
          session_id: string;
          student_id: string;
          word_count: number;
        };
        Insert: {
          content: string;
          created_at?: string;
          id?: string;
          session_id: string;
          student_id: string;
          word_count: number;
        };
        Update: {
          content?: string;
          created_at?: string;
          id?: string;
          session_id?: string;
          student_id?: string;
          word_count?: number;
        };
        Relationships: [
          {
            foreignKeyName: "session_reflections_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "study_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "session_reflections_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      social_challenges: {
        Row: {
          challenge_type: string;
          course_id: string;
          created_at: string;
          created_by: string;
          description: string;
          end_date: string;
          goal_target: number;
          id: string;
          institution_id: string;
          participation_mode: string;
          reward_badge_id: string | null;
          reward_xp: number;
          start_date: string;
          status: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          challenge_type: string;
          course_id: string;
          created_at?: string;
          created_by: string;
          description?: string;
          end_date: string;
          goal_target: number;
          id?: string;
          institution_id: string;
          participation_mode?: string;
          reward_badge_id?: string | null;
          reward_xp?: number;
          start_date: string;
          status?: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          challenge_type?: string;
          course_id?: string;
          created_at?: string;
          created_by?: string;
          description?: string;
          end_date?: string;
          goal_target?: number;
          id?: string;
          institution_id?: string;
          participation_mode?: string;
          reward_badge_id?: string | null;
          reward_xp?: number;
          start_date?: string;
          status?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "social_challenges_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "social_challenges_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "social_challenges_institution_id_fkey";
            columns: ["institution_id"];
            isOneToOne: false;
            referencedRelation: "institutions";
            referencedColumns: ["id"];
          }
        ];
      };
      starter_week_sessions: {
        Row: {
          course_id: string | null;
          created_at: string;
          description: string;
          duration_minutes: number;
          id: string;
          planner_entry_id: string | null;
          session_type: string;
          status: string;
          student_id: string;
          suggested_date: string;
          suggested_time_slot: string;
          updated_at: string;
        };
        Insert: {
          course_id?: string | null;
          created_at?: string;
          description: string;
          duration_minutes: number;
          id?: string;
          planner_entry_id?: string | null;
          session_type: string;
          status?: string;
          student_id: string;
          suggested_date: string;
          suggested_time_slot: string;
          updated_at?: string;
        };
        Update: {
          course_id?: string | null;
          created_at?: string;
          description?: string;
          duration_minutes?: number;
          id?: string;
          planner_entry_id?: string | null;
          session_type?: string;
          status?: string;
          student_id?: string;
          suggested_date?: string;
          suggested_time_slot?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "starter_week_sessions_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "starter_week_sessions_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      student_active_boosts: {
        Row: {
          activated_at: string;
          boost_type: string;
          expires_at: string;
          id: string;
          multiplier: number;
          purchase_id: string;
          student_id: string;
        };
        Insert: {
          activated_at?: string;
          boost_type?: string;
          expires_at: string;
          id?: string;
          multiplier?: number;
          purchase_id: string;
          student_id: string;
        };
        Update: {
          activated_at?: string;
          boost_type?: string;
          expires_at?: string;
          id?: string;
          multiplier?: number;
          purchase_id?: string;
          student_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "student_active_boosts_purchase_id_fkey";
            columns: ["purchase_id"];
            isOneToOne: false;
            referencedRelation: "xp_purchases";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "student_active_boosts_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      student_activity_log: {
        Row: {
          created_at: string;
          event_type: string;
          id: string;
          metadata: Json | null;
          student_id: string;
        };
        Insert: {
          created_at?: string;
          event_type: string;
          id?: string;
          metadata?: Json | null;
          student_id: string;
        };
        Update: {
          created_at?: string;
          event_type?: string;
          id?: string;
          metadata?: Json | null;
          student_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "student_activity_log_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      student_content: {
        Row: {
          clo_id: string | null;
          content_data: Json;
          content_type: string;
          created_at: string;
          id: string;
          institution_id: string;
          reviewed_at: string | null;
          reviewer_feedback: string | null;
          reviewer_id: string | null;
          status: string;
          student_id: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          clo_id?: string | null;
          content_data?: Json;
          content_type: string;
          created_at?: string;
          id?: string;
          institution_id: string;
          reviewed_at?: string | null;
          reviewer_feedback?: string | null;
          reviewer_id?: string | null;
          status?: string;
          student_id: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          clo_id?: string | null;
          content_data?: Json;
          content_type?: string;
          created_at?: string;
          id?: string;
          institution_id?: string;
          reviewed_at?: string | null;
          reviewer_feedback?: string | null;
          reviewer_id?: string | null;
          status?: string;
          student_id?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "student_content_clo_id_fkey";
            columns: ["clo_id"];
            isOneToOne: false;
            referencedRelation: "learning_outcomes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "student_content_institution_id_fkey";
            columns: ["institution_id"];
            isOneToOne: false;
            referencedRelation: "institutions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "student_content_reviewer_id_fkey";
            columns: ["reviewer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "student_content_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      student_courses: {
        Row: {
          course_id: string;
          enrolled_at: string;
          id: string;
          section_id: string | null;
          status: string;
          student_id: string;
        };
        Insert: {
          course_id: string;
          enrolled_at?: string;
          id?: string;
          section_id?: string | null;
          status?: string;
          student_id: string;
        };
        Update: {
          course_id?: string;
          enrolled_at?: string;
          id?: string;
          section_id?: string | null;
          status?: string;
          student_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "student_courses_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "student_courses_section_id_fkey";
            columns: ["section_id"];
            isOneToOne: false;
            referencedRelation: "course_sections";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "student_courses_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      student_equipped_items: {
        Row: {
          equipped_at: string;
          id: string;
          purchase_id: string;
          slot: Database["public"]["Enums"]["cosmetic_slot"];
          student_id: string;
        };
        Insert: {
          equipped_at?: string;
          id?: string;
          purchase_id: string;
          slot: Database["public"]["Enums"]["cosmetic_slot"];
          student_id: string;
        };
        Update: {
          equipped_at?: string;
          id?: string;
          purchase_id?: string;
          slot?: Database["public"]["Enums"]["cosmetic_slot"];
          student_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "student_equipped_items_purchase_id_fkey";
            columns: ["purchase_id"];
            isOneToOne: false;
            referencedRelation: "xp_purchases";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "student_equipped_items_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      student_gamification: {
        Row: {
          comeback_active: boolean | null;
          comeback_challenge_active: boolean;
          comeback_challenge_days_completed: number;
          comeback_challenge_start_date: string | null;
          comeback_challenge_streak_to_restore: number;
          comeback_days_completed: number | null;
          comeback_streak_to_restore: number | null;
          habit_difficulty_level: string | null;
          habit_level_streak: number | null;
          id: string;
          last_login_date: string | null;
          leaderboard_anonymous: boolean;
          league_tier: string;
          level: number;
          streak_current: number;
          streak_freezes_available: number;
          streak_longest: number;
          student_id: string;
          total_active_days: number;
          updated_at: string;
          xp_total: number;
        };
        Insert: {
          comeback_active?: boolean | null;
          comeback_challenge_active?: boolean;
          comeback_challenge_days_completed?: number;
          comeback_challenge_start_date?: string | null;
          comeback_challenge_streak_to_restore?: number;
          comeback_days_completed?: number | null;
          comeback_streak_to_restore?: number | null;
          habit_difficulty_level?: string | null;
          habit_level_streak?: number | null;
          id?: string;
          last_login_date?: string | null;
          leaderboard_anonymous?: boolean;
          league_tier?: string;
          level?: number;
          streak_current?: number;
          streak_freezes_available?: number;
          streak_longest?: number;
          student_id: string;
          total_active_days?: number;
          updated_at?: string;
          xp_total?: number;
        };
        Update: {
          comeback_active?: boolean | null;
          comeback_challenge_active?: boolean;
          comeback_challenge_days_completed?: number;
          comeback_challenge_start_date?: string | null;
          comeback_challenge_streak_to_restore?: number;
          comeback_days_completed?: number | null;
          comeback_streak_to_restore?: number | null;
          habit_difficulty_level?: string | null;
          habit_level_streak?: number | null;
          id?: string;
          last_login_date?: string | null;
          leaderboard_anonymous?: boolean;
          league_tier?: string;
          level?: number;
          streak_current?: number;
          streak_freezes_available?: number;
          streak_longest?: number;
          student_id?: string;
          total_active_days?: number;
          updated_at?: string;
          xp_total?: number;
        };
        Relationships: [
          {
            foreignKeyName: "student_gamification_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      student_profiles: {
        Row: {
          assessment_version: number;
          completed_at: string;
          created_at: string;
          id: string;
          institution_id: string;
          learning_style: Json | null;
          personality_traits: Json | null;
          profile_completeness: number;
          self_efficacy: Json | null;
          student_id: string;
          study_strategies: Json | null;
        };
        Insert: {
          assessment_version?: number;
          completed_at?: string;
          created_at?: string;
          id?: string;
          institution_id: string;
          learning_style?: Json | null;
          personality_traits?: Json | null;
          profile_completeness?: number;
          self_efficacy?: Json | null;
          student_id: string;
          study_strategies?: Json | null;
        };
        Update: {
          assessment_version?: number;
          completed_at?: string;
          created_at?: string;
          id?: string;
          institution_id?: string;
          learning_style?: Json | null;
          personality_traits?: Json | null;
          profile_completeness?: number;
          self_efficacy?: Json | null;
          student_id?: string;
          study_strategies?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "student_profiles_institution_id_fkey";
            columns: ["institution_id"];
            isOneToOne: false;
            referencedRelation: "institutions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "student_profiles_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      student_quest_progress: {
        Row: {
          completed_at: string | null;
          id: string;
          quest_id: string;
          reward_claimed: boolean;
          started_at: string;
          status: string;
          student_id: string;
        };
        Insert: {
          completed_at?: string | null;
          id?: string;
          quest_id: string;
          reward_claimed?: boolean;
          started_at?: string;
          status?: string;
          student_id: string;
        };
        Update: {
          completed_at?: string | null;
          id?: string;
          quest_id?: string;
          reward_claimed?: boolean;
          started_at?: string;
          status?: string;
          student_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "student_quest_progress_quest_id_fkey";
            columns: ["quest_id"];
            isOneToOne: false;
            referencedRelation: "knowledge_quests";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "student_quest_progress_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      student_wellness_preferences: {
        Row: {
          created_at: string;
          dismissed_onboarding_tips: string[];
          enabled_habits: string[];
          habit_targets: Json;
          id: string;
          parent_visibility: boolean;
          reminder_times: Json;
          student_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          dismissed_onboarding_tips?: string[];
          enabled_habits?: string[];
          habit_targets?: Json;
          id?: string;
          parent_visibility?: boolean;
          reminder_times?: Json;
          student_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          dismissed_onboarding_tips?: string[];
          enabled_habits?: string[];
          habit_targets?: Json;
          id?: string;
          parent_visibility?: boolean;
          reminder_times?: Json;
          student_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "student_wellness_preferences_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      study_sessions: {
        Row: {
          actual_duration_minutes: number | null;
          actual_end_at: string | null;
          actual_start_at: string | null;
          clo_id: string | null;
          clo_ids: string[] | null;
          course_id: string | null;
          created_at: string | null;
          description: string | null;
          ended_at: string | null;
          flow_rating: number | null;
          id: string;
          intent: string | null;
          planned_date: string | null;
          planned_duration_minutes: number | null;
          planned_start_time: string | null;
          reflection: string | null;
          satisfaction_rating: number | null;
          session_type: string;
          started_at: string;
          status: Database["public"]["Enums"]["session_status_type"] | null;
          student_id: string;
          timer_mode: Database["public"]["Enums"]["timer_mode_type"] | null;
          title: string | null;
          updated_at: string | null;
        };
        Insert: {
          actual_duration_minutes?: number | null;
          actual_end_at?: string | null;
          actual_start_at?: string | null;
          clo_id?: string | null;
          clo_ids?: string[] | null;
          course_id?: string | null;
          created_at?: string | null;
          description?: string | null;
          ended_at?: string | null;
          flow_rating?: number | null;
          id?: string;
          intent?: string | null;
          planned_date?: string | null;
          planned_duration_minutes?: number | null;
          planned_start_time?: string | null;
          reflection?: string | null;
          satisfaction_rating?: number | null;
          session_type?: string;
          started_at: string;
          status?: Database["public"]["Enums"]["session_status_type"] | null;
          student_id: string;
          timer_mode?: Database["public"]["Enums"]["timer_mode_type"] | null;
          title?: string | null;
          updated_at?: string | null;
        };
        Update: {
          actual_duration_minutes?: number | null;
          actual_end_at?: string | null;
          actual_start_at?: string | null;
          clo_id?: string | null;
          clo_ids?: string[] | null;
          course_id?: string | null;
          created_at?: string | null;
          description?: string | null;
          ended_at?: string | null;
          flow_rating?: number | null;
          id?: string;
          intent?: string | null;
          planned_date?: string | null;
          planned_duration_minutes?: number | null;
          planned_start_time?: string | null;
          reflection?: string | null;
          satisfaction_rating?: number | null;
          session_type?: string;
          started_at?: string;
          status?: Database["public"]["Enums"]["session_status_type"] | null;
          student_id?: string;
          timer_mode?: Database["public"]["Enums"]["timer_mode_type"] | null;
          title?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "study_sessions_clo_id_fkey";
            columns: ["clo_id"];
            isOneToOne: false;
            referencedRelation: "learning_outcomes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "study_sessions_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "study_sessions_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      sub_clos: {
        Row: {
          clo_id: string;
          created_at: string | null;
          description: string | null;
          id: string;
          sort_order: number | null;
          title: string;
        };
        Insert: {
          clo_id: string;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          sort_order?: number | null;
          title: string;
        };
        Update: {
          clo_id?: string;
          created_at?: string | null;
          description?: string | null;
          id?: string;
          sort_order?: number | null;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sub_clos_clo_id_fkey";
            columns: ["clo_id"];
            isOneToOne: false;
            referencedRelation: "learning_outcomes";
            referencedColumns: ["id"];
          }
        ];
      };
      submissions: {
        Row: {
          assignment_id: string;
          file_url: string | null;
          id: string;
          is_late: boolean;
          plagiarism_score: number | null;
          status: Database["public"]["Enums"]["submission_status"];
          student_id: string;
          submitted_at: string;
          text_content: string | null;
        };
        Insert: {
          assignment_id: string;
          file_url?: string | null;
          id?: string;
          is_late?: boolean;
          plagiarism_score?: number | null;
          status?: Database["public"]["Enums"]["submission_status"];
          student_id: string;
          submitted_at?: string;
          text_content?: string | null;
        };
        Update: {
          assignment_id?: string;
          file_url?: string | null;
          id?: string;
          is_late?: boolean;
          plagiarism_score?: number | null;
          status?: Database["public"]["Enums"]["submission_status"];
          student_id?: string;
          submitted_at?: string;
          text_content?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "submissions_assignment_id_fkey";
            columns: ["assignment_id"];
            isOneToOne: false;
            referencedRelation: "assignments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "submissions_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      survey_questions: {
        Row: {
          id: string;
          options: Json | null;
          question_text: string;
          question_type: string;
          sort_order: number;
          survey_id: string;
        };
        Insert: {
          id?: string;
          options?: Json | null;
          question_text: string;
          question_type: string;
          sort_order?: number;
          survey_id: string;
        };
        Update: {
          id?: string;
          options?: Json | null;
          question_text?: string;
          question_type?: string;
          sort_order?: number;
          survey_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "survey_questions_survey_id_fkey";
            columns: ["survey_id"];
            isOneToOne: false;
            referencedRelation: "surveys";
            referencedColumns: ["id"];
          }
        ];
      };
      survey_responses: {
        Row: {
          created_at: string;
          id: string;
          question_id: string;
          respondent_id: string;
          response_value: string;
          survey_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          question_id: string;
          respondent_id: string;
          response_value: string;
          survey_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          question_id?: string;
          respondent_id?: string;
          response_value?: string;
          survey_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "survey_responses_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: false;
            referencedRelation: "survey_questions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "survey_responses_respondent_id_fkey";
            columns: ["respondent_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "survey_responses_survey_id_fkey";
            columns: ["survey_id"];
            isOneToOne: false;
            referencedRelation: "surveys";
            referencedColumns: ["id"];
          }
        ];
      };
      surveys: {
        Row: {
          created_at: string;
          id: string;
          institution_id: string;
          is_active: boolean;
          target_outcomes: Json;
          title: string;
          type: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          institution_id: string;
          is_active?: boolean;
          target_outcomes?: Json;
          title: string;
          type: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          institution_id?: string;
          is_active?: boolean;
          target_outcomes?: Json;
          title?: string;
          type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "surveys_institution_id_fkey";
            columns: ["institution_id"];
            isOneToOne: false;
            referencedRelation: "institutions";
            referencedColumns: ["id"];
          }
        ];
      };
      teacher_handoff_requests: {
        Row: {
          clo_id: string | null;
          conversation_id: string;
          conversation_summary: string;
          course_id: string;
          created_at: string;
          id: string;
          institution_id: string;
          resolved_at: string | null;
          status: string;
          student_consent: boolean;
          student_id: string;
          suggested_intervention: string;
          teacher_id: string;
          teacher_response: string | null;
          trigger_reason: string;
        };
        Insert: {
          clo_id?: string | null;
          conversation_id: string;
          conversation_summary: string;
          course_id: string;
          created_at?: string;
          id?: string;
          institution_id: string;
          resolved_at?: string | null;
          status?: string;
          student_consent?: boolean;
          student_id: string;
          suggested_intervention: string;
          teacher_id: string;
          teacher_response?: string | null;
          trigger_reason: string;
        };
        Update: {
          clo_id?: string | null;
          conversation_id?: string;
          conversation_summary?: string;
          course_id?: string;
          created_at?: string;
          id?: string;
          institution_id?: string;
          resolved_at?: string | null;
          status?: string;
          student_consent?: boolean;
          student_id?: string;
          suggested_intervention?: string;
          teacher_id?: string;
          teacher_response?: string | null;
          trigger_reason?: string;
        };
        Relationships: [
          {
            foreignKeyName: "teacher_handoff_requests_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "tutor_conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "teacher_handoff_requests_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "teacher_handoff_requests_institution_id_fkey";
            columns: ["institution_id"];
            isOneToOne: false;
            referencedRelation: "institutions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "teacher_handoff_requests_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "teacher_handoff_requests_teacher_id_fkey";
            columns: ["teacher_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      teaching_moment_ratings: {
        Row: {
          clarity_rating: number;
          helpfulness_rating: number;
          id: string;
          rated_at: string;
          teaching_moment_id: string;
          viewer_id: string;
        };
        Insert: {
          clarity_rating: number;
          helpfulness_rating: number;
          id?: string;
          rated_at?: string;
          teaching_moment_id: string;
          viewer_id: string;
        };
        Update: {
          clarity_rating?: number;
          helpfulness_rating?: number;
          id?: string;
          rated_at?: string;
          teaching_moment_id?: string;
          viewer_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "teaching_moment_ratings_teaching_moment_id_fkey";
            columns: ["teaching_moment_id"];
            isOneToOne: false;
            referencedRelation: "peer_teaching_moments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "teaching_moment_ratings_viewer_id_fkey";
            columns: ["viewer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      teaching_moment_views: {
        Row: {
          id: string;
          pre_view_attainment: number | null;
          teaching_moment_id: string;
          viewed_at: string;
          viewer_id: string;
        };
        Insert: {
          id?: string;
          pre_view_attainment?: number | null;
          teaching_moment_id: string;
          viewed_at?: string;
          viewer_id: string;
        };
        Update: {
          id?: string;
          pre_view_attainment?: number | null;
          teaching_moment_id?: string;
          viewed_at?: string;
          viewer_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "teaching_moment_views_teaching_moment_id_fkey";
            columns: ["teaching_moment_id"];
            isOneToOne: false;
            referencedRelation: "peer_teaching_moments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "teaching_moment_views_viewer_id_fkey";
            columns: ["viewer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      team_badges: {
        Row: {
          badge_key: string;
          earned_at: string;
          id: string;
          team_id: string;
        };
        Insert: {
          badge_key: string;
          earned_at?: string;
          id?: string;
          team_id: string;
        };
        Update: {
          badge_key?: string;
          earned_at?: string;
          id?: string;
          team_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "team_badges_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          }
        ];
      };
      team_health_snapshots: {
        Row: {
          activity_overlap_rate: number;
          challenge_participation_rate: number;
          computed_at: string;
          engagement_trend: string;
          gini_coefficient: number;
          health_score: number;
          id: string;
          team_id: string;
        };
        Insert: {
          activity_overlap_rate: number;
          challenge_participation_rate: number;
          computed_at?: string;
          engagement_trend: string;
          gini_coefficient: number;
          health_score: number;
          id?: string;
          team_id: string;
        };
        Update: {
          activity_overlap_rate?: number;
          challenge_participation_rate?: number;
          computed_at?: string;
          engagement_trend?: string;
          gini_coefficient?: number;
          health_score?: number;
          id?: string;
          team_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "team_health_snapshots_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          }
        ];
      };
      team_invitations: {
        Row: {
          created_at: string;
          id: string;
          invited_by: string;
          invited_student_id: string;
          responded_at: string | null;
          status: string;
          team_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          invited_by: string;
          invited_student_id: string;
          responded_at?: string | null;
          status?: string;
          team_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          invited_by?: string;
          invited_student_id?: string;
          responded_at?: string | null;
          status?: string;
          team_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "team_invitations_invited_by_fkey";
            columns: ["invited_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_invitations_invited_student_id_fkey";
            columns: ["invited_student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_invitations_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          }
        ];
      };
      team_members: {
        Row: {
          consecutive_low_days: number;
          contribution_status: string;
          contribution_status_since: string | null;
          id: string;
          joined_at: string;
          left_at: string | null;
          role: string;
          student_id: string;
          team_id: string;
        };
        Insert: {
          consecutive_low_days?: number;
          contribution_status?: string;
          contribution_status_since?: string | null;
          id?: string;
          joined_at?: string;
          left_at?: string | null;
          role?: string;
          student_id: string;
          team_id: string;
        };
        Update: {
          consecutive_low_days?: number;
          contribution_status?: string;
          contribution_status_since?: string | null;
          id?: string;
          joined_at?: string;
          left_at?: string | null;
          role?: string;
          student_id?: string;
          team_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "team_members_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_members_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          }
        ];
      };
      teams: {
        Row: {
          captain_id: string;
          cooperation_score: number;
          course_id: string;
          created_at: string;
          created_by: string;
          deleted_at: string | null;
          health_score: number;
          health_status: string;
          id: string;
          institution_id: string;
          name: string;
          streak_count: number;
          streak_last_active_date: string | null;
          updated_at: string;
          xp_total: number;
        };
        Insert: {
          captain_id: string;
          cooperation_score?: number;
          course_id: string;
          created_at?: string;
          created_by: string;
          deleted_at?: string | null;
          health_score?: number;
          health_status?: string;
          id?: string;
          institution_id: string;
          name: string;
          streak_count?: number;
          streak_last_active_date?: string | null;
          updated_at?: string;
          xp_total?: number;
        };
        Update: {
          captain_id?: string;
          cooperation_score?: number;
          course_id?: string;
          created_at?: string;
          created_by?: string;
          deleted_at?: string | null;
          health_score?: number;
          health_status?: string;
          id?: string;
          institution_id?: string;
          name?: string;
          streak_count?: number;
          streak_last_active_date?: string | null;
          updated_at?: string;
          xp_total?: number;
        };
        Relationships: [
          {
            foreignKeyName: "teams_captain_id_fkey";
            columns: ["captain_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "teams_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "teams_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "teams_institution_id_fkey";
            columns: ["institution_id"];
            isOneToOne: false;
            referencedRelation: "institutions";
            referencedColumns: ["id"];
          }
        ];
      };
      timetable_slots: {
        Row: {
          day_of_week: number;
          end_time: string;
          id: string;
          room: string | null;
          section_id: string;
          slot_type: string;
          start_time: string;
        };
        Insert: {
          day_of_week: number;
          end_time: string;
          id?: string;
          room?: string | null;
          section_id: string;
          slot_type: string;
          start_time: string;
        };
        Update: {
          day_of_week?: number;
          end_time?: string;
          id?: string;
          room?: string | null;
          section_id?: string;
          slot_type?: string;
          start_time?: string;
        };
        Relationships: [
          {
            foreignKeyName: "timetable_slots_section_id_fkey";
            columns: ["section_id"];
            isOneToOne: false;
            referencedRelation: "course_sections";
            referencedColumns: ["id"];
          }
        ];
      };
      tutor_conversations: {
        Row: {
          autonomy_override: string | null;
          clo_scope: string[] | null;
          course_id: string | null;
          created_at: string;
          id: string;
          institution_id: string;
          is_active: boolean;
          message_count: number;
          persona: string;
          student_id: string;
          title: string | null;
          updated_at: string;
          xp_awarded: boolean;
        };
        Insert: {
          autonomy_override?: string | null;
          clo_scope?: string[] | null;
          course_id?: string | null;
          created_at?: string;
          id?: string;
          institution_id: string;
          is_active?: boolean;
          message_count?: number;
          persona?: string;
          student_id: string;
          title?: string | null;
          updated_at?: string;
          xp_awarded?: boolean;
        };
        Update: {
          autonomy_override?: string | null;
          clo_scope?: string[] | null;
          course_id?: string | null;
          created_at?: string;
          id?: string;
          institution_id?: string;
          is_active?: boolean;
          message_count?: number;
          persona?: string;
          student_id?: string;
          title?: string | null;
          updated_at?: string;
          xp_awarded?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "tutor_conversations_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tutor_conversations_institution_id_fkey";
            columns: ["institution_id"];
            isOneToOne: false;
            referencedRelation: "institutions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tutor_conversations_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      tutor_llm_logs: {
        Row: {
          completion_tokens: number;
          conversation_id: string | null;
          created_at: string;
          error_message: string | null;
          id: string;
          institution_id: string;
          latency_ms: number;
          model_used: string;
          prompt_tokens: number;
          status: string;
          student_id: string;
          total_tokens: number;
        };
        Insert: {
          completion_tokens: number;
          conversation_id?: string | null;
          created_at?: string;
          error_message?: string | null;
          id?: string;
          institution_id: string;
          latency_ms: number;
          model_used: string;
          prompt_tokens: number;
          status: string;
          student_id: string;
          total_tokens: number;
        };
        Update: {
          completion_tokens?: number;
          conversation_id?: string | null;
          created_at?: string;
          error_message?: string | null;
          id?: string;
          institution_id?: string;
          latency_ms?: number;
          model_used?: string;
          prompt_tokens?: number;
          status?: string;
          student_id?: string;
          total_tokens?: number;
        };
        Relationships: [
          {
            foreignKeyName: "tutor_llm_logs_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "tutor_conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tutor_llm_logs_institution_id_fkey";
            columns: ["institution_id"];
            isOneToOne: false;
            referencedRelation: "institutions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tutor_llm_logs_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      tutor_messages: {
        Row: {
          autonomy_level: string | null;
          content: string;
          conversation_id: string;
          created_at: string;
          document_url: string | null;
          flagged_integrity: boolean;
          id: string;
          image_urls: string[] | null;
          nudge_type: string | null;
          role: string;
          satisfaction_rating: string | null;
          source_citations: Json | null;
          token_count: number;
        };
        Insert: {
          autonomy_level?: string | null;
          content: string;
          conversation_id: string;
          created_at?: string;
          document_url?: string | null;
          flagged_integrity?: boolean;
          id?: string;
          image_urls?: string[] | null;
          nudge_type?: string | null;
          role: string;
          satisfaction_rating?: string | null;
          source_citations?: Json | null;
          token_count?: number;
        };
        Update: {
          autonomy_level?: string | null;
          content?: string;
          conversation_id?: string;
          created_at?: string;
          document_url?: string | null;
          flagged_integrity?: boolean;
          id?: string;
          image_urls?: string[] | null;
          nudge_type?: string | null;
          role?: string;
          satisfaction_rating?: string | null;
          source_citations?: Json | null;
          token_count?: number;
        };
        Relationships: [
          {
            foreignKeyName: "tutor_messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "tutor_conversations";
            referencedColumns: ["id"];
          }
        ];
      };
      tutor_plan_updates: {
        Row: {
          clo_id: string;
          conversation_id: string;
          course_id: string;
          created_at: string;
          id: string;
          institution_id: string;
          interaction_count: number;
          modifications: string | null;
          recommended_materials: Json;
          responded_at: string | null;
          response: string | null;
          student_id: string;
          study_time_recommendation: string;
          suggested_planner_sessions: number;
        };
        Insert: {
          clo_id: string;
          conversation_id: string;
          course_id: string;
          created_at?: string;
          id?: string;
          institution_id: string;
          interaction_count: number;
          modifications?: string | null;
          recommended_materials?: Json;
          responded_at?: string | null;
          response?: string | null;
          student_id: string;
          study_time_recommendation: string;
          suggested_planner_sessions?: number;
        };
        Update: {
          clo_id?: string;
          conversation_id?: string;
          course_id?: string;
          created_at?: string;
          id?: string;
          institution_id?: string;
          interaction_count?: number;
          modifications?: string | null;
          recommended_materials?: Json;
          responded_at?: string | null;
          response?: string | null;
          student_id?: string;
          study_time_recommendation?: string;
          suggested_planner_sessions?: number;
        };
        Relationships: [
          {
            foreignKeyName: "tutor_plan_updates_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "tutor_conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tutor_plan_updates_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tutor_plan_updates_institution_id_fkey";
            columns: ["institution_id"];
            isOneToOne: false;
            referencedRelation: "institutions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tutor_plan_updates_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      tutor_usage_limits: {
        Row: {
          created_at: string;
          id: string;
          institution_id: string;
          message_count: number;
          student_id: string;
          token_count: number;
          usage_date: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          institution_id: string;
          message_count?: number;
          student_id: string;
          token_count?: number;
          usage_date?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          institution_id?: string;
          message_count?: number;
          student_id?: string;
          token_count?: number;
          usage_date?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tutor_usage_limits_institution_id_fkey";
            columns: ["institution_id"];
            isOneToOne: false;
            referencedRelation: "institutions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tutor_usage_limits_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      verified_explanations: {
        Row: {
          created_at: string;
          explanation_text: string;
          id: string;
          institution_id: string;
          is_active: boolean;
          question_id: string;
          source: string;
          updated_at: string;
          verified_by: string;
        };
        Insert: {
          created_at?: string;
          explanation_text: string;
          id?: string;
          institution_id: string;
          is_active?: boolean;
          question_id: string;
          source: string;
          updated_at?: string;
          verified_by: string;
        };
        Update: {
          created_at?: string;
          explanation_text?: string;
          id?: string;
          institution_id?: string;
          is_active?: boolean;
          question_id?: string;
          source?: string;
          updated_at?: string;
          verified_by?: string;
        };
        Relationships: [
          {
            foreignKeyName: "verified_explanations_institution_id_fkey";
            columns: ["institution_id"];
            isOneToOne: false;
            referencedRelation: "institutions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "verified_explanations_question_id_fkey";
            columns: ["question_id"];
            isOneToOne: false;
            referencedRelation: "question_bank";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "verified_explanations_verified_by_fkey";
            columns: ["verified_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      weekly_goals: {
        Row: {
          created_at: string | null;
          current_value: number | null;
          goal_text: string;
          goal_type: string | null;
          id: string;
          status: string | null;
          student_id: string;
          target_value: number | null;
          updated_at: string | null;
          week_start: string;
          week_start_date: string | null;
        };
        Insert: {
          created_at?: string | null;
          current_value?: number | null;
          goal_text: string;
          goal_type?: string | null;
          id?: string;
          status?: string | null;
          student_id: string;
          target_value?: number | null;
          updated_at?: string | null;
          week_start: string;
          week_start_date?: string | null;
        };
        Update: {
          created_at?: string | null;
          current_value?: number | null;
          goal_text?: string;
          goal_type?: string | null;
          id?: string;
          status?: string | null;
          student_id?: string;
          target_value?: number | null;
          updated_at?: string | null;
          week_start?: string;
          week_start_date?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "weekly_goals_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      wellness_habit_logs: {
        Row: {
          completed_at: string;
          created_at: string;
          date: string;
          id: string;
          student_id: string;
          value: number | null;
          wellness_type: Database["public"]["Enums"]["wellness_habit_type"];
        };
        Insert: {
          completed_at?: string;
          created_at?: string;
          date: string;
          id?: string;
          student_id: string;
          value?: number | null;
          wellness_type: Database["public"]["Enums"]["wellness_habit_type"];
        };
        Update: {
          completed_at?: string;
          created_at?: string;
          date?: string;
          id?: string;
          student_id?: string;
          value?: number | null;
          wellness_type?: Database["public"]["Enums"]["wellness_habit_type"];
        };
        Relationships: [
          {
            foreignKeyName: "wellness_habit_logs_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      xp_events: {
        Row: {
          bonus_xp: number;
          created_at: string;
          description: string | null;
          ends_at: string | null;
          event_type: string;
          id: string;
          institution_id: string | null;
          is_active: boolean;
          name: string;
          starts_at: string | null;
          xp_multiplier: number;
        };
        Insert: {
          bonus_xp?: number;
          created_at?: string;
          description?: string | null;
          ends_at?: string | null;
          event_type: string;
          id?: string;
          institution_id?: string | null;
          is_active?: boolean;
          name: string;
          starts_at?: string | null;
          xp_multiplier?: number;
        };
        Update: {
          bonus_xp?: number;
          created_at?: string;
          description?: string | null;
          ends_at?: string | null;
          event_type?: string;
          id?: string;
          institution_id?: string | null;
          is_active?: boolean;
          name?: string;
          starts_at?: string | null;
          xp_multiplier?: number;
        };
        Relationships: [
          {
            foreignKeyName: "xp_events_institution_id_fkey";
            columns: ["institution_id"];
            isOneToOne: false;
            referencedRelation: "institutions";
            referencedColumns: ["id"];
          }
        ];
      };
      xp_purchases: {
        Row: {
          consumed_at: string | null;
          id: string;
          institution_id: string | null;
          item_id: string;
          metadata: Json | null;
          purchased_at: string;
          status: Database["public"]["Enums"]["xp_purchase_status"];
          student_id: string;
          xp_cost: number;
        };
        Insert: {
          consumed_at?: string | null;
          id?: string;
          institution_id?: string | null;
          item_id: string;
          metadata?: Json | null;
          purchased_at?: string;
          status?: Database["public"]["Enums"]["xp_purchase_status"];
          student_id: string;
          xp_cost: number;
        };
        Update: {
          consumed_at?: string | null;
          id?: string;
          institution_id?: string | null;
          item_id?: string;
          metadata?: Json | null;
          purchased_at?: string;
          status?: Database["public"]["Enums"]["xp_purchase_status"];
          student_id?: string;
          xp_cost?: number;
        };
        Relationships: [
          {
            foreignKeyName: "xp_purchases_institution_id_fkey";
            columns: ["institution_id"];
            isOneToOne: false;
            referencedRelation: "institutions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "xp_purchases_item_id_fkey";
            columns: ["item_id"];
            isOneToOne: false;
            referencedRelation: "marketplace_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "xp_purchases_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      xp_transactions: {
        Row: {
          base_xp: number | null;
          created_at: string;
          final_xp: number | null;
          id: string;
          multipliers: Json | null;
          note: string | null;
          reference_id: string | null;
          scope: string;
          source: string;
          student_id: string;
          team_id: string | null;
          xp_amount: number;
        };
        Insert: {
          base_xp?: number | null;
          created_at?: string;
          final_xp?: number | null;
          id?: string;
          multipliers?: Json | null;
          note?: string | null;
          reference_id?: string | null;
          scope?: string;
          source: string;
          student_id: string;
          team_id?: string | null;
          xp_amount: number;
        };
        Update: {
          base_xp?: number | null;
          created_at?: string;
          final_xp?: number | null;
          id?: string;
          multipliers?: Json | null;
          note?: string | null;
          reference_id?: string | null;
          scope?: string;
          source?: string;
          student_id?: string;
          team_id?: string | null;
          xp_amount?: number;
        };
        Relationships: [
          {
            foreignKeyName: "xp_transactions_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "xp_transactions_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      leaderboard_weekly: {
        Row: {
          full_name: string | null;
          global_rank: number | null;
          institution_id: string | null;
          level: number | null;
          streak_current: number | null;
          student_id: string | null;
          xp_total: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_institution_id_fkey";
            columns: ["institution_id"];
            isOneToOne: false;
            referencedRelation: "institutions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "student_gamification_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Functions: {
      auth_institution_id: { Args: never; Returns: string };
      auth_user_role: { Args: never; Returns: string };
      badge_auto_archive: { Args: never; Returns: undefined };
      badge_spotlight_auto_rotate: { Args: never; Returns: undefined };
      delete_department_if_no_programs: {
        Args: { dept_id: string };
        Returns: boolean;
      };
      expire_stale_recovery_sessions: { Args: never; Returns: number };
      get_badge_spotlight: {
        Args: { p_student_id: string; p_week_number: number };
        Returns: string;
      };
      get_earn_spend_ratio: {
        Args: { p_institution_id: string };
        Returns: {
          ratio: number;
          status: string;
          total_earned: number;
          total_spent: number;
        }[];
      };
      get_effective_price: {
        Args: { p_institution_id: string; p_item_id: string };
        Returns: number;
      };
      get_leaderboard: {
        Args: { p_institution_id: string };
        Returns: {
          full_name: string;
          global_rank: number;
          level: number;
          streak_current: number;
          student_id: string;
          xp_total: number;
        }[];
      };
      get_wellness_aggregate_stats: {
        Args: { p_institution_id: string };
        Returns: {
          total_logs: number;
          unique_students: number;
          wellness_type: string;
        }[];
      };
      get_xp_balance: { Args: { p_student_id: string }; Returns: number };
      health_check_ping: { Args: never; Returns: boolean };
      increment_team_xp: {
        Args: { p_amount: number; p_team_id: string };
        Returns: undefined;
      };
      is_pgcron_available: { Args: never; Returns: boolean };
      process_marketplace_purchase: {
        Args: {
          p_institution_id: string;
          p_item_id: string;
          p_student_id: string;
        };
        Returns: Json;
      };
      recalculate_dynamic_prices: {
        Args: { p_institution_id: string };
        Returns: undefined;
      };
      recalculate_league_tiers: {
        Args: { p_institution_id: string };
        Returns: undefined;
      };
      search_course_materials: {
        Args: {
          match_clo_ids?: string[];
          match_count?: number;
          match_course_ids: string[];
          match_threshold?: number;
          query_embedding: string;
        };
        Returns: {
          bloom_level: string;
          chunk_text: string;
          clo_ids: string[];
          id: string;
          material_type: string;
          similarity: number;
          source_filename: string;
        }[];
      };
      seed_marketplace_items: {
        Args: { p_institution_id: string };
        Returns: undefined;
      };
    };
    Enums: {
      assignment_type: "assignment" | "quiz" | "project" | "exam";
      attainment_level: "excellent" | "satisfactory" | "developing" | "not_yet";
      attainment_scope: "student_course" | "course" | "program" | "institution";
      blooms_level:
        | "remembering"
        | "understanding"
        | "applying"
        | "analyzing"
        | "evaluating"
        | "creating";
      cosmetic_slot: "profile_theme" | "avatar_frame" | "display_title";
      flow_response_type: "in_the_zone" | "stuck" | "too_easy";
      goal_type_enum: "study_hours" | "sessions_completed" | "tasks_completed";
      marketplace_item_category: "cosmetic" | "educational_perk" | "power_up";
      marketplace_item_sub_category:
        | "profile_theme"
        | "avatar_frame"
        | "display_title"
        | "extra_quiz_attempt"
        | "deadline_extension"
        | "hint_token"
        | "xp_boost"
        | "streak_shield";
      marketplace_stock_type: "unlimited" | "limited" | "one_per_student";
      outcome_type: "ILO" | "PLO" | "CLO" | "SUB_CLO";
      quality_category_type: "thoughtful" | "good_effort" | "needs_detail";
      reflection_template_type: "free_form" | "simple" | "gibbs";
      reflection_type_enum: "session_reflection" | "journal_entry";
      review_status_type: "pending" | "completed" | "skipped";
      session_status_type:
        | "planned"
        | "in_progress"
        | "completed"
        | "cancelled";
      submission_status: "submitted" | "graded";
      task_priority_type: "low" | "medium" | "high";
      task_status_type: "pending" | "completed";
      timer_mode_type: "pomodoro" | "custom";
      user_role: "admin" | "coordinator" | "teacher" | "student" | "parent";
      wellness_habit_type: "meditation" | "hydration" | "exercise" | "sleep";
      xp_purchase_status: "active" | "consumed" | "expired" | "refunded";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
      DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] &
      DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R;
    }
    ? R
    : never
  : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I;
    }
    ? I
    : never
  : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U;
    }
    ? U
    : never
  : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never;

export const Constants = {
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
      cosmetic_slot: ["profile_theme", "avatar_frame", "display_title"],
      flow_response_type: ["in_the_zone", "stuck", "too_easy"],
      goal_type_enum: ["study_hours", "sessions_completed", "tasks_completed"],
      marketplace_item_category: ["cosmetic", "educational_perk", "power_up"],
      marketplace_item_sub_category: [
        "profile_theme",
        "avatar_frame",
        "display_title",
        "extra_quiz_attempt",
        "deadline_extension",
        "hint_token",
        "xp_boost",
        "streak_shield",
      ],
      marketplace_stock_type: ["unlimited", "limited", "one_per_student"],
      outcome_type: ["ILO", "PLO", "CLO", "SUB_CLO"],
      quality_category_type: ["thoughtful", "good_effort", "needs_detail"],
      reflection_template_type: ["free_form", "simple", "gibbs"],
      reflection_type_enum: ["session_reflection", "journal_entry"],
      review_status_type: ["pending", "completed", "skipped"],
      session_status_type: ["planned", "in_progress", "completed", "cancelled"],
      submission_status: ["submitted", "graded"],
      task_priority_type: ["low", "medium", "high"],
      task_status_type: ["pending", "completed"],
      timer_mode_type: ["pomodoro", "custom"],
      user_role: ["admin", "coordinator", "teacher", "student", "parent"],
      wellness_habit_type: ["meditation", "hydration", "exercise", "sleep"],
      xp_purchase_status: ["active", "consumed", "expired", "refunded"],
    },
  },
} as const;
