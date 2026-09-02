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
    PostgrestVersion: "14.5"
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
            foreignKeyName: "academic_calendar_events_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "academic_calendar_events_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "mv_historical_evidence"
            referencedColumns: ["semester_id"]
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
      accreditation_approvals: {
        Row: {
          approver_id: string | null
          created_at: string
          decided_at: string | null
          id: string
          institution_id: string
          notes: string | null
          program_id: string
          sort_order: number
          stage: string
          status: string
          updated_at: string
        }
        Insert: {
          approver_id?: string | null
          created_at?: string
          decided_at?: string | null
          id?: string
          institution_id: string
          notes?: string | null
          program_id: string
          sort_order?: number
          stage: string
          status?: string
          updated_at?: string
        }
        Update: {
          approver_id?: string | null
          created_at?: string
          decided_at?: string | null
          id?: string
          institution_id?: string
          notes?: string | null
          program_id?: string
          sort_order?: number
          stage?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accreditation_approvals_approver_id_fkey"
            columns: ["approver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accreditation_approvals_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accreditation_approvals_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accreditation_approvals_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      accreditation_generated_reports: {
        Row: {
          expires_at: string | null
          file_name: string
          file_size_bytes: number
          generated_at: string
          id: string
          institution_id: string
          job_id: string | null
          mime_type: string
          program_id: string
          storage_path: string
          template: string
        }
        Insert: {
          expires_at?: string | null
          file_name?: string
          file_size_bytes?: number
          generated_at?: string
          id?: string
          institution_id: string
          job_id?: string | null
          mime_type?: string
          program_id: string
          storage_path: string
          template?: string
        }
        Update: {
          expires_at?: string | null
          file_name?: string
          file_size_bytes?: number
          generated_at?: string
          id?: string
          institution_id?: string
          job_id?: string | null
          mime_type?: string
          program_id?: string
          storage_path?: string
          template?: string
        }
        Relationships: [
          {
            foreignKeyName: "accreditation_generated_reports_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accreditation_generated_reports_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accreditation_generated_reports_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "accreditation_report_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accreditation_generated_reports_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      accreditation_report_deliveries: {
        Row: {
          delivery_mode: string
          error_message: string | null
          id: string
          recipient_email: string
          report_id: string | null
          sent_at: string
          status: string
        }
        Insert: {
          delivery_mode?: string
          error_message?: string | null
          id?: string
          recipient_email: string
          report_id?: string | null
          sent_at?: string
          status?: string
        }
        Update: {
          delivery_mode?: string
          error_message?: string | null
          id?: string
          recipient_email?: string
          report_id?: string | null
          sent_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "accreditation_report_deliveries_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "accreditation_generated_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      accreditation_report_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          institution_id: string
          program_id: string
          requested_by: string
          semester_id: string | null
          started_at: string
          status: string
          storage_path: string | null
          template: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          institution_id: string
          program_id: string
          requested_by: string
          semester_id?: string | null
          started_at?: string
          status?: string
          storage_path?: string | null
          template?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          institution_id?: string
          program_id?: string
          requested_by?: string
          semester_id?: string | null
          started_at?: string
          status?: string
          storage_path?: string | null
          template?: string
        }
        Relationships: [
          {
            foreignKeyName: "accreditation_report_jobs_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accreditation_report_jobs_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accreditation_report_jobs_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accreditation_report_jobs_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_bootstrap_requests: {
        Row: {
          consumed_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          institution_id: string
        }
        Insert: {
          consumed_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          institution_id: string
        }
        Update: {
          consumed_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          institution_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_bootstrap_requests_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_bootstrap_requests_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions_public"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_action_executions: {
        Row: {
          executed_at: string
          executed_by: string
          id: string
          idempotency_key: string
          institution_id: string
          learning_state_version: number | null
          proposal_id: string
          result: Json
          run_id: string
          student_id: string | null
          tool_name: string
          tool_version: string
        }
        Insert: {
          executed_at?: string
          executed_by: string
          id?: string
          idempotency_key: string
          institution_id: string
          learning_state_version?: number | null
          proposal_id: string
          result: Json
          run_id: string
          student_id?: string | null
          tool_name: string
          tool_version: string
        }
        Update: {
          executed_at?: string
          executed_by?: string
          id?: string
          idempotency_key?: string
          institution_id?: string
          learning_state_version?: number | null
          proposal_id?: string
          result?: Json
          run_id?: string
          student_id?: string | null
          tool_name?: string
          tool_version?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_action_executions_executed_by_fkey"
            columns: ["executed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_action_executions_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_action_executions_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_action_executions_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: true
            referencedRelation: "agent_action_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_action_executions_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_action_executions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_action_proposals: {
        Row: {
          action_type: string
          actor_user_id: string | null
          course_id: string | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision_reason: string | null
          evidence_hash: string
          evidence_references: Json
          executed_at: string | null
          expires_at: string | null
          id: string
          idempotency_key: string
          institution_id: string
          payload: Json
          program_id: string | null
          reason: string
          required_approver_role: string
          required_approver_user_id: string | null
          risk_classification: string
          run_id: string
          status: string
          student_id: string | null
          tool_version: string | null
        }
        Insert: {
          action_type: string
          actor_user_id?: string | null
          course_id?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_reason?: string | null
          evidence_hash: string
          evidence_references?: Json
          executed_at?: string | null
          expires_at?: string | null
          id?: string
          idempotency_key: string
          institution_id: string
          payload?: Json
          program_id?: string | null
          reason: string
          required_approver_role: string
          required_approver_user_id?: string | null
          risk_classification?: string
          run_id: string
          status?: string
          student_id?: string | null
          tool_version?: string | null
        }
        Update: {
          action_type?: string
          actor_user_id?: string | null
          course_id?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_reason?: string | null
          evidence_hash?: string
          evidence_references?: Json
          executed_at?: string | null
          expires_at?: string | null
          id?: string
          idempotency_key?: string
          institution_id?: string
          payload?: Json
          program_id?: string | null
          reason?: string
          required_approver_role?: string
          required_approver_user_id?: string | null
          risk_classification?: string
          run_id?: string
          status?: string
          student_id?: string | null
          tool_version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_action_proposals_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_action_proposals_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_action_proposals_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_action_proposals_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_action_proposals_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_action_proposals_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_action_proposals_required_approver_user_id_fkey"
            columns: ["required_approver_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_action_proposals_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_action_proposals_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_conversations: {
        Row: {
          actor_role: string
          actor_user_id: string
          created_at: string
          id: string
          institution_id: string
          last_message_at: string | null
          specialist: string
          title: string | null
          updated_at: string
        }
        Insert: {
          actor_role: string
          actor_user_id: string
          created_at?: string
          id?: string
          institution_id: string
          last_message_at?: string | null
          specialist?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          actor_role?: string
          actor_user_id?: string
          created_at?: string
          id?: string
          institution_id?: string
          last_message_at?: string | null
          specialist?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_conversations_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_conversations_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_conversations_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions_public"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_evaluations: {
        Row: {
          citation_score: number | null
          created_at: string
          details: Json
          evaluated_at: string
          evaluator_version: string
          id: string
          institution_id: string
          integrity_score: number | null
          overall_score: number | null
          passed: boolean | null
          run_id: string
          tool_correctness_score: number | null
        }
        Insert: {
          citation_score?: number | null
          created_at?: string
          details?: Json
          evaluated_at?: string
          evaluator_version: string
          id?: string
          institution_id: string
          integrity_score?: number | null
          overall_score?: number | null
          passed?: boolean | null
          run_id: string
          tool_correctness_score?: number | null
        }
        Update: {
          citation_score?: number | null
          created_at?: string
          details?: Json
          evaluated_at?: string
          evaluator_version?: string
          id?: string
          institution_id?: string
          integrity_score?: number | null
          overall_score?: number | null
          passed?: boolean | null
          run_id?: string
          tool_correctness_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_evaluations_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_evaluations_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_evaluations_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_feedback: {
        Row: {
          categories: Json
          comment: string | null
          created_at: string
          id: string
          institution_id: string
          message_id: string | null
          rating: number
          run_id: string | null
          user_id: string
        }
        Insert: {
          categories?: Json
          comment?: string | null
          created_at?: string
          id?: string
          institution_id: string
          message_id?: string | null
          rating: number
          run_id?: string | null
          user_id: string
        }
        Update: {
          categories?: Json
          comment?: string | null
          created_at?: string
          id?: string
          institution_id?: string
          message_id?: string | null
          rating?: number
          run_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_feedback_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_feedback_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_feedback_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "agent_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_feedback_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_feedback_run_tenant_fkey"
            columns: ["run_id", "institution_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id", "institution_id"]
          },
          {
            foreignKeyName: "agent_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_messages: {
        Row: {
          citations: Json
          content: string
          conversation_id: string
          created_at: string
          evidence: Json
          id: string
          role: string
          run_id: string | null
        }
        Insert: {
          citations?: Json
          content: string
          conversation_id: string
          created_at?: string
          evidence?: Json
          id?: string
          role: string
          run_id?: string | null
        }
        Update: {
          citations?: Json
          content?: string
          conversation_id?: string
          created_at?: string
          evidence?: Json
          id?: string
          role?: string
          run_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "agent_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_messages_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_runs: {
        Row: {
          actor_role: string
          actor_user_id: string | null
          completed_at: string | null
          created_at: string
          error_classification: string | null
          id: string
          input_hash: string
          institution_id: string
          latency_ms: number | null
          model: string | null
          provider: string | null
          request_id: string
          session_id: string
          specialist: string
          started_at: string
          status: string
          usage: Json
        }
        Insert: {
          actor_role: string
          actor_user_id?: string | null
          completed_at?: string | null
          created_at?: string
          error_classification?: string | null
          id?: string
          input_hash: string
          institution_id: string
          latency_ms?: number | null
          model?: string | null
          provider?: string | null
          request_id: string
          session_id: string
          specialist: string
          started_at?: string
          status: string
          usage?: Json
        }
        Update: {
          actor_role?: string
          actor_user_id?: string | null
          completed_at?: string | null
          created_at?: string
          error_classification?: string | null
          id?: string
          input_hash?: string
          institution_id?: string
          latency_ms?: number | null
          model?: string | null
          provider?: string | null
          request_id?: string
          session_id?: string
          specialist?: string
          started_at?: string
          status?: string
          usage?: Json
        }
        Relationships: [
          {
            foreignKeyName: "agent_runs_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_runs_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_runs_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions_public"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_tasks: {
        Row: {
          assignee_role: string
          assignee_user_id: string
          completed_at: string | null
          course_id: string | null
          created_at: string
          due_at: string | null
          id: string
          institution_id: string
          payload: Json
          program_id: string | null
          proposal_id: string | null
          source_run_id: string | null
          status: string
          student_id: string | null
          task_type: string
          updated_at: string
        }
        Insert: {
          assignee_role: string
          assignee_user_id: string
          completed_at?: string | null
          course_id?: string | null
          created_at?: string
          due_at?: string | null
          id?: string
          institution_id: string
          payload?: Json
          program_id?: string | null
          proposal_id?: string | null
          source_run_id?: string | null
          status?: string
          student_id?: string | null
          task_type: string
          updated_at?: string
        }
        Update: {
          assignee_role?: string
          assignee_user_id?: string
          completed_at?: string | null
          course_id?: string | null
          created_at?: string
          due_at?: string | null
          id?: string
          institution_id?: string
          payload?: Json
          program_id?: string | null
          proposal_id?: string | null
          source_run_id?: string | null
          status?: string
          student_id?: string | null
          task_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_tasks_assignee_user_id_fkey"
            columns: ["assignee_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_tasks_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_tasks_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_tasks_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_tasks_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_tasks_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "agent_action_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_tasks_source_run_id_fkey"
            columns: ["source_run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_tasks_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_tool_attempts: {
        Row: {
          actor_role: string
          actor_user_id: string | null
          approval_state: string
          completed_at: string | null
          created_at: string
          error_classification: string | null
          evidence_hash: string
          id: string
          idempotency_key: string | null
          institution_id: string
          latency_ms: number | null
          model: string | null
          proposal_id: string | null
          provider: string | null
          request_id: string
          risk_classification: string
          run_id: string
          session_id: string
          specialist: string
          started_at: string
          status: string
          tool_name: string
          tool_version: string
        }
        Insert: {
          actor_role: string
          actor_user_id?: string | null
          approval_state: string
          completed_at?: string | null
          created_at?: string
          error_classification?: string | null
          evidence_hash: string
          id?: string
          idempotency_key?: string | null
          institution_id: string
          latency_ms?: number | null
          model?: string | null
          proposal_id?: string | null
          provider?: string | null
          request_id: string
          risk_classification: string
          run_id: string
          session_id: string
          specialist: string
          started_at?: string
          status: string
          tool_name: string
          tool_version: string
        }
        Update: {
          actor_role?: string
          actor_user_id?: string | null
          approval_state?: string
          completed_at?: string | null
          created_at?: string
          error_classification?: string | null
          evidence_hash?: string
          id?: string
          idempotency_key?: string | null
          institution_id?: string
          latency_ms?: number | null
          model?: string | null
          proposal_id?: string | null
          provider?: string | null
          request_id?: string
          risk_classification?: string
          run_id?: string
          session_id?: string
          specialist?: string
          started_at?: string
          status?: string
          tool_name?: string
          tool_version?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_tool_attempts_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_tool_attempts_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_tool_attempts_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_tool_attempts_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "agent_action_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_tool_attempts_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_assistance_events: {
        Row: {
          created_at: string
          event_type: string
          feature_context: string
          id: string
          institution_id: string
          prompt_summary: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          feature_context: string
          id?: string
          institution_id: string
          prompt_summary?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          feature_context?: string
          id?: string
          institution_id?: string
          prompt_summary?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_assistance_events_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_assistance_events_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_assistance_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      ai_governance_policies: {
        Row: {
          action_key: string
          created_at: string
          hard_cap: string | null
          id: string
          institution_id: string
          level: string
          sensitive: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          action_key: string
          created_at?: string
          hard_cap?: string | null
          id?: string
          institution_id: string
          level: string
          sensitive?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          action_key?: string
          created_at?: string
          hard_cap?: string | null
          id?: string
          institution_id?: string
          level?: string
          sensitive?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_governance_policies_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_governance_policies_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_governance_policies_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_attachments: {
        Row: {
          announcement_id: string
          content_type: string | null
          created_at: string
          file_name: string
          id: string
          size_bytes: number | null
          storage_path: string
        }
        Insert: {
          announcement_id: string
          content_type?: string | null
          created_at?: string
          file_name: string
          id?: string
          size_bytes?: number | null
          storage_path: string
        }
        Update: {
          announcement_id?: string
          content_type?: string | null
          created_at?: string
          file_name?: string
          id?: string
          size_bytes?: number | null
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_attachments_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_reads: {
        Row: {
          announcement_id: string
          id: string
          read_at: string
          student_id: string
        }
        Insert: {
          announcement_id: string
          id?: string
          read_at?: string
          student_id: string
        }
        Update: {
          announcement_id?: string
          id?: string
          read_at?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_reads_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_reads_student_id_fkey"
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
          rubric_id: string | null
          search_vector: unknown
          title: string
          total_marks: number
          tutor_autonomy_level: string | null
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
          rubric_id?: string | null
          search_vector?: unknown
          title: string
          total_marks: number
          tutor_autonomy_level?: string | null
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
          rubric_id?: string | null
          search_vector?: unknown
          title?: string
          total_marks?: number
          tutor_autonomy_level?: string | null
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
          {
            foreignKeyName: "assignments_rubric_id_fkey"
            columns: ["rubric_id"]
            isOneToOne: false
            referencedRelation: "rubrics"
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
      audit_findings: {
        Row: {
          audit_run_id: string
          created_at: string
          detail: Json | null
          id: string
          location_file: string | null
          location_line: number | null
          message: string
          requirement_id: string
          severity: string
          stage: string | null
        }
        Insert: {
          audit_run_id: string
          created_at?: string
          detail?: Json | null
          id?: string
          location_file?: string | null
          location_line?: number | null
          message: string
          requirement_id: string
          severity: string
          stage?: string | null
        }
        Update: {
          audit_run_id?: string
          created_at?: string
          detail?: Json | null
          id?: string
          location_file?: string | null
          location_line?: number | null
          message?: string
          requirement_id?: string
          severity?: string
          stage?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_findings_audit_run_id_fkey"
            columns: ["audit_run_id"]
            isOneToOne: false
            referencedRelation: "audit_runs"
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
          institution_id: string | null
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
          institution_id?: string | null
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
          institution_id?: string | null
          ip_address?: unknown
          target_id?: string | null
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions_public"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_runs: {
        Row: {
          blocker_count: number
          commit_sha: string | null
          created_at: string
          critical_count: number
          env_id: string
          finished_at: string | null
          id: string
          major_count: number
          migration_head: string | null
          minor_count: number
          run_id: string
          started_at: string
          trivial_count: number
          verdict: string
        }
        Insert: {
          blocker_count?: number
          commit_sha?: string | null
          created_at?: string
          critical_count?: number
          env_id: string
          finished_at?: string | null
          id?: string
          major_count?: number
          migration_head?: string | null
          minor_count?: number
          run_id: string
          started_at?: string
          trivial_count?: number
          verdict: string
        }
        Update: {
          blocker_count?: number
          commit_sha?: string | null
          created_at?: string
          critical_count?: number
          env_id?: string
          finished_at?: string | null
          id?: string
          major_count?: number
          migration_head?: string | null
          minor_count?: number
          run_id?: string
          started_at?: string
          trivial_count?: number
          verdict?: string
        }
        Relationships: []
      }
      badge_definitions: {
        Row: {
          badge_key: string
          category: string | null
          created_at: string
          description: string
          emoji: string
          id: string
          institution_id: string
          is_archived: boolean
          name: string
          tier_conditions: Json | null
          updated_at: string
        }
        Insert: {
          badge_key: string
          category?: string | null
          created_at?: string
          description?: string
          emoji?: string
          id?: string
          institution_id: string
          is_archived?: boolean
          name: string
          tier_conditions?: Json | null
          updated_at?: string
        }
        Update: {
          badge_key?: string
          category?: string | null
          created_at?: string
          description?: string
          emoji?: string
          id?: string
          institution_id?: string
          is_archived?: boolean
          name?: string
          tier_conditions?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "badge_definitions_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "badge_definitions_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions_public"
            referencedColumns: ["id"]
          },
        ]
      }
      badge_spotlight_schedule: {
        Row: {
          category: string
          created_at: string
          id: string
          institution_id: string
          is_manual: boolean
          week_start: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          institution_id: string
          is_manual?: boolean
          week_start: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          institution_id?: string
          is_manual?: boolean
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "badge_spotlight_schedule_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "badge_spotlight_schedule_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions_public"
            referencedColumns: ["id"]
          },
        ]
      }
      badges: {
        Row: {
          archived_at: string | null
          awarded_at: string
          badge_key: string
          badge_name: string
          category: string | null
          emoji: string
          id: string
          is_pinned: boolean
          scope: string
          student_id: string
          team_id: string | null
          tier: string
        }
        Insert: {
          archived_at?: string | null
          awarded_at?: string
          badge_key: string
          badge_name: string
          category?: string | null
          emoji?: string
          id?: string
          is_pinned?: boolean
          scope?: string
          student_id: string
          team_id?: string | null
          tier?: string
        }
        Update: {
          archived_at?: string | null
          awarded_at?: string
          badge_key?: string
          badge_name?: string
          category?: string | null
          emoji?: string
          id?: string
          is_pinned?: boolean
          scope?: string
          student_id?: string
          team_id?: string | null
          tier?: string
        }
        Relationships: [
          {
            foreignKeyName: "badges_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "badges_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
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
      blocked_ips: {
        Row: {
          blocked_by: string | null
          blocked_until: string
          created_at: string
          ip_address: unknown
          reason: string
        }
        Insert: {
          blocked_by?: string | null
          blocked_until: string
          created_at?: string
          ip_address: unknown
          reason: string
        }
        Update: {
          blocked_by?: string | null
          blocked_until?: string
          created_at?: string
          ip_address?: unknown
          reason?: string
        }
        Relationships: []
      }
      blooms_progression: {
        Row: {
          bloom_challenger_awarded: boolean
          bloom_explorer_awarded: boolean
          bloom_pioneer_awarded: boolean
          clo_id: string
          correct_count_at_highest: number
          course_id: string
          highest_bloom_level: number
          id: string
          institution_id: string
          student_id: string
          updated_at: string
        }
        Insert: {
          bloom_challenger_awarded?: boolean
          bloom_explorer_awarded?: boolean
          bloom_pioneer_awarded?: boolean
          clo_id: string
          correct_count_at_highest?: number
          course_id: string
          highest_bloom_level?: number
          id?: string
          institution_id: string
          student_id: string
          updated_at?: string
        }
        Update: {
          bloom_challenger_awarded?: boolean
          bloom_explorer_awarded?: boolean
          bloom_pioneer_awarded?: boolean
          clo_id?: string
          correct_count_at_highest?: number
          course_id?: string
          highest_bloom_level?: number
          id?: string
          institution_id?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blooms_progression_clo_id_fkey"
            columns: ["clo_id"]
            isOneToOne: false
            referencedRelation: "learning_outcomes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blooms_progression_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blooms_progression_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blooms_progression_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blooms_progression_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_participants: {
        Row: {
          challenge_id: string
          created_at: string
          current_progress: number
          id: string
          participant_id: string
          participant_type: string
        }
        Insert: {
          challenge_id: string
          created_at?: string
          current_progress?: number
          id?: string
          participant_id: string
          participant_type: string
        }
        Update: {
          challenge_id?: string
          created_at?: string
          current_progress?: number
          id?: string
          participant_id?: string
          participant_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_participants_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "social_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_progress: {
        Row: {
          challenge_id: string
          completed_at: string | null
          current_progress: number
          id: string
          participant_id: string
          participant_type: string
          reward_granted: boolean
          updated_at: string
        }
        Insert: {
          challenge_id: string
          completed_at?: string | null
          current_progress?: number
          id?: string
          participant_id: string
          participant_type?: string
          reward_granted?: boolean
          updated_at?: string
        }
        Update: {
          challenge_id?: string
          completed_at?: string | null
          current_progress?: number
          id?: string
          participant_id?: string
          participant_type?: string
          reward_granted?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_progress_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "social_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      class_donation_contributions: {
        Row: {
          contributed_at: string
          donation_id: string
          id: string
          purchase_id: string | null
          student_id: string
          xp_amount: number
        }
        Insert: {
          contributed_at?: string
          donation_id: string
          id?: string
          purchase_id?: string | null
          student_id: string
          xp_amount: number
        }
        Update: {
          contributed_at?: string
          donation_id?: string
          id?: string
          purchase_id?: string | null
          student_id?: string
          xp_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "class_donation_contributions_donation_id_fkey"
            columns: ["donation_id"]
            isOneToOne: false
            referencedRelation: "class_donations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_donation_contributions_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "xp_purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_donation_contributions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      class_donations: {
        Row: {
          completed_at: string | null
          course_id: string
          created_at: string
          created_by: string
          current_total: number
          goal_amount: number
          id: string
          institution_id: string
          resource_description: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          course_id: string
          created_at?: string
          created_by: string
          current_total?: number
          goal_amount: number
          id?: string
          institution_id: string
          resource_description: string
          status?: string
        }
        Update: {
          completed_at?: string | null
          course_id?: string
          created_at?: string
          created_by?: string
          current_total?: number
          goal_amount?: number
          id?: string
          institution_id?: string
          resource_description?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_donations_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_donations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_donations_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_donations_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions_public"
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
      communication_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          sender_id: string
          thread_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          sender_id: string
          thread_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          sender_id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "communication_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "communication_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_reads: {
        Row: {
          id: string
          message_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          id?: string
          message_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          id?: string
          message_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "communication_reads_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "communication_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_thread_participants: {
        Row: {
          id: string
          joined_at: string
          role: string
          thread_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          role: string
          thread_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          role?: string
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "communication_thread_participants_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "communication_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_thread_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_threads: {
        Row: {
          course_id: string | null
          created_at: string
          created_by: string
          id: string
          institution_id: string
          subject: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          created_by: string
          id?: string
          institution_id: string
          subject: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          created_by?: string
          id?: string
          institution_id?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "communication_threads_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_threads_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_threads_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_threads_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions_public"
            referencedColumns: ["id"]
          },
        ]
      }
      competency_frameworks: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          institution_id: string
          is_active: boolean | null
          name: string
          version: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          institution_id: string
          is_active?: boolean | null
          name: string
          version?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          institution_id?: string
          is_active?: boolean | null
          name?: string
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "competency_frameworks_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competency_frameworks_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions_public"
            referencedColumns: ["id"]
          },
        ]
      }
      competency_items: {
        Row: {
          created_at: string | null
          description: string | null
          framework_id: string
          id: string
          level: number | null
          name: string
          parent_id: string | null
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          framework_id: string
          id?: string
          level?: number | null
          name: string
          parent_id?: string | null
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          framework_id?: string
          id?: string
          level?: number | null
          name?: string
          parent_id?: string | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "competency_items_framework_id_fkey"
            columns: ["framework_id"]
            isOneToOne: false
            referencedRelation: "competency_frameworks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competency_items_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "competency_items"
            referencedColumns: ["id"]
          },
        ]
      }
      competency_outcome_mappings: {
        Row: {
          competency_item_id: string
          created_at: string | null
          id: string
          outcome_id: string
          weight: number | null
        }
        Insert: {
          competency_item_id: string
          created_at?: string | null
          id?: string
          outcome_id: string
          weight?: number | null
        }
        Update: {
          competency_item_id?: string
          created_at?: string | null
          id?: string
          outcome_id?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "competency_outcome_mappings_competency_item_id_fkey"
            columns: ["competency_item_id"]
            isOneToOne: false
            referencedRelation: "competency_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competency_outcome_mappings_outcome_id_fkey"
            columns: ["outcome_id"]
            isOneToOne: false
            referencedRelation: "learning_outcomes"
            referencedColumns: ["id"]
          },
        ]
      }
      connected_integrations: {
        Row: {
          connected_at: string | null
          created_at: string
          id: string
          metadata: Json
          provider: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          connected_at?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          provider: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          connected_at?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          provider?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "connected_integrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coordinator_ai_insights: {
        Row: {
          created_by: string | null
          generated_at: string
          id: string
          institution_id: string
          kind: string
          model: string | null
          payload: Json
          scope_key: string
          source: string
        }
        Insert: {
          created_by?: string | null
          generated_at?: string
          id?: string
          institution_id: string
          kind: string
          model?: string | null
          payload: Json
          scope_key?: string
          source?: string
        }
        Update: {
          created_by?: string | null
          generated_at?: string
          id?: string
          institution_id?: string
          kind?: string
          model?: string | null
          payload?: Json
          scope_key?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "coordinator_ai_insights_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coordinator_ai_insights_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coordinator_ai_insights_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions_public"
            referencedColumns: ["id"]
          },
        ]
      }
      course_material_embeddings: {
        Row: {
          bloom_level: string | null
          chunk_index: number
          chunk_text: string
          clo_ids: string[] | null
          course_id: string
          created_at: string
          embedding: string | null
          embedding_dimensions: number
          embedding_model: string
          embedding_provider: string
          embedding_v2: string | null
          embedding_v3: string | null
          embedding_version: number
          id: string
          indexing_status: string
          institution_id: string
          material_type: string
          source_filename: string
          source_material_id: string | null
          token_count: number
          updated_at: string
        }
        Insert: {
          bloom_level?: string | null
          chunk_index: number
          chunk_text: string
          clo_ids?: string[] | null
          course_id: string
          created_at?: string
          embedding?: string | null
          embedding_dimensions?: number
          embedding_model?: string
          embedding_provider?: string
          embedding_v2?: string | null
          embedding_v3?: string | null
          embedding_version?: number
          id?: string
          indexing_status?: string
          institution_id: string
          material_type: string
          source_filename: string
          source_material_id?: string | null
          token_count: number
          updated_at?: string
        }
        Update: {
          bloom_level?: string | null
          chunk_index?: number
          chunk_text?: string
          clo_ids?: string[] | null
          course_id?: string
          created_at?: string
          embedding?: string | null
          embedding_dimensions?: number
          embedding_model?: string
          embedding_provider?: string
          embedding_v2?: string | null
          embedding_v3?: string | null
          embedding_version?: number
          id?: string
          indexing_status?: string
          institution_id?: string
          material_type?: string
          source_filename?: string
          source_material_id?: string | null
          token_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_material_embeddings_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_material_embeddings_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_material_embeddings_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_material_embeddings_source_material_id_fkey"
            columns: ["source_material_id"]
            isOneToOne: false
            referencedRelation: "course_materials"
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
          color: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          name_ar: string | null
          program_id: string
          search_vector: unknown
          semester: string
          semester_id: string | null
          teacher_id: string | null
          team_formation_mode: string
        }
        Insert: {
          academic_year: string
          code: string
          color?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          name_ar?: string | null
          program_id: string
          search_vector?: unknown
          semester: string
          semester_id?: string | null
          teacher_id?: string | null
          team_formation_mode?: string
        }
        Update: {
          academic_year?: string
          code?: string
          color?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          name_ar?: string | null
          program_id?: string
          search_vector?: unknown
          semester?: string
          semester_id?: string | null
          teacher_id?: string | null
          team_formation_mode?: string
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
            referencedRelation: "mv_historical_evidence"
            referencedColumns: ["semester_id"]
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
      cqi_action_plan_measurements: {
        Row: {
          after_window_end: string | null
          after_window_start: string | null
          baseline_metric: number
          baseline_sample_count: number
          baseline_window_end: string
          baseline_window_start: string
          cohort_fingerprint: string | null
          cohort_member_ids: string[] | null
          cohort_semantics: string
          course_id: string | null
          cqi_action_plan_id: string
          created_at: string
          delta: number | null
          denominator_semantics: string
          evaluation_state: string
          id: string
          institution_id: string
          material_change: number
          measured_at: string | null
          measurement_method_version: string
          outcome_id: string
          post_action_metric: number | null
          post_action_sample_count: number | null
          program_id: string
          systemic_pattern_id: string
          updated_at: string
        }
        Insert: {
          after_window_end?: string | null
          after_window_start?: string | null
          baseline_metric: number
          baseline_sample_count: number
          baseline_window_end: string
          baseline_window_start: string
          cohort_fingerprint?: string | null
          cohort_member_ids?: string[] | null
          cohort_semantics: string
          course_id?: string | null
          cqi_action_plan_id: string
          created_at?: string
          delta?: number | null
          denominator_semantics: string
          evaluation_state?: string
          id?: string
          institution_id: string
          material_change?: number
          measured_at?: string | null
          measurement_method_version: string
          outcome_id: string
          post_action_metric?: number | null
          post_action_sample_count?: number | null
          program_id: string
          systemic_pattern_id: string
          updated_at?: string
        }
        Update: {
          after_window_end?: string | null
          after_window_start?: string | null
          baseline_metric?: number
          baseline_sample_count?: number
          baseline_window_end?: string
          baseline_window_start?: string
          cohort_fingerprint?: string | null
          cohort_member_ids?: string[] | null
          cohort_semantics?: string
          course_id?: string | null
          cqi_action_plan_id?: string
          created_at?: string
          delta?: number | null
          denominator_semantics?: string
          evaluation_state?: string
          id?: string
          institution_id?: string
          material_change?: number
          measured_at?: string | null
          measurement_method_version?: string
          outcome_id?: string
          post_action_metric?: number | null
          post_action_sample_count?: number | null
          program_id?: string
          systemic_pattern_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cqi_action_plan_measurements_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cqi_action_plan_measurements_cqi_action_plan_id_fkey"
            columns: ["cqi_action_plan_id"]
            isOneToOne: true
            referencedRelation: "cqi_action_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cqi_action_plan_measurements_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cqi_action_plan_measurements_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cqi_action_plan_measurements_outcome_id_fkey"
            columns: ["outcome_id"]
            isOneToOne: false
            referencedRelation: "learning_outcomes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cqi_action_plan_measurements_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cqi_action_plan_measurements_systemic_pattern_id_fkey"
            columns: ["systemic_pattern_id"]
            isOneToOne: false
            referencedRelation: "cqi_systemic_patterns"
            referencedColumns: ["id"]
          },
        ]
      }
      cqi_action_plans: {
        Row: {
          action_description: string
          baseline_attainment: number
          created_at: string
          due_date: string | null
          evidence_of_improvement: string | null
          id: string
          outcome_id: string
          outcome_type: string
          program_id: string
          responsible_person: string
          result_attainment: number | null
          root_cause: string | null
          semester_id: string
          source_proposal_id: string | null
          status: string
          systemic_pattern_id: string | null
          target_attainment: number
          updated_at: string
        }
        Insert: {
          action_description: string
          baseline_attainment: number
          created_at?: string
          due_date?: string | null
          evidence_of_improvement?: string | null
          id?: string
          outcome_id: string
          outcome_type: string
          program_id: string
          responsible_person: string
          result_attainment?: number | null
          root_cause?: string | null
          semester_id: string
          source_proposal_id?: string | null
          status?: string
          systemic_pattern_id?: string | null
          target_attainment: number
          updated_at?: string
        }
        Update: {
          action_description?: string
          baseline_attainment?: number
          created_at?: string
          due_date?: string | null
          evidence_of_improvement?: string | null
          id?: string
          outcome_id?: string
          outcome_type?: string
          program_id?: string
          responsible_person?: string
          result_attainment?: number | null
          root_cause?: string | null
          semester_id?: string
          source_proposal_id?: string | null
          status?: string
          systemic_pattern_id?: string | null
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
            referencedRelation: "mv_historical_evidence"
            referencedColumns: ["semester_id"]
          },
          {
            foreignKeyName: "cqi_action_plans_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "semesters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cqi_action_plans_source_proposal_id_fkey"
            columns: ["source_proposal_id"]
            isOneToOne: false
            referencedRelation: "agent_action_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cqi_action_plans_systemic_pattern_id_fkey"
            columns: ["systemic_pattern_id"]
            isOneToOne: false
            referencedRelation: "cqi_systemic_patterns"
            referencedColumns: ["id"]
          },
        ]
      }
      cqi_systemic_patterns: {
        Row: {
          affected_population: number
          baseline_attainment: number
          cooldown_until: string | null
          course_id: string | null
          created_at: string
          current_attainment: number
          evidence_references: Json
          id: string
          institution_id: string
          last_measurement_state: string | null
          occurrence_version: string
          outcome_id: string
          outcome_type: string
          pattern_identity: string
          pattern_kind: string
          policy_version: string
          program_id: string
          sample_count: number
          status: string
          target_threshold: number
          updated_at: string
          window_end: string
          window_start: string
        }
        Insert: {
          affected_population: number
          baseline_attainment: number
          cooldown_until?: string | null
          course_id?: string | null
          created_at?: string
          current_attainment: number
          evidence_references?: Json
          id?: string
          institution_id: string
          last_measurement_state?: string | null
          occurrence_version: string
          outcome_id: string
          outcome_type: string
          pattern_identity: string
          pattern_kind: string
          policy_version: string
          program_id: string
          sample_count: number
          status?: string
          target_threshold: number
          updated_at?: string
          window_end: string
          window_start: string
        }
        Update: {
          affected_population?: number
          baseline_attainment?: number
          cooldown_until?: string | null
          course_id?: string | null
          created_at?: string
          current_attainment?: number
          evidence_references?: Json
          id?: string
          institution_id?: string
          last_measurement_state?: string | null
          occurrence_version?: string
          outcome_id?: string
          outcome_type?: string
          pattern_identity?: string
          pattern_kind?: string
          policy_version?: string
          program_id?: string
          sample_count?: number
          status?: string
          target_threshold?: number
          updated_at?: string
          window_end?: string
          window_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "cqi_systemic_patterns_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cqi_systemic_patterns_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cqi_systemic_patterns_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cqi_systemic_patterns_outcome_id_fkey"
            columns: ["outcome_id"]
            isOneToOne: false
            referencedRelation: "learning_outcomes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cqi_systemic_patterns_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      deadline_extensions: {
        Row: {
          assignment_id: string
          created_at: string
          extended_deadline: string
          id: string
          original_deadline: string
          purchase_id: string
          revoked: boolean
          revoked_by: string | null
          student_id: string
        }
        Insert: {
          assignment_id: string
          created_at?: string
          extended_deadline: string
          id?: string
          original_deadline: string
          purchase_id: string
          revoked?: boolean
          revoked_by?: string | null
          student_id: string
        }
        Update: {
          assignment_id?: string
          created_at?: string
          extended_deadline?: string
          id?: string
          original_deadline?: string
          purchase_id?: string
          revoked?: boolean
          revoked_by?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deadline_extensions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deadline_extensions_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "xp_purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deadline_extensions_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deadline_extensions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          {
            foreignKeyName: "departments_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions_public"
            referencedColumns: ["id"]
          },
        ]
      }
      development_seed_entities: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          seed_run_id: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          seed_run_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          seed_run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "development_seed_entities_seed_run_id_fkey"
            columns: ["seed_run_id"]
            isOneToOne: false
            referencedRelation: "development_seed_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      development_seed_runs: {
        Row: {
          id: string
          institution_id: string | null
          run_at: string
          seed_version: string
          status: string
        }
        Insert: {
          id?: string
          institution_id?: string | null
          run_at?: string
          seed_version: string
          status?: string
        }
        Update: {
          id?: string
          institution_id?: string | null
          run_at?: string
          seed_version?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "development_seed_runs_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "development_seed_runs_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions_public"
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
      email_deliveries: {
        Row: {
          attempt_count: number
          created_at: string
          email_type: string
          entity_id: string | null
          entity_type: string
          failed_at: string | null
          id: string
          idempotency_key: string
          institution_id: string
          last_error_code: string | null
          last_error_message: string | null
          provider: string
          provider_message_id: string | null
          recipient_email: string
          sent_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          created_at?: string
          email_type: string
          entity_id?: string | null
          entity_type: string
          failed_at?: string | null
          id?: string
          idempotency_key: string
          institution_id: string
          last_error_code?: string | null
          last_error_message?: string | null
          provider?: string
          provider_message_id?: string | null
          recipient_email: string
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          created_at?: string
          email_type?: string
          entity_id?: string | null
          entity_type?: string
          failed_at?: string | null
          id?: string
          idempotency_key?: string
          institution_id?: string
          last_error_code?: string | null
          last_error_message?: string | null
          provider?: string
          provider_message_id?: string | null
          recipient_email?: string
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_deliveries_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_deliveries_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions_public"
            referencedColumns: ["id"]
          },
        ]
      }
      email_delivery_events: {
        Row: {
          created_at: string
          delivery_id: string | null
          event_type: string
          id: string
          occurred_at: string
          payload: Json
          provider: string
          provider_event_id: string | null
        }
        Insert: {
          created_at?: string
          delivery_id?: string | null
          event_type: string
          id?: string
          occurred_at?: string
          payload?: Json
          provider?: string
          provider_event_id?: string | null
        }
        Update: {
          created_at?: string
          delivery_id?: string | null
          event_type?: string
          id?: string
          occurred_at?: string
          payload?: Json
          provider?: string
          provider_event_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_delivery_events_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "email_deliveries"
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
      fee_accounts: {
        Row: {
          created_at: string
          currency: string
          id: string
          institution_id: string
          parent_id: string | null
          student_id: string
          total_billed: number
          total_paid: number
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          institution_id: string
          parent_id?: string | null
          student_id: string
          total_billed?: number
          total_paid?: number
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          institution_id?: string
          parent_id?: string | null
          student_id?: string
          total_billed?: number
          total_paid?: number
        }
        Relationships: [
          {
            foreignKeyName: "fee_accounts_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_accounts_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_accounts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_credits: {
        Row: {
          account_id: string
          amount: number
          approved_by: string
          created_at: string
          id: string
          invoice_id: string | null
          reason: string
        }
        Insert: {
          account_id: string
          amount: number
          approved_by: string
          created_at?: string
          id?: string
          invoice_id?: string | null
          reason: string
        }
        Update: {
          account_id?: string
          amount?: number
          approved_by?: string
          created_at?: string
          id?: string
          invoice_id?: string | null
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_credits_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "fee_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_credits_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_credits_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "fee_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_invoice_items: {
        Row: {
          amount: number
          id: string
          invoice_id: string
          item_description: string
        }
        Insert: {
          amount: number
          id?: string
          invoice_id: string
          item_description: string
        }
        Update: {
          amount?: number
          id?: string
          invoice_id?: string
          item_description?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "fee_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_invoices: {
        Row: {
          amount: number
          created_at: string
          description: string
          due_date: string
          fee_account_id: string
          id: string
          invoice_number: string
          status: string
        }
        Insert: {
          amount: number
          created_at?: string
          description: string
          due_date: string
          fee_account_id: string
          id?: string
          invoice_number: string
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          due_date?: string
          fee_account_id?: string
          id?: string
          invoice_number?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_invoices_fee_account_id_fkey"
            columns: ["fee_account_id"]
            isOneToOne: false
            referencedRelation: "fee_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_payment_allocations: {
        Row: {
          id: string
          invoice_id: string
          paid_at: string
          paid_by: string
          payment_amount: number
          payment_method: string
          transaction_reference: string | null
        }
        Insert: {
          id?: string
          invoice_id: string
          paid_at?: string
          paid_by: string
          payment_amount: number
          payment_method?: string
          transaction_reference?: string | null
        }
        Update: {
          id?: string
          invoice_id?: string
          paid_at?: string
          paid_by?: string
          payment_amount?: number
          payment_method?: string
          transaction_reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fee_payment_allocations_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "fee_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_payment_allocations_paid_by_fkey"
            columns: ["paid_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      fee_refunds: {
        Row: {
          amount: number
          created_at: string
          id: string
          payment_id: string
          provider_reference: string | null
          status: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          payment_id: string
          provider_reference?: string | null
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          payment_id?: string
          provider_reference?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_refunds_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "fee_payment_allocations"
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
            referencedRelation: "mv_historical_evidence"
            referencedColumns: ["semester_id"]
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
      flow_check_ins: {
        Row: {
          created_at: string
          id: string
          interval_number: number
          response: Database["public"]["Enums"]["flow_response_type"]
          session_id: string
          student_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          interval_number: number
          response: Database["public"]["Enums"]["flow_response_type"]
          session_id: string
          student_id: string
        }
        Update: {
          created_at?: string
          id?: string
          interval_number?: number
          response?: Database["public"]["Enums"]["flow_response_type"]
          session_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flow_check_ins_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "study_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flow_check_ins_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          institution_id: string
          requester_id: string
          responded_at: string | null
          status: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          institution_id: string
          requester_id: string
          responded_at?: string | null
          status?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          institution_id?: string
          requester_id?: string
          responded_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "friendships_addressee_id_fkey"
            columns: ["addressee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          ai_applied: boolean
          ai_edited_by_teacher: boolean
          graded_at: string
          graded_by: string
          id: string
          is_released: boolean
          overall_feedback: string | null
          rubric_selections: Json
          score_percent: number
          submission_id: string
          total_score: number
        }
        Insert: {
          ai_applied?: boolean
          ai_edited_by_teacher?: boolean
          graded_at?: string
          graded_by: string
          id?: string
          is_released?: boolean
          overall_feedback?: string | null
          rubric_selections?: Json
          score_percent: number
          submission_id: string
          total_score: number
        }
        Update: {
          ai_applied?: boolean
          ai_edited_by_teacher?: boolean
          graded_at?: string
          graded_by?: string
          id?: string
          is_released?: boolean
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
      graduate_attribute_mappings: {
        Row: {
          created_at: string | null
          graduate_attribute_id: string
          id: string
          outcome_id: string
          weight: number | null
        }
        Insert: {
          created_at?: string | null
          graduate_attribute_id: string
          id?: string
          outcome_id: string
          weight?: number | null
        }
        Update: {
          created_at?: string | null
          graduate_attribute_id?: string
          id?: string
          outcome_id?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "graduate_attribute_mappings_graduate_attribute_id_fkey"
            columns: ["graduate_attribute_id"]
            isOneToOne: false
            referencedRelation: "graduate_attributes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "graduate_attribute_mappings_outcome_id_fkey"
            columns: ["outcome_id"]
            isOneToOne: false
            referencedRelation: "learning_outcomes"
            referencedColumns: ["id"]
          },
        ]
      }
      graduate_attributes: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          institution_id: string
          name: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          institution_id: string
          name: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          institution_id?: string
          name?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "graduate_attributes_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "graduate_attributes_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions_public"
            referencedColumns: ["id"]
          },
        ]
      }
      habit_correlations: {
        Row: {
          computed_at: string | null
          correlated_metric: string
          correlation_coefficient: number | null
          habit_type: string
          id: string
          sample_size: number | null
          student_id: string
        }
        Insert: {
          computed_at?: string | null
          correlated_metric: string
          correlation_coefficient?: number | null
          habit_type: string
          id?: string
          sample_size?: number | null
          student_id: string
        }
        Update: {
          computed_at?: string | null
          correlated_metric?: string
          correlation_coefficient?: number | null
          habit_type?: string
          id?: string
          sample_size?: number | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habit_correlations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      habit_logs: {
        Row: {
          completed_at: string | null
          created_at: string
          date: string
          habit_type: string
          id: string
          student_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          date: string
          habit_type: string
          id?: string
          student_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          date?: string
          habit_type?: string
          id?: string
          student_id?: string
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
      institution_autonomy_settings: {
        Row: {
          auto_execute_low_risk: boolean
          created_at: string
          evaluation_thresholds: Json
          institution_id: string
          operational_autonomy_ceiling: string
          rollback_enabled: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          auto_execute_low_risk?: boolean
          created_at?: string
          evaluation_thresholds?: Json
          institution_id: string
          operational_autonomy_ceiling?: string
          rollback_enabled?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          auto_execute_low_risk?: boolean
          created_at?: string
          evaluation_thresholds?: Json
          institution_id?: string
          operational_autonomy_ceiling?: string
          rollback_enabled?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "institution_autonomy_settings_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: true
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "institution_autonomy_settings_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: true
            referencedRelation: "institutions_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "institution_autonomy_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      institution_contacts: {
        Row: {
          contact_name: string
          created_at: string
          department: string
          email: string
          id: string
          institution_id: string
          is_primary: boolean
          phone: string | null
        }
        Insert: {
          contact_name: string
          created_at?: string
          department: string
          email: string
          id?: string
          institution_id: string
          is_primary?: boolean
          phone?: string | null
        }
        Update: {
          contact_name?: string
          created_at?: string
          department?: string
          email?: string
          id?: string
          institution_id?: string
          is_primary?: boolean
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "institution_contacts_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "institution_contacts_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions_public"
            referencedColumns: ["id"]
          },
        ]
      }
      institution_settings: {
        Row: {
          accreditation_body: string
          attainment_thresholds: Json
          created_at: string
          default_language: string
          dynamic_pricing_enabled: boolean
          grade_scales: Json
          id: string
          institution_id: string
          leaderboard_min_cohort_size: number
          leaderboard_page_size: number
          league_thresholds: Json | null
          streak_sabbatical_enabled: boolean | null
          success_threshold: number
          wellness_xp_amount: number
        }
        Insert: {
          accreditation_body?: string
          attainment_thresholds?: Json
          created_at?: string
          default_language?: string
          dynamic_pricing_enabled?: boolean
          grade_scales?: Json
          id?: string
          institution_id: string
          leaderboard_min_cohort_size?: number
          leaderboard_page_size?: number
          league_thresholds?: Json | null
          streak_sabbatical_enabled?: boolean | null
          success_threshold?: number
          wellness_xp_amount?: number
        }
        Update: {
          accreditation_body?: string
          attainment_thresholds?: Json
          created_at?: string
          default_language?: string
          dynamic_pricing_enabled?: boolean
          grade_scales?: Json
          id?: string
          institution_id?: string
          leaderboard_min_cohort_size?: number
          leaderboard_page_size?: number
          league_thresholds?: Json | null
          streak_sabbatical_enabled?: boolean | null
          success_threshold?: number
          wellness_xp_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "institution_settings_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: true
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "institution_settings_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: true
            referencedRelation: "institutions_public"
            referencedColumns: ["id"]
          },
        ]
      }
      institutions: {
        Row: {
          accreditation_body: string | null
          allowed_email_domains: string[]
          created_at: string
          id: string
          is_active: boolean
          join_mode: string
          logo_url: string | null
          name: string
          settings: Json
          slug: string
        }
        Insert: {
          accreditation_body?: string | null
          allowed_email_domains?: string[]
          created_at?: string
          id?: string
          is_active?: boolean
          join_mode?: string
          logo_url?: string | null
          name: string
          settings?: Json
          slug: string
        }
        Update: {
          accreditation_body?: string | null
          allowed_email_domains?: string[]
          created_at?: string
          id?: string
          is_active?: boolean
          join_mode?: string
          logo_url?: string | null
          name?: string
          settings?: Json
          slug?: string
        }
        Relationships: []
      }
      intervention_measurements: {
        Row: {
          baseline_evidence: Json
          baseline_metric: number
          course_id: string | null
          created_at: string
          delta: number | null
          evaluation_attempt_count: number
          evaluation_claimed_by: string | null
          evaluation_dead_lettered_at: string | null
          evaluation_lease_until: string | null
          evaluation_state: string
          evaluator_recommendation: string | null
          evaluator_summary: string | null
          evidence_sufficiency: string
          execution_id: string
          id: string
          institution_id: string
          last_evaluation_error: string | null
          measured_at: string | null
          measurement_window_end: string
          measurement_window_start: string
          outcome_id: string | null
          post_action_evidence: Json | null
          post_action_metric: number | null
          program_id: string | null
          proposal_id: string
          student_id: string
          updated_at: string
        }
        Insert: {
          baseline_evidence?: Json
          baseline_metric: number
          course_id?: string | null
          created_at?: string
          delta?: number | null
          evaluation_attempt_count?: number
          evaluation_claimed_by?: string | null
          evaluation_dead_lettered_at?: string | null
          evaluation_lease_until?: string | null
          evaluation_state?: string
          evaluator_recommendation?: string | null
          evaluator_summary?: string | null
          evidence_sufficiency?: string
          execution_id: string
          id?: string
          institution_id: string
          last_evaluation_error?: string | null
          measured_at?: string | null
          measurement_window_end: string
          measurement_window_start: string
          outcome_id?: string | null
          post_action_evidence?: Json | null
          post_action_metric?: number | null
          program_id?: string | null
          proposal_id: string
          student_id: string
          updated_at?: string
        }
        Update: {
          baseline_evidence?: Json
          baseline_metric?: number
          course_id?: string | null
          created_at?: string
          delta?: number | null
          evaluation_attempt_count?: number
          evaluation_claimed_by?: string | null
          evaluation_dead_lettered_at?: string | null
          evaluation_lease_until?: string | null
          evaluation_state?: string
          evaluator_recommendation?: string | null
          evaluator_summary?: string | null
          evidence_sufficiency?: string
          execution_id?: string
          id?: string
          institution_id?: string
          last_evaluation_error?: string | null
          measured_at?: string | null
          measurement_window_end?: string
          measurement_window_start?: string
          outcome_id?: string | null
          post_action_evidence?: Json | null
          post_action_metric?: number | null
          program_id?: string | null
          proposal_id?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "intervention_measurements_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_measurements_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: true
            referencedRelation: "agent_action_executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_measurements_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_measurements_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_measurements_outcome_id_fkey"
            columns: ["outcome_id"]
            isOneToOne: false
            referencedRelation: "learning_outcomes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_measurements_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_measurements_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: true
            referencedRelation: "agent_action_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_measurements_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      intervention_outcomes: {
        Row: {
          baseline: number | null
          created_at: string
          delta: number | null
          id: string
          institution_id: string
          intervention_id: string
          measured_at: string
          metric: string
          notes: string | null
          sample_count: number
          value: number | null
        }
        Insert: {
          baseline?: number | null
          created_at?: string
          delta?: number | null
          id?: string
          institution_id: string
          intervention_id: string
          measured_at?: string
          metric: string
          notes?: string | null
          sample_count?: number
          value?: number | null
        }
        Update: {
          baseline?: number | null
          created_at?: string
          delta?: number | null
          id?: string
          institution_id?: string
          intervention_id?: string
          measured_at?: string
          metric?: string
          notes?: string | null
          sample_count?: number
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "intervention_outcomes_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_outcomes_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intervention_outcomes_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "learning_interventions"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          created_by: string
          email: string
          expires_at: string
          id: string
          idempotency_key: string | null
          institution_id: string
          last_sent_at: string | null
          relationship: string | null
          relationship_label: string | null
          revoked_at: string | null
          role: Database["public"]["Enums"]["user_role"]
          send_count: number
          status: string
          student_id: string | null
          token: string | null
          token_hash: string | null
          used_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          created_by: string
          email: string
          expires_at?: string
          id?: string
          idempotency_key?: string | null
          institution_id: string
          last_sent_at?: string | null
          relationship?: string | null
          relationship_label?: string | null
          revoked_at?: string | null
          role: Database["public"]["Enums"]["user_role"]
          send_count?: number
          status?: string
          student_id?: string | null
          token?: string | null
          token_hash?: string | null
          used_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          created_by?: string
          email?: string
          expires_at?: string
          id?: string
          idempotency_key?: string | null
          institution_id?: string
          last_sent_at?: string | null
          relationship?: string | null
          relationship_label?: string | null
          revoked_at?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          send_count?: number
          status?: string
          student_id?: string | null
          token?: string | null
          token_hash?: string | null
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invitations_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      knowledge_quests: {
        Row: {
          created_at: string
          created_by: string
          description: string
          end_date: string
          id: string
          institution_id: string
          is_active: boolean
          max_participants: number | null
          quest_type: string
          reward_item_id: string | null
          reward_type: string
          reward_xp_amount: number | null
          start_date: string
          target_clo_ids: string[] | null
          title: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description: string
          end_date: string
          id?: string
          institution_id: string
          is_active?: boolean
          max_participants?: number | null
          quest_type: string
          reward_item_id?: string | null
          reward_type: string
          reward_xp_amount?: number | null
          start_date: string
          target_clo_ids?: string[] | null
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string
          end_date?: string
          id?: string
          institution_id?: string
          is_active?: boolean
          max_participants?: number | null
          quest_type?: string
          reward_item_id?: string | null
          reward_type?: string
          reward_xp_amount?: number | null
          start_date?: string
          target_clo_ids?: string[] | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_quests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_quests_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_quests_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_quests_reward_item_id_fkey"
            columns: ["reward_item_id"]
            isOneToOne: false
            referencedRelation: "marketplace_items"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_interventions: {
        Row: {
          approved_by: string | null
          completed_at: string | null
          course_id: string | null
          created_at: string
          created_by: string | null
          id: string
          institution_id: string
          intervention_type: string
          payload: Json
          program_id: string | null
          proposal_id: string | null
          source: string
          started_at: string | null
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          completed_at?: string | null
          course_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          institution_id: string
          intervention_type: string
          payload?: Json
          program_id?: string | null
          proposal_id?: string | null
          source?: string
          started_at?: string | null
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          completed_at?: string | null
          course_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          institution_id?: string
          intervention_type?: string
          payload?: Json
          program_id?: string | null
          proposal_id?: string | null
          source?: string
          started_at?: string | null
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_interventions_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_interventions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_interventions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_interventions_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_interventions_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_interventions_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_interventions_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "agent_action_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_interventions_student_id_fkey"
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
          review_status: string
          reviewed_at: string | null
          reviewed_by: string | null
          sort_order: number
          title: string
          title_ar: string | null
          tutor_autonomy_level: string | null
          type: Database["public"]["Enums"]["outcome_type"]
          updated_at: string
          weight: number | null
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
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          sort_order?: number
          title: string
          title_ar?: string | null
          tutor_autonomy_level?: string | null
          type: Database["public"]["Enums"]["outcome_type"]
          updated_at?: string
          weight?: number | null
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
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          sort_order?: number
          title?: string
          title_ar?: string | null
          tutor_autonomy_level?: string | null
          type?: Database["public"]["Enums"]["outcome_type"]
          updated_at?: string
          weight?: number | null
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
            foreignKeyName: "learning_outcomes_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions_public"
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
      learning_state_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          institution_id: string
          learning_state_version: number | null
          payload: Json
          state_hash: string | null
          student_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          institution_id: string
          learning_state_version?: number | null
          payload?: Json
          state_hash?: string | null
          student_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          institution_id?: string
          learning_state_version?: number | null
          payload?: Json
          state_hash?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_state_events_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_state_events_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_state_events_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      login_attempts: {
        Row: {
          attempt_count: number
          email: string
          locked_until: string | null
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          email: string
          locked_until?: string | null
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          email?: string
          locked_until?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      marketplace_items: {
        Row: {
          category: Database["public"]["Enums"]["marketplace_item_category"]
          created_at: string
          description: string
          dynamic_price_override: number | null
          icon_identifier: string
          id: string
          institution_id: string
          is_active: boolean
          level_requirement: number
          metadata: Json | null
          name: string
          stock_quantity: number | null
          stock_type: Database["public"]["Enums"]["marketplace_stock_type"]
          sub_category: Database["public"]["Enums"]["marketplace_item_sub_category"]
          updated_at: string
          xp_price: number
        }
        Insert: {
          category: Database["public"]["Enums"]["marketplace_item_category"]
          created_at?: string
          description: string
          dynamic_price_override?: number | null
          icon_identifier: string
          id?: string
          institution_id: string
          is_active?: boolean
          level_requirement?: number
          metadata?: Json | null
          name: string
          stock_quantity?: number | null
          stock_type?: Database["public"]["Enums"]["marketplace_stock_type"]
          sub_category: Database["public"]["Enums"]["marketplace_item_sub_category"]
          updated_at?: string
          xp_price: number
        }
        Update: {
          category?: Database["public"]["Enums"]["marketplace_item_category"]
          created_at?: string
          description?: string
          dynamic_price_override?: number | null
          icon_identifier?: string
          id?: string
          institution_id?: string
          is_active?: boolean
          level_requirement?: number
          metadata?: Json | null
          name?: string
          stock_quantity?: number | null
          stock_type?: Database["public"]["Enums"]["marketplace_stock_type"]
          sub_category?: Database["public"]["Enums"]["marketplace_item_sub_category"]
          updated_at?: string
          xp_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_items_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_items_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions_public"
            referencedColumns: ["id"]
          },
        ]
      }
      mastery_recovery_pathways: {
        Row: {
          activated_at: string
          ai_tutor_completed: boolean
          ai_tutor_completed_at: string | null
          clo_id: string
          completed_at: string | null
          course_id: string
          created_at: string
          expired_at: string | null
          failure_count: number
          id: string
          institution_id: string
          peer_suggestion_applicable: boolean
          peer_suggestion_shown: boolean
          practice_completed: boolean
          practice_completed_at: string | null
          retry_outcome: string | null
          retry_quiz_attempt_id: string | null
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          activated_at?: string
          ai_tutor_completed?: boolean
          ai_tutor_completed_at?: string | null
          clo_id: string
          completed_at?: string | null
          course_id: string
          created_at?: string
          expired_at?: string | null
          failure_count?: number
          id?: string
          institution_id: string
          peer_suggestion_applicable?: boolean
          peer_suggestion_shown?: boolean
          practice_completed?: boolean
          practice_completed_at?: string | null
          retry_outcome?: string | null
          retry_quiz_attempt_id?: string | null
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          activated_at?: string
          ai_tutor_completed?: boolean
          ai_tutor_completed_at?: string | null
          clo_id?: string
          completed_at?: string | null
          course_id?: string
          created_at?: string
          expired_at?: string | null
          failure_count?: number
          id?: string
          institution_id?: string
          peer_suggestion_applicable?: boolean
          peer_suggestion_shown?: boolean
          practice_completed?: boolean
          practice_completed_at?: string | null
          retry_outcome?: string | null
          retry_quiz_attempt_id?: string | null
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mastery_recovery_pathways_clo_id_fkey"
            columns: ["clo_id"]
            isOneToOne: false
            referencedRelation: "learning_outcomes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mastery_recovery_pathways_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mastery_recovery_pathways_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mastery_recovery_pathways_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mastery_recovery_pathways_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          options_ar: Json | null
          question_text: string
          question_text_ar: string | null
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
          options_ar?: Json | null
          question_text: string
          question_text_ar?: string | null
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
          options_ar?: Json | null
          question_text?: string
          question_text_ar?: string | null
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
          {
            foreignKeyName: "onboarding_questions_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions_public"
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
      outcome_attainment_snapshots: {
        Row: {
          id: string
          institution_id: string
          mean_attainment_percent: number
          outcome_id: string
          sample_count: number
          scope: string
          semester_id: string
          snapshot_at: string
        }
        Insert: {
          id?: string
          institution_id: string
          mean_attainment_percent: number
          outcome_id: string
          sample_count?: number
          scope: string
          semester_id: string
          snapshot_at?: string
        }
        Update: {
          id?: string
          institution_id?: string
          mean_attainment_percent?: number
          outcome_id?: string
          sample_count?: number
          scope?: string
          semester_id?: string
          snapshot_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "outcome_attainment_snapshots_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outcome_attainment_snapshots_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outcome_attainment_snapshots_outcome_id_fkey"
            columns: ["outcome_id"]
            isOneToOne: false
            referencedRelation: "learning_outcomes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outcome_attainment_snapshots_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "mv_historical_evidence"
            referencedColumns: ["semester_id"]
          },
          {
            foreignKeyName: "outcome_attainment_snapshots_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "semesters"
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
      parent_encouragements: {
        Row: {
          badge_key: string | null
          created_at: string
          id: string
          is_read: boolean
          message: string
          parent_id: string
          student_id: string
        }
        Insert: {
          badge_key?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          parent_id: string
          student_id: string
        }
        Update: {
          badge_key?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          parent_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_encouragements_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_encouragements_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_reminders: {
        Row: {
          created_at: string
          id: string
          is_delivered: boolean
          parent_id: string
          reminder_time: string
          student_id: string
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_delivered?: boolean
          parent_id: string
          reminder_time: string
          student_id: string
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          is_delivered?: boolean
          parent_id?: string
          reminder_time?: string
          student_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_reminders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_reminders_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_saved_support_actions: {
        Row: {
          action_key: string
          category: string
          created_at: string
          id: string
          parent_id: string
          status: string
          student_id: string
          title: string
        }
        Insert: {
          action_key: string
          category: string
          created_at?: string
          id?: string
          parent_id: string
          status?: string
          student_id: string
          title: string
        }
        Update: {
          action_key?: string
          category?: string
          created_at?: string
          id?: string
          parent_id?: string
          status?: string
          student_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_saved_support_actions_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_saved_support_actions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_student_links: {
        Row: {
          created_at: string
          id: string
          institution_id: string
          invitation_id: string | null
          invited_email: string | null
          parent_id: string | null
          rejected_at: string | null
          rejected_by: string | null
          relationship: string
          relationship_label: string | null
          revoked_at: string | null
          revoked_by: string | null
          status: string
          student_id: string
          updated_at: string
          verified: boolean
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          institution_id: string
          invitation_id?: string | null
          invited_email?: string | null
          parent_id?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          relationship: string
          relationship_label?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          status?: string
          student_id: string
          updated_at?: string
          verified?: boolean
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          institution_id?: string
          invitation_id?: string | null
          invited_email?: string | null
          parent_id?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          relationship?: string
          relationship_label?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          status?: string
          student_id?: string
          updated_at?: string
          verified?: boolean
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parent_student_links_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_student_links_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_student_links_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "invitations"
            referencedColumns: ["id"]
          },
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
      peer_teaching_moments: {
        Row: {
          author_id: string
          avg_clarity_rating: number | null
          avg_helpfulness_rating: number | null
          clo_id: string
          created_at: string
          explanation_text: string
          id: string
          media_url: string | null
          status: string
          team_id: string
          title: string
          view_count: number
        }
        Insert: {
          author_id: string
          avg_clarity_rating?: number | null
          avg_helpfulness_rating?: number | null
          clo_id: string
          created_at?: string
          explanation_text: string
          id?: string
          media_url?: string | null
          status?: string
          team_id: string
          title: string
          view_count?: number
        }
        Update: {
          author_id?: string
          avg_clarity_rating?: number | null
          avg_helpfulness_rating?: number | null
          clo_id?: string
          created_at?: string
          explanation_text?: string
          id?: string
          media_url?: string | null
          status?: string
          team_id?: string
          title?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "peer_teaching_moments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "peer_teaching_moments_clo_id_fkey"
            columns: ["clo_id"]
            isOneToOne: false
            referencedRelation: "learning_outcomes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "peer_teaching_moments_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      planner_tasks: {
        Row: {
          assignment_id: string | null
          clo_id: string | null
          completed_at: string | null
          course_id: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          planned_date: string | null
          priority: string | null
          sort_order: number | null
          status: string | null
          student_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          assignment_id?: string | null
          clo_id?: string | null
          completed_at?: string | null
          course_id?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          planned_date?: string | null
          priority?: string | null
          sort_order?: number | null
          status?: string | null
          student_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          assignment_id?: string | null
          clo_id?: string | null
          completed_at?: string | null
          course_id?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          planned_date?: string | null
          priority?: string | null
          sort_order?: number | null
          status?: string | null
          student_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "planner_tasks_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planner_tasks_clo_id_fkey"
            columns: ["clo_id"]
            isOneToOne: false
            referencedRelation: "learning_outcomes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planner_tasks_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planner_tasks_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      proactive_agent_jobs: {
        Row: {
          attempt_count: number
          available_at: string
          claimed_by: string | null
          completed_at: string | null
          course_id: string | null
          created_at: string
          error_classification: string | null
          evidence_hash: string
          evidence_packet: Json
          id: string
          idempotency_key: string
          institution_id: string
          last_error_at: string | null
          learning_state_version: number
          lease_until: string | null
          max_attempts: number
          model: string | null
          program_id: string | null
          proposal_ids: Json
          provider: string | null
          recipient_role: string
          recipient_user_id: string
          recommendation: string | null
          run_id: string | null
          specialist: string
          status: string
          student_id: string
          trigger_key: string
          trigger_source: string
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          available_at?: string
          claimed_by?: string | null
          completed_at?: string | null
          course_id?: string | null
          created_at?: string
          error_classification?: string | null
          evidence_hash: string
          evidence_packet: Json
          id?: string
          idempotency_key: string
          institution_id: string
          last_error_at?: string | null
          learning_state_version: number
          lease_until?: string | null
          max_attempts?: number
          model?: string | null
          program_id?: string | null
          proposal_ids?: Json
          provider?: string | null
          recipient_role: string
          recipient_user_id: string
          recommendation?: string | null
          run_id?: string | null
          specialist: string
          status?: string
          student_id: string
          trigger_key: string
          trigger_source: string
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          available_at?: string
          claimed_by?: string | null
          completed_at?: string | null
          course_id?: string | null
          created_at?: string
          error_classification?: string | null
          evidence_hash?: string
          evidence_packet?: Json
          id?: string
          idempotency_key?: string
          institution_id?: string
          last_error_at?: string | null
          learning_state_version?: number
          lease_until?: string | null
          max_attempts?: number
          model?: string | null
          program_id?: string | null
          proposal_ids?: Json
          provider?: string | null
          recipient_role?: string
          recipient_user_id?: string
          recommendation?: string | null
          run_id?: string | null
          specialist?: string
          status?: string
          student_id?: string
          trigger_key?: string
          trigger_source?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proactive_agent_jobs_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proactive_agent_jobs_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proactive_agent_jobs_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proactive_agent_jobs_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proactive_agent_jobs_recipient_user_id_fkey"
            columns: ["recipient_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proactive_agent_jobs_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proactive_agent_jobs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          academic_rank: string | null
          accessibility_preferences: Json | null
          avatar_url: string | null
          bio: string | null
          created_at: string
          department: string | null
          designation: string | null
          email: string
          email_preferences: Json | null
          email_verified_at: string | null
          full_name: string
          highest_degree: string | null
          id: string
          institution_id: string
          is_active: boolean
          language_preference: string
          last_seen_at: string | null
          notification_preferences: Json
          office_hours: string | null
          office_location: string | null
          onboarding_completed: boolean
          phone: string | null
          portfolio_public: boolean
          portfolio_sharing_permitted: boolean
          preferred_language: string | null
          role: Database["public"]["Enums"]["user_role"]
          search_vector: unknown
          status: string
          theme_preference: string
          tos_accepted_at: string | null
          tour_completed_at: string | null
          years_experience: number | null
        }
        Insert: {
          academic_rank?: string | null
          accessibility_preferences?: Json | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          department?: string | null
          designation?: string | null
          email: string
          email_preferences?: Json | null
          email_verified_at?: string | null
          full_name: string
          highest_degree?: string | null
          id: string
          institution_id: string
          is_active?: boolean
          language_preference?: string
          last_seen_at?: string | null
          notification_preferences?: Json
          office_hours?: string | null
          office_location?: string | null
          onboarding_completed?: boolean
          phone?: string | null
          portfolio_public?: boolean
          portfolio_sharing_permitted?: boolean
          preferred_language?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          search_vector?: unknown
          status?: string
          theme_preference?: string
          tos_accepted_at?: string | null
          tour_completed_at?: string | null
          years_experience?: number | null
        }
        Update: {
          academic_rank?: string | null
          accessibility_preferences?: Json | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          department?: string | null
          designation?: string | null
          email?: string
          email_preferences?: Json | null
          email_verified_at?: string | null
          full_name?: string
          highest_degree?: string | null
          id?: string
          institution_id?: string
          is_active?: boolean
          language_preference?: string
          last_seen_at?: string | null
          notification_preferences?: Json
          office_hours?: string | null
          office_location?: string | null
          onboarding_completed?: boolean
          phone?: string | null
          portfolio_public?: boolean
          portfolio_sharing_permitted?: boolean
          preferred_language?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          search_vector?: unknown
          status?: string
          theme_preference?: string
          tos_accepted_at?: string | null
          tour_completed_at?: string | null
          years_experience?: number | null
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
            foreignKeyName: "profiles_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions_public"
            referencedColumns: ["id"]
          },
        ]
      }
      program_accreditations: {
        Row: {
          accreditation_body: string
          accreditation_date: string | null
          created_at: string
          current_stage: string | null
          framework: string | null
          framework_version: string | null
          id: string
          institution_id: string | null
          next_review_date: string | null
          owner_id: string | null
          program_id: string
          status: string
        }
        Insert: {
          accreditation_body: string
          accreditation_date?: string | null
          created_at?: string
          current_stage?: string | null
          framework?: string | null
          framework_version?: string | null
          id?: string
          institution_id?: string | null
          next_review_date?: string | null
          owner_id?: string | null
          program_id: string
          status?: string
        }
        Update: {
          accreditation_body?: string
          accreditation_date?: string | null
          created_at?: string
          current_stage?: string | null
          framework?: string | null
          framework_version?: string | null
          id?: string
          institution_id?: string | null
          next_review_date?: string | null
          owner_id?: string | null
          program_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_accreditations_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_accreditations_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_accreditations_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_accreditations_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: true
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
          name_ar: string | null
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
          name_ar?: string | null
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
          name_ar?: string | null
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
          {
            foreignKeyName: "programs_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions_public"
            referencedColumns: ["id"]
          },
        ]
      }
      question_analytics: {
        Row: {
          avg_response_time_seconds: number | null
          calibrated_difficulty: number | null
          correct_count: number
          discrimination_index: number | null
          id: string
          last_calculated_at: string
          quality_flag: string | null
          question_id: string
          success_rate: number | null
          total_attempts: number
        }
        Insert: {
          avg_response_time_seconds?: number | null
          calibrated_difficulty?: number | null
          correct_count?: number
          discrimination_index?: number | null
          id?: string
          last_calculated_at?: string
          quality_flag?: string | null
          question_id: string
          success_rate?: number | null
          total_attempts?: number
        }
        Update: {
          avg_response_time_seconds?: number | null
          calibrated_difficulty?: number | null
          correct_count?: number
          discrimination_index?: number | null
          id?: string
          last_calculated_at?: string
          quality_flag?: string | null
          question_id?: string
          success_rate?: number | null
          total_attempts?: number
        }
        Relationships: [
          {
            foreignKeyName: "question_analytics_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: true
            referencedRelation: "question_bank"
            referencedColumns: ["id"]
          },
        ]
      }
      question_bank: {
        Row: {
          bloom_level: number
          clo_id: string
          correct_answer: Json
          course_id: string
          created_at: string
          created_by: string
          difficulty_rating: number
          explanation: string | null
          explanation_confidence: number | null
          generation_request_id: string | null
          generation_source: string
          id: string
          institution_id: string
          labels: string[] | null
          options: Json | null
          parent_question_id: string | null
          question_text: string
          question_type: string
          source_chunks: Json | null
          status: string
          updated_at: string
        }
        Insert: {
          bloom_level: number
          clo_id: string
          correct_answer: Json
          course_id: string
          created_at?: string
          created_by: string
          difficulty_rating: number
          explanation?: string | null
          explanation_confidence?: number | null
          generation_request_id?: string | null
          generation_source: string
          id?: string
          institution_id: string
          labels?: string[] | null
          options?: Json | null
          parent_question_id?: string | null
          question_text: string
          question_type: string
          source_chunks?: Json | null
          status?: string
          updated_at?: string
        }
        Update: {
          bloom_level?: number
          clo_id?: string
          correct_answer?: Json
          course_id?: string
          created_at?: string
          created_by?: string
          difficulty_rating?: number
          explanation?: string | null
          explanation_confidence?: number | null
          generation_request_id?: string | null
          generation_source?: string
          id?: string
          institution_id?: string
          labels?: string[] | null
          options?: Json | null
          parent_question_id?: string | null
          question_text?: string
          question_type?: string
          source_chunks?: Json | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_bank_clo_id_fkey"
            columns: ["clo_id"]
            isOneToOne: false
            referencedRelation: "learning_outcomes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_bank_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_bank_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_bank_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_bank_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_bank_parent_question_id_fkey"
            columns: ["parent_question_id"]
            isOneToOne: false
            referencedRelation: "question_bank"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_attempts: {
        Row: {
          answers: Json
          attempt_number: number
          blooms_climb_state: Json | null
          difficulty_trajectory: Json | null
          id: string
          mode: string
          per_question_times: Json | null
          question_sequence: Json | null
          quiz_id: string
          score: number | null
          started_at: string
          student_id: string
          submitted_at: string | null
        }
        Insert: {
          answers?: Json
          attempt_number?: number
          blooms_climb_state?: Json | null
          difficulty_trajectory?: Json | null
          id?: string
          mode?: string
          per_question_times?: Json | null
          question_sequence?: Json | null
          quiz_id: string
          score?: number | null
          started_at?: string
          student_id: string
          submitted_at?: string | null
        }
        Update: {
          answers?: Json
          attempt_number?: number
          blooms_climb_state?: Json | null
          difficulty_trajectory?: Json | null
          id?: string
          mode?: string
          per_question_times?: Json | null
          question_sequence?: Json | null
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
      quiz_clos: {
        Row: {
          clo_id: string
          created_at: string
          id: string
          quiz_id: string
        }
        Insert: {
          clo_id: string
          created_at?: string
          id?: string
          quiz_id: string
        }
        Update: {
          clo_id?: string
          created_at?: string
          id?: string
          quiz_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_clos_clo_id_fkey"
            columns: ["clo_id"]
            isOneToOne: false
            referencedRelation: "learning_outcomes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_clos_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_generation_logs: {
        Row: {
          chunks_retrieved: number
          completion_tokens: number
          course_id: string
          created_at: string
          error_message: string | null
          generation_request_id: string
          id: string
          institution_id: string
          latency_ms: number
          model_used: string
          prompt_tokens: number
          question_count_generated: number
          question_count_requested: number
          status: string
          teacher_id: string
          total_tokens: number
        }
        Insert: {
          chunks_retrieved: number
          completion_tokens: number
          course_id: string
          created_at?: string
          error_message?: string | null
          generation_request_id: string
          id?: string
          institution_id: string
          latency_ms: number
          model_used: string
          prompt_tokens: number
          question_count_generated: number
          question_count_requested: number
          status: string
          teacher_id: string
          total_tokens: number
        }
        Update: {
          chunks_retrieved?: number
          completion_tokens?: number
          course_id?: string
          created_at?: string
          error_message?: string | null
          generation_request_id?: string
          id?: string
          institution_id?: string
          latency_ms?: number
          model_used?: string
          prompt_tokens?: number
          question_count_generated?: number
          question_count_requested?: number
          status?: string
          teacher_id?: string
          total_tokens?: number
        }
        Relationships: [
          {
            foreignKeyName: "quiz_generation_logs_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_generation_logs_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_generation_logs_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_generation_logs_teacher_id_fkey"
            columns: ["teacher_id"]
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
          adaptation_config: Json | null
          clo_ids: Json
          course_id: string
          created_at: string
          description: string | null
          due_date: string
          id: string
          is_adaptive: boolean
          is_published: boolean
          max_attempts: number
          practice_mode_enabled: boolean
          time_limit_minutes: number | null
          title: string
        }
        Insert: {
          adaptation_config?: Json | null
          clo_ids?: Json
          course_id: string
          created_at?: string
          description?: string | null
          due_date: string
          id?: string
          is_adaptive?: boolean
          is_published?: boolean
          max_attempts?: number
          practice_mode_enabled?: boolean
          time_limit_minutes?: number | null
          title: string
        }
        Update: {
          adaptation_config?: Json | null
          clo_ids?: Json
          course_id?: string
          created_at?: string
          description?: string | null
          due_date?: string
          id?: string
          is_adaptive?: boolean
          is_published?: boolean
          max_attempts?: number
          practice_mode_enabled?: boolean
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
      rate_limit_events: {
        Row: {
          event_type: string
          id: number
          ip_address: unknown
          metadata: Json
          occurred_at: string
          user_id: string | null
        }
        Insert: {
          event_type: string
          id?: number
          ip_address: unknown
          metadata?: Json
          occurred_at?: string
          user_id?: string | null
        }
        Update: {
          event_type?: string
          id?: number
          ip_address?: unknown
          metadata?: Json
          occurred_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      receipts: {
        Row: {
          id: string
          issued_at: string
          payment_allocation_id: string
          receipt_number: string
          storage_path: string
        }
        Insert: {
          id?: string
          issued_at?: string
          payment_allocation_id: string
          receipt_number: string
          storage_path: string
        }
        Update: {
          id?: string
          issued_at?: string
          payment_allocation_id?: string
          receipt_number?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipts_payment_allocation_id_fkey"
            columns: ["payment_allocation_id"]
            isOneToOne: false
            referencedRelation: "fee_payment_allocations"
            referencedColumns: ["id"]
          },
        ]
      }
      reflection_digests: {
        Row: {
          emotional_trends: Json
          generated_at: string
          growth_patterns: Json
          id: string
          month: string
          shared_with: Json
          student_id: string
          suggested_focus: Json
          themes: Json
        }
        Insert: {
          emotional_trends?: Json
          generated_at?: string
          growth_patterns?: Json
          id?: string
          month: string
          shared_with?: Json
          student_id: string
          suggested_focus?: Json
          themes?: Json
        }
        Update: {
          emotional_trends?: Json
          generated_at?: string
          growth_patterns?: Json
          id?: string
          month?: string
          shared_with?: Json
          student_id?: string
          suggested_focus?: Json
          themes?: Json
        }
        Relationships: [
          {
            foreignKeyName: "reflection_digests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reflection_quality_scores: {
        Row: {
          depth_score: number
          flags: Json
          id: string
          originality_score: number
          reflection_id: string
          reflection_type: Database["public"]["Enums"]["reflection_type_enum"]
          relevance_score: number
          score: number
          scored_at: string
          student_id: string
        }
        Insert: {
          depth_score: number
          flags?: Json
          id?: string
          originality_score: number
          reflection_id: string
          reflection_type: Database["public"]["Enums"]["reflection_type_enum"]
          relevance_score: number
          score: number
          scored_at?: string
          student_id: string
        }
        Update: {
          depth_score?: number
          flags?: Json
          id?: string
          originality_score?: number
          reflection_id?: string
          reflection_type?: Database["public"]["Enums"]["reflection_type_enum"]
          relevance_score?: number
          score?: number
          scored_at?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reflection_quality_scores_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      replacement_votes: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          initiated_by: string
          resolved_at: string | null
          status: string
          target_member_id: string
          teacher_override: boolean
          team_id: string
          votes_against: number
          votes_for: number
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          initiated_by: string
          resolved_at?: string | null
          status?: string
          target_member_id: string
          teacher_override?: boolean
          team_id: string
          votes_against?: number
          votes_for?: number
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          initiated_by?: string
          resolved_at?: string | null
          status?: string
          target_member_id?: string
          teacher_override?: boolean
          team_id?: string
          votes_against?: number
          votes_for?: number
        }
        Relationships: [
          {
            foreignKeyName: "replacement_votes_initiated_by_fkey"
            columns: ["initiated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "replacement_votes_target_member_id_fkey"
            columns: ["target_member_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "replacement_votes_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      review_schedules: {
        Row: {
          clo_id: string
          course_id: string | null
          created_at: string
          id: string
          interval_days: number
          review_date: string
          review_session_id: string | null
          source_session_id: string | null
          status: Database["public"]["Enums"]["review_status_type"]
          student_id: string
          updated_at: string
        }
        Insert: {
          clo_id: string
          course_id?: string | null
          created_at?: string
          id?: string
          interval_days: number
          review_date: string
          review_session_id?: string | null
          source_session_id?: string | null
          status?: Database["public"]["Enums"]["review_status_type"]
          student_id: string
          updated_at?: string
        }
        Update: {
          clo_id?: string
          course_id?: string | null
          created_at?: string
          id?: string
          interval_days?: number
          review_date?: string
          review_session_id?: string | null
          source_session_id?: string | null
          status?: Database["public"]["Enums"]["review_status_type"]
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_schedules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_schedules_review_session_id_fkey"
            columns: ["review_session_id"]
            isOneToOne: false
            referencedRelation: "study_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_schedules_source_session_id_fkey"
            columns: ["source_session_id"]
            isOneToOne: false
            referencedRelation: "study_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_schedules_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      sale_event_items: {
        Row: {
          item_id: string
          sale_event_id: string
        }
        Insert: {
          item_id: string
          sale_event_id: string
        }
        Update: {
          item_id?: string
          sale_event_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_event_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "marketplace_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_event_items_sale_event_id_fkey"
            columns: ["sale_event_id"]
            isOneToOne: false
            referencedRelation: "sale_events"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_events: {
        Row: {
          created_at: string
          created_by: string
          discount_percentage: number
          end_date: string
          id: string
          institution_id: string
          name: string
          start_date: string
        }
        Insert: {
          created_at?: string
          created_by: string
          discount_percentage: number
          end_date: string
          id?: string
          institution_id: string
          name: string
          start_date: string
        }
        Update: {
          created_at?: string
          created_by?: string
          discount_percentage?: number
          end_date?: string
          id?: string
          institution_id?: string
          name?: string
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_events_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_events_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions_public"
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
          {
            foreignKeyName: "semesters_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions_public"
            referencedColumns: ["id"]
          },
        ]
      }
      session_evidence: {
        Row: {
          content: string | null
          created_at: string | null
          evidence_type: string
          file_name: string | null
          file_size_bytes: number | null
          file_url: string | null
          id: string
          mime_type: string | null
          notes: string | null
          session_id: string
          student_id: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          evidence_type: string
          file_name?: string | null
          file_size_bytes?: number | null
          file_url?: string | null
          id?: string
          mime_type?: string | null
          notes?: string | null
          session_id: string
          student_id?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          evidence_type?: string
          file_name?: string | null
          file_size_bytes?: number | null
          file_url?: string | null
          id?: string
          mime_type?: string | null
          notes?: string | null
          session_id?: string
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_evidence_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "study_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_evidence_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      session_intents: {
        Row: {
          concept: string
          created_at: string
          id: string
          is_auto_suggested: boolean
          session_id: string
          student_id: string
          success_criterion: string
        }
        Insert: {
          concept: string
          created_at?: string
          id?: string
          is_auto_suggested?: boolean
          session_id: string
          student_id: string
          success_criterion: string
        }
        Update: {
          concept?: string
          created_at?: string
          id?: string
          is_auto_suggested?: boolean
          session_id?: string
          student_id?: string
          success_criterion?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_intents_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "study_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_intents_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      session_reflections: {
        Row: {
          content: string
          created_at: string
          id: string
          session_id: string
          student_id: string
          word_count: number
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          session_id: string
          student_id: string
          word_count: number
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          session_id?: string
          student_id?: string
          word_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "session_reflections_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "study_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_reflections_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      social_challenges: {
        Row: {
          challenge_type: string
          course_id: string
          created_at: string
          created_by: string
          description: string
          end_date: string
          goal_target: number
          id: string
          institution_id: string
          participation_mode: string
          reward_badge_id: string | null
          reward_xp: number
          start_date: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          challenge_type: string
          course_id: string
          created_at?: string
          created_by: string
          description?: string
          end_date: string
          goal_target: number
          id?: string
          institution_id: string
          participation_mode?: string
          reward_badge_id?: string | null
          reward_xp?: number
          start_date: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          challenge_type?: string
          course_id?: string
          created_at?: string
          created_by?: string
          description?: string
          end_date?: string
          goal_target?: number
          id?: string
          institution_id?: string
          participation_mode?: string
          reward_badge_id?: string | null
          reward_xp?: number
          start_date?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_challenges_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_challenges_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_challenges_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_challenges_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions_public"
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
      student_active_boosts: {
        Row: {
          activated_at: string
          boost_type: string
          expires_at: string
          id: string
          multiplier: number
          purchase_id: string
          student_id: string
        }
        Insert: {
          activated_at?: string
          boost_type?: string
          expires_at: string
          id?: string
          multiplier?: number
          purchase_id: string
          student_id: string
        }
        Update: {
          activated_at?: string
          boost_type?: string
          expires_at?: string
          id?: string
          multiplier?: number
          purchase_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_active_boosts_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "xp_purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_active_boosts_student_id_fkey"
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
      student_badges: {
        Row: {
          awarded_at: string
          badge_id: string
          id: string
          student_id: string
        }
        Insert: {
          awarded_at?: string
          badge_id: string
          id?: string
          student_id: string
        }
        Update: {
          awarded_at?: string
          badge_id?: string
          id?: string
          student_id?: string
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
      student_content: {
        Row: {
          clo_id: string | null
          content_data: Json
          content_type: string
          created_at: string
          id: string
          institution_id: string
          reviewed_at: string | null
          reviewer_feedback: string | null
          reviewer_id: string | null
          status: string
          student_id: string
          title: string
          updated_at: string
        }
        Insert: {
          clo_id?: string | null
          content_data?: Json
          content_type: string
          created_at?: string
          id?: string
          institution_id: string
          reviewed_at?: string | null
          reviewer_feedback?: string | null
          reviewer_id?: string | null
          status?: string
          student_id: string
          title: string
          updated_at?: string
        }
        Update: {
          clo_id?: string | null
          content_data?: Json
          content_type?: string
          created_at?: string
          id?: string
          institution_id?: string
          reviewed_at?: string | null
          reviewer_feedback?: string | null
          reviewer_id?: string | null
          status?: string
          student_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_content_clo_id_fkey"
            columns: ["clo_id"]
            isOneToOne: false
            referencedRelation: "learning_outcomes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_content_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_content_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_content_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_content_student_id_fkey"
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
      student_equipped_items: {
        Row: {
          equipped_at: string
          id: string
          purchase_id: string
          slot: Database["public"]["Enums"]["cosmetic_slot"]
          student_id: string
        }
        Insert: {
          equipped_at?: string
          id?: string
          purchase_id: string
          slot: Database["public"]["Enums"]["cosmetic_slot"]
          student_id: string
        }
        Update: {
          equipped_at?: string
          id?: string
          purchase_id?: string
          slot?: Database["public"]["Enums"]["cosmetic_slot"]
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_equipped_items_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "xp_purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_equipped_items_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_gamification: {
        Row: {
          comeback_active: boolean | null
          comeback_challenge_active: boolean
          comeback_challenge_days_completed: number
          comeback_challenge_start_date: string | null
          comeback_challenge_streak_to_restore: number
          comeback_days_completed: number | null
          comeback_streak_to_restore: number | null
          habit_difficulty_level: string | null
          habit_level_streak: number | null
          id: string
          last_login_date: string | null
          leaderboard_anonymous: boolean
          league_tier: string
          level: number
          streak_current: number
          streak_freezes_available: number
          streak_longest: number
          student_id: string
          total_active_days: number
          updated_at: string
          xp_total: number
        }
        Insert: {
          comeback_active?: boolean | null
          comeback_challenge_active?: boolean
          comeback_challenge_days_completed?: number
          comeback_challenge_start_date?: string | null
          comeback_challenge_streak_to_restore?: number
          comeback_days_completed?: number | null
          comeback_streak_to_restore?: number | null
          habit_difficulty_level?: string | null
          habit_level_streak?: number | null
          id?: string
          last_login_date?: string | null
          leaderboard_anonymous?: boolean
          league_tier?: string
          level?: number
          streak_current?: number
          streak_freezes_available?: number
          streak_longest?: number
          student_id: string
          total_active_days?: number
          updated_at?: string
          xp_total?: number
        }
        Update: {
          comeback_active?: boolean | null
          comeback_challenge_active?: boolean
          comeback_challenge_days_completed?: number
          comeback_challenge_start_date?: string | null
          comeback_challenge_streak_to_restore?: number
          comeback_days_completed?: number | null
          comeback_streak_to_restore?: number | null
          habit_difficulty_level?: string | null
          habit_level_streak?: number | null
          id?: string
          last_login_date?: string | null
          leaderboard_anonymous?: boolean
          league_tier?: string
          level?: number
          streak_current?: number
          streak_freezes_available?: number
          streak_longest?: number
          student_id?: string
          total_active_days?: number
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
      student_habit_level_history: {
        Row: {
          changed_at: string
          id: string
          new_level: number
          previous_level: number | null
          student_id: string
        }
        Insert: {
          changed_at?: string
          id?: string
          new_level: number
          previous_level?: number | null
          student_id: string
        }
        Update: {
          changed_at?: string
          id?: string
          new_level?: number
          previous_level?: number | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_habit_level_history_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_habit_levels: {
        Row: {
          current_level: number
          id: string
          student_id: string
          updated_at: string
        }
        Insert: {
          current_level?: number
          id?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          current_level?: number
          id?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_habit_levels_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_learning_states: {
        Row: {
          active_interventions: Json
          approved_executed_actions: Json
          calculated_at: string
          fresh_until: string
          freshness: Json
          goals: Json
          habits: Json
          institution_id: string
          mastery: Json
          measured_intervention_effects: Json
          opportunities: Json
          recent_evidence: Json
          recommendation_history: Json
          risk_signals: Json
          state_hash: string
          strengths: Json
          student_id: string
          updated_at: string
          version: number
          versions: Json
        }
        Insert: {
          active_interventions: Json
          approved_executed_actions: Json
          calculated_at: string
          fresh_until: string
          freshness: Json
          goals: Json
          habits: Json
          institution_id: string
          mastery: Json
          measured_intervention_effects: Json
          opportunities: Json
          recent_evidence: Json
          recommendation_history: Json
          risk_signals: Json
          state_hash: string
          strengths: Json
          student_id: string
          updated_at?: string
          version?: number
          versions?: Json
        }
        Update: {
          active_interventions?: Json
          approved_executed_actions?: Json
          calculated_at?: string
          fresh_until?: string
          freshness?: Json
          goals?: Json
          habits?: Json
          institution_id?: string
          mastery?: Json
          measured_intervention_effects?: Json
          opportunities?: Json
          recent_evidence?: Json
          recommendation_history?: Json
          risk_signals?: Json
          state_hash?: string
          strengths?: Json
          student_id?: string
          updated_at?: string
          version?: number
          versions?: Json
        }
        Relationships: [
          {
            foreignKeyName: "student_learning_states_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_learning_states_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_learning_states_student_id_fkey"
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
            foreignKeyName: "student_profiles_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions_public"
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
      student_quest_progress: {
        Row: {
          completed_at: string | null
          id: string
          quest_id: string
          reward_claimed: boolean
          started_at: string
          status: string
          student_id: string
        }
        Insert: {
          completed_at?: string | null
          id?: string
          quest_id: string
          reward_claimed?: boolean
          started_at?: string
          status?: string
          student_id: string
        }
        Update: {
          completed_at?: string | null
          id?: string
          quest_id?: string
          reward_claimed?: boolean
          started_at?: string
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_quest_progress_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "knowledge_quests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_quest_progress_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_support_states: {
        Row: {
          id: string
          institution_id: string
          last_reviewed_at: string | null
          open_support_cases: Json
          student_id: string
          support_level: string
          updated_at: string
        }
        Insert: {
          id?: string
          institution_id: string
          last_reviewed_at?: string | null
          open_support_cases?: Json
          student_id: string
          support_level?: string
          updated_at?: string
        }
        Update: {
          id?: string
          institution_id?: string
          last_reviewed_at?: string | null
          open_support_cases?: Json
          student_id?: string
          support_level?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_support_states_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_support_states_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_support_states_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_wellness_preferences: {
        Row: {
          created_at: string
          dismissed_onboarding_tips: string[]
          enabled_habits: string[]
          habit_targets: Json
          id: string
          parent_visibility: boolean
          reminder_times: Json
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dismissed_onboarding_tips?: string[]
          enabled_habits?: string[]
          habit_targets?: Json
          id?: string
          parent_visibility?: boolean
          reminder_times?: Json
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dismissed_onboarding_tips?: string[]
          enabled_habits?: string[]
          habit_targets?: Json
          id?: string
          parent_visibility?: boolean
          reminder_times?: Json
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_wellness_preferences_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      study_sessions: {
        Row: {
          actual_duration_minutes: number | null
          actual_end_at: string | null
          actual_start_at: string | null
          clo_id: string | null
          clo_ids: string[] | null
          course_id: string | null
          created_at: string | null
          description: string | null
          ended_at: string | null
          flow_rating: number | null
          id: string
          intent: string | null
          planned_date: string | null
          planned_duration_minutes: number | null
          planned_start_time: string | null
          reflection: string | null
          satisfaction_rating: number | null
          session_type: string
          started_at: string
          status: Database["public"]["Enums"]["session_status_type"] | null
          student_id: string
          timer_mode: Database["public"]["Enums"]["timer_mode_type"] | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          actual_duration_minutes?: number | null
          actual_end_at?: string | null
          actual_start_at?: string | null
          clo_id?: string | null
          clo_ids?: string[] | null
          course_id?: string | null
          created_at?: string | null
          description?: string | null
          ended_at?: string | null
          flow_rating?: number | null
          id?: string
          intent?: string | null
          planned_date?: string | null
          planned_duration_minutes?: number | null
          planned_start_time?: string | null
          reflection?: string | null
          satisfaction_rating?: number | null
          session_type?: string
          started_at: string
          status?: Database["public"]["Enums"]["session_status_type"] | null
          student_id: string
          timer_mode?: Database["public"]["Enums"]["timer_mode_type"] | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          actual_duration_minutes?: number | null
          actual_end_at?: string | null
          actual_start_at?: string | null
          clo_id?: string | null
          clo_ids?: string[] | null
          course_id?: string | null
          created_at?: string | null
          description?: string | null
          ended_at?: string | null
          flow_rating?: number | null
          id?: string
          intent?: string | null
          planned_date?: string | null
          planned_duration_minutes?: number | null
          planned_start_time?: string | null
          reflection?: string | null
          satisfaction_rating?: number | null
          session_type?: string
          started_at?: string
          status?: Database["public"]["Enums"]["session_status_type"] | null
          student_id?: string
          timer_mode?: Database["public"]["Enums"]["timer_mode_type"] | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "study_sessions_clo_id_fkey"
            columns: ["clo_id"]
            isOneToOne: false
            referencedRelation: "learning_outcomes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_sessions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_sessions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sub_clos: {
        Row: {
          clo_id: string
          created_at: string | null
          description: string | null
          id: string
          sort_order: number | null
          title: string
        }
        Insert: {
          clo_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          sort_order?: number | null
          title: string
        }
        Update: {
          clo_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          sort_order?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "sub_clos_clo_id_fkey"
            columns: ["clo_id"]
            isOneToOne: false
            referencedRelation: "learning_outcomes"
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
          {
            foreignKeyName: "surveys_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions_public"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_handoff_requests: {
        Row: {
          clo_id: string | null
          conversation_id: string
          conversation_summary: string
          course_id: string
          created_at: string
          id: string
          institution_id: string
          resolved_at: string | null
          status: string
          student_consent: boolean
          student_id: string
          suggested_intervention: string
          teacher_id: string
          teacher_response: string | null
          trigger_reason: string
        }
        Insert: {
          clo_id?: string | null
          conversation_id: string
          conversation_summary: string
          course_id: string
          created_at?: string
          id?: string
          institution_id: string
          resolved_at?: string | null
          status?: string
          student_consent?: boolean
          student_id: string
          suggested_intervention: string
          teacher_id: string
          teacher_response?: string | null
          trigger_reason: string
        }
        Update: {
          clo_id?: string | null
          conversation_id?: string
          conversation_summary?: string
          course_id?: string
          created_at?: string
          id?: string
          institution_id?: string
          resolved_at?: string | null
          status?: string
          student_consent?: boolean
          student_id?: string
          suggested_intervention?: string
          teacher_id?: string
          teacher_response?: string | null
          trigger_reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_handoff_requests_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "tutor_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_handoff_requests_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_handoff_requests_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_handoff_requests_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_handoff_requests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_handoff_requests_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teaching_moment_ratings: {
        Row: {
          clarity_rating: number
          helpfulness_rating: number
          id: string
          rated_at: string
          teaching_moment_id: string
          viewer_id: string
        }
        Insert: {
          clarity_rating: number
          helpfulness_rating: number
          id?: string
          rated_at?: string
          teaching_moment_id: string
          viewer_id: string
        }
        Update: {
          clarity_rating?: number
          helpfulness_rating?: number
          id?: string
          rated_at?: string
          teaching_moment_id?: string
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teaching_moment_ratings_teaching_moment_id_fkey"
            columns: ["teaching_moment_id"]
            isOneToOne: false
            referencedRelation: "peer_teaching_moments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teaching_moment_ratings_viewer_id_fkey"
            columns: ["viewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teaching_moment_views: {
        Row: {
          id: string
          pre_view_attainment: number | null
          teaching_moment_id: string
          viewed_at: string
          viewer_id: string
        }
        Insert: {
          id?: string
          pre_view_attainment?: number | null
          teaching_moment_id: string
          viewed_at?: string
          viewer_id: string
        }
        Update: {
          id?: string
          pre_view_attainment?: number | null
          teaching_moment_id?: string
          viewed_at?: string
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teaching_moment_views_teaching_moment_id_fkey"
            columns: ["teaching_moment_id"]
            isOneToOne: false
            referencedRelation: "peer_teaching_moments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teaching_moment_views_viewer_id_fkey"
            columns: ["viewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      team_badges: {
        Row: {
          badge_key: string
          earned_at: string
          id: string
          team_id: string
        }
        Insert: {
          badge_key: string
          earned_at?: string
          id?: string
          team_id: string
        }
        Update: {
          badge_key?: string
          earned_at?: string
          id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_badges_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_gamification: {
        Row: {
          id: string
          last_streak_date: string | null
          streak_current: number
          streak_longest: number
          team_id: string
          updated_at: string
          xp_this_week: number
          xp_total: number
        }
        Insert: {
          id?: string
          last_streak_date?: string | null
          streak_current?: number
          streak_longest?: number
          team_id: string
          updated_at?: string
          xp_this_week?: number
          xp_total?: number
        }
        Update: {
          id?: string
          last_streak_date?: string | null
          streak_current?: number
          streak_longest?: number
          team_id?: string
          updated_at?: string
          xp_this_week?: number
          xp_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "team_gamification_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: true
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_health_snapshots: {
        Row: {
          activity_overlap_rate: number
          challenge_participation_rate: number
          computed_at: string
          engagement_trend: string
          gini_coefficient: number
          health_score: number
          id: string
          team_id: string
        }
        Insert: {
          activity_overlap_rate: number
          challenge_participation_rate: number
          computed_at?: string
          engagement_trend: string
          gini_coefficient: number
          health_score: number
          id?: string
          team_id: string
        }
        Update: {
          activity_overlap_rate?: number
          challenge_participation_rate?: number
          computed_at?: string
          engagement_trend?: string
          gini_coefficient?: number
          health_score?: number
          id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_health_snapshots_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invitations: {
        Row: {
          created_at: string
          id: string
          invited_by: string
          invited_student_id: string
          responded_at: string | null
          status: string
          team_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by: string
          invited_student_id: string
          responded_at?: string | null
          status?: string
          team_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string
          invited_student_id?: string
          responded_at?: string | null
          status?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_invitations_invited_student_id_fkey"
            columns: ["invited_student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_invitations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          consecutive_low_days: number
          contribution_status: string
          contribution_status_since: string | null
          id: string
          joined_at: string
          left_at: string | null
          role: string
          student_id: string
          team_id: string
        }
        Insert: {
          consecutive_low_days?: number
          contribution_status?: string
          contribution_status_since?: string | null
          id?: string
          joined_at?: string
          left_at?: string | null
          role?: string
          student_id: string
          team_id: string
        }
        Update: {
          consecutive_low_days?: number
          contribution_status?: string
          contribution_status_since?: string | null
          id?: string
          joined_at?: string
          left_at?: string | null
          role?: string
          student_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          avatar_letter: string | null
          captain_id: string
          cooperation_score: number
          course_id: string
          created_at: string
          created_by: string
          deleted_at: string | null
          health_score: number
          health_status: string
          id: string
          institution_id: string
          name: string
          streak_count: number
          streak_last_active_date: string | null
          updated_at: string
          xp_total: number
        }
        Insert: {
          avatar_letter?: string | null
          captain_id: string
          cooperation_score?: number
          course_id: string
          created_at?: string
          created_by: string
          deleted_at?: string | null
          health_score?: number
          health_status?: string
          id?: string
          institution_id: string
          name: string
          streak_count?: number
          streak_last_active_date?: string | null
          updated_at?: string
          xp_total?: number
        }
        Update: {
          avatar_letter?: string | null
          captain_id?: string
          cooperation_score?: number
          course_id?: string
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          health_score?: number
          health_status?: string
          id?: string
          institution_id?: string
          name?: string
          streak_count?: number
          streak_last_active_date?: string | null
          updated_at?: string
          xp_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "teams_captain_id_fkey"
            columns: ["captain_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions_public"
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
      tutor_conversations: {
        Row: {
          autonomy_override: string | null
          clo_scope: string[] | null
          course_id: string | null
          created_at: string
          id: string
          institution_id: string
          is_active: boolean
          message_count: number
          persona: string
          recommended_persona: string | null
          student_id: string
          title: string | null
          updated_at: string
          xp_awarded: boolean
        }
        Insert: {
          autonomy_override?: string | null
          clo_scope?: string[] | null
          course_id?: string | null
          created_at?: string
          id?: string
          institution_id: string
          is_active?: boolean
          message_count?: number
          persona?: string
          recommended_persona?: string | null
          student_id: string
          title?: string | null
          updated_at?: string
          xp_awarded?: boolean
        }
        Update: {
          autonomy_override?: string | null
          clo_scope?: string[] | null
          course_id?: string | null
          created_at?: string
          id?: string
          institution_id?: string
          is_active?: boolean
          message_count?: number
          persona?: string
          recommended_persona?: string | null
          student_id?: string
          title?: string | null
          updated_at?: string
          xp_awarded?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "tutor_conversations_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tutor_conversations_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tutor_conversations_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tutor_conversations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tutor_llm_logs: {
        Row: {
          completion_tokens: number
          conversation_id: string | null
          created_at: string
          error_message: string | null
          id: string
          institution_id: string
          latency_ms: number
          model_used: string
          prompt_tokens: number
          status: string
          student_id: string
          total_tokens: number
        }
        Insert: {
          completion_tokens: number
          conversation_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          institution_id: string
          latency_ms: number
          model_used: string
          prompt_tokens: number
          status: string
          student_id: string
          total_tokens: number
        }
        Update: {
          completion_tokens?: number
          conversation_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          institution_id?: string
          latency_ms?: number
          model_used?: string
          prompt_tokens?: number
          status?: string
          student_id?: string
          total_tokens?: number
        }
        Relationships: [
          {
            foreignKeyName: "tutor_llm_logs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "tutor_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tutor_llm_logs_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tutor_llm_logs_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tutor_llm_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tutor_messages: {
        Row: {
          autonomy_level: string | null
          content: string
          conversation_id: string
          created_at: string
          document_url: string | null
          flagged_integrity: boolean
          id: string
          image_urls: string[] | null
          nudge_type: string | null
          role: string
          satisfaction_rating: string | null
          source_citations: Json | null
          token_count: number
        }
        Insert: {
          autonomy_level?: string | null
          content: string
          conversation_id: string
          created_at?: string
          document_url?: string | null
          flagged_integrity?: boolean
          id?: string
          image_urls?: string[] | null
          nudge_type?: string | null
          role: string
          satisfaction_rating?: string | null
          source_citations?: Json | null
          token_count?: number
        }
        Update: {
          autonomy_level?: string | null
          content?: string
          conversation_id?: string
          created_at?: string
          document_url?: string | null
          flagged_integrity?: boolean
          id?: string
          image_urls?: string[] | null
          nudge_type?: string | null
          role?: string
          satisfaction_rating?: string | null
          source_citations?: Json | null
          token_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "tutor_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "tutor_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      tutor_plan_updates: {
        Row: {
          clo_id: string
          conversation_id: string
          course_id: string
          created_at: string
          id: string
          institution_id: string
          interaction_count: number
          modifications: string | null
          recommended_materials: Json
          responded_at: string | null
          response: string | null
          student_id: string
          study_time_recommendation: string
          suggested_planner_sessions: number
        }
        Insert: {
          clo_id: string
          conversation_id: string
          course_id: string
          created_at?: string
          id?: string
          institution_id: string
          interaction_count: number
          modifications?: string | null
          recommended_materials?: Json
          responded_at?: string | null
          response?: string | null
          student_id: string
          study_time_recommendation: string
          suggested_planner_sessions?: number
        }
        Update: {
          clo_id?: string
          conversation_id?: string
          course_id?: string
          created_at?: string
          id?: string
          institution_id?: string
          interaction_count?: number
          modifications?: string | null
          recommended_materials?: Json
          responded_at?: string | null
          response?: string | null
          student_id?: string
          study_time_recommendation?: string
          suggested_planner_sessions?: number
        }
        Relationships: [
          {
            foreignKeyName: "tutor_plan_updates_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "tutor_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tutor_plan_updates_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tutor_plan_updates_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tutor_plan_updates_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tutor_plan_updates_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tutor_usage_limits: {
        Row: {
          created_at: string
          id: string
          institution_id: string
          message_count: number
          student_id: string
          token_count: number
          usage_date: string
        }
        Insert: {
          created_at?: string
          id?: string
          institution_id: string
          message_count?: number
          student_id: string
          token_count?: number
          usage_date?: string
        }
        Update: {
          created_at?: string
          id?: string
          institution_id?: string
          message_count?: number
          student_id?: string
          token_count?: number
          usage_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "tutor_usage_limits_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tutor_usage_limits_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tutor_usage_limits_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      verified_explanations: {
        Row: {
          created_at: string
          explanation_text: string
          id: string
          institution_id: string
          is_active: boolean
          question_id: string
          source: string
          updated_at: string
          verified_by: string
        }
        Insert: {
          created_at?: string
          explanation_text: string
          id?: string
          institution_id: string
          is_active?: boolean
          question_id: string
          source: string
          updated_at?: string
          verified_by: string
        }
        Update: {
          created_at?: string
          explanation_text?: string
          id?: string
          institution_id?: string
          is_active?: boolean
          question_id?: string
          source?: string
          updated_at?: string
          verified_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "verified_explanations_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verified_explanations_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verified_explanations_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "question_bank"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verified_explanations_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_goals: {
        Row: {
          created_at: string | null
          current_value: number | null
          goal_text: string
          goal_type: string | null
          id: string
          status: string | null
          student_id: string
          target_value: number | null
          updated_at: string | null
          week_start: string
          week_start_date: string
        }
        Insert: {
          created_at?: string | null
          current_value?: number | null
          goal_text: string
          goal_type?: string | null
          id?: string
          status?: string | null
          student_id: string
          target_value?: number | null
          updated_at?: string | null
          week_start: string
          week_start_date: string
        }
        Update: {
          created_at?: string | null
          current_value?: number | null
          goal_text?: string
          goal_type?: string | null
          id?: string
          status?: string | null
          student_id?: string
          target_value?: number | null
          updated_at?: string | null
          week_start?: string
          week_start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_goals_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wellness_habit_logs: {
        Row: {
          completed_at: string
          created_at: string
          date: string
          id: string
          student_id: string
          value: number | null
          wellness_type: Database["public"]["Enums"]["wellness_habit_type"]
        }
        Insert: {
          completed_at?: string
          created_at?: string
          date: string
          id?: string
          student_id: string
          value?: number | null
          wellness_type: Database["public"]["Enums"]["wellness_habit_type"]
        }
        Update: {
          completed_at?: string
          created_at?: string
          date?: string
          id?: string
          student_id?: string
          value?: number | null
          wellness_type?: Database["public"]["Enums"]["wellness_habit_type"]
        }
        Relationships: [
          {
            foreignKeyName: "wellness_habit_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          {
            foreignKeyName: "xp_events_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions_public"
            referencedColumns: ["id"]
          },
        ]
      }
      xp_purchases: {
        Row: {
          consumed_at: string | null
          id: string
          institution_id: string | null
          item_id: string
          metadata: Json | null
          purchased_at: string
          status: Database["public"]["Enums"]["xp_purchase_status"]
          student_id: string
          xp_cost: number
        }
        Insert: {
          consumed_at?: string | null
          id?: string
          institution_id?: string | null
          item_id: string
          metadata?: Json | null
          purchased_at?: string
          status?: Database["public"]["Enums"]["xp_purchase_status"]
          student_id: string
          xp_cost: number
        }
        Update: {
          consumed_at?: string | null
          id?: string
          institution_id?: string | null
          item_id?: string
          metadata?: Json | null
          purchased_at?: string
          status?: Database["public"]["Enums"]["xp_purchase_status"]
          student_id?: string
          xp_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "xp_purchases_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "xp_purchases_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "xp_purchases_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "marketplace_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "xp_purchases_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      xp_transactions: {
        Row: {
          base_xp: number | null
          created_at: string
          final_xp: number | null
          id: string
          multipliers: Json | null
          note: string | null
          reference_id: string | null
          scope: string
          source: string
          student_id: string
          team_id: string | null
          xp_amount: number
        }
        Insert: {
          base_xp?: number | null
          created_at?: string
          final_xp?: number | null
          id?: string
          multipliers?: Json | null
          note?: string | null
          reference_id?: string | null
          scope?: string
          source: string
          student_id: string
          team_id?: string | null
          xp_amount: number
        }
        Update: {
          base_xp?: number | null
          created_at?: string
          final_xp?: number | null
          id?: string
          multipliers?: Json | null
          note?: string | null
          reference_id?: string | null
          scope?: string
          source?: string
          student_id?: string
          team_id?: string | null
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
          {
            foreignKeyName: "xp_transactions_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      agent_tool_calls: {
        Row: {
          actor_role: string | null
          actor_user_id: string | null
          approval_state: string | null
          completed_at: string | null
          created_at: string | null
          error_classification: string | null
          evidence_hash: string | null
          id: string | null
          idempotency_key: string | null
          institution_id: string | null
          latency_ms: number | null
          model: string | null
          proposal_id: string | null
          provider: string | null
          request_id: string | null
          risk_classification: string | null
          run_id: string | null
          session_id: string | null
          specialist: string | null
          started_at: string | null
          status: string | null
          tool_name: string | null
          tool_version: string | null
        }
        Insert: {
          actor_role?: string | null
          actor_user_id?: string | null
          approval_state?: string | null
          completed_at?: string | null
          created_at?: string | null
          error_classification?: string | null
          evidence_hash?: string | null
          id?: string | null
          idempotency_key?: string | null
          institution_id?: string | null
          latency_ms?: number | null
          model?: string | null
          proposal_id?: string | null
          provider?: string | null
          request_id?: string | null
          risk_classification?: string | null
          run_id?: string | null
          session_id?: string | null
          specialist?: string | null
          started_at?: string | null
          status?: string | null
          tool_name?: string | null
          tool_version?: string | null
        }
        Update: {
          actor_role?: string | null
          actor_user_id?: string | null
          approval_state?: string | null
          completed_at?: string | null
          created_at?: string | null
          error_classification?: string | null
          evidence_hash?: string | null
          id?: string | null
          idempotency_key?: string | null
          institution_id?: string | null
          latency_ms?: number | null
          model?: string | null
          proposal_id?: string | null
          provider?: string | null
          request_id?: string | null
          risk_classification?: string | null
          run_id?: string | null
          session_id?: string | null
          specialist?: string | null
          started_at?: string | null
          status?: string | null
          tool_name?: string | null
          tool_version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_tool_attempts_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_tool_attempts_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_tool_attempts_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_tool_attempts_proposal_fk"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "agent_action_proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_tool_attempts_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "agent_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      institutions_public: {
        Row: {
          id: string | null
          join_mode: string | null
          logo_url: string | null
          name: string | null
          slug: string | null
        }
        Insert: {
          id?: string | null
          join_mode?: string | null
          logo_url?: string | null
          name?: string | null
          slug?: string | null
        }
        Update: {
          id?: string | null
          join_mode?: string | null
          logo_url?: string | null
          name?: string | null
          slug?: string | null
        }
        Relationships: []
      }
      leaderboard_weekly: {
        Row: {
          rank: number | null
          student_id: string | null
          weekly_xp: number | null
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
      mv_historical_evidence: {
        Row: {
          avg_score: number | null
          blooms_level: Database["public"]["Enums"]["blooms_level"] | null
          developing_count: number | null
          evidence_count: number | null
          excellent_count: number | null
          not_yet_count: number | null
          outcome_type: Database["public"]["Enums"]["outcome_type"] | null
          satisfactory_count: number | null
          semester_id: string | null
          semester_name: string | null
          start_date: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_update_parent_link: {
        Args: {
          p_action: string
          p_actor_id: string
          p_link_id: string
          p_reason: string
          p_relationship: string
          p_relationship_label: string
        }
        Returns: Json
      }
      anonymize_user: { Args: { p_user_id: string }; Returns: Json }
      auth_institution_id: { Args: never; Returns: string }
      auth_user_is_thread_participant: {
        Args: { p_thread_id: string }
        Returns: boolean
      }
      auth_user_role: { Args: never; Returns: string }
      auth_user_status: { Args: never; Returns: string }
      badge_auto_archive: { Args: never; Returns: undefined }
      badge_spotlight_auto_rotate: { Args: never; Returns: undefined }
      calculate_level_from_xp: { Args: { p_xp: number }; Returns: number }
      capture_active_semester_snapshots: { Args: never; Returns: number }
      check_rate_limit_approaching: {
        Args: {
          p_event_type?: string
          p_ip_address: unknown
          p_threshold?: number
          p_window_minutes?: number
        }
        Returns: boolean
      }
      claim_due_intervention_measurements_v1: {
        Args: {
          p_batch_size?: number
          p_lease_seconds?: number
          p_worker_id: string
        }
        Returns: {
          baseline_evidence: Json
          baseline_metric: number
          course_id: string | null
          created_at: string
          delta: number | null
          evaluation_attempt_count: number
          evaluation_claimed_by: string | null
          evaluation_dead_lettered_at: string | null
          evaluation_lease_until: string | null
          evaluation_state: string
          evaluator_recommendation: string | null
          evaluator_summary: string | null
          evidence_sufficiency: string
          execution_id: string
          id: string
          institution_id: string
          last_evaluation_error: string | null
          measured_at: string | null
          measurement_window_end: string
          measurement_window_start: string
          outcome_id: string | null
          post_action_evidence: Json | null
          post_action_metric: number | null
          program_id: string | null
          proposal_id: string
          student_id: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "intervention_measurements"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_proactive_agent_jobs_v1: {
        Args: {
          p_batch_size?: number
          p_lease_seconds?: number
          p_worker_id: string
        }
        Returns: {
          attempt_count: number
          available_at: string
          claimed_by: string | null
          completed_at: string | null
          course_id: string | null
          created_at: string
          error_classification: string | null
          evidence_hash: string
          evidence_packet: Json
          id: string
          idempotency_key: string
          institution_id: string
          last_error_at: string | null
          learning_state_version: number
          lease_until: string | null
          max_attempts: number
          model: string | null
          program_id: string | null
          proposal_ids: Json
          provider: string | null
          recipient_role: string
          recipient_user_id: string
          recommendation: string | null
          run_id: string | null
          specialist: string
          status: string
          student_id: string
          trigger_key: string
          trigger_source: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "proactive_agent_jobs"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      complete_intervention_evaluation_v1: {
        Args: {
          p_measurement_id: string
          p_post_action_evidence: Json
          p_post_action_metric: number
          p_worker_id: string
        }
        Returns: {
          baseline_evidence: Json
          baseline_metric: number
          course_id: string | null
          created_at: string
          delta: number | null
          evaluation_attempt_count: number
          evaluation_claimed_by: string | null
          evaluation_dead_lettered_at: string | null
          evaluation_lease_until: string | null
          evaluation_state: string
          evaluator_recommendation: string | null
          evaluator_summary: string | null
          evidence_sufficiency: string
          execution_id: string
          id: string
          institution_id: string
          last_evaluation_error: string | null
          measured_at: string | null
          measurement_window_end: string
          measurement_window_start: string
          outcome_id: string | null
          post_action_evidence: Json | null
          post_action_metric: number | null
          program_id: string | null
          proposal_id: string
          student_id: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "intervention_measurements"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      complete_proactive_agent_job_v1: {
        Args: {
          p_job_id: string
          p_model: string
          p_proposal_ids: Json
          p_provider: string
          p_recommendation: string
          p_run_id: string
          p_worker_id: string
        }
        Returns: boolean
      }
      consume_invitation: { Args: { p_token: string }; Returns: boolean }
      course_material_institution: {
        Args: { p_object_name: string }
        Returns: string
      }
      create_invitation: {
        Args: {
          p_actor_id: string
          p_email: string
          p_idempotency_key: string
          p_role: string
          p_token_hash: string
        }
        Returns: Json
      }
      create_parent_link_invitation: {
        Args: {
          p_actor_id: string
          p_email: string
          p_idempotency_key: string
          p_relationship: string
          p_relationship_label: string
          p_student_id: string
          p_token_hash: string
        }
        Returns: Json
      }
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      delete_department_if_no_programs: {
        Args: { dept_id: string }
        Returns: boolean
      }
      emit_notification: {
        Args: {
          p_body?: string
          p_dedup_key?: string
          p_metadata?: Json
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: undefined
      }
      enqueue_intervention_generation_jobs_v1: {
        Args: {
          p_batch_size?: number
          p_institution_id?: string
          p_trigger_source?: string
        }
        Returns: number
      }
      enqueue_proactive_agent_jobs_v1: {
        Args: {
          p_batch_size?: number
          p_institution_id?: string
          p_student_id?: string
          p_trigger_source?: string
        }
        Returns: number
      }
      execute_approved_agent_personal_action_v1: {
        Args: { p_actor_id: string; p_proposal_id: string }
        Returns: Json
      }
      execute_approved_cqi_action_v1: {
        Args: { p_actor_id: string; p_proposal_id: string }
        Returns: Json
      }
      expire_stale_recovery_sessions: { Args: never; Returns: number }
      fail_intervention_evaluation_v1: {
        Args: {
          p_dead_letter?: boolean
          p_error_classification: string
          p_measurement_id: string
          p_worker_id: string
        }
        Returns: string
      }
      fail_proactive_agent_job_v1: {
        Args: {
          p_error_classification: string
          p_job_id: string
          p_retryable?: boolean
          p_worker_id: string
        }
        Returns: string
      }
      fan_out_announcement_notifications: {
        Args: { p_announcement_id: string }
        Returns: number
      }
      finalize_invitation_acceptance: {
        Args: { p_invitation_id: string; p_user_id: string }
        Returns: boolean
      }
      get_admin_analytics: {
        Args: { p_date_from?: string; p_date_to?: string }
        Returns: Json
      }
      get_admin_cqi_effectiveness_v1: { Args: never; Returns: Json }
      get_admin_dashboard: { Args: never; Returns: Json }
      get_badge_spotlight: {
        Args: { p_student_id: string; p_week_number: number }
        Returns: string
      }
      get_coordinator_accreditation_readiness: { Args: never; Returns: Json }
      get_coordinator_cqi_patterns_v1: {
        Args: { p_program_id: string }
        Returns: Json
      }
      get_coordinator_dashboard: { Args: never; Returns: Json }
      get_coordinator_workspace: { Args: never; Returns: Json }
      get_earn_spend_ratio: {
        Args: { p_institution_id: string }
        Returns: {
          ratio: number
          status: string
          total_earned: number
          total_spent: number
        }[]
      }
      get_effective_price: {
        Args: { p_institution_id: string; p_item_id: string }
        Returns: number
      }
      get_historical_evidence: {
        Args: { p_blooms_level?: string; p_outcome_type?: string }
        Returns: {
          avg_score: number
          blooms_level: string
          developing_count: number
          evidence_count: number
          excellent_count: number
          not_yet_count: number
          outcome_type: string
          satisfactory_count: number
          semester_id: string
          semester_name: string
          start_date: string
        }[]
      }
      get_intervention_effects_v1: {
        Args: {
          p_course_id?: string
          p_program_id?: string
          p_student_id?: string
        }
        Returns: Json[]
      }
      get_invitation_by_token: {
        Args: { p_token: string }
        Returns: {
          email: string
          expires_at: string
          id: string
          institution_id: string
          institution_name: string
          role: Database["public"]["Enums"]["user_role"]
        }[]
      }
      get_leaderboard_page: {
        Args: { p_institution_id: string; p_limit: number; p_offset: number }
        Returns: {
          eligible_count: number
          full_name: string
          global_rank: number
          level: number
          streak_current: number
          student_id: string
          xp_total: number
        }[]
      }
      get_my_proactive_intelligence_v1: {
        Args: { p_limit?: number }
        Returns: {
          completed_at: string
          course_id: string
          evidence_packet: Json
          id: string
          program_id: string
          proposals: Json
          recipient_role: string
          recommendation: string
          specialist: string
          student_id: string
          trigger_key: string
        }[]
      }
      get_parent_dashboard: { Args: never; Returns: Json }
      get_student_dashboard: { Args: { p_student_id: string }; Returns: Json }
      get_student_learning_state_v1: {
        Args: {
          p_course_id?: string
          p_program_id?: string
          p_student_id: string
        }
        Returns: Json
      }
      get_teacher_dashboard: { Args: { p_teacher_id: string }; Returns: Json }
      get_wellness_aggregate_stats: {
        Args: { p_institution_id: string }
        Returns: {
          total_logs: number
          unique_students: number
          wellness_type: string
        }[]
      }
      get_xp_balance: { Args: { p_student_id: string }; Returns: number }
      get_xp_transactions_page: {
        Args: {
          p_filter: string
          p_limit: number
          p_offset: number
          p_student_id: string
        }
        Returns: {
          amount: number
          category: string
          id: string
          kind: string
          label: string
          occurred_at: string
          total_count: number
        }[]
      }
      health_check_ping: { Args: never; Returns: boolean }
      increment_team_xp: {
        Args: { p_amount: number; p_team_id: string }
        Returns: undefined
      }
      is_pgcron_available: { Args: never; Returns: boolean }
      is_portfolio_publicly_accessible: {
        Args: { p_student_id: string }
        Returns: boolean
      }
      is_student_in_my_institution: {
        Args: { p_student_id: string }
        Returns: boolean
      }
      keepwarm_dashboards: { Args: never; Returns: number }
      link_existing_parent: {
        Args: {
          p_actor_id: string
          p_parent_id: string
          p_relationship: string
          p_relationship_label: string
          p_student_id: string
        }
        Returns: Json
      }
      mark_invitation_sent: {
        Args: { p_invitation_id: string; p_provider_message_id: string }
        Returns: boolean
      }
      measure_cqi_action_plan_v1: {
        Args: {
          p_actor_id: string
          p_after_window_end: string
          p_after_window_start: string
          p_measurement_id: string
        }
        Returns: Json
      }
      measure_intervention_v1: {
        Args: {
          p_measured_at?: string
          p_measurement_id: string
          p_post_action_evidence: Json
          p_post_action_metric: number
        }
        Returns: {
          baseline_evidence: Json
          baseline_metric: number
          course_id: string | null
          created_at: string
          delta: number | null
          evaluation_attempt_count: number
          evaluation_claimed_by: string | null
          evaluation_dead_lettered_at: string | null
          evaluation_lease_until: string | null
          evaluation_state: string
          evaluator_recommendation: string | null
          evaluator_summary: string | null
          evidence_sufficiency: string
          execution_id: string
          id: string
          institution_id: string
          last_evaluation_error: string | null
          measured_at: string | null
          measurement_window_end: string
          measurement_window_start: string
          outcome_id: string | null
          post_action_evidence: Json | null
          post_action_metric: number | null
          program_id: string | null
          proposal_id: string
          student_id: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "intervention_measurements"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      parent_has_verified_link: {
        Args: { p_student_id: string }
        Returns: boolean
      }
      portfolio_public_access: {
        Args: { p_student_id: string }
        Returns: string
      }
      preview_invitation: {
        Args: { p_token_hash: string }
        Returns: {
          expires_at: string
          institution_name: string
          invited_email: string
          role: Database["public"]["Enums"]["user_role"]
        }[]
      }
      preview_invitation_by_hash: {
        Args: { p_token_hash: string }
        Returns: {
          expires_at: string
          institution_name: string
          invited_email: string
          role: Database["public"]["Enums"]["user_role"]
        }[]
      }
      process_marketplace_purchase: {
        Args: {
          p_institution_id: string
          p_item_id: string
          p_student_id: string
        }
        Returns: Json
      }
      recalculate_dynamic_prices: {
        Args: { p_institution_id: string }
        Returns: undefined
      }
      recalculate_league_tiers: {
        Args: { p_institution_id: string }
        Returns: undefined
      }
      reconcile_student_learning_state_measurements_v1: {
        Args: { p_student_id: string }
        Returns: undefined
      }
      refresh_mv_historical_evidence: { Args: never; Returns: undefined }
      refresh_student_learning_state_v1: {
        Args: { p_student_id: string }
        Returns: {
          active_interventions: Json
          approved_executed_actions: Json
          calculated_at: string
          fresh_until: string
          freshness: Json
          goals: Json
          habits: Json
          institution_id: string
          mastery: Json
          measured_intervention_effects: Json
          opportunities: Json
          recent_evidence: Json
          recommendation_history: Json
          risk_signals: Json
          state_hash: string
          strengths: Json
          student_id: string
          updated_at: string
          version: number
          versions: Json
        }
        SetofOptions: {
          from: "*"
          to: "student_learning_states"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      register_intervention_measurement_v1: {
        Args: {
          p_baseline_evidence: Json
          p_baseline_metric: number
          p_course_id?: string
          p_execution_id: string
          p_outcome_id?: string
          p_program_id?: string
          p_proposal_id: string
          p_student_id: string
          p_window_end: string
          p_window_start: string
        }
        Returns: {
          baseline_evidence: Json
          baseline_metric: number
          course_id: string | null
          created_at: string
          delta: number | null
          evaluation_attempt_count: number
          evaluation_claimed_by: string | null
          evaluation_dead_lettered_at: string | null
          evaluation_lease_until: string | null
          evaluation_state: string
          evaluator_recommendation: string | null
          evaluator_summary: string | null
          evidence_sufficiency: string
          execution_id: string
          id: string
          institution_id: string
          last_evaluation_error: string | null
          measured_at: string | null
          measurement_window_end: string
          measurement_window_start: string
          outcome_id: string | null
          post_action_evidence: Json | null
          post_action_metric: number | null
          program_id: string | null
          proposal_id: string
          student_id: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "intervention_measurements"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      reorder_learning_outcomes: { Args: { p_items: Json }; Returns: number }
      replace_course_material_embeddings_v2: {
        Args: {
          p_course_id: string
          p_institution_id: string
          p_rows: Json
          p_source_filename: string
          p_source_material_id: string
        }
        Returns: number
      }
      replace_course_material_embeddings_v3: {
        Args: {
          p_course_id: string
          p_institution_id: string
          p_rows: Json
          p_source_filename: string
          p_source_material_id: string
        }
        Returns: number
      }
      respond_friend_request: {
        Args: { p_accept: boolean; p_friendship_id: string }
        Returns: undefined
      }
      rls_isolation_violations: {
        Args: never
        Returns: {
          cmd: string
          policy_name: string
          reason: string
          table_name: string
        }[]
      }
      search_course_materials: {
        Args: {
          match_clo_ids?: string[]
          match_count?: number
          match_course_ids: string[]
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          bloom_level: string
          chunk_text: string
          clo_ids: string[]
          id: string
          material_type: string
          similarity: number
          source_filename: string
        }[]
      }
      search_course_materials_v2: {
        Args: {
          match_clo_ids?: string[]
          match_count?: number
          match_course_ids: string[]
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          bloom_level: string
          chunk_text: string
          clo_ids: string[]
          embedding_model: string
          embedding_provider: string
          embedding_version: number
          id: string
          material_type: string
          similarity: number
          source_filename: string
        }[]
      }
      search_course_materials_v3: {
        Args: {
          match_clo_ids?: string[]
          match_count?: number
          match_course_ids: string[]
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          bloom_level: string
          chunk_text: string
          clo_ids: string[]
          embedding_model: string
          embedding_provider: string
          embedding_version: number
          id: string
          material_type: string
          similarity: number
          source_filename: string
        }[]
      }
      seed_marketplace_items: {
        Args: { p_institution_id: string }
        Returns: undefined
      }
      send_friend_request: { Args: { p_addressee_id: string }; Returns: string }
      send_teacher_nudge: {
        Args: { p_message: string; p_student_id: string }
        Returns: undefined
      }
      student_enrolled_in_team_course: {
        Args: { p_team_id: string }
        Returns: boolean
      }
      student_learning_state_needs_refresh_v1: {
        Args: { p_student_id: string }
        Returns: boolean
      }
      team_i_captain: { Args: { p_team_id: string }; Returns: boolean }
      team_i_captain_student_formed_active: {
        Args: { p_team_id: string }
        Returns: boolean
      }
      team_in_course_i_teach: { Args: { p_team_id: string }; Returns: boolean }
      team_in_course_i_teach_active: {
        Args: { p_team_id: string }
        Returns: boolean
      }
      team_in_my_institution: { Args: { p_team_id: string }; Returns: boolean }
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
      cosmetic_slot: "profile_theme" | "avatar_frame" | "display_title"
      flow_response_type: "in_the_zone" | "stuck" | "too_easy"
      goal_type_enum: "study_hours" | "sessions_completed" | "tasks_completed"
      marketplace_item_category: "cosmetic" | "educational_perk" | "power_up"
      marketplace_item_sub_category:
        | "profile_theme"
        | "avatar_frame"
        | "display_title"
        | "extra_quiz_attempt"
        | "deadline_extension"
        | "hint_token"
        | "xp_boost"
        | "streak_shield"
      marketplace_stock_type: "unlimited" | "limited" | "one_per_student"
      outcome_type: "ILO" | "PLO" | "CLO" | "SUB_CLO"
      quality_category_type: "thoughtful" | "good_effort" | "needs_detail"
      reflection_template_type: "free_form" | "simple" | "gibbs"
      reflection_type_enum: "session_reflection" | "journal_entry"
      review_status_type: "pending" | "completed" | "skipped"
      session_status_type: "planned" | "in_progress" | "completed" | "cancelled"
      submission_status: "submitted" | "graded"
      task_priority_type: "low" | "medium" | "high"
      task_status_type: "pending" | "completed"
      timer_mode_type: "pomodoro" | "custom"
      user_role: "admin" | "coordinator" | "teacher" | "student" | "parent"
      wellness_habit_type: "meditation" | "hydration" | "exercise" | "sleep"
      xp_purchase_status: "active" | "consumed" | "expired" | "refunded"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

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
} as const
