import { z } from "zod";

export const surveyQuestionSchema = z.object({
  question_text: z.string().min(1, "Question text is required"),
  question_type: z.enum(["likert", "mcq", "text"]),
  options: z.array(z.string()).nullable(),
  sort_order: z.number().int().min(0),
});

export const createSurveySchema = z.object({
  title: z.string().min(1, "Survey title is required").max(255),
  type: z.enum(["course_exit", "graduate_exit", "employer"]),
  target_outcomes: z.array(z.uuid()),
  is_active: z.boolean().default(true),
  questions: z.array(surveyQuestionSchema).min(1, "At least 1 question required"),
});

export const surveyResponseSchema = z.object({
  survey_id: z.uuid(),
  responses: z.array(
    z.object({
      question_id: z.uuid(),
      response_value: z.string().min(1),
    })
  ),
});

export type SurveyQuestionFormData = z.infer<typeof surveyQuestionSchema>;
export type CreateSurveyFormData = z.infer<typeof createSurveySchema>;
export type SurveyResponseFormData = z.infer<typeof surveyResponseSchema>;
