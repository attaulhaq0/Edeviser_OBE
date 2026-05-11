// Task 122.3: Declining trend detection utility

export interface SemesterTrendPoint {
  semester_id: string;
  semester_name: string;
  avg_attainment: number;
  student_count: number;
  evidence_count: number;
}

export interface TrendResult {
  outcome_id: string;
  points: SemesterTrendPoint[];
  isDeclining: boolean;
  declineAmount: number; // percentage points
}

/**
 * Detect ≥10 percentage point drop between consecutive semesters.
 */
export const detectDecliningTrend = (
  points: SemesterTrendPoint[]
): { isDeclining: boolean; declineAmount: number } => {
  if (points.length < 2) return { isDeclining: false, declineAmount: 0 };

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    if (!prev || !curr) continue;
    const drop = prev.avg_attainment - curr.avg_attainment;
    if (drop >= 10) {
      return { isDeclining: true, declineAmount: Math.round(drop * 10) / 10 };
    }
  }

  return { isDeclining: false, declineAmount: 0 };
};
