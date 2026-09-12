/**
 * v2 — Behavioral correlation engine.
 * Detects patterns linking habit/behavior data with attainment signals.
 * Pure, deterministic: outputs BehaviorPattern only when evidence thresholds
 * are met. Never claims causality — only association.
 */
import type { BehaviorPattern } from "./learner-signals.ts";

export interface HabitObservation {
  habitType: string;
  observedAt: string;
  value?: number;
}
export interface AttainmentSnapshot {
  outcomeId: string;
  percent: number;
  observedAt: string;
}

export interface CorrelationInput {
  habits: readonly HabitObservation[];
  attainment: readonly AttainmentSnapshot[];
  windowDays: number;
  minObservations: number;
  frameworkDimension?: string;
}

const DAY_MS = 86_400_000;

export const detectBehavioralPattern = (
  input: CorrelationInput
): BehaviorPattern | null => {
  const {
    habits,
    attainment,
    windowDays,
    minObservations,
    frameworkDimension,
  } = input;
  if (habits.length < minObservations || attainment.length < minObservations)
    return null;

  const now = Date.now();
  const cutoff = now - windowDays * DAY_MS;
  const recentHabits = habits.filter(
    (h) => new Date(h.observedAt).getTime() >= cutoff
  );
  const recentAttainment = attainment.filter(
    (a) => new Date(a.observedAt).getTime() >= cutoff
  );
  if (
    recentHabits.length < minObservations ||
    recentAttainment.length < minObservations
  )
    return null;

  // Detect submission delay pattern
  const delayHabits = recentHabits.filter(
    (h) => h.habitType.includes("submission") || h.habitType.includes("delay")
  );
  const decliningAttainment =
    recentAttainment.length >= 2 &&
    recentAttainment[0]!.percent >
      recentAttainment[recentAttainment.length - 1]!.percent;

  const delayRatio = delayHabits.length / recentHabits.length;
  const hasSubmissionPattern =
    delayRatio >= 0.3 && recentHabits.length >= minObservations;

  // Detect self-management pattern (missed habits, irregular timing)
  const missedOrIrregular = recentHabits.filter(
    (h) => h.habitType.includes("missed") || h.habitType.includes("irregular")
  );
  const selfMgmtRatio = missedOrIrregular.length / recentHabits.length;
  const hasSelfMgmtPattern =
    selfMgmtRatio >= 0.25 && recentHabits.length >= minObservations;

  // Build the strongest pattern
  if (hasSubmissionPattern && decliningAttainment) {
    const confidence = Math.min(0.95, 0.5 + delayRatio * 0.5);
    return {
      patternType: "persistent_submission_with_declining_attainment",
      dimension: "self_management",
      frameworkDimension,
      observationWindow: {
        from: new Date(cutoff).toISOString(),
        to: new Date(now).toISOString(),
      },
      sampleSize: recentHabits.length,
      confidence: Math.round(confidence * 100) / 100,
      habitRefs: recentHabits.map((_, i) => `habit:${i}`),
      attainmentRefs: recentAttainment.map((a) => a.outcomeId),
      summary: `Persistent submission delays (${Math.round(
        delayRatio * 100
      )}% of ${
        recentHabits.length
      } observations) associated with declining attainment over ${windowDays} days.`,
    };
  }

  if (hasSelfMgmtPattern && decliningAttainment) {
    const confidence = Math.min(0.9, 0.4 + selfMgmtRatio * 0.5);
    return {
      patternType: "self_management_with_declining_attainment",
      dimension: "self_management",
      frameworkDimension,
      observationWindow: {
        from: new Date(cutoff).toISOString(),
        to: new Date(now).toISOString(),
      },
      sampleSize: recentHabits.length,
      confidence: Math.round(confidence * 100) / 100,
      habitRefs: recentHabits.map((_, i) => `habit:${i}`),
      attainmentRefs: recentAttainment.map((a) => a.outcomeId),
      summary: `Self-management pattern (${Math.round(
        selfMgmtRatio * 100
      )}% irregular/missed habits out of ${
        recentHabits.length
      }) associated with declining attainment over ${windowDays} days.`,
    };
  }

  if (hasSubmissionPattern) {
    return {
      patternType: "persistent_submission_delay",
      dimension: "self_management",
      frameworkDimension,
      observationWindow: {
        from: new Date(cutoff).toISOString(),
        to: new Date(now).toISOString(),
      },
      sampleSize: recentHabits.length,
      confidence: Math.round((0.4 + delayRatio * 0.3) * 100) / 100,
      habitRefs: recentHabits.map((_, i) => `habit:${i}`),
      attainmentRefs: [],
      summary: `Persistent submission delays (${Math.round(
        delayRatio * 100
      )}% of ${recentHabits.length} observations) over ${windowDays} days.`,
    };
  }

  return null;
};
