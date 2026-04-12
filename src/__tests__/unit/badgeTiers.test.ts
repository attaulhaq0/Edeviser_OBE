// Task 154.4: Unit tests for Badge Tiers
// Requirements: 133, 134, 135

import { describe, it, expect } from 'vitest';
import { badgeTierSchema, tieredBadgeSchema, badgePinSchema } from '@/lib/schemas/badgeTier';
import { badgeSpotlightScheduleSchema } from '@/lib/schemas/badgeSpotlight';

// ─── Badge Tier Progression Tests ────────────────────────────────────────────

describe('Badge Tier Progression', () => {
  // Pure function mirroring check-badges logic
  type BadgeTier = 'bronze' | 'silver' | 'gold';

  interface TierThresholds {
    bronze: number;
    silver: number;
    gold: number;
  }

  const THRESHOLDS: Record<string, TierThresholds> = {
    academic: { bronze: 5, silver: 15, gold: 30 },
    engagement: { bronze: 10, silver: 25, gold: 50 },
  };

  function checkProgression(
    currentTier: BadgeTier | null,
    category: string,
    metric: number,
  ): BadgeTier | null {
    const t = THRESHOLDS[category];
    if (!t) return null;
    if (currentTier === 'gold') return null;
    if (currentTier === 'silver' && metric >= t.gold) return 'gold';
    if (currentTier === 'bronze' && metric >= t.silver) return 'silver';
    if (currentTier === null && metric >= t.bronze) return 'bronze';
    return null;
  }

  it('awards bronze when threshold met from null', () => {
    expect(checkProgression(null, 'academic', 5)).toBe('bronze');
  });

  it('upgrades bronze to silver', () => {
    expect(checkProgression('bronze', 'academic', 15)).toBe('silver');
  });

  it('upgrades silver to gold', () => {
    expect(checkProgression('silver', 'academic', 30)).toBe('gold');
  });

  it('returns null when already at gold', () => {
    expect(checkProgression('gold', 'academic', 100)).toBeNull();
  });

  it('returns null when metric below threshold', () => {
    expect(checkProgression(null, 'academic', 3)).toBeNull();
  });

  it('does not skip tiers', () => {
    // Even with metric high enough for gold, null → bronze first
    expect(checkProgression(null, 'academic', 100)).toBe('bronze');
  });
});

// ─── Badge Spotlight Bonus Tests ─────────────────────────────────────────────

describe('Badge Spotlight Bonus', () => {
  function getSpotlightMultiplier(
    badgeCategory: string | null,
    spotlightCategory: string | null,
  ): number {
    if (!badgeCategory || !spotlightCategory) return 1.0;
    return badgeCategory === spotlightCategory ? 2.0 : 1.0;
  }

  it('returns 2x for matching category', () => {
    expect(getSpotlightMultiplier('academic', 'academic')).toBe(2.0);
  });

  it('returns 1x for non-matching category', () => {
    expect(getSpotlightMultiplier('academic', 'engagement')).toBe(1.0);
  });

  it('returns 1x when no spotlight active', () => {
    expect(getSpotlightMultiplier('academic', null)).toBe(1.0);
  });

  it('returns 1x when badge has no category', () => {
    expect(getSpotlightMultiplier(null, 'academic')).toBe(1.0);
  });
});

// ─── Badge Archive Logic Tests ───────────────────────────────────────────────

describe('Badge Archive Logic', () => {
  function shouldArchive(
    isPinned: boolean,
    daysSinceUpgrade: number,
    alreadyArchived: boolean,
  ): boolean {
    if (isPinned) return false;
    if (alreadyArchived) return false;
    return daysSinceUpgrade >= 90;
  }

  it('archives badge not upgraded in 90+ days', () => {
    expect(shouldArchive(false, 90, false)).toBe(true);
    expect(shouldArchive(false, 100, false)).toBe(true);
  });

  it('does not archive badge upgraded within 90 days', () => {
    expect(shouldArchive(false, 89, false)).toBe(false);
    expect(shouldArchive(false, 0, false)).toBe(false);
  });

  it('never archives pinned badges', () => {
    expect(shouldArchive(true, 100, false)).toBe(false);
    expect(shouldArchive(true, 365, false)).toBe(false);
  });

  it('does not re-archive already archived badges', () => {
    expect(shouldArchive(false, 100, true)).toBe(false);
  });
});

// ─── Badge Pin Limit Tests ───────────────────────────────────────────────────

describe('Badge Pin Limit', () => {
  const MAX_PINNED = 3;

  function canPin(currentPinnedCount: number): boolean {
    return currentPinnedCount < MAX_PINNED;
  }

  it('allows pinning when under limit', () => {
    expect(canPin(0)).toBe(true);
    expect(canPin(1)).toBe(true);
    expect(canPin(2)).toBe(true);
  });

  it('rejects pinning at limit', () => {
    expect(canPin(3)).toBe(false);
  });

  it('rejects pinning above limit', () => {
    expect(canPin(5)).toBe(false);
  });
});

// ─── Zod Schema Validation Tests ─────────────────────────────────────────────

describe('Badge Tier Schemas', () => {
  describe('badgeTierSchema', () => {
    it('accepts valid tier values', () => {
      expect(badgeTierSchema.safeParse({ tier: 'bronze', category: 'academic' }).success).toBe(true);
      expect(badgeTierSchema.safeParse({ tier: 'silver', category: 'engagement' }).success).toBe(true);
      expect(badgeTierSchema.safeParse({ tier: 'gold', category: 'streak' }).success).toBe(true);
    });

    it('rejects invalid tier values', () => {
      expect(badgeTierSchema.safeParse({ tier: 'platinum', category: 'academic' }).success).toBe(false);
    });

    it('rejects empty category', () => {
      expect(badgeTierSchema.safeParse({ tier: 'bronze', category: '' }).success).toBe(false);
    });
  });

  describe('tieredBadgeSchema', () => {
    it('accepts valid tiered badge', () => {
      const result = tieredBadgeSchema.safeParse({
        category: 'academic',
        current_tier: 'silver',
        progress: 75,
        is_pinned: true,
        archived_at: null,
      });
      expect(result.success).toBe(true);
    });

    it('accepts null current_tier', () => {
      const result = tieredBadgeSchema.safeParse({
        category: 'academic',
        current_tier: null,
        progress: 0,
      });
      expect(result.success).toBe(true);
    });

    it('rejects progress > 100', () => {
      const result = tieredBadgeSchema.safeParse({
        category: 'academic',
        current_tier: 'bronze',
        progress: 101,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('badgePinSchema', () => {
    it('accepts valid pin request', () => {
      const result = badgePinSchema.safeParse({
        student_badge_id: '550e8400-e29b-41d4-a716-446655440000',
        is_pinned: true,
      });
      expect(result.success).toBe(true);
    });

    it('rejects non-UUID badge id', () => {
      const result = badgePinSchema.safeParse({
        student_badge_id: 'not-a-uuid',
        is_pinned: true,
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('Badge Spotlight Schema', () => {
  it('accepts valid Monday date', () => {
    const result = badgeSpotlightScheduleSchema.safeParse({
      week_start: '2025-01-06', // Monday
      category: 'academic',
      is_manual: true,
    });
    expect(result.success).toBe(true);
  });

  it('rejects non-Monday date', () => {
    const result = badgeSpotlightScheduleSchema.safeParse({
      week_start: '2025-01-07', // Tuesday
      category: 'academic',
      is_manual: false,
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid date format', () => {
    const result = badgeSpotlightScheduleSchema.safeParse({
      week_start: '01-06-2025',
      category: 'academic',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty category', () => {
    const result = badgeSpotlightScheduleSchema.safeParse({
      week_start: '2025-01-06',
      category: '',
    });
    expect(result.success).toBe(false);
  });
});
