// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import {
  countMasteryFailures,
  shouldActivateRecovery,
} from '@/lib/masteryRecovery';

/**
 * Tests for the mastery failure detection integration logic.
 *
 * The actual integration runs server-side in the update-question-analytics
 * Edge Function. These tests validate the core decision logic:
 *   1. computePerCLOScores — per-CLO score computation from attempt data
 *   2. Failure counting + recovery activation threshold
 *
 * The Edge Function's computePerCLOScores mirrors the logic tested here
 * using the same approach as computePerCLOScore from questionAnalytics.ts.
 */

// ─── Helper: mirrors Edge Function's computePerCLOScores ────────────────────

interface QuestionSequenceEntry {
  question_id: string;
  difficulty_rating: number;
  bloom_level: number;
}

interface QuestionBankRow {
  id: string;
  difficulty_rating: number;
  clo_id: string;
}

function computePerCLOScores(
  questionSequence: QuestionSequenceEntry[],
  answersMap: Map<string, boolean>,
  questionBankMap: Map<string, QuestionBankRow>,
): Record<string, number> {
  const totals: Record<string, number> = {};
  const corrects: Record<string, number> = {};

  for (const seqEntry of questionSequence) {
    const qbRow = questionBankMap.get(seqEntry.question_id);
    const isCorrect = answersMap.get(seqEntry.question_id);
    if (!qbRow || isCorrect === undefined) continue;

    const cloId = qbRow.clo_id;
    totals[cloId] = (totals[cloId] ?? 0) + 1;
    if (isCorrect) {
      corrects[cloId] = (corrects[cloId] ?? 0) + 1;
    }
  }

  const result: Record<string, number> = {};
  for (const cloId of Object.keys(totals)) {
    result[cloId] = ((corrects[cloId] ?? 0) / (totals[cloId] ?? 1)) * 100;
  }
  return result;
}

// ─── computePerCLOScores ────────────────────────────────────────────────────

describe('computePerCLOScores (Edge Function mirror)', () => {
  const makeSeq = (id: string): QuestionSequenceEntry => ({
    question_id: id,
    difficulty_rating: 3.0,
    bloom_level: 2,
  });

  const makeQB = (id: string, cloId: string): QuestionBankRow => ({
    id,
    difficulty_rating: 3.0,
    clo_id: cloId,
  });

  it('returns empty object for empty question sequence', () => {
    const result = computePerCLOScores([], new Map(), new Map());
    expect(result).toEqual({});
  });

  it('computes 100% for a CLO with all correct answers', () => {
    const seq = [makeSeq('q1'), makeSeq('q2')];
    const answers = new Map([['q1', true], ['q2', true]]);
    const qbMap = new Map([['q1', makeQB('q1', 'clo-1')], ['q2', makeQB('q2', 'clo-1')]]);

    const result = computePerCLOScores(seq, answers, qbMap);
    expect(result['clo-1']).toBe(100);
  });

  it('computes 0% for a CLO with all incorrect answers', () => {
    const seq = [makeSeq('q1'), makeSeq('q2')];
    const answers = new Map([['q1', false], ['q2', false]]);
    const qbMap = new Map([['q1', makeQB('q1', 'clo-1')], ['q2', makeQB('q2', 'clo-1')]]);

    const result = computePerCLOScores(seq, answers, qbMap);
    expect(result['clo-1']).toBe(0);
  });

  it('computes scores across multiple CLOs', () => {
    const seq = [makeSeq('q1'), makeSeq('q2'), makeSeq('q3')];
    const answers = new Map([['q1', true], ['q2', false], ['q3', true]]);
    const qbMap = new Map([
      ['q1', makeQB('q1', 'clo-1')],
      ['q2', makeQB('q2', 'clo-1')],
      ['q3', makeQB('q3', 'clo-2')],
    ]);

    const result = computePerCLOScores(seq, answers, qbMap);
    expect(result['clo-1']).toBe(50);
    expect(result['clo-2']).toBe(100);
  });

  it('skips questions without answer data', () => {
    const seq = [makeSeq('q1'), makeSeq('q2')];
    const answers = new Map([['q1', true]]); // q2 has no answer
    const qbMap = new Map([['q1', makeQB('q1', 'clo-1')], ['q2', makeQB('q2', 'clo-1')]]);

    const result = computePerCLOScores(seq, answers, qbMap);
    expect(result['clo-1']).toBe(100); // only q1 counted
  });

  it('skips questions not in question bank map', () => {
    const seq = [makeSeq('q1'), makeSeq('q2')];
    const answers = new Map([['q1', true], ['q2', false]]);
    const qbMap = new Map([['q1', makeQB('q1', 'clo-1')]]); // q2 not in bank

    const result = computePerCLOScores(seq, answers, qbMap);
    expect(result['clo-1']).toBe(100); // only q1 counted
  });
});

// ─── Mastery failure detection integration logic ────────────────────────────

describe('Mastery failure detection integration', () => {
  it('identifies CLOs below 70% threshold as failing', () => {
    const seq: QuestionSequenceEntry[] = [
      { question_id: 'q1', difficulty_rating: 3.0, bloom_level: 2 },
      { question_id: 'q2', difficulty_rating: 3.0, bloom_level: 2 },
      { question_id: 'q3', difficulty_rating: 3.0, bloom_level: 2 },
    ];
    const answers = new Map([['q1', true], ['q2', false], ['q3', false]]);
    const qbMap = new Map([
      ['q1', { id: 'q1', difficulty_rating: 3.0, clo_id: 'clo-1' }],
      ['q2', { id: 'q2', difficulty_rating: 3.0, clo_id: 'clo-1' }],
      ['q3', { id: 'q3', difficulty_rating: 3.0, clo_id: 'clo-1' }],
    ]);

    const scores = computePerCLOScores(seq, answers, qbMap);
    const failingCLOs = Object.entries(scores)
      .filter(([, score]) => score < 70)
      .map(([cloId]) => cloId);

    expect(failingCLOs).toEqual(['clo-1']);
    expect(scores['clo-1']).toBeCloseTo(33.33, 1);
  });

  it('does not flag CLOs at exactly 70%', () => {
    const seq: QuestionSequenceEntry[] = [
      { question_id: 'q1', difficulty_rating: 3.0, bloom_level: 2 },
      { question_id: 'q2', difficulty_rating: 3.0, bloom_level: 2 },
      { question_id: 'q3', difficulty_rating: 3.0, bloom_level: 2 },
      { question_id: 'q4', difficulty_rating: 3.0, bloom_level: 2 },
      { question_id: 'q5', difficulty_rating: 3.0, bloom_level: 2 },
      { question_id: 'q6', difficulty_rating: 3.0, bloom_level: 2 },
      { question_id: 'q7', difficulty_rating: 3.0, bloom_level: 2 },
      { question_id: 'q8', difficulty_rating: 3.0, bloom_level: 2 },
      { question_id: 'q9', difficulty_rating: 3.0, bloom_level: 2 },
      { question_id: 'q10', difficulty_rating: 3.0, bloom_level: 2 },
    ];
    // 7 correct out of 10 = 70%
    const answers = new Map<string, boolean>([
      ['q1', true], ['q2', true], ['q3', true], ['q4', true],
      ['q5', true], ['q6', true], ['q7', true],
      ['q8', false], ['q9', false], ['q10', false],
    ]);
    const qbMap = new Map(
      Array.from({ length: 10 }, (_, i) => [
        `q${i + 1}`,
        { id: `q${i + 1}`, difficulty_rating: 3.0, clo_id: 'clo-1' },
      ]),
    );

    const scores = computePerCLOScores(seq, answers, qbMap);
    const failingCLOs = Object.entries(scores)
      .filter(([, score]) => score < 70)
      .map(([cloId]) => cloId);

    expect(scores['clo-1']).toBe(70);
    expect(failingCLOs).toEqual([]);
  });

  it('activates recovery when failure count reaches threshold', () => {
    // Simulate: 1 previous failure + current failure = 2 total
    const previousAttempts = [
      { clo_scores: { 'clo-1': 50 } }, // failure
    ];
    const previousFailures = countMasteryFailures(previousAttempts, 'clo-1');
    const totalFailures = previousFailures + 1; // +1 for current attempt

    expect(totalFailures).toBe(2);
    expect(shouldActivateRecovery(totalFailures)).toBe(true);
  });

  it('does not activate recovery when failure count is below threshold', () => {
    // Simulate: 0 previous failures + current failure = 1 total
    const previousAttempts: { clo_scores: Record<string, number> }[] = [];
    const previousFailures = countMasteryFailures(previousAttempts, 'clo-1');
    const totalFailures = previousFailures + 1;

    expect(totalFailures).toBe(1);
    expect(shouldActivateRecovery(totalFailures)).toBe(false);
  });

  it('activates recovery when failures exceed threshold', () => {
    // Simulate: 3 previous failures + current failure = 4 total
    const previousAttempts = [
      { clo_scores: { 'clo-1': 40 } },
      { clo_scores: { 'clo-1': 30 } },
      { clo_scores: { 'clo-1': 60 } },
    ];
    const previousFailures = countMasteryFailures(previousAttempts, 'clo-1');
    const totalFailures = previousFailures + 1;

    expect(totalFailures).toBe(4);
    expect(shouldActivateRecovery(totalFailures)).toBe(true);
  });

  it('handles mixed CLO results — only failing CLOs trigger recovery check', () => {
    const seq: QuestionSequenceEntry[] = [
      { question_id: 'q1', difficulty_rating: 3.0, bloom_level: 2 },
      { question_id: 'q2', difficulty_rating: 3.0, bloom_level: 2 },
      { question_id: 'q3', difficulty_rating: 3.0, bloom_level: 3 },
      { question_id: 'q4', difficulty_rating: 3.0, bloom_level: 3 },
    ];
    const answers = new Map([
      ['q1', false], ['q2', false], // clo-1: 0%
      ['q3', true], ['q4', true],   // clo-2: 100%
    ]);
    const qbMap = new Map([
      ['q1', { id: 'q1', difficulty_rating: 3.0, clo_id: 'clo-1' }],
      ['q2', { id: 'q2', difficulty_rating: 3.0, clo_id: 'clo-1' }],
      ['q3', { id: 'q3', difficulty_rating: 3.0, clo_id: 'clo-2' }],
      ['q4', { id: 'q4', difficulty_rating: 3.0, clo_id: 'clo-2' }],
    ]);

    const scores = computePerCLOScores(seq, answers, qbMap);
    const failingCLOs = Object.entries(scores)
      .filter(([, score]) => score < 70)
      .map(([cloId]) => cloId);

    expect(failingCLOs).toEqual(['clo-1']);
    expect(failingCLOs).not.toContain('clo-2');
  });
});
