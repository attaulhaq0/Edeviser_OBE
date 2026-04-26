// Feature: xp-marketplace, Property 34: quest reward exclusivity
// **Validates: Requirements 25.7**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// ─── Pure functions mirroring knowledge quest reward logic ──────────────────

interface MarketplaceItem {
  id: string;
  is_active: boolean;
  is_quest_exclusive: boolean;
}

interface KnowledgeQuest {
  id: string;
  reward_type: 'item' | 'xp';
  reward_item_id: string | null;
  reward_xp_amount: number | null;
}

function isItemPurchasable(item: MarketplaceItem): boolean {
  return item.is_active && !item.is_quest_exclusive;
}

function validateQuestReward(quest: KnowledgeQuest): { valid: boolean; reason?: string } {
  if (quest.reward_type === 'item') {
    if (!quest.reward_item_id) return { valid: false, reason: 'Item reward requires reward_item_id' };
    return { valid: true };
  }
  if (quest.reward_type === 'xp') {
    if (!quest.reward_xp_amount || quest.reward_xp_amount <= 0) {
      return { valid: false, reason: 'XP reward requires positive reward_xp_amount' };
    }
    return { valid: true };
  }
  return { valid: false, reason: 'Unknown reward type' };
}

function getExclusiveRewardItems(
  quests: readonly KnowledgeQuest[],
  allItems: readonly MarketplaceItem[],
): MarketplaceItem[] {
  const questItemIds = new Set(
    quests.filter((q) => q.reward_type === 'item' && q.reward_item_id).map((q) => q.reward_item_id!),
  );
  return allItems.filter((item) => questItemIds.has(item.id));
}

// ─── Arbitraries ────────────────────────────────────────────────────────────

const itemArb = fc.record({
  id: fc.uuid(),
  is_active: fc.boolean(),
  is_quest_exclusive: fc.boolean(),
});

const questArb = fc.record({
  id: fc.uuid(),
  reward_type: fc.constantFrom('item', 'xp') as fc.Arbitrary<'item' | 'xp'>,
  reward_item_id: fc.oneof(fc.uuid(), fc.constant(null)),
  reward_xp_amount: fc.oneof(fc.integer({ min: 1, max: 500 }), fc.constant(null)),
});

// ─── Property 34: Knowledge quest exclusivity ───────────────────────────────

describe('Property 34 — Knowledge quest reward exclusivity', () => {
  it('P34a: quest-exclusive items are not purchasable through regular marketplace', () => {
    fc.assert(
      fc.property(
        fc.array(itemArb, { minLength: 1, maxLength: 20 }),
        (items) => {
          const exclusiveItems = items.filter((i) => i.is_quest_exclusive);
          for (const item of exclusiveItems) {
            expect(isItemPurchasable(item)).toBe(false);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P34b: non-exclusive active items are purchasable', () => {
    fc.assert(
      fc.property(
        fc.array(itemArb, { minLength: 1, maxLength: 20 }),
        (items) => {
          const regularItems = items.filter((i) => !i.is_quest_exclusive && i.is_active);
          for (const item of regularItems) {
            expect(isItemPurchasable(item)).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P34c: quest with item reward must have reward_item_id', () => {
    fc.assert(
      fc.property(questArb, (quest) => {
        const result = validateQuestReward(quest);
        if (quest.reward_type === 'item' && !quest.reward_item_id) {
          expect(result.valid).toBe(false);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('P34d: quest with xp reward must have positive reward_xp_amount', () => {
    fc.assert(
      fc.property(questArb, (quest) => {
        const result = validateQuestReward(quest);
        if (quest.reward_type === 'xp' && (!quest.reward_xp_amount || quest.reward_xp_amount <= 0)) {
          expect(result.valid).toBe(false);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('P34e: exclusive reward items are identified from quest list', () => {
    fc.assert(
      fc.property(
        fc.array(questArb, { minLength: 0, maxLength: 10 }),
        fc.array(itemArb, { minLength: 0, maxLength: 20 }),
        (quests, items) => {
          const exclusiveItems = getExclusiveRewardItems(quests, items);
          const questItemIds = new Set(
            quests.filter((q) => q.reward_type === 'item' && q.reward_item_id).map((q) => q.reward_item_id!),
          );
          for (const item of exclusiveItems) {
            expect(questItemIds.has(item.id)).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
