// Shared survey aggregation helpers used by SurveyResultsPage and tests
// Extracted to avoid logic duplication between production and test code.

export const LIKERT_LABELS = ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'] as const;

export interface LikertAggregation {
  label: string;
  count: number;
}

export interface MCQAggregation {
  option: string;
  count: number;
}

export interface AggregableResponse {
  question_id: string;
  response_value: string;
}

export function aggregateLikert(responses: AggregableResponse[], questionId: string): LikertAggregation[] {
  const counts = new Map<string, number>();
  for (const label of LIKERT_LABELS) counts.set(label, 0);

  for (const r of responses) {
    if (r.question_id === questionId && counts.has(r.response_value)) {
      counts.set(r.response_value, (counts.get(r.response_value) ?? 0) + 1);
    }
  }

  return LIKERT_LABELS.map((label) => ({ label, count: counts.get(label) ?? 0 }));
}

export function aggregateMCQ(responses: AggregableResponse[], questionId: string): MCQAggregation[] {
  const counts: Record<string, number> = {};

  for (const r of responses) {
    if (r.question_id === questionId) {
      counts[r.response_value] = (counts[r.response_value] ?? 0) + 1;
    }
  }

  return Object.entries(counts).map(([option, count]) => ({ option, count }));
}
