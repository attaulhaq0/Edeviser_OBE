import { z } from "zod";

export const moduleSuggestionSchema = z.object({
  student_id: z.uuid(),
  weak_clo_id: z.uuid(),
  weak_clo_title: z.string(),
  weak_clo_attainment: z.number().min(0).max(100),
  prerequisite_clo_id: z.uuid().nullable(),
  prerequisite_clo_title: z.string().nullable(),
  suggestion_text: z.string().min(1),
  social_proof_text: z.string().nullable(),
  feedback: z.enum(["thumbs_up", "thumbs_down"]).nullable(),
});

export const atRiskPredictionSchema = z.object({
  student_id: z.uuid(),
  at_risk_clo_id: z.uuid(),
  at_risk_clo_title: z.string(),
  probability_score: z.number().min(0).max(100),
  contributing_signals: z.object({
    login_frequency: z.enum(["low", "medium", "high"]),
    submission_pattern: z.enum(["early", "on_time", "late", "missed"]),
    attainment_trend: z.enum(["improving", "declining", "stagnant"]),
  }),
  prediction_date: z.iso.date(),
  validated_outcome: z.enum(["correct", "incorrect"]).nullable(),
});

export const feedbackDraftSchema = z.object({
  criterion_id: z.uuid(),
  criterion_name: z.string(),
  draft_comment: z.string(),
  status: z.enum(["pending", "accepted", "edited", "rejected"]),
});

export const aiFeedbackSchema = z.object({
  feedback_id: z.uuid(),
  feedback: z.enum(["thumbs_up", "thumbs_down"]),
});

export type ModuleSuggestionData = z.infer<typeof moduleSuggestionSchema>;
export type AtRiskPredictionData = z.infer<typeof atRiskPredictionSchema>;
export type FeedbackDraftData = z.infer<typeof feedbackDraftSchema>;
export type AIFeedbackData = z.infer<typeof aiFeedbackSchema>;
