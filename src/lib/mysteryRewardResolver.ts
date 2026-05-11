// =============================================================================
// Mystery Reward Resolver — Pure function
// Resolves mystery box outcome from probability weights
// Default weights: 50% 2x XP, 30% cosmetic, 20% boost
// =============================================================================

/**
 * Possible mystery box outcome types.
 */
export type MysteryRewardType = "double_xp" | "cosmetic" | "boost";

export interface MysteryRewardWeight {
  type: MysteryRewardType;
  /** Weight (not percentage — will be normalized) */
  weight: number;
}

export interface MysteryRewardOutcome {
  /** The resolved reward type */
  type: MysteryRewardType;
  /** Human-readable label for the reward */
  label: string;
  /** Description of what the student receives */
  description: string;
}

/**
 * Default probability weights for mystery box outcomes.
 * 50% 2x XP, 30% cosmetic, 20% boost.
 */
export const DEFAULT_MYSTERY_WEIGHTS: ReadonlyArray<MysteryRewardWeight> = [
  { type: "double_xp", weight: 50 },
  { type: "cosmetic", weight: 30 },
  { type: "boost", weight: 20 },
];

/**
 * Labels and descriptions for each reward type.
 */
const REWARD_META: Record<
  MysteryRewardType,
  { label: string; description: string }
> = {
  double_xp: {
    label: "2x XP Bonus",
    description: "Your next XP award is doubled!",
  },
  cosmetic: {
    label: "Random Cosmetic",
    description: "You received a random cosmetic item for your profile!",
  },
  boost: {
    label: "Temporary Boost",
    description: "You received a temporary XP boost!",
  },
};

/**
 * Resolve a mystery box outcome using weighted random selection.
 *
 * @param roll - A random number in [0, 1) used for selection.
 *   Pass `Math.random()` for production use, or a fixed value for testing.
 * @param weights - Probability weights for each outcome type.
 *   Defaults to 50/30/20 split. Weights are normalized to sum to 1.
 * @returns The resolved reward outcome.
 * @throws Error if weights array is empty or all weights are zero.
 */
export function resolveMysteryReward(
  roll: number,
  weights: ReadonlyArray<MysteryRewardWeight> = DEFAULT_MYSTERY_WEIGHTS
): MysteryRewardOutcome {
  if (weights.length === 0) {
    throw new Error("Mystery reward weights cannot be empty");
  }

  const totalWeight = weights.reduce(
    (sum, w) => sum + Math.max(0, w.weight),
    0
  );
  if (totalWeight <= 0) {
    throw new Error("Total mystery reward weight must be positive");
  }

  // Clamp roll to [0, 1)
  const clampedRoll = Math.max(0, Math.min(roll, 0.9999999999));

  // Walk through cumulative weights to find the selected outcome
  let cumulative = 0;
  for (const entry of weights) {
    const normalizedWeight = Math.max(0, entry.weight) / totalWeight;
    cumulative += normalizedWeight;
    if (clampedRoll < cumulative) {
      const meta = REWARD_META[entry.type];
      return {
        type: entry.type,
        label: meta.label,
        description: meta.description,
      };
    }
  }

  // Fallback to last entry (should not happen with valid inputs)
  const lastEntry = weights[weights.length - 1];
  if (!lastEntry) {
    throw new Error("Mystery reward weights cannot be empty");
  }
  const meta = REWARD_META[lastEntry.type];
  return {
    type: lastEntry.type,
    label: meta.label,
    description: meta.description,
  };
}

/**
 * Compute the normalized probability for each reward type.
 * Useful for displaying probabilities in the UI.
 */
export function getRewardProbabilities(
  weights: ReadonlyArray<MysteryRewardWeight> = DEFAULT_MYSTERY_WEIGHTS
): Array<{ type: MysteryRewardType; probability: number }> {
  const totalWeight = weights.reduce(
    (sum, w) => sum + Math.max(0, w.weight),
    0
  );
  if (totalWeight <= 0) return [];

  return weights.map((w) => ({
    type: w.type,
    probability: Math.max(0, w.weight) / totalWeight,
  }));
}
