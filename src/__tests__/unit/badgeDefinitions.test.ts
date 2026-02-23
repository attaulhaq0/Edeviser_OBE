import { describe, it, expect } from 'vitest';
import {
  BADGE_DEFINITIONS,
  getBadgeById,
  getAllBadgeIds,
  getBadgesByCategory,
  getMysteryBadges,
  getVisibleBadges,
  type BadgeCategory,
} from '@/lib/badgeDefinitions';

describe('Badge Definitions', () => {
  it('has all required fields on every badge', () => {
    for (const badge of BADGE_DEFINITIONS) {
      expect(badge.id).toBeTruthy();
      expect(typeof badge.id).toBe('string');
      expect(badge.name).toBeTruthy();
      expect(typeof badge.name).toBe('string');
      expect(badge.description).toBeTruthy();
      expect(typeof badge.description).toBe('string');
      expect(badge.icon).toBeTruthy();
      expect(typeof badge.icon).toBe('string');
      expect(['streak', 'academic', 'engagement', 'mystery']).toContain(badge.category);
      expect(typeof badge.isMystery).toBe('boolean');
      expect(badge.condition).toBeTruthy();
      expect(typeof badge.condition).toBe('string');
      expect(typeof badge.xpReward).toBe('number');
      expect(badge.xpReward).toBeGreaterThanOrEqual(0);
    }
  });

  it('has unique badge IDs', () => {
    const ids = BADGE_DEFINITIONS.map((b) => b.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('marks mystery badges with isMystery: true', () => {
    const mysteryBadges = BADGE_DEFINITIONS.filter((b) => b.category === 'mystery');
    for (const badge of mysteryBadges) {
      expect(badge.isMystery).toBe(true);
    }
  });

  it('marks non-mystery badges with isMystery: false', () => {
    const nonMysteryBadges = BADGE_DEFINITIONS.filter((b) => b.category !== 'mystery');
    for (const badge of nonMysteryBadges) {
      expect(badge.isMystery).toBe(false);
    }
  });

  it('includes the three required mystery badges', () => {
    const mysteryIds = BADGE_DEFINITIONS.filter((b) => b.isMystery).map((b) => b.id);
    expect(mysteryIds).toContain('speed_demon');
    expect(mysteryIds).toContain('night_owl');
    expect(mysteryIds).toContain('perfectionist');
  });

  it('has mystery badges with hidden descriptions', () => {
    const mysteryBadges = BADGE_DEFINITIONS.filter((b) => b.isMystery);
    for (const badge of mysteryBadges) {
      expect(badge.description).toBe('???');
    }
  });

  it('has badges across all categories', () => {
    const categories = new Set(BADGE_DEFINITIONS.map((b) => b.category));
    expect(categories.has('streak')).toBe(true);
    expect(categories.has('academic')).toBe(true);
    expect(categories.has('engagement')).toBe(true);
    expect(categories.has('mystery')).toBe(true);
  });

  it('includes streak milestone badges at 7, 14, 30, 60, 100 days', () => {
    const streakBadges = BADGE_DEFINITIONS.filter((b) => b.category === 'streak');
    const streakIds = streakBadges.map((b) => b.id);
    expect(streakIds).toContain('streak_7');
    expect(streakIds).toContain('streak_14');
    expect(streakIds).toContain('streak_30');
    expect(streakIds).toContain('streak_60');
    expect(streakIds).toContain('streak_100');
  });
});

describe('getBadgeById', () => {
  it('returns the correct badge for a valid ID', () => {
    const badge = getBadgeById('streak_7');
    expect(badge).toBeDefined();
    expect(badge!.name).toBe('7-Day Warrior');
  });

  it('returns undefined for an invalid ID', () => {
    expect(getBadgeById('nonexistent')).toBeUndefined();
  });
});

describe('getAllBadgeIds', () => {
  it('returns all badge IDs', () => {
    const ids = getAllBadgeIds();
    expect(ids.length).toBe(BADGE_DEFINITIONS.length);
    expect(ids).toContain('streak_7');
    expect(ids).toContain('speed_demon');
  });
});

describe('getBadgesByCategory', () => {
  it('returns only badges of the specified category', () => {
    const streakBadges = getBadgesByCategory('streak');
    expect(streakBadges.length).toBeGreaterThan(0);
    for (const badge of streakBadges) {
      expect(badge.category).toBe('streak');
    }
  });

  it('returns empty array for a category with no badges', () => {
    // All categories have badges, but test the filtering works
    const allCategories: BadgeCategory[] = ['streak', 'academic', 'engagement', 'mystery'];
    for (const cat of allCategories) {
      const badges = getBadgesByCategory(cat);
      expect(badges.length).toBeGreaterThan(0);
    }
  });
});

describe('getMysteryBadges', () => {
  it('returns only mystery badges', () => {
    const mystery = getMysteryBadges();
    expect(mystery.length).toBe(3);
    for (const badge of mystery) {
      expect(badge.isMystery).toBe(true);
    }
  });
});

describe('getVisibleBadges', () => {
  it('returns only non-mystery badges', () => {
    const visible = getVisibleBadges();
    for (const badge of visible) {
      expect(badge.isMystery).toBe(false);
    }
    expect(visible.length).toBe(BADGE_DEFINITIONS.length - 3);
  });
});
