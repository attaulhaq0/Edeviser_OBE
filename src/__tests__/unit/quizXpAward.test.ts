import { describe, it, expect } from 'vitest';
import { QUIZ_XP_ON_TIME, QUIZ_XP_LATE } from '@/lib/quizXpAward';

describe('Quiz XP Award Constants', () => {
  it('awards 50 XP for on-time completion', () => {
    expect(QUIZ_XP_ON_TIME).toBe(50);
  });

  it('awards 25 XP for late completion', () => {
    expect(QUIZ_XP_LATE).toBe(25);
  });

  it('on-time XP is greater than late XP', () => {
    expect(QUIZ_XP_ON_TIME).toBeGreaterThan(QUIZ_XP_LATE);
  });
});
