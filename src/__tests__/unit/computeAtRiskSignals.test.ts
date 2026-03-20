import { describe, it, expect } from 'vitest';

// ─── Extract pure helpers from the Edge Function for testing ────────────────
// We replicate the pure functions here since Edge Functions use Deno imports.

function computeAttainmentTrend(
  records: Array<{ attainment_percent: number; last_calculated_at: string }>,
): 'improving' | 'declining' | 'stagnant' {
  if (records.length < 2) return 'stagnant';

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000).toISOString();
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 86_400_000).toISOString();

  const recent = records.filter((r) => r.last_calculated_at >= thirtyDaysAgo);
  const older = records.filter(
    (r) => r.last_calculated_at >= sixtyDaysAgo && r.last_calculated_at < thirtyDaysAgo,
  );

  if (recent.length === 0 || older.length === 0) return 'stagnant';

  const avgRecent = recent.reduce((s, r) => s + r.attainment_percent, 0) / recent.length;
  const avgOlder = older.reduce((s, r) => s + r.attainment_percent, 0) / older.length;

  const delta = avgRecent - avgOlder;
  if (delta > 3) return 'improving';
  if (delta < -3) return 'declining';
  return 'stagnant';
}

function computeSubmissionPattern(
  submissions: Array<{ submitted_at: string; is_late: boolean }>,
  totalAssignments: number,
): 'early' | 'on_time' | 'late' | 'missed' {
  if (totalAssignments === 0) return 'on_time';
  if (submissions.length === 0) return 'missed';

  const submissionRate = submissions.length / totalAssignments;
  if (submissionRate < 0.5) return 'missed';

  const lateCount = submissions.filter((s) => s.is_late).length;
  const lateRatio = lateCount / submissions.length;

  if (lateRatio > 0.5) return 'late';
  if (lateRatio < 0.1) return 'early';
  return 'on_time';
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('computeAttainmentTrend', () => {
  const now = new Date();
  const daysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000).toISOString();

  it('returns stagnant for fewer than 2 records', () => {
    expect(computeAttainmentTrend([])).toBe('stagnant');
    expect(
      computeAttainmentTrend([{ attainment_percent: 80, last_calculated_at: daysAgo(5) }]),
    ).toBe('stagnant');
  });

  it('returns improving when recent average is significantly higher', () => {
    const records = [
      { attainment_percent: 60, last_calculated_at: daysAgo(45) },
      { attainment_percent: 62, last_calculated_at: daysAgo(40) },
      { attainment_percent: 75, last_calculated_at: daysAgo(10) },
      { attainment_percent: 80, last_calculated_at: daysAgo(5) },
    ];
    expect(computeAttainmentTrend(records)).toBe('improving');
  });

  it('returns declining when recent average is significantly lower', () => {
    const records = [
      { attainment_percent: 85, last_calculated_at: daysAgo(45) },
      { attainment_percent: 80, last_calculated_at: daysAgo(40) },
      { attainment_percent: 60, last_calculated_at: daysAgo(10) },
      { attainment_percent: 55, last_calculated_at: daysAgo(5) },
    ];
    expect(computeAttainmentTrend(records)).toBe('declining');
  });

  it('returns stagnant when delta is within ±3', () => {
    const records = [
      { attainment_percent: 70, last_calculated_at: daysAgo(45) },
      { attainment_percent: 72, last_calculated_at: daysAgo(40) },
      { attainment_percent: 72, last_calculated_at: daysAgo(10) },
      { attainment_percent: 73, last_calculated_at: daysAgo(5) },
    ];
    expect(computeAttainmentTrend(records)).toBe('stagnant');
  });

  it('returns stagnant when all records are in the same window', () => {
    const records = [
      { attainment_percent: 50, last_calculated_at: daysAgo(5) },
      { attainment_percent: 90, last_calculated_at: daysAgo(3) },
    ];
    expect(computeAttainmentTrend(records)).toBe('stagnant');
  });
});

describe('computeSubmissionPattern', () => {
  it('returns on_time when there are no assignments', () => {
    expect(computeSubmissionPattern([], 0)).toBe('on_time');
  });

  it('returns missed when there are no submissions but assignments exist', () => {
    expect(computeSubmissionPattern([], 5)).toBe('missed');
  });

  it('returns missed when submission rate is below 50%', () => {
    const submissions = [
      { submitted_at: '2024-01-01', is_late: false },
      { submitted_at: '2024-01-02', is_late: false },
    ];
    expect(computeSubmissionPattern(submissions, 10)).toBe('missed');
  });

  it('returns late when more than 50% of submissions are late', () => {
    const submissions = [
      { submitted_at: '2024-01-01', is_late: true },
      { submitted_at: '2024-01-02', is_late: true },
      { submitted_at: '2024-01-03', is_late: true },
      { submitted_at: '2024-01-04', is_late: false },
    ];
    expect(computeSubmissionPattern(submissions, 5)).toBe('late');
  });

  it('returns early when less than 10% of submissions are late', () => {
    const submissions = [
      { submitted_at: '2024-01-01', is_late: false },
      { submitted_at: '2024-01-02', is_late: false },
      { submitted_at: '2024-01-03', is_late: false },
      { submitted_at: '2024-01-04', is_late: false },
      { submitted_at: '2024-01-05', is_late: false },
    ];
    expect(computeSubmissionPattern(submissions, 5)).toBe('early');
  });

  it('returns on_time for moderate late ratio', () => {
    const submissions = [
      { submitted_at: '2024-01-01', is_late: false },
      { submitted_at: '2024-01-02', is_late: false },
      { submitted_at: '2024-01-03', is_late: true },
      { submitted_at: '2024-01-04', is_late: false },
    ];
    expect(computeSubmissionPattern(submissions, 5)).toBe('on_time');
  });
});
