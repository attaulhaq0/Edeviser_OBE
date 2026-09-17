// =============================================================================
// habitSignalEngine.ts — Structured Habit Signal Computation (Phase 15)
// Replaces free-form JSON blobs in student_learning_states.habits
// Every signal: structured, time-windowed, cited, confidence-rated
// =============================================================================

import type { LearnerDimension } from "./habitBehaviorModel";

export interface HabitSignal {
  id: string;
  studentId: string;
  behaviorId: string;
  dimension: LearnerDimension;
  window: { start: string; end: string };
  value: number; // [0, 1] normalized
  source: "observed" | "inferred" | "configured";
  confidence: number; // [0, 1]
  generatedAt: string;
  evidenceReferences: string[];
  metadata?: Record<string, unknown>;
}

export type SignalName =
  | "consistency" | "completion_rate" | "delay_pattern" | "recovery"
  | "goal_follow_through" | "engagement_frequency" | "session_regularization"
  | "reflection_depth" | "help_seeking" | "challenge_seeking";

/** Compute consistency: ratio of days with any habit activity to total days in window */
export function computeConsistency(habitDays: Set<string>, windowDays: number): { value: number; confidence: number } {
  if (windowDays <= 0) return { value: 0, confidence: 0 };
  return { value: Math.min(1, habitDays.size / windowDays), confidence: windowDays >= 7 ? 0.9 : 0.6 };
}

/** Compute completion rate: ratio of completed to total assigned */
export function computeCompletionRate(completed: number, totalAssigned: number): { value: number; confidence: number } {
  if (totalAssigned <= 0) return { value: 0, confidence: 0 };
  return { value: Math.min(1, completed / totalAssigned), confidence: totalAssigned >= 3 ? 0.9 : 0.5 };
}

/** Compute delay pattern: average days between assignment and submission, inverted so low delay = high signal */
export function computeDelayPattern(avgDelayDays: number, maxAcceptableDelay: number = 7): { value: number; confidence: number } {
  if (avgDelayDays <= 0) return { value: 1, confidence: 0.7 };
  return { value: Math.max(0, 1 - avgDelayDays / maxAcceptableDelay), confidence: 0.8 };
}

/** Compute recovery: whether student has resumed after a break/failure */
export function computeRecovery(daysSinceLastActivity: number, hasResumed: boolean): { value: number; confidence: number } {
  if (!hasResumed) return { value: 0, confidence: 0.9 };
  if (daysSinceLastActivity <= 1) return { value: 1, confidence: 0.8 };
  return { value: Math.max(0, 1 - daysSinceLastActivity / 14), confidence: 0.7 };
}

/** Compute goal follow-through: ratio of completed goals to set goals */
export function computeGoalFollowThrough(goalsSet: number, goalsCompleted: number): { value: number; confidence: number } {
  if (goalsSet <= 0) return { value: 0, confidence: 0 };
  return { value: Math.min(1, goalsCompleted / goalsSet), confidence: goalsSet >= 2 ? 0.8 : 0.4 };
}

/** Compute engagement frequency: sessions per week */
export function computeEngagementFrequency(sessionsPerWeek: number, targetPerWeek: number = 5): { value: number; confidence: number } {
  return { value: Math.min(1, sessionsPerWeek / targetPerWeek), confidence: 0.85 };
}

/** Compute session regularization: how consistent the time-of-day pattern is */
export function computeSessionRegularization(timeStdDevMinutes: number): { value: number; confidence: number } {
  if (timeStdDevMinutes <= 30) return { value: 1, confidence: 0.8 };
  if (timeStdDevMinutes <= 60) return { value: 0.7, confidence: 0.7 };
  return { value: Math.max(0, 1 - timeStdDevMinutes / 240), confidence: 0.6 };
}

/** Main signal computation entry point */
export function computeSignal(name: SignalName, params: Record<string, number>): { value: number; confidence: number } {
  switch (name) {
    case "consistency": return computeConsistency(new Set(), params.windowDays ?? 7);
    case "completion_rate": return computeCompletionRate(params.completed ?? 0, params.totalAssigned ?? 0);
    case "delay_pattern": return computeDelayPattern(params.avgDelayDays ?? 0);
    case "recovery": return computeRecovery(params.daysSinceLastActivity ?? 0, (params.hasResumed ?? 0) === 1);
    case "goal_follow_through": return computeGoalFollowThrough(params.goalsSet ?? 0, params.goalsCompleted ?? 0);
    case "engagement_frequency": return computeEngagementFrequency(params.sessionsPerWeek ?? 0);
    case "session_regularization": return computeSessionRegularization(params.timeStdDev ?? 60);
    default: return { value: 0, confidence: 0 };
  }
}

/** Merge OBE attainment and habit signals into a fused learner risk assessment */
export function fuseSignals(attainmentPct: number, consistencyValue: number, completionValue: number): {
  riskLevel: "low" | "moderate" | "high";
  primaryDriver: "academic" | "behavioral" | "combined";
  description: string;
} {
  const weakAttainment = attainmentPct < 50;
  const weakHabits = consistencyValue < 0.4 || completionValue < 0.4;
  const strongHabits = consistencyValue > 0.7 && completionValue > 0.7;

  if (weakAttainment && weakHabits) {
    return { riskLevel: "high", primaryDriver: "combined", description: "Weak mastery + declining habits — combined academic and behavioral risk" };
  }
  if (weakAttainment && strongHabits) {
    return { riskLevel: "moderate", primaryDriver: "academic", description: "Weak mastery + strong habits — academic support needed" };
  }
  if (!weakAttainment && weakHabits) {
    return { riskLevel: "moderate", primaryDriver: "behavioral", description: "Adequate mastery + declining habits — monitor and re-engage" };
  }
  return { riskLevel: "low", primaryDriver: "academic", description: "Strong mastery + strong habits — no immediate risk" };
}