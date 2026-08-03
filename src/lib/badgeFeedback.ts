import { getBadgeById } from "@/lib/badgeDefinitions";

export const BADGE_FEEDBACK_EVENT = "edeviser:badge-feedback";

export interface BadgeFeedbackDetail {
  id: string;
  name: string;
  description: string;
  icon: string;
  isMystery: boolean;
  xpReward: number;
}

/**
 * Publishes celebrations only for badge keys returned by the real
 * check-badges response. Unknown institution-specific keys stay silent until
 * their display metadata is available.
 */
export const emitBadgeFeedback = (badgeIds: readonly string[]): void => {
  if (typeof window === "undefined") return;

  for (const badgeId of badgeIds) {
    const badge = getBadgeById(badgeId);
    if (!badge) continue;

    const detail: BadgeFeedbackDetail = {
      id: badge.id,
      name: badge.name,
      description: badge.description,
      icon: badge.icon,
      isMystery: badge.isMystery,
      xpReward: badge.xpReward,
    };
    window.dispatchEvent(
      new CustomEvent<BadgeFeedbackDetail>(BADGE_FEEDBACK_EVENT, { detail })
    );
  }
};
