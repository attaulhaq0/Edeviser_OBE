import type { XPSource } from "@/types/app";

export const XP_FEEDBACK_EVENT = "edeviser:xp-feedback";

export interface XPFeedbackDetail {
  id: string;
  studentId: string;
  amount: number;
  source: XPSource;
  levelUp: boolean;
  newLevel: number;
  mysteryRewardTriggered: boolean;
}

interface EmitXPFeedbackInput {
  studentId: string;
  amount: number;
  source: XPSource;
  levelUp: boolean;
  newLevel: number;
  mysteryRewardTriggered?: boolean;
}

/**
 * Publishes visual feedback only after the backend confirms an XP award.
 * Duplicate/idempotent responses return zero XP and intentionally stay quiet.
 */
export const emitXPFeedback = ({
  studentId,
  amount,
  source,
  levelUp,
  newLevel,
  mysteryRewardTriggered = false,
}: EmitXPFeedbackInput): void => {
  if (typeof window === "undefined" || amount <= 0) return;

  const detail: XPFeedbackDetail = {
    id: `${Date.now()}-${crypto.randomUUID()}`,
    studentId,
    amount,
    source,
    levelUp,
    newLevel,
    mysteryRewardTriggered,
  };
  window.dispatchEvent(
    new CustomEvent<XPFeedbackDetail>(XP_FEEDBACK_EVENT, { detail })
  );
};
