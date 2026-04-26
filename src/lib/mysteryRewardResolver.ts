/**
 * Pure function to resolve mystery box outcome from probability weights.
 *
 * Default probability distribution:
 * - 50% chance: 2x XP multiplier (applied to the triggering XP award)
 * - 30% chance: Random cosmetic item from eligible pool
 * - 20% chance: Temporary boost (30-minute XP boost)
 *
 * Uses a random value (0-99) to select outcome deterministically for testability.
 */

export type MysteryRewardType = 'xp_multiplier' | 'cosmetic' | 'boost';

export interface MysteryRewardWeights {
  xp_multiplier: number; // default 50
  cosmetic: number;      // default 30
  boost: number;         // default 20
}

export interface MysteryRewardInput {
  /** Random value 0-99 for outcome selection */
  randomValue: number;
  weights?: MysteryRewardWeights;
  /** Available cosmetic item IDs for cosmetic outcomes */
  eligibleCosmeticIds?: readonly string[];
}

export interface MysteryRewardResult {
  type: MysteryRewardType;
  /** For xp_multiplier: the multiplier value (2.0) */
  xpMultiplier?: number;
  /** For cosmetic: the selected item ID */
  cosmeticItemId?: string | null;
  /** For boost: duration in minutes */
  boostDurationMinutes?: number;
  /** Human-readable description */
  description: string;
}

const DEFAULT_WEIGHTS: MysteryRewardWeights = {
  xp_multiplier: 50,
  cosmetic: 30,
  boost: 20,
};

export const resolveMysteryReward = (input: MysteryRewardInput): MysteryRewardResult => {
  const weights = input.weights ?? DEFAULT_WEIGHTS;
  const { randomValue, eligibleCosmeticIds } = input;

  // Normalize random value to 0-99 range
  const normalizedRandom = Math.abs(Math.round(randomValue)) % 100;

  // Determine outcome based on cumulative probability
  const xpThreshold = weights.xp_multiplier;
  const cosmeticThreshold = xpThreshold + weights.cosmetic;

  if (normalizedRandom < xpThreshold) {
    return {
      type: 'xp_multiplier',
      xpMultiplier: 2.0,
      description: '2x XP Multiplier! Your XP award is doubled!',
    };
  }

  if (normalizedRandom < cosmeticThreshold) {
    // Select a random cosmetic from eligible pool
    const cosmeticId =
      eligibleCosmeticIds && eligibleCosmeticIds.length > 0
        ? eligibleCosmeticIds[normalizedRandom % eligibleCosmeticIds.length]
        : null;

    return {
      type: 'cosmetic',
      cosmeticItemId: cosmeticId,
      description: cosmeticId
        ? 'Rare Cosmetic Unlocked! Check your inventory.'
        : 'Cosmetic Reward! (No eligible items available — XP bonus applied instead)',
    };
  }

  return {
    type: 'boost',
    boostDurationMinutes: 30,
    description: '30-Minute XP Boost! All XP earned in the next 30 minutes is doubled.',
  };
};

/**
 * Determines whether a mystery reward box should trigger.
 * Default probability: 10% (configurable 5-20%).
 */
export const shouldTriggerMysteryBox = (
  randomValue: number,
  probability: number = 10,
): boolean => {
  const boundedProbability = Math.max(5, Math.min(20, probability));
  return (Math.abs(Math.round(randomValue)) % 100) < boundedProbability;
};
