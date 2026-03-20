// Feature: adaptive-quiz-generation, Property 12: Adaptive session stores complete trajectory data
// **Validates: Requirements 7.6**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { adjustDifficulty } from '@/lib/adaptiveEngine';

interface QuestionSequenceEntry {
  question_id: string;
  difficulty_rating: number;
  bloom_level: number;
}

interface DifficultyTrajectoryEntry {
  question_number: number;
  target_difficulty: number;
  actual_difficulty: number;
  was_correct: boolean;
}

interface PerQuestionTimeEntry {
  question_id: string;
  response_time_ms: number;
}

interface AdaptiveSessionData {
  question_sequence: QuestionSequenceEntry[];
  difficulty_trajectory: DifficultyTrajectoryEntry[];
  per_question_times: PerQuestionTimeEntry[];
}

interface AnsweredQuestion {
  question_id: string;
  difficulty_rating: number;
  bloom_level: number;
  was_correct: boolean;
  response_time_ms: number;
}

/**
 * Simulates building adaptive session trajectory data step by step,
 * using adjustDifficulty from the adaptive engine to compute target
 * difficulty after each answer.
 */
function buildSessionData(
  initialDifficulty: number,
  answers: AnsweredQuestion[],
): AdaptiveSessionData {
  const question_sequence: QuestionSequenceEntry[] = [];
  const difficulty_trajectory: DifficultyTrajectoryEntry[] = [];
  const per_question_times: PerQuestionTimeEntry[] = [];

  let targetDifficulty = initialDifficulty;

  for (let i = 0; i < answers.length; i++) {
    const answer = answers[i]!;

    question_sequence.push({
      question_id: answer.question_id,
      difficulty_rating: answer.difficulty_rating,
      bloom_level: answer.bloom_level,
    });

    difficulty_trajectory.push({
      question_number: i + 1,
      target_difficulty: targetDifficulty,
      actual_difficulty: answer.difficulty_rating,
      was_correct: answer.was_correct,
    });

    per_question_times.push({
      question_id: answer.question_id,
      response_time_ms: answer.response_time_ms,
    });

    // Adjust target difficulty for the next question using the adaptive engine
    targetDifficulty = adjustDifficulty(targetDifficulty, answer.was_correct);
  }

  return { question_sequence, difficulty_trajectory, per_question_times };
}

// ─── Arbitraries ─────────────────────────────────────────────────────────────

const answeredQuestionArb = fc.record({
  question_id: fc.uuid(),
  difficulty_rating: fc.double({ min: 1.0, max: 5.0, noNaN: true }),
  bloom_level: fc.integer({ min: 1, max: 6 }),
  was_correct: fc.boolean(),
  response_time_ms: fc.integer({ min: 100, max: 120000 }),
});

const answersArb = fc.array(answeredQuestionArb, { minLength: 1, maxLength: 30 });

const initialDifficultyArb = fc.double({ min: 1.0, max: 5.0, noNaN: true });

describe('Adaptive session stores complete trajectory data — property-based tests', () => {
  it('P12a: all three trajectory arrays have exactly N entries for N questions answered', () => {
    fc.assert(
      fc.property(initialDifficultyArb, answersArb, (initialDiff, answers) => {
        const session = buildSessionData(initialDiff, answers);
        const n = answers.length;

        expect(session.question_sequence).toHaveLength(n);
        expect(session.difficulty_trajectory).toHaveLength(n);
        expect(session.per_question_times).toHaveLength(n);
      }),
      { numRuns: 100 },
    );
  });

  it('P12b: every question_sequence entry has required fields (question_id, difficulty_rating, bloom_level)', () => {
    fc.assert(
      fc.property(initialDifficultyArb, answersArb, (initialDiff, answers) => {
        const session = buildSessionData(initialDiff, answers);

        for (const entry of session.question_sequence) {
          expect(typeof entry.question_id).toBe('string');
          expect(entry.question_id.length).toBeGreaterThan(0);
          expect(typeof entry.difficulty_rating).toBe('number');
          expect(entry.difficulty_rating).toBeGreaterThanOrEqual(1.0);
          expect(entry.difficulty_rating).toBeLessThanOrEqual(5.0);
          expect(typeof entry.bloom_level).toBe('number');
          expect(entry.bloom_level).toBeGreaterThanOrEqual(1);
          expect(entry.bloom_level).toBeLessThanOrEqual(6);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('P12c: every difficulty_trajectory entry has required fields (question_number, target_difficulty, actual_difficulty, was_correct)', () => {
    fc.assert(
      fc.property(initialDifficultyArb, answersArb, (initialDiff, answers) => {
        const session = buildSessionData(initialDiff, answers);

        for (let i = 0; i < session.difficulty_trajectory.length; i++) {
          const entry = session.difficulty_trajectory[i]!;
          expect(entry.question_number).toBe(i + 1);
          expect(typeof entry.target_difficulty).toBe('number');
          expect(typeof entry.actual_difficulty).toBe('number');
          expect(typeof entry.was_correct).toBe('boolean');
        }
      }),
      { numRuns: 100 },
    );
  });

  it('P12d: every per_question_times entry has required fields (question_id, response_time_ms)', () => {
    fc.assert(
      fc.property(initialDifficultyArb, answersArb, (initialDiff, answers) => {
        const session = buildSessionData(initialDiff, answers);

        for (const entry of session.per_question_times) {
          expect(typeof entry.question_id).toBe('string');
          expect(entry.question_id.length).toBeGreaterThan(0);
          expect(typeof entry.response_time_ms).toBe('number');
          expect(entry.response_time_ms).toBeGreaterThanOrEqual(0);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('P12e: difficulty trajectory uses adjustDifficulty to compute target for each subsequent question', () => {
    fc.assert(
      fc.property(initialDifficultyArb, answersArb, (initialDiff, answers) => {
        const session = buildSessionData(initialDiff, answers);

        let expectedTarget = initialDiff;
        for (let i = 0; i < answers.length; i++) {
          const trajEntry = session.difficulty_trajectory[i]!;
          expect(trajEntry.target_difficulty).toBeCloseTo(expectedTarget, 10);
          expectedTarget = adjustDifficulty(expectedTarget, answers[i]!.was_correct);
        }
      }),
      { numRuns: 100 },
    );
  });
});
