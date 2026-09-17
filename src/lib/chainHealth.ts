// Chain-health monitoring for the canonical Edeviser data pipeline.
// Detects broken links in: grade → evidence → attainment → learner state.
// Captures PostHog events for each link status.

import { captureAnalyticsEvent } from "./analyticsConsent";
import { AnalyticsEvents } from "./analyticsEvents";

// ─── Chain Link Definitions ─────────────────────────────────────────
export interface ChainLink {
  name: string;
  upstream: string; // event name that triggers this link
  downstream: string; // event name expected to follow
  maxDelayMs: number; // max acceptable delay between upstream and downstream
}

export const CANONICAL_CHAIN: readonly ChainLink[] = [
  {
    name: "grade_to_evidence",
    upstream: AnalyticsEvents.GRADE_SUBMITTED,
    downstream: AnalyticsEvents.EVIDENCE_CREATED,
    maxDelayMs: 30_000, // 30 seconds for trigger to fire
  },
  {
    name: "evidence_to_attainment",
    upstream: AnalyticsEvents.EVIDENCE_CREATED,
    downstream: AnalyticsEvents.ATTAINMENT_UPDATED,
    maxDelayMs: 30_000,
  },
  {
    name: "submission_to_grade",
    upstream: AnalyticsEvents.ASSIGNMENT_SUBMITTED,
    downstream: AnalyticsEvents.GRADE_SUBMITTED,
    maxDelayMs: 7 * 86_400_000, // 7 days (teacher grading delay)
  },
  {
    name: "quiz_to_grade",
    upstream: AnalyticsEvents.QUIZ_SUBMITTED,
    downstream: AnalyticsEvents.GRADE_SUBMITTED,
    maxDelayMs: 60_000, // auto-grading
  },
] as const;

// ─── Learning Loop Definition ───────────────────────────────────────
// A Verified Learning Loop requires ALL of:
// 1. Outcome context exists (CLO mapped)
// 2. Learning activity completed (submission or quiz)
// 3. Evidence generated (grade → evidence trigger)
// 4. Measurement/attainment updated

export interface LearningLoopCriteria {
  hasOutcomeContext: boolean;
  hasActivity: boolean;
  hasEvidence: boolean;
  hasAttainment: boolean;
}

export const isVerifiedLearningLoop = (
  criteria: LearningLoopCriteria
): boolean => {
  return (
    criteria.hasOutcomeContext &&
    criteria.hasActivity &&
    criteria.hasEvidence &&
    criteria.hasAttainment
  );
};

// ─── Chain Health Reporter ──────────────────────────────────────────
interface ChainState {
  lastUpstream: number;
  lastDownstream: number;
  pending: boolean;
}

const chainStates = new Map<string, ChainState>();

export const recordChainEvent = (
  linkName: string,
  direction: "upstream" | "downstream",
  contextId: string // submission_id, grade_id, etc.
): void => {
  const key = `${linkName}:${contextId}`;
  let state = chainStates.get(key);

  if (!state) {
    state = { lastUpstream: 0, lastDownstream: 0, pending: false };
    chainStates.set(key, state);
  }

  const now = Date.now();

  if (direction === "upstream") {
    state.lastUpstream = now;
    state.pending = true;
  } else {
    state.lastDownstream = now;
    if (state.pending && state.lastUpstream > 0) {
      const delay = now - state.lastUpstream;
      const link = CANONICAL_CHAIN.find((l) => l.name === linkName);
      const healthy = link ? delay <= link.maxDelayMs : true;

      captureAnalyticsEvent(
        healthy
          ? AnalyticsEvents.CHAIN_LINK_HEALTHY
          : AnalyticsEvents.CHAIN_LINK_BROKEN,
        {
          link_name: linkName,
          context_id: contextId,
          delay_ms: delay,
          max_delay_ms: link?.maxDelayMs ?? 0,
        }
      );

      state.pending = false;
    }
  }

  // Cleanup old states (keep map bounded)
  if (chainStates.size > 1000) {
    const cutoff = now - 3600000; // 1 hour
    for (const [k, v] of chainStates) {
      if (Math.max(v.lastUpstream, v.lastDownstream) < cutoff) {
        chainStates.delete(k);
      }
    }
  }
};

// ─── Teacher Adoption Funnel ────────────────────────────────────────
export const TEACHER_ADOPTION_STEPS = [
  "teacher_onboarding_started",
  "teacher_onboarding_completed",
  "teacher_first_course",
  "teacher_first_grade",
  "teacher_returned",
] as const;

export const STUDENT_ACTIVATION_STEPS = [
  "onboarding_completed",
  "course_joined",
  "assignment_submitted",
  "student_returned",
] as const;

// ─── Verified Learning Loop Counter ─────────────────────────────────
// Tracks how many complete learning loops have been observed
let verifiedLoopCount = 0;

export const recordLearningLoop = (criteria: LearningLoopCriteria): void => {
  if (isVerifiedLearningLoop(criteria)) {
    verifiedLoopCount++;
    captureAnalyticsEvent("verified_learning_loop", {
      loop_number: verifiedLoopCount,
      has_outcome: criteria.hasOutcomeContext,
      has_activity: criteria.hasActivity,
      has_evidence: criteria.hasEvidence,
      has_attainment: criteria.hasAttainment,
    });
  }
};