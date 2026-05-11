/**
 * Notification CTA resolver — maps notification type + role to a call-to-action.
 *
 * Pure function with no side effects; safe to call in render paths.
 *
 * Design: ADR-19
 * Requirements: 2.29
 */

import type { UserRole } from "@/types/app";
import type { NotificationType } from "@/hooks/useNotifications";

export interface NotificationCta {
  labelKey: string;
  route: string;
}

export interface NotificationWithMetadata {
  type: NotificationType;
  metadata: Record<string, unknown> | null;
}

/**
 * Resolve a CTA for a notification.
 *
 * Returns `null` when no CTA is applicable for the given type.
 *
 * @example
 * resolveNotificationCta({ type: 'grade_released', metadata: { submission_id: 'abc' } }, 'student')
 * // → { labelKey: 'notifications.cta.viewGrade', route: '/student/grades/abc' }
 */
export function resolveNotificationCta(
  n: NotificationWithMetadata,
  role: UserRole
): NotificationCta | null {
  const meta = n.metadata ?? {};

  switch (n.type) {
    case "grade_released":
      return {
        labelKey: "notifications.cta.viewGrade",
        route: `/${role}/grades/${meta.submission_id ?? ""}`,
      };
    case "new_assignment":
      return {
        labelKey: "notifications.cta.openAssignment",
        route: `/${role}/assignments/${meta.assignment_id ?? ""}`,
      };
    case "badge_earned":
      return {
        labelKey: "notifications.cta.viewBadge",
        route: `/student/gamification#badge-${meta.badge_id ?? ""}`,
      };
    case "streak_at_risk":
      return {
        labelKey: "notifications.cta.viewStreak",
        route: "/student/gamification",
      };
    case "at_risk_alert":
      return {
        labelKey: "notifications.cta.viewProgress",
        route: "/student/progress",
      };
    case "peer_milestone":
      return {
        labelKey: "notifications.cta.viewLeaderboard",
        route: "/student/leaderboard",
      };
    case "perfect_day_nudge":
      return {
        labelKey: "notifications.cta.viewHabits",
        route: "/student/habits",
      };
    case "prerequisite_unlocked":
      return {
        labelKey: "notifications.cta.viewAssignment",
        route: `/student/assignments/${meta.assignment_id ?? ""}`,
      };
    case "digest":
      return {
        labelKey: "notifications.cta.viewAll",
        route: `/${role}/notifications`,
      };
    default:
      return null;
  }
}
