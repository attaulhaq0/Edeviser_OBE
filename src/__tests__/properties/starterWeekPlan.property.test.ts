// Feature: student-onboarding-profiling, Property 30, 31
// P30: Session count matches self-efficacy tier
// P31: Sessions within 7-day window
// **Validates: Requirements 27.1, 27.2**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { STARTER_SESSION_TIERS, SELF_EFFICACY_TIER_THRESHOLDS } from '@/lib/onboardingConstants';

interface StarterSession {
  suggested_date: string;
  duration_minutes: number;
}

type EfficacyTier = 'low' | 'moderate' | 'high';

function getEfficacyTier(selfEfficacyScore: number): EfficacyTier {
  if (selfEfficacyScore < SELF_EFFICACY_TIER_THRESHOLDS.low) return 'low';
  if (selfEfficacyScore <= SELF_EFFICACY_TIER_THRESHOLDS.moderate) return 'moderate';
  return 'high';
}

function generateStarterSessions(
  selfEfficacyScore: number,
  startDate: Date,
): StarterSession[] {
  const tier = getEfficacyTier(selfEfficacyScore);
  const config = STARTER_SESSION_TIERS[tier];
  const sessions: StarterSession[] = [];

  for (let i = 0; i < config.sessions; i++) {
    const dayOffset = i % 7;
    const sessionDate = new Date(startDate);
    sessionDate.setDate(sessionDate.getDate() + dayOffset);
    sessions.push({
      suggested_date: sessionDate.toISOString().slice(0, 10),
      duration_minutes: config.duration,
    });
  }

  return sessions;
}

const validDate = fc.date({ min: new Date('2024-01-01'), max: new Date('2030-12-31') })
  .filter((d) => !isNaN(d.getTime()));

describe('Starter week plan — property-based tests', () => {
  it('P30: session count and duration match self-efficacy tier', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        validDate,
        (selfEfficacy, startDate) => {
          const sessions = generateStarterSessions(selfEfficacy, startDate);
          const tier = getEfficacyTier(selfEfficacy);
          const config = STARTER_SESSION_TIERS[tier];

          expect(sessions).toHaveLength(config.sessions);
          for (const session of sessions) {
            expect(session.duration_minutes).toBe(config.duration);
          }

          // Verify tier mapping
          if (selfEfficacy < SELF_EFFICACY_TIER_THRESHOLDS.low) {
            expect(tier).toBe('low');
            expect(sessions).toHaveLength(5);
            expect(sessions[0]!.duration_minutes).toBe(25);
          } else if (selfEfficacy <= SELF_EFFICACY_TIER_THRESHOLDS.moderate) {
            expect(tier).toBe('moderate');
            expect(sessions).toHaveLength(4);
            expect(sessions[0]!.duration_minutes).toBe(35);
          } else {
            expect(tier).toBe('high');
            expect(sessions).toHaveLength(3);
            expect(sessions[0]!.duration_minutes).toBe(45);
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it('P31: all sessions fall within 7-day window from start date', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        validDate,
        (selfEfficacy, startDate) => {
          const sessions = generateStarterSessions(selfEfficacy, startDate);
          for (const session of sessions) {
            const sessionDate = new Date(session.suggested_date + 'T00:00:00Z');
            const sessionMs = sessionDate.getTime();
            // Session date should be >= start date and < start + 7 days
            const startDateNorm = new Date(startDate.toISOString().slice(0, 10) + 'T00:00:00Z').getTime();
            const endDateMs = startDateNorm + 7 * 24 * 60 * 60 * 1000;
            expect(sessionMs).toBeGreaterThanOrEqual(startDateNorm);
            expect(sessionMs).toBeLessThan(endDateMs);
          }
        },
      ),
      { numRuns: 200 },
    );
  });
});
