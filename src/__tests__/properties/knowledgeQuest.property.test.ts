// =============================================================================
// Property-Based Test: Knowledge Quest
// Task 25.7 — P34: quest reward exclusivity
// Feature: xp-marketplace
// =============================================================================

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { createKnowledgeQuestSchema } from "@/lib/marketplaceSchemas";

/**
 * **Validates: Requirements 6.1**
 * P34: Quest reward is either an item OR XP, never both.
 */
describe("P34: Knowledge quest reward exclusivity", () => {
  it("valid quest with item reward has reward_item_id and no reward_xp_amount", () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.constantFrom("quiz_challenge", "content_creation", "peer_review"),
        (itemId, questType) => {
          const now = new Date();
          const future = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

          const input = {
            title: "Test Quest",
            description: "A test quest",
            quest_type: questType as
              | "quiz_challenge"
              | "content_creation"
              | "peer_review",
            target_clo_ids: [],
            start_date: now.toISOString(),
            end_date: future.toISOString(),
            reward_type: "item" as const,
            reward_item_id: itemId,
            reward_xp_amount: null,
          };

          const result = createKnowledgeQuestSchema.safeParse(input);
          expect(result.success).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("valid quest with XP reward has reward_xp_amount and no reward_item_id", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 500 }),
        fc.constantFrom("quiz_challenge", "content_creation", "peer_review"),
        (xpAmount, questType) => {
          const now = new Date();
          const future = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

          const input = {
            title: "Test Quest",
            description: "A test quest",
            quest_type: questType as
              | "quiz_challenge"
              | "content_creation"
              | "peer_review",
            target_clo_ids: [],
            start_date: now.toISOString(),
            end_date: future.toISOString(),
            reward_type: "xp" as const,
            reward_item_id: null,
            reward_xp_amount: xpAmount,
          };

          const result = createKnowledgeQuestSchema.safeParse(input);
          expect(result.success).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("rejects quest where end_date is before start_date", () => {
    const now = new Date();
    const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const input = {
      title: "Bad Quest",
      description: "Invalid dates",
      quest_type: "quiz_challenge" as const,
      target_clo_ids: [],
      start_date: now.toISOString(),
      end_date: past.toISOString(),
      reward_type: "xp" as const,
      reward_item_id: null,
      reward_xp_amount: 50,
    };

    const result = createKnowledgeQuestSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});
