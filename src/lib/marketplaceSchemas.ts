// =============================================================================
// Marketplace Schemas — Zod schemas for all marketplace payloads
// =============================================================================

import { z } from 'zod';

// ─── Enums ───────────────────────────────────────────────────────────────────

export const marketplaceItemCategorySchema = z.enum([
  'cosmetic',
  'educational_perk',
  'power_up',
]);

export const marketplaceItemSubCategorySchema = z.enum([
  'profile_theme',
  'avatar_frame',
  'display_title',
  'extra_quiz_attempt',
  'deadline_extension',
  'hint_token',
  'xp_boost',
  'streak_shield',
]);

export const stockTypeSchema = z.enum(['unlimited', 'limited', 'one_per_student']);

// ─── Create / Update Item ────────────────────────────────────────────────────

export const createMarketplaceItemSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  category: marketplaceItemCategorySchema,
  sub_category: marketplaceItemSubCategorySchema,
  xp_price: z.number().int().positive(),
  level_requirement: z.number().int().min(0).default(0),
  stock_type: stockTypeSchema,
  stock_quantity: z.number().int().positive().nullable().default(null),
  icon_identifier: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const updateMarketplaceItemSchema = createMarketplaceItemSchema.partial();

// ─── Sale Events ─────────────────────────────────────────────────────────────

export const createSaleEventSchema = z
  .object({
    name: z.string().min(1).max(100),
    discount_percentage: z.number().int().min(5).max(90),
    start_date: z.string().datetime(),
    end_date: z.string().datetime(),
    item_ids: z.array(z.string().uuid()).min(1),
  })
  .refine((data) => new Date(data.end_date) > new Date(data.start_date), {
    message: 'End date must be after start date',
  });

// ─── Purchase ────────────────────────────────────────────────────────────────

export const purchaseRequestSchema = z.object({
  item_id: z.string().uuid(),
});

// ─── Deadline Extension ──────────────────────────────────────────────────────

export const deadlineExtensionSchema = z.object({
  purchase_id: z.string().uuid(),
  assignment_id: z.string().uuid(),
});

// ─── Knowledge Quests (Gap 1: Creative Expression) ───────────────────────────

export const questTypeSchema = z.enum([
  'quiz_challenge',
  'content_creation',
  'peer_review',
]);

export const contentTypeSchema = z.enum([
  'study_plan',
  'quiz_question',
  'explanation_video',
]);

export const contentStatusSchema = z.enum([
  'pending',
  'approved',
  'rejected',
]);

export const createKnowledgeQuestSchema = z
  .object({
    title: z.string().min(1).max(200),
    description: z.string().min(1),
    quest_type: questTypeSchema,
    target_clo_ids: z.array(z.string().uuid()).default([]),
    start_date: z.string().datetime(),
    end_date: z.string().datetime(),
    reward_type: z.enum(['item', 'xp']),
    reward_item_id: z.string().uuid().nullable().default(null),
    reward_xp_amount: z.number().int().positive().nullable().default(null),
  })
  .refine(
    (data) => new Date(data.end_date) > new Date(data.start_date),
    { message: 'End date must be after start date' },
  )
  .refine(
    (data) =>
      (data.reward_type === 'item' && data.reward_item_id !== null) ||
      (data.reward_type === 'xp' && data.reward_xp_amount !== null),
    {
      message:
        'Must specify reward_item_id for item rewards or reward_xp_amount for XP rewards',
    },
  );

export const createStudentContentSchema = z.object({
  content_type: contentTypeSchema,
  clo_id: z.string().uuid().nullable().default(null),
  title: z.string().min(1).max(200),
  content_data: z.record(z.string(), z.unknown()),
});

export const reviewStudentContentSchema = z.object({
  content_id: z.string().uuid(),
  status: z.enum(['approved', 'rejected']),
  feedback: z.string().max(1000).optional(),
});

// ─── XP Economy Health (Gap 2) ───────────────────────────────────────────────

export const classDonationSchema = z.object({
  course_id: z.string().uuid(),
  resource_description: z.string().min(1).max(500),
  goal_amount: z.number().int().min(100).max(10000),
});

export const classDonationContributionSchema = z.object({
  donation_id: z.string().uuid(),
  xp_amount: z.number().int().positive(),
});

export const bonusQuestionProbabilitySchema = z.number().int().min(5).max(30);

export const mysteryBoxProbabilitySchema = z.number().int().min(5).max(20);

// ─── Inferred Types ──────────────────────────────────────────────────────────

export type MarketplaceItemCategory = z.infer<typeof marketplaceItemCategorySchema>;
export type MarketplaceItemSubCategory = z.infer<typeof marketplaceItemSubCategorySchema>;
export type StockType = z.infer<typeof stockTypeSchema>;
export type CreateMarketplaceItemInput = z.infer<typeof createMarketplaceItemSchema>;
export type UpdateMarketplaceItemInput = z.infer<typeof updateMarketplaceItemSchema>;
export type CreateSaleEventInput = z.infer<typeof createSaleEventSchema>;
export type PurchaseRequestInput = z.infer<typeof purchaseRequestSchema>;
export type DeadlineExtensionInput = z.infer<typeof deadlineExtensionSchema>;
export type QuestType = z.infer<typeof questTypeSchema>;
export type ContentType = z.infer<typeof contentTypeSchema>;
export type ContentStatus = z.infer<typeof contentStatusSchema>;
export type CreateKnowledgeQuestInput = z.infer<typeof createKnowledgeQuestSchema>;
export type CreateStudentContentInput = z.infer<typeof createStudentContentSchema>;
export type ReviewStudentContentInput = z.infer<typeof reviewStudentContentSchema>;
export type ClassDonationInput = z.infer<typeof classDonationSchema>;
export type ClassDonationContributionInput = z.infer<typeof classDonationContributionSchema>;
