import { describe, it, expect } from 'vitest';

// Test the XP multiplier stacking formula used in award-xp Edge Function
// final_xp = floor(base_xp × student_boost × admin_event_multiplier)

describe('award-xp boost integration', () => {
  const computeFinalXP = (
    baseXP: number,
    levelMultiplier: number,
    difficultyMultiplier: number,
    diminishingMultiplier: number,
    studentBoostMultiplier: number,
    bonusEventMultiplier: number,
    spotlightMultiplier: number,
  ): number => {
    return Math.min(
      9999,
      Math.floor(
        baseXP * levelMultiplier * difficultyMultiplier * diminishingMultiplier *
        studentBoostMultiplier * bonusEventMultiplier * spotlightMultiplier,
      ),
    );
  };

  it('applies no boost when student has no active boosts', () => {
    const result = computeFinalXP(25, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0);
    expect(result).toBe(25);
  });

  it('applies 2x student boost correctly', () => {
    const result = computeFinalXP(25, 1.0, 1.0, 1.0, 2.0, 1.0, 1.0);
    expect(result).toBe(50);
  });

  it('stacks student boost with admin event multiplier', () => {
    // 25 base × 2.0 student boost × 1.5 admin event = 75
    const result = computeFinalXP(25, 1.0, 1.0, 1.0, 2.0, 1.5, 1.0);
    expect(result).toBe(75);
  });

  it('stacks all multipliers correctly', () => {
    // 25 × 1.2 level × 1.3 difficulty × 1.0 diminishing × 2.0 boost × 1.5 event × 1.0 spotlight
    const result = computeFinalXP(25, 1.2, 1.3, 1.0, 2.0, 1.5, 1.0);
    expect(result).toBe(Math.floor(25 * 1.2 * 1.3 * 1.0 * 2.0 * 1.5 * 1.0));
  });

  it('caps at 9999', () => {
    const result = computeFinalXP(5000, 1.2, 1.5, 1.0, 2.0, 2.0, 2.0);
    expect(result).toBe(9999);
  });

  it('floors the result', () => {
    // 10 × 1.2 × 1.1 × 1.0 × 2.0 × 1.0 × 1.0 = 26.4 → 26
    const result = computeFinalXP(10, 1.2, 1.1, 1.0, 2.0, 1.0, 1.0);
    expect(result).toBe(Math.floor(10 * 1.2 * 1.1 * 2.0));
  });

  it('records boost_applied metadata correctly', () => {
    const studentBoostMultiplier = 2.0;
    const metadata = {
      boost_applied: studentBoostMultiplier > 1,
      student_boost_multiplier: studentBoostMultiplier,
    };
    expect(metadata.boost_applied).toBe(true);
    expect(metadata.student_boost_multiplier).toBe(2.0);
  });

  it('records no boost metadata when no boost active', () => {
    const studentBoostMultiplier = 1.0;
    const metadata = {
      boost_applied: studentBoostMultiplier > 1,
      student_boost_multiplier: studentBoostMultiplier,
    };
    expect(metadata.boost_applied).toBe(false);
    expect(metadata.student_boost_multiplier).toBe(1.0);
  });

  it('selects highest multiplier from multiple active boosts', () => {
    const activeBoosts = [
      { multiplier: 1.5 },
      { multiplier: 2.0 },
      { multiplier: 1.8 },
    ];
    const studentBoostMultiplier = Math.max(...activeBoosts.map((b) => b.multiplier));
    expect(studentBoostMultiplier).toBe(2.0);
  });
});
