// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { aggregateLikert, aggregateMCQ } from '@/lib/surveyAggregators';
import type { AggregableResponse } from '@/lib/surveyAggregators';

// ─── Tests ──────────────────────────────────────────────────────────────────

interface MockResponse extends AggregableResponse {
  id: string;
  survey_id: string;
  respondent_id: string;
  created_at: string;
}

describe('Survey Results Aggregation', () => {
  const makeResponse = (questionId: string, value: string, respondentId = 'stu-1'): MockResponse => ({
    id: `${questionId}-${respondentId}-${value}`,
    survey_id: 'survey-1',
    question_id: questionId,
    respondent_id: respondentId,
    response_value: value,
    created_at: new Date().toISOString(),
  });

  describe('aggregateLikert', () => {
    it('counts each Likert option correctly', () => {
      const responses = [
        makeResponse('q1', 'Agree', 'stu-1'),
        makeResponse('q1', 'Agree', 'stu-2'),
        makeResponse('q1', 'Neutral', 'stu-3'),
        makeResponse('q1', 'Strongly Disagree', 'stu-4'),
      ];

      const result = aggregateLikert(responses, 'q1');

      expect(result).toEqual([
        { label: 'Strongly Disagree', count: 1 },
        { label: 'Disagree', count: 0 },
        { label: 'Neutral', count: 1 },
        { label: 'Agree', count: 2 },
        { label: 'Strongly Agree', count: 0 },
      ]);
    });

    it('returns all zeros for empty responses', () => {
      const result = aggregateLikert([], 'q1');
      expect(result.every((r) => r.count === 0)).toBe(true);
      expect(result).toHaveLength(5);
    });

    it('ignores responses for other questions', () => {
      const responses = [
        makeResponse('q1', 'Agree'),
        makeResponse('q2', 'Disagree'),
      ];

      const result = aggregateLikert(responses, 'q1');
      expect(result.find((r) => r.label === 'Agree')?.count).toBe(1);
      expect(result.find((r) => r.label === 'Disagree')?.count).toBe(0);
    });

    it('ignores invalid Likert values', () => {
      const responses = [
        makeResponse('q1', 'Invalid Value'),
        makeResponse('q1', 'Agree'),
      ];

      const result = aggregateLikert(responses, 'q1');
      const total = result.reduce((sum, r) => sum + r.count, 0);
      expect(total).toBe(1);
    });
  });

  describe('aggregateMCQ', () => {
    it('counts each option correctly', () => {
      const responses = [
        makeResponse('q2', 'Option A', 'stu-1'),
        makeResponse('q2', 'Option B', 'stu-2'),
        makeResponse('q2', 'Option A', 'stu-3'),
      ];

      const result = aggregateMCQ(responses, 'q2');
      expect(result).toContainEqual({ option: 'Option A', count: 2 });
      expect(result).toContainEqual({ option: 'Option B', count: 1 });
    });

    it('returns empty array for no responses', () => {
      const result = aggregateMCQ([], 'q2');
      expect(result).toEqual([]);
    });

    it('ignores responses for other questions', () => {
      const responses = [
        makeResponse('q2', 'Option A'),
        makeResponse('q3', 'Option B'),
      ];

      const result = aggregateMCQ(responses, 'q2');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ option: 'Option A', count: 1 });
    });
  });

  describe('unique respondent counting', () => {
    it('counts unique respondents from responses', () => {
      const responses = [
        makeResponse('q1', 'Agree', 'stu-1'),
        makeResponse('q2', 'Option A', 'stu-1'),
        makeResponse('q1', 'Neutral', 'stu-2'),
        makeResponse('q2', 'Option B', 'stu-2'),
        makeResponse('q1', 'Agree', 'stu-3'),
      ];

      const uniqueRespondents = new Set(responses.map((r) => r.respondent_id)).size;
      expect(uniqueRespondents).toBe(3);
    });

    it('returns 0 for empty responses', () => {
      const responses: MockResponse[] = [];
      const uniqueRespondents = new Set(responses.map((r) => r.respondent_id)).size;
      expect(uniqueRespondents).toBe(0);
    });
  });
});
