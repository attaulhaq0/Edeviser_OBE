import { z } from "zod";

// ─── Persona & Autonomy Enums ────────────────────────────────────────────────

export const tutorPersonaSchema = z.enum([
  "socratic_guide",
  "step_by_step_coach",
  "quick_explainer",
]);

export type TutorPersona = z.infer<typeof tutorPersonaSchema>;

export const autonomyLevelSchema = z.enum(["L1", "L2", "L3"]);

export type AutonomyLevel = z.infer<typeof autonomyLevelSchema>;

export const satisfactionRatingSchema = z.enum(["thumbs_up", "thumbs_down"]);

export type SatisfactionRating = z.infer<typeof satisfactionRatingSchema>;

// ─── Send Message ────────────────────────────────────────────────────────────

export const sendMessageSchema = z.object({
  conversation_id: z.string().uuid().optional(),
  course_id: z.string().uuid().optional(),
  message: z
    .string()
    .min(1, "Message cannot be empty")
    .max(2000, "Message cannot exceed 2000 characters"),
  persona: tutorPersonaSchema.optional(),
  image_urls: z
    .array(z.string().url())
    .max(2, "Maximum 2 images allowed")
    .optional(),
  document_url: z.string().url().optional(),
  clo_scope: z.array(z.string().uuid()).optional(),
  autonomy_override: z.enum(["L1", "L3"]).optional(),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;

// ─── Rate Message ────────────────────────────────────────────────────────────

export const rateMessageSchema = z.object({
  message_id: z.string().uuid(),
  rating: satisfactionRatingSchema,
});

export type RateMessageInput = z.infer<typeof rateMessageSchema>;

// ─── Tutor Analytics Request ─────────────────────────────────────────────────

export const tutorAnalyticsRequestSchema = z.object({
  course_id: z.string().uuid(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
});

export type TutorAnalyticsRequest = z.infer<typeof tutorAnalyticsRequestSchema>;

// ─── SSE Event Types ─────────────────────────────────────────────────────────

export interface SourceCitation {
  chunk_id: string;
  chunk_text: string;
  source_filename: string;
  material_type: string;
  similarity_score: number;
}

export interface LearningPlanUpdate {
  id: string;
  clo_id: string;
  clo_title: string;
  study_time_recommendation: string;
  recommended_materials: Array<{
    chunk_id: string;
    source_filename: string;
    section_title: string;
  }>;
  suggested_planner_sessions: number;
  interaction_count: number;
}

export type SSEEvent =
  | { type: "token"; data: string }
  | { type: "citations"; data: SourceCitation[] }
  | { type: "done"; data: { message_id: string; tokens_used: number } }
  | { type: "error"; data: { code: string; message: string } }
  | { type: "plan_update"; data: LearningPlanUpdate }
  | { type: "independence_nudge"; data: { message: string } }
  | { type: "handoff_suggestion"; data: { reason: string; message: string } };

// ─── Analytics Response Types ────────────────────────────────────────────────

export interface TutorAnalyticsResponse {
  total_conversations: number;
  total_messages: number;
  avg_messages_per_conversation: number;
  avg_satisfaction_rating: number;
  top_questioned_clos: Array<{
    clo_id: string;
    clo_title: string;
    conversation_count: number;
  }>;
  common_topics: Array<{ topic: string; frequency: number }>;
  usage_over_time: Array<{ date: string; conversation_count: number }>;
}

// ─── Conversation Types ──────────────────────────────────────────────────────

export interface TutorConversation {
  id: string;
  student_id: string;
  institution_id: string;
  course_id: string | null;
  persona: TutorPersona;
  title: string | null;
  clo_scope: string[];
  message_count: number;
  xp_awarded: boolean;
  is_active: boolean;
  autonomy_override: "L1" | "L3" | null;
  created_at: string;
  updated_at: string;
}

export interface TutorMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  source_citations: SourceCitation[];
  image_urls: string[];
  document_url: string | null;
  token_count: number;
  satisfaction_rating: SatisfactionRating | null;
  flagged_integrity: boolean;
  autonomy_level: AutonomyLevel | null;
  nudge_type: "independence" | null;
  created_at: string;
}

export interface TutorUsageStatus {
  message_count: number;
  token_count: number;
  daily_message_limit: number;
  daily_token_budget: number;
  warning: boolean;
  remaining_messages: number;
}
