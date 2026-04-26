// =============================================================================
// Team Badge Definitions — Unit tests (Task 10.1)
// =============================================================================

import { describe, it, expect } from 'vitest';
import {
  TEAM_BADGE_DEFINITIONS,
  TEAM_PLAYER_BADGE,
  TEAM_BADGE_IDS,
  STREAK_BADGE_MAP,
  getTeamBadgeById,
} from '@/lib/teamBadgeDefinitions';

describe('TEAM_BADGE_DEFINITIONS', () => {
  const expectedBadgeIds = [
    'team_spirit',
    'streak_squad',
    'streak_champions',
    'streak_legends',
    'full_house',
    'quest_conquerors',
  ];

  it('defines exactly 6 team badges', () => {
    expect(TEAM_BADGE_DEFINITIONS).toHaveLength(6);
  });

  it.each(expectedBadgeIds)('includes the "%s" badge', (id) => {
    const badge = TEAM_BADGE_DEFINITIONS.find((b) => b.id === id);
    expect(badge).toBeDefined();
  });

  it('has required fields on every badge', () => {
    for (const badge of TEAM_BADGE_DEFINITIONS) {
      expect(badge.id).toBeTruthy();
      expect(typeof badge.id).toBe('string');
      expect(badge.name).toBeTruthy();
      expect(typeof badge.name).toBe('string');
      expect(badge.description).toBeTruthy();
      expect(typeof badge.description).toBe('string');
      expect(badge.icon).toBeTruthy();
      expect(typeof badge.icon).toBe('string');
      expect(badge.condition).toBeTruthy();
      expect(typeof badge.condition).toBe('string');
      expect(typeof badge.xpReward).toBe('number');
      expect(badge.xpReward).toBeGreaterThan(0);
    }
  });

  it('has unique badge IDs', () => {
    const ids = TEAM_BADGE_DEFINITIONS.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('TEAM_PLAYER_BADGE', () => {
  it('is defined with correct properties', () => {
    expect(TEAM_PLAYER_BADGE.id).toBe('team_player');
    expect(TEAM_PLAYER_BADGE.name).toBe('Team Player');
    expect(TEAM_PLAYER_BADGE.category).toBe('team');
    expect(TEAM_PLAYER_BADGE.isMystery).toBe(false);
    expect(typeof TEAM_PLAYER_BADGE.xpReward).toBe('number');
    expect(TEAM_PLAYER_BADGE.xpReward).toBeGreaterThan(0);
  });

  it('has all required badge fields', () => {
    expect(TEAM_PLAYER_BADGE.id).toBeTruthy();
    expect(TEAM_PLAYER_BADGE.name).toBeTruthy();
    expect(TEAM_PLAYER_BADGE.description).toBeTruthy();
    expect(TEAM_PLAYER_BADGE.icon).toBeTruthy();
    expect(TEAM_PLAYER_BADGE.condition).toBeTruthy();
  });
});

describe('TEAM_BADGE_IDS', () => {
  it('contains all 6 badge IDs', () => {
    expect(TEAM_BADGE_IDS).toHaveLength(6);
    expect(TEAM_BADGE_IDS).toContain('team_spirit');
    expect(TEAM_BADGE_IDS).toContain('streak_squad');
    expect(TEAM_BADGE_IDS).toContain('streak_champions');
    expect(TEAM_BADGE_IDS).toContain('streak_legends');
    expect(TEAM_BADGE_IDS).toContain('full_house');
    expect(TEAM_BADGE_IDS).toContain('quest_conquerors');
  });
});

describe('STREAK_BADGE_MAP', () => {
  it('maps 7 → streak_squad', () => {
    expect(STREAK_BADGE_MAP[7]).toBe('streak_squad');
  });

  it('maps 14 → streak_champions', () => {
    expect(STREAK_BADGE_MAP[14]).toBe('streak_champions');
  });

  it('maps 30 → streak_legends', () => {
    expect(STREAK_BADGE_MAP[30]).toBe('streak_legends');
  });

  it('has exactly 3 entries', () => {
    expect(Object.keys(STREAK_BADGE_MAP)).toHaveLength(3);
  });
});

describe('getTeamBadgeById', () => {
  it('returns the correct badge for a valid ID', () => {
    const badge = getTeamBadgeById('team_spirit');
    expect(badge).toBeDefined();
    expect(badge!.name).toBe('Team Spirit');
  });

  it('returns undefined for an invalid ID', () => {
    expect(getTeamBadgeById('nonexistent')).toBeUndefined();
  });

  it('returns correct badge for each defined ID', () => {
    for (const def of TEAM_BADGE_DEFINITIONS) {
      const found = getTeamBadgeById(def.id);
      expect(found).toBeDefined();
      expect(found!.id).toBe(def.id);
      expect(found!.name).toBe(def.name);
    }
  });
});
