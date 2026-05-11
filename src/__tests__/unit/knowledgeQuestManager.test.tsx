// =============================================================================
// Unit Test: Knowledge Quest Manager
// Task 26.5 — Quest CRUD form, date validation
// =============================================================================

import { describe, it, expect } from "vitest";
import { createKnowledgeQuestSchema } from "@/lib/marketplaceSchemas";

describe("Knowledge Quest Manager", () => {
  describe("createKnowledgeQuestSchema", () => {
    it("validates a valid XP reward quest", () => {
      const now = new Date();
      const future = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const result = createKnowledgeQuestSchema.safeParse({
        title: "Weekly Challenge",
        description: "Complete 5 quizzes this week",
        quest_type: "quiz_challenge",
        target_clo_ids: [],
        start_date: now.toISOString(),
        end_date: future.toISOString(),
        reward_type: "xp",
        reward_item_id: null,
        reward_xp_amount: 100,
      });

      expect(result.success).toBe(true);
    });

    it("validates a valid item reward quest", () => {
      const now = new Date();
      const future = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const result = createKnowledgeQuestSchema.safeParse({
        title: "Content Creator",
        description: "Create a study plan",
        quest_type: "content_creation",
        target_clo_ids: [],
        start_date: now.toISOString(),
        end_date: future.toISOString(),
        reward_type: "item",
        reward_item_id: "550e8400-e29b-41d4-a716-446655440000",
        reward_xp_amount: null,
      });

      expect(result.success).toBe(true);
    });

    it("rejects quest with end_date before start_date", () => {
      const now = new Date();
      const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const result = createKnowledgeQuestSchema.safeParse({
        title: "Bad Quest",
        description: "Invalid dates",
        quest_type: "quiz_challenge",
        target_clo_ids: [],
        start_date: now.toISOString(),
        end_date: past.toISOString(),
        reward_type: "xp",
        reward_item_id: null,
        reward_xp_amount: 50,
      });

      expect(result.success).toBe(false);
    });

    it("rejects quest with empty title", () => {
      const now = new Date();
      const future = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const result = createKnowledgeQuestSchema.safeParse({
        title: "",
        description: "Some description",
        quest_type: "quiz_challenge",
        target_clo_ids: [],
        start_date: now.toISOString(),
        end_date: future.toISOString(),
        reward_type: "xp",
        reward_item_id: null,
        reward_xp_amount: 50,
      });

      expect(result.success).toBe(false);
    });

    it("rejects item reward without reward_item_id", () => {
      const now = new Date();
      const future = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const result = createKnowledgeQuestSchema.safeParse({
        title: "Quest",
        description: "Description",
        quest_type: "quiz_challenge",
        target_clo_ids: [],
        start_date: now.toISOString(),
        end_date: future.toISOString(),
        reward_type: "item",
        reward_item_id: null,
        reward_xp_amount: null,
      });

      expect(result.success).toBe(false);
    });
  });
});
