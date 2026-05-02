// Unit test: ChallengeForm — form validation, XP Race acknowledgment, cooperative default
import { describe, it, expect } from 'vitest';
import { createChallengeSchema } from '@/lib/schemas/challenge';

describe('ChallengeForm schema validation', () => {
  const validBase = {
    title: 'Test Challenge',
    description: 'A test challenge',
    challenge_type: 'cooperative' as const,
    participation_mode: 'team' as const,
    goal_target: 100,
    start_date: '2025-06-01T00:00:00Z',
    end_date: '2025-06-15T00:00:00Z',
    reward_xp: 100,
    reward_badge_id: null,
  };

  it('accepts valid cooperative challenge', () => {
    const result = createChallengeSchema.safeParse(validBase);
    expect(result.success).toBe(true);
  });

  it('rejects empty title', () => {
    const result = createChallengeSchema.safeParse({ ...validBase, title: '' });
    expect(result.success).toBe(false);
  });

  it('rejects title shorter than 3 characters', () => {
    const result = createChallengeSchema.safeParse({ ...validBase, title: 'AB' });
    expect(result.success).toBe(false);
  });

  it('rejects end_date before start_date', () => {
    const result = createChallengeSchema.safeParse({
      ...validBase,
      start_date: '2025-06-15T00:00:00Z',
      end_date: '2025-06-01T00:00:00Z',
    });
    expect(result.success).toBe(false);
  });

  it('rejects duration less than 24 hours', () => {
    const result = createChallengeSchema.safeParse({
      ...validBase,
      start_date: '2025-06-01T00:00:00Z',
      end_date: '2025-06-01T12:00:00Z',
    });
    expect(result.success).toBe(false);
  });

  it('rejects duration exceeding 90 days', () => {
    const result = createChallengeSchema.safeParse({
      ...validBase,
      start_date: '2025-01-01T00:00:00Z',
      end_date: '2025-06-01T00:00:00Z',
    });
    expect(result.success).toBe(false);
  });

  it('rejects reward_xp below 50', () => {
    const result = createChallengeSchema.safeParse({ ...validBase, reward_xp: 10 });
    expect(result.success).toBe(false);
  });

  it('rejects reward_xp above 500', () => {
    const result = createChallengeSchema.safeParse({ ...validBase, reward_xp: 600 });
    expect(result.success).toBe(false);
  });

  it('XP Race requires acknowledgment', () => {
    const result = createChallengeSchema.safeParse({
      ...validBase,
      challenge_type: 'xp_race',
      xp_race_acknowledged: false,
    });
    expect(result.success).toBe(false);
  });

  it('XP Race with acknowledgment passes', () => {
    const result = createChallengeSchema.safeParse({
      ...validBase,
      challenge_type: 'xp_race',
      xp_race_acknowledged: true,
    });
    expect(result.success).toBe(true);
  });

  it('cooperative is a valid challenge type', () => {
    const result = createChallengeSchema.safeParse({
      ...validBase,
      challenge_type: 'cooperative',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid challenge type', () => {
    const result = createChallengeSchema.safeParse({
      ...validBase,
      challenge_type: 'invalid_type',
    });
    expect(result.success).toBe(false);
  });
});
