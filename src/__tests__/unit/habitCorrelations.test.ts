import { describe, it, expect } from 'vitest';

// ─── Pure correlation logic (mirrored from Edge Function for testability) ────

const FORBIDDEN_CAUSAL_WORDS = ['because', 'causes', 'caused', 'due to', 'results in', 'leads to'];

function containsCausalLanguage(text: string): boolean {
  const lower = text.toLowerCase();
  return FORBIDDEN_CAUSAL_WORDS.some((word) => lower.includes(word));
}

function computeCoOccurrenceRate(
  habitDates: Set<string>,
  eventDates: Set<string>,
  allDates: Set<string>,
): number {
  if (habitDates.size === 0 || allDates.size === 0) return 0;

  const nonHabitDates = new Set(
    [...allDates].filter((d) => !habitDates.has(d)),
  );

  let habitEventCount = 0;
  for (const d of habitDates) {
    if (eventDates.has(d)) habitEventCount++;
  }
  const habitRate = habitDates.size > 0 ? habitEventCount / habitDates.size : 0;

  let nonHabitEventCount = 0;
  for (const d of nonHabitDates) {
    if (eventDates.has(d)) nonHabitEventCount++;
  }
  const nonHabitRate = nonHabitDates.size > 0 ? nonHabitEventCount / nonHabitDates.size : 0;

  if (habitRate <= nonHabitRate) return 0;
  return Math.min(habitRate - nonHabitRate, 1);
}

const HABIT_LABELS: Record<string, string> = {
  meditation: 'meditate',
  hydration: 'stay hydrated',
  exercise: 'exercise',
  sleep: 'get enough sleep',
  login: 'log in',
  submit: 'submit work',
  journal: 'journal',
  read: 'read content',
};

const INSIGHT_TEMPLATES: Record<string, (habitLabel: string) => string> = {
  submission_rate: (habit) =>
    `On days when you ${habit}, you tend to submit more assignments`,
  submission_timeliness: (habit) =>
    `On days when you ${habit}, you're more likely to submit assignments on time`,
  activity_level: (habit) =>
    `On days when you ${habit}, you tend to be more active on the platform`,
};

function generateInsightDescription(
  habitType: string,
  academicMetric: string,
): string {
  const habitLabel = HABIT_LABELS[habitType] ?? habitType;
  const template = INSIGHT_TEMPLATES[academicMetric];
  if (template) return template(habitLabel);
  return `On days when you ${habitLabel}, your ${academicMetric.replace(/_/g, ' ')} tends to be higher`;
}

function hasMinimumData(allDates: Set<string>, minimumDays: number = 14): boolean {
  return allDates.size >= minimumDays;
}

interface CorrelationInsight {
  id: string;
  habitType: string;
  academicMetric: string;
  description: string;
  strength: number;
}

function computeCorrelationInsights(
  habitDatesByType: Map<string, Set<string>>,
  submissionDates: Set<string>,
  allDates: Set<string>,
): CorrelationInsight[] {
  const insights: CorrelationInsight[] = [];

  for (const [habitType, habitDates] of habitDatesByType) {
    const strength = computeCoOccurrenceRate(habitDates, submissionDates, allDates);

    if (strength > 0.05) {
      insights.push({
        id: `${habitType}_submission_rate`,
        habitType,
        academicMetric: 'submission_rate',
        description: generateInsightDescription(habitType, 'submission_rate'),
        strength: Math.round(strength * 100) / 100,
      });
    }
  }

  return insights
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 3);
}

// ─── Helper to generate consecutive date strings ────────────────────────────

function generateDates(startDate: string, count: number): string[] {
  const dates: string[] = [];
  const start = new Date(startDate);
  for (let i = 0; i < count; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('Co-occurrence Rate Calculation', () => {
  it('returns 0 when habit dates are empty', () => {
    const result = computeCoOccurrenceRate(
      new Set(),
      new Set(['2025-01-01']),
      new Set(['2025-01-01']),
    );
    expect(result).toBe(0);
  });

  it('returns 0 when all dates are empty', () => {
    const result = computeCoOccurrenceRate(new Set(), new Set(), new Set());
    expect(result).toBe(0);
  });

  it('returns 0 when event never co-occurs with habit', () => {
    const habitDates = new Set(['2025-01-01', '2025-01-02']);
    const eventDates = new Set(['2025-01-03', '2025-01-04']);
    const allDates = new Set(['2025-01-01', '2025-01-02', '2025-01-03', '2025-01-04']);
    const result = computeCoOccurrenceRate(habitDates, eventDates, allDates);
    expect(result).toBe(0);
  });

  it('returns positive value when event co-occurs more on habit days', () => {
    // Habit on days 1-5, event on days 1-5 (100% co-occurrence on habit days)
    // No habit on days 6-10, event on days 6-7 (20% on non-habit days)
    const allDates = new Set(generateDates('2025-01-01', 10));
    const habitDates = new Set(generateDates('2025-01-01', 5));
    const eventDates = new Set([
      ...generateDates('2025-01-01', 5),
      '2025-01-06', '2025-01-07',
    ]);
    const result = computeCoOccurrenceRate(habitDates, eventDates, allDates);
    expect(result).toBeGreaterThan(0);
    // habitRate = 5/5 = 1.0, nonHabitRate = 2/5 = 0.4, strength = 0.6
    expect(result).toBeCloseTo(0.6, 1);
  });

  it('returns 0 when event rate is equal on habit and non-habit days', () => {
    const allDates = new Set(generateDates('2025-01-01', 4));
    const habitDates = new Set(['2025-01-01', '2025-01-02']);
    const eventDates = new Set(['2025-01-01', '2025-01-03']); // 50% on both
    const result = computeCoOccurrenceRate(habitDates, eventDates, allDates);
    expect(result).toBe(0);
  });

  it('returns value capped at 1', () => {
    // All habit days have events, no non-habit days have events
    const allDates = new Set(generateDates('2025-01-01', 10));
    const habitDates = new Set(generateDates('2025-01-01', 5));
    const eventDates = new Set(generateDates('2025-01-01', 5));
    const result = computeCoOccurrenceRate(habitDates, eventDates, allDates);
    expect(result).toBeLessThanOrEqual(1);
    expect(result).toBeGreaterThan(0);
  });
});

describe('Insight Generation — Non-Causal Language', () => {
  it('generates description with "On days when" for submission_rate', () => {
    const desc = generateInsightDescription('meditation', 'submission_rate');
    expect(desc).toContain('On days when');
    expect(desc).toContain('tend to');
  });

  it('generates description with "more likely" for submission_timeliness', () => {
    const desc = generateInsightDescription('exercise', 'submission_timeliness');
    expect(desc).toContain("you're more likely to");
  });

  it('uses fallback template for unknown metrics', () => {
    const desc = generateInsightDescription('sleep', 'unknown_metric');
    expect(desc).toContain('On days when');
    expect(desc).toContain('tends to be higher');
  });

  it('never contains causal language in any template', () => {
    const habitTypes = ['meditation', 'hydration', 'exercise', 'sleep', 'login', 'submit', 'journal', 'read'];
    const metrics = ['submission_rate', 'submission_timeliness', 'activity_level', 'some_other'];

    for (const habit of habitTypes) {
      for (const metric of metrics) {
        const desc = generateInsightDescription(habit, metric);
        expect(containsCausalLanguage(desc)).toBe(false);
      }
    }
  });

  it('uses correct habit labels', () => {
    expect(generateInsightDescription('meditation', 'submission_rate')).toContain('meditate');
    expect(generateInsightDescription('hydration', 'submission_rate')).toContain('stay hydrated');
    expect(generateInsightDescription('exercise', 'submission_rate')).toContain('exercise');
    expect(generateInsightDescription('sleep', 'submission_rate')).toContain('get enough sleep');
  });
});

describe('Causal Language Detection', () => {
  it('detects "because"', () => {
    expect(containsCausalLanguage('You submit more because you meditate')).toBe(true);
  });

  it('detects "causes"', () => {
    expect(containsCausalLanguage('Meditation causes better grades')).toBe(true);
  });

  it('detects "due to"', () => {
    expect(containsCausalLanguage('Better scores due to exercise')).toBe(true);
  });

  it('detects "results in"', () => {
    expect(containsCausalLanguage('Exercise results in better focus')).toBe(true);
  });

  it('detects "leads to"', () => {
    expect(containsCausalLanguage('Sleep leads to better performance')).toBe(true);
  });

  it('allows non-causal language', () => {
    expect(containsCausalLanguage('On days when you meditate, you tend to submit more')).toBe(false);
    expect(containsCausalLanguage("You're more likely to submit on time")).toBe(false);
    expect(containsCausalLanguage('Your activity level tends to be higher')).toBe(false);
  });
});

describe('14-Day Minimum Data Threshold', () => {
  it('returns false when fewer than 14 days', () => {
    const dates = new Set(generateDates('2025-01-01', 13));
    expect(hasMinimumData(dates)).toBe(false);
  });

  it('returns true when exactly 14 days', () => {
    const dates = new Set(generateDates('2025-01-01', 14));
    expect(hasMinimumData(dates)).toBe(true);
  });

  it('returns true when more than 14 days', () => {
    const dates = new Set(generateDates('2025-01-01', 30));
    expect(hasMinimumData(dates)).toBe(true);
  });

  it('returns false for empty set', () => {
    expect(hasMinimumData(new Set())).toBe(false);
  });

  it('supports custom minimum threshold', () => {
    const dates = new Set(generateDates('2025-01-01', 20));
    expect(hasMinimumData(dates, 30)).toBe(false);
    expect(hasMinimumData(dates, 20)).toBe(true);
  });
});

describe('Correlation Insights Computation', () => {
  it('returns empty array when no correlations exceed threshold', () => {
    const habitDatesByType = new Map<string, Set<string>>();
    habitDatesByType.set('meditation', new Set(['2025-01-01']));
    const submissionDates = new Set(['2025-01-02']);
    const allDates = new Set(['2025-01-01', '2025-01-02']);

    const insights = computeCorrelationInsights(habitDatesByType, submissionDates, allDates);
    expect(insights).toHaveLength(0);
  });

  it('returns insights sorted by strength descending', () => {
    const allDates = new Set(generateDates('2025-01-01', 20));
    const meditationDates = new Set(generateDates('2025-01-01', 10));
    const exerciseDates = new Set(generateDates('2025-01-01', 5));

    // Submissions co-occur more with meditation than exercise
    const submissionDates = new Set(generateDates('2025-01-01', 10));

    const habitDatesByType = new Map<string, Set<string>>();
    habitDatesByType.set('meditation', meditationDates);
    habitDatesByType.set('exercise', exerciseDates);

    const insights = computeCorrelationInsights(habitDatesByType, submissionDates, allDates);

    if (insights.length > 1) {
      for (let i = 1; i < insights.length; i++) {
        expect(insights[i]!.strength).toBeLessThanOrEqual(insights[i - 1]!.strength);
      }
    }
  });

  it('returns at most 3 insights', () => {
    const allDates = new Set(generateDates('2025-01-01', 30));
    const submissionDates = new Set(generateDates('2025-01-01', 15));

    const habitDatesByType = new Map<string, Set<string>>();
    // Create 5 habit types that all correlate with submissions
    const types = ['meditation', 'hydration', 'exercise', 'sleep', 'login'];
    for (const type of types) {
      habitDatesByType.set(type, new Set(generateDates('2025-01-01', 15)));
    }

    const insights = computeCorrelationInsights(habitDatesByType, submissionDates, allDates);
    expect(insights.length).toBeLessThanOrEqual(3);
  });

  it('each insight has required fields', () => {
    const allDates = new Set(generateDates('2025-01-01', 20));
    const habitDatesByType = new Map<string, Set<string>>();
    habitDatesByType.set('meditation', new Set(generateDates('2025-01-01', 10)));
    const submissionDates = new Set(generateDates('2025-01-01', 10));

    const insights = computeCorrelationInsights(habitDatesByType, submissionDates, allDates);

    for (const insight of insights) {
      expect(insight.id).toBeDefined();
      expect(typeof insight.id).toBe('string');
      expect(insight.habitType).toBeDefined();
      expect(insight.academicMetric).toBeDefined();
      expect(insight.description).toBeDefined();
      expect(typeof insight.strength).toBe('number');
      expect(insight.strength).toBeGreaterThanOrEqual(0);
      expect(insight.strength).toBeLessThanOrEqual(1);
    }
  });

  it('insight descriptions use non-causal language', () => {
    const allDates = new Set(generateDates('2025-01-01', 20));
    const habitDatesByType = new Map<string, Set<string>>();
    habitDatesByType.set('meditation', new Set(generateDates('2025-01-01', 10)));
    const submissionDates = new Set(generateDates('2025-01-01', 10));

    const insights = computeCorrelationInsights(habitDatesByType, submissionDates, allDates);

    for (const insight of insights) {
      expect(containsCausalLanguage(insight.description)).toBe(false);
    }
  });

  it('handles empty habit data', () => {
    const habitDatesByType = new Map<string, Set<string>>();
    const submissionDates = new Set<string>();
    const allDates = new Set<string>();

    const insights = computeCorrelationInsights(habitDatesByType, submissionDates, allDates);
    expect(insights).toHaveLength(0);
  });

  it('handles no submissions', () => {
    const allDates = new Set(generateDates('2025-01-01', 20));
    const habitDatesByType = new Map<string, Set<string>>();
    habitDatesByType.set('meditation', new Set(generateDates('2025-01-01', 10)));
    const submissionDates = new Set<string>();

    const insights = computeCorrelationInsights(habitDatesByType, submissionDates, allDates);
    expect(insights).toHaveLength(0);
  });
});
