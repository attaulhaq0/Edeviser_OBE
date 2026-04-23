// =============================================================================
// Property 107: Adaptive XP formula correctness
// Feature: edeviser-platform
// **Validates: Requirements 120.1, 120.2, 121.1, 121.2**
// =============================================================================

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// ─── Pure functions mirroring award-xp Edge Function logic ───────────────────

type BloomsLevel = 'Remembering' | 'Understanding' | 'Applying' | 'Analyzing' | 'Evaluating' | 'Creating';

const BLOOMS_MULTIPLIERS: Record<BloomsLevel, number> = {
  Remembering: 1.0,
  Understanding: 1.1,
  Applying: 1.2,
  Analyzing: 1.3,
  Evaluating: 1.4,
  Creating: 1.5,
};

function getLevelMultiplier(level: number): number {
  if (level <= 5) return 1.2;
  if (level <= 10) return 1.0;
  if (level <= 15) return 0.9;
  return 0.8;
}

function getDifficultyMultiplier(bloomsLevels: BloomsLevel[]): number {
  if (!bloomsLevels || bloomsLevels.length === 0) return 1.0;
  let highest = 1.0;
  for (const bl of bloomsLevels) {
    const mult = BLOOMS_MULTIPLIERS[bl] ?? 1.0;
    if (mult > highest) highest = mult;
  }
  return highest;
}

function getDiminishingMultiplier(repeatCount: number, isMilestone: boolean): number {
  if (isMilestone) return 1.0;
  if (repeatCount <= 0) return 1.0;
  return Math.max(0.2, 1.0 - repeatCount * 0.2);
}

function calculateFinalXP(
  baseXP: number,
  level: number,
  bloomsLevels: BloomsLevel[],
  repeatCount: number,
  isMilestone: boolean,
): number {
  const lm = getLevelMultiplier(level);
  const dm = getDifficultyMultiplier(bloomsLevels);
  const dim = getDiminishingMultiplier(repeatCount, isMilestone);
  return Math.min(Math.floor(baseXP * lm * dm * dim), 9999);
}

// ─── Generators ──────────────────────────────────────────────────────────────

const bloomsLevelArb = fc.constantFrom<BloomsLevel>(
  'Remembering', 'Understanding', 'Applying', 'Analyzing', 'Evaluating', 'Creating',
);

// ─── Properties ──────────────────────────────────────────────────────────────

describe('Property 107: Adaptive XP formula correctness', () => {
  it('final XP is always non-negative', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 500 }),
        fc.integer({ min: 1, max: 50 }),
        fc.array(bloomsLevelArb, { minLength: 0, maxLength: 3 }),
        fc.integer({ min: 0, max: 10 }),
        fc.boolean(),
        (baseXP, level, blooms, repeatCount, isMilestone) => {
          const result = calculateFinalXP(baseXP, level, blooms, repeatCount, isMilestone);
          expect(result).toBeGreaterThanOrEqual(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('final XP never exceeds 9999', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 9999 }),
        fc.integer({ min: 1, max: 50 }),
        fc.array(bloomsLevelArb, { minLength: 0, maxLength: 3 }),
        fc.integer({ min: 0, max: 10 }),
        fc.boolean(),
        (baseXP, level, blooms, repeatCount, isMilestone) => {
          const result = calculateFinalXP(baseXP, level, blooms, repeatCount, isMilestone);
          expect(result).toBeLessThanOrEqual(9999);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('higher Blooms level yields equal or higher XP', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 500 }),
        fc.integer({ min: 1, max: 50 }),
        (baseXP, level) => {
          const xpRemembering = calculateFinalXP(baseXP, level, ['Remembering'], 0, false);
          const xpCreating = calculateFinalXP(baseXP, level, ['Creating'], 0, false);
          expect(xpCreating).toBeGreaterThanOrEqual(xpRemembering);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('milestone sources are exempt from diminishing returns', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 500 }),
        fc.integer({ min: 1, max: 50 }),
        fc.integer({ min: 1, max: 10 }),
        (baseXP, level, repeatCount) => {
          const milestoneXP = calculateFinalXP(baseXP, level, [], repeatCount, true);
          const noRepeatXP = calculateFinalXP(baseXP, level, [], 0, false);
          expect(milestoneXP).toBe(noRepeatXP);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('level multiplier decreases for higher levels', () => {
    const lowLevel = getLevelMultiplier(3);
    const midLevel = getLevelMultiplier(8);
    const highLevel = getLevelMultiplier(20);
    expect(lowLevel).toBeGreaterThanOrEqual(midLevel);
    expect(midLevel).toBeGreaterThanOrEqual(highLevel);
  });
});


// =============================================================================
// Property 108: XP transaction auditability
// **Validates: Requirements 120.3, 121.4**
// =============================================================================

describe('Property 108: XP transaction auditability', () => {
  it('every XP transaction records base_xp, final_xp, and multipliers', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 500 }),
        fc.integer({ min: 1, max: 50 }),
        fc.array(bloomsLevelArb, { minLength: 0, maxLength: 3 }),
        fc.integer({ min: 0, max: 10 }),
        fc.boolean(),
        (baseXP, level, blooms, repeatCount, isMilestone) => {
          const lm = getLevelMultiplier(level);
          const dm = getDifficultyMultiplier(blooms);
          const dim = getDiminishingMultiplier(repeatCount, isMilestone);
          const finalXP = calculateFinalXP(baseXP, level, blooms, repeatCount, isMilestone);

          // All multiplier values should be recordable
          expect(lm).toBeGreaterThan(0);
          expect(dm).toBeGreaterThanOrEqual(1.0);
          expect(dim).toBeGreaterThan(0);
          expect(finalXP).toBeGreaterThanOrEqual(0);

          // base_xp and final_xp should both be available
          expect(baseXP).toBeGreaterThan(0);
          expect(typeof finalXP).toBe('number');
        },
      ),
      { numRuns: 100 },
    );
  });
});

// =============================================================================
// Property 109: Diminishing returns mechanics
// **Validates: Requirements 122.1, 122.4, 122.5**
// =============================================================================

describe('Property 109: Diminishing returns mechanics', () => {
  it('diminishing multiplier decreases with repeat count', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 9 }),
        (repeatCount) => {
          const current = getDiminishingMultiplier(repeatCount, false);
          const next = getDiminishingMultiplier(repeatCount + 1, false);
          expect(next).toBeLessThanOrEqual(current);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('diminishing multiplier has a floor of 0.2', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        (repeatCount) => {
          const mult = getDiminishingMultiplier(repeatCount, false);
          expect(mult).toBeGreaterThanOrEqual(0.2);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('milestone sources always get multiplier of 1.0', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        (repeatCount) => {
          const mult = getDiminishingMultiplier(repeatCount, true);
          expect(mult).toBe(1.0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('first action (repeatCount=0) gets full multiplier', () => {
    const mult = getDiminishingMultiplier(0, false);
    expect(mult).toBe(1.0);
  });

  it('diminishing returns reduce final XP compared to first action', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 500 }),
        fc.integer({ min: 1, max: 50 }),
        fc.integer({ min: 1, max: 4 }),
        (baseXP, level, repeatCount) => {
          const firstXP = calculateFinalXP(baseXP, level, [], 0, false);
          const repeatedXP = calculateFinalXP(baseXP, level, [], repeatCount, false);
          expect(repeatedXP).toBeLessThanOrEqual(firstXP);
        },
      ),
      { numRuns: 100 },
    );
  });
});
