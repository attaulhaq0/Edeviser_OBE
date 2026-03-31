// Task 137.1: Adaptive XP calculation utility

export type BloomsLevel =
  | 'Remembering'
  | 'Understanding'
  | 'Applying'
  | 'Analyzing'
  | 'Evaluating'
  | 'Creating';

/**
 * Level-based XP multiplier.
 * Levels 1–5: 1.2x (encouragement), 6–10: 1.0x, 11–15: 0.9x, 16–20: 0.8x
 */
export function getLevelMultiplier(level: number): number {
  if (level <= 5) return 1.2;
  if (level <= 10) return 1.0;
  if (level <= 15) return 0.9;
  return 0.8;
}

const DIFFICULTY_MAP: Record<BloomsLevel, number> = {
  Remembering: 1.0,
  Understanding: 1.1,
  Applying: 1.2,
  Analyzing: 1.3,
  Evaluating: 1.4,
  Creating: 1.5,
};

/**
 * Difficulty multiplier based on Bloom's Taxonomy level.
 */
export function getDifficultyMultiplier(bloomsLevel: BloomsLevel): number {
  return DIFFICULTY_MAP[bloomsLevel] ?? 1.0;
}

/**
 * Diminishing returns multiplier.
 * Decreases by 0.2 per repetition: 1.0 → 0.8 → 0.6 → 0.4 → 0.2 min.
 * Milestones always get 1.0.
 */
export function getDiminishingMultiplier(repeatCount: number, isMilestone: boolean): number {
  if (isMilestone) return 1.0;
  if (repeatCount <= 0) return 1.0;
  const multiplier = 1.0 - repeatCount * 0.2;
  return Math.max(multiplier, 0.2);
}

/**
 * Calculate final XP with all adaptive multipliers.
 * Formula: floor(base × level × difficulty × diminishing)
 * For multiple CLOs, use the highest Bloom's level.
 */
export function calculateFinalXP(
  baseXP: number,
  level: number,
  bloomsLevels: BloomsLevel[],
  repeatCount: number,
  isMilestone: boolean,
): number {
  if (baseXP <= 0) return 0;

  const levelMult = getLevelMultiplier(level);

  // Use highest Bloom's level for difficulty multiplier
  const bloomsOrder: BloomsLevel[] = [
    'Remembering', 'Understanding', 'Applying', 'Analyzing', 'Evaluating', 'Creating',
  ];
  let highestDifficulty = 1.0;
  for (const bl of bloomsLevels) {
    const idx = bloomsOrder.indexOf(bl);
    if (idx >= 0) {
      const diff = getDifficultyMultiplier(bl);
      if (diff > highestDifficulty) highestDifficulty = diff;
    }
  }

  const diminishing = getDiminishingMultiplier(repeatCount, isMilestone);

  return Math.floor(baseXP * levelMult * highestDifficulty * diminishing);
}
