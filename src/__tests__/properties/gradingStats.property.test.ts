// Feature: edeviser-platform, Property 50: Grading time calculation correctness
// **Validates: Requirements 67.1, 67.2**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// ─── Pure grading time calculation logic ────────────────────────────────────

interface GradingEvent {
  submission_id: string;
  event_type: 'grading_start' | 'grading_end';
  created_at: string; // ISO timestamp
}

interface GradingTimePair {
  submission_id: string;
  startTime: string;
  endTime: string;
  durationSeconds: number;
}

const MIN_GRADING_SECONDS = 5;
const MAX_GRADING_SECONDS = 7200; // 2 hours

/**
 * Match grading_start and grading_end events by submission_id,
 * compute duration, and filter unreasonable durations.
 * Mirrors the logic in useGradingStats.ts calculateAvgGradingTime.
 */
function matchGradingPairs(events: GradingEvent[]): GradingTimePair[] {
  const startMap = new Map<string, string>();

  // Build map of submission_id → earliest start time
  for (const evt of events) {
    if (evt.event_type === 'grading_start' && !startMap.has(evt.submission_id)) {
      startMap.set(evt.submission_id, evt.created_at);
    }
  }

  const pairs: GradingTimePair[] = [];
  const matchedEnds = new Set<string>();

  for (const evt of events) {
    if (evt.event_type !== 'grading_end') continue;
    if (matchedEnds.has(evt.submission_id)) continue;

    const startTime = startMap.get(evt.submission_id);
    if (!startTime) continue;

    const durationMs = new Date(evt.created_at).getTime() - new Date(startTime).getTime();
    const durationSeconds = durationMs / 1000;

    if (durationSeconds >= MIN_GRADING_SECONDS && durationSeconds <= MAX_GRADING_SECONDS) {
      pairs.push({
        submission_id: evt.submission_id,
        startTime,
        endTime: evt.created_at,
        durationSeconds,
      });
      matchedEnds.add(evt.submission_id);
    }
  }

  return pairs;
}

/** Calculate average grading time from matched pairs. */
function calculateAvgGradingTime(pairs: GradingTimePair[]): number {
  if (pairs.length === 0) return 0;
  const total = pairs.reduce((sum, p) => sum + p.durationSeconds, 0);
  return Math.round(total / pairs.length);
}

// ─── Arbitraries ────────────────────────────────────────────────────────────

const submissionIdArb = fc.uuid();

/** Generate a valid grading start/end pair with reasonable duration. */
const gradingPairArb = fc.record({
  submission_id: submissionIdArb,
  startOffset: fc.integer({ min: 0, max: 86400 }), // seconds from base
  durationSeconds: fc.integer({ min: MIN_GRADING_SECONDS, max: MAX_GRADING_SECONDS }),
}).map(({ submission_id, startOffset, durationSeconds }) => {
  const base = new Date('2025-06-01T08:00:00Z');
  const startTime = new Date(base.getTime() + startOffset * 1000);
  const endTime = new Date(startTime.getTime() + durationSeconds * 1000);
  return {
    submission_id,
    start: {
      submission_id,
      event_type: 'grading_start' as const,
      created_at: startTime.toISOString(),
    },
    end: {
      submission_id,
      event_type: 'grading_end' as const,
      created_at: endTime.toISOString(),
    },
    expectedDuration: durationSeconds,
  };
});

// ─── Property 50: Grading time calculation correctness ──────────────────────

describe('Property 50 — Grading time calculation correctness', () => {
  it('P50a: grading time equals difference between start and end timestamps', () => {
    fc.assert(
      fc.property(
        fc.array(gradingPairArb, { minLength: 1, maxLength: 10 }),
        (pairs) => {
          const events: GradingEvent[] = [];
          for (const pair of pairs) {
            events.push(pair.start, pair.end);
          }

          const matched = matchGradingPairs(events);

          for (const m of matched) {
            const expectedDuration =
              (new Date(m.endTime).getTime() - new Date(m.startTime).getTime()) / 1000;
            expect(m.durationSeconds).toBeCloseTo(expectedDuration, 1);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P50b: submissions without grading_start are excluded from average', () => {
    fc.assert(
      fc.property(
        fc.array(submissionIdArb, { minLength: 1, maxLength: 10 }),
        (submissionIds) => {
          // Only end events, no start events
          const events: GradingEvent[] = submissionIds.map((id) => ({
            submission_id: id,
            event_type: 'grading_end' as const,
            created_at: new Date().toISOString(),
          }));

          const matched = matchGradingPairs(events);
          expect(matched).toHaveLength(0);
          expect(calculateAvgGradingTime(matched)).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P50c: unreasonable durations (<5s or >2h) are excluded', () => {
    fc.assert(
      fc.property(
        submissionIdArb,
        fc.oneof(
          fc.integer({ min: 0, max: 4 }),       // too short
          fc.integer({ min: 7201, max: 86400 }), // too long
        ),
        (submissionId, durationSeconds) => {
          const base = new Date('2025-06-01T10:00:00Z');
          const events: GradingEvent[] = [
            {
              submission_id: submissionId,
              event_type: 'grading_start',
              created_at: base.toISOString(),
            },
            {
              submission_id: submissionId,
              event_type: 'grading_end',
              created_at: new Date(base.getTime() + durationSeconds * 1000).toISOString(),
            },
          ];

          const matched = matchGradingPairs(events);
          expect(matched).toHaveLength(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P50d: average grading time is always non-negative', () => {
    fc.assert(
      fc.property(
        fc.array(gradingPairArb, { minLength: 0, maxLength: 10 }),
        (pairs) => {
          const events: GradingEvent[] = [];
          for (const pair of pairs) {
            events.push(pair.start, pair.end);
          }

          const matched = matchGradingPairs(events);
          const avg = calculateAvgGradingTime(matched);
          expect(avg).toBeGreaterThanOrEqual(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P50e: average grading time is within valid range when pairs exist', () => {
    fc.assert(
      fc.property(
        fc.array(gradingPairArb, { minLength: 1, maxLength: 10 }),
        (pairs) => {
          // Use unique submission IDs to avoid collisions
          const uniquePairs = pairs.map((p, i) => ({
            ...p,
            start: { ...p.start, submission_id: `sub-${i}` },
            end: { ...p.end, submission_id: `sub-${i}` },
          }));

          const events: GradingEvent[] = [];
          for (const pair of uniquePairs) {
            events.push(pair.start, pair.end);
          }

          const matched = matchGradingPairs(events);
          if (matched.length > 0) {
            const avg = calculateAvgGradingTime(matched);
            expect(avg).toBeGreaterThanOrEqual(MIN_GRADING_SECONDS);
            expect(avg).toBeLessThanOrEqual(MAX_GRADING_SECONDS);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P50f: empty events produce zero average', () => {
    const matched = matchGradingPairs([]);
    expect(calculateAvgGradingTime(matched)).toBe(0);
  });
});
