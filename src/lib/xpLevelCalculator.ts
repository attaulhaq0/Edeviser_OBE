// =============================================================================
// XP Level Calculator — Pure functions for level threshold generation and lookup
// =============================================================================

import type { LevelThreshold } from '@/types/app';

const MAX_LEVEL = 50;

/**
 * Generate level thresholds up to MAX_LEVEL.
 * Level 1: 0 XP, Level 2: 100 XP, Level 3: 250 XP
 * Level N (N >= 4): floor(50 * N^1.5)
 */
export function generateLevelThresholds(): LevelThreshold[] {
  const thresholds: LevelThreshold[] = [
    { level: 1, xpRequired: 0, title: 'Newcomer' },
    { level: 2, xpRequired: 100, title: 'Beginner' },
    { level: 3, xpRequired: 250, title: 'Learner' },
  ];

  for (let n = 4; n <= MAX_LEVEL; n++) {
    thresholds.push({
      level: n,
      xpRequired: Math.floor(50 * Math.pow(n, 1.5)),
      title: getLevelTitle(n),
    });
  }

  return thresholds;
}

function getLevelTitle(level: number): string {
  if (level <= 5) return 'Apprentice';
  if (level <= 10) return 'Scholar';
  if (level <= 15) return 'Adept';
  if (level <= 20) return 'Expert';
  if (level <= 30) return 'Master';
  if (level <= 40) return 'Grandmaster';
  return 'Legend';
}

/** Cached thresholds for repeated lookups */
const LEVEL_THRESHOLDS = generateLevelThresholds();

/**
 * Calculate the level for a given XP total.
 * Returns the highest level whose xpRequired <= xpTotal.
 */
export function calculateLevel(xpTotal: number): number {
  if (xpTotal < 0) return 1;

  let level = 1;
  for (const threshold of LEVEL_THRESHOLDS) {
    if (xpTotal >= threshold.xpRequired) {
      level = threshold.level;
    } else {
      break;
    }
  }
  return level;
}

/**
 * Apply bonus multiplier to base XP amount.
 * Multiplier must be >= 1. Returns the multiplied amount (floored to integer).
 */
export function applyBonusMultiplier(baseXP: number, multiplier: number): number {
  if (multiplier < 1) return baseXP;
  return Math.floor(baseXP * multiplier);
}

export { LEVEL_THRESHOLDS };
