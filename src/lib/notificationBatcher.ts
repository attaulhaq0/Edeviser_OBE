// =============================================================================
// NotificationBatcher - Batching, rate limiting, and grouping for notifications
// Validates: Requirements 65.1, 65.2, 65.3
// =============================================================================

export const PEER_MILESTONE_BATCH_WINDOW_MS = 60 * 60 * 1000;
export const PEER_MILESTONE_DAILY_LIMIT = 5;
export const GROUPING_THRESHOLD = 3;

export interface NotificationRecord {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  is_read: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface BatchedNotification {
  type: string;
  title: string;
  body: string;
  count: number;
  is_grouped: boolean;
  items: NotificationRecord[];
}

export function countInWindow(
  notifications: NotificationRecord[],
  studentId: string,
  type: string,
  windowMs: number,
  referenceTime: Date = new Date()
): number {
  const cutoff = referenceTime.getTime() - windowMs;
  return notifications.filter(
    (n) =>
      n.user_id === studentId &&
      n.type === type &&
      new Date(n.created_at).getTime() >= cutoff
  ).length;
}

export function shouldBatch(
  notifications: NotificationRecord[],
  studentId: string,
  type: string,
  windowMs: number = PEER_MILESTONE_BATCH_WINDOW_MS,
  referenceTime: Date = new Date()
): boolean {
  if (type !== "peer_milestone") return false;
  return (
    countInWindow(notifications, studentId, type, windowMs, referenceTime) > 0
  );
}

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export function hasReachedDailyLimit(
  notifications: NotificationRecord[],
  studentId: string,
  referenceTime: Date = new Date()
): boolean {
  const count = countInWindow(
    notifications,
    studentId,
    "peer_milestone",
    TWENTY_FOUR_HOURS_MS,
    referenceTime
  );
  return count >= PEER_MILESTONE_DAILY_LIMIT;
}

export function canCreatePeerMilestone(
  notifications: NotificationRecord[],
  studentId: string,
  referenceTime: Date = new Date()
): boolean {
  return !hasReachedDailyLimit(notifications, studentId, referenceTime);
}

const TYPE_LABELS: Record<string, string> = {
  grade_released: "new grades released",
  new_assignment: "new assignments posted",
  badge_earned: "badges earned",
  streak_at_risk: "streak alerts",
  at_risk_alert: "at-risk alerts",
  peer_milestone: "classmate milestones",
  perfect_day_nudge: "perfect day nudges",
  prerequisite_unlocked: "prerequisites unlocked",
};

export function groupNotifications(
  notifications: NotificationRecord[]
): BatchedNotification[] {
  const byType = new Map<string, NotificationRecord[]>();
  for (const n of notifications) {
    const existing = byType.get(n.type) ?? [];
    existing.push(n);
    byType.set(n.type, existing);
  }

  const result: BatchedNotification[] = [];

  for (const [type, items] of byType) {
    if (items.length > GROUPING_THRESHOLD) {
      const label = TYPE_LABELS[type] ?? type + " notifications";
      result.push({
        type,
        title: items.length + " " + label,
        body: "You have " + items.length + " " + label,
        count: items.length,
        is_grouped: true,
        items: items.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ),
      });
    } else {
      for (const item of items) {
        result.push({
          type: item.type,
          title: item.title,
          body: item.body ?? "",
          count: 1,
          is_grouped: false,
          items: [item],
        });
      }
    }
  }

  return result.sort((a, b) => {
    const aFirst = a.items[0];
    const bFirst = b.items[0];
    if (!aFirst || !bFirst) return 0;
    return (
      new Date(bFirst.created_at).getTime() -
      new Date(aFirst.created_at).getTime()
    );
  });
}

export function createBatchedPeerMilestonePayload(
  studentId: string,
  milestoneDescriptions: string[]
): {
  user_id: string;
  type: string;
  title: string;
  body: string;
  is_read: boolean;
  metadata: Record<string, unknown>;
} {
  const count = milestoneDescriptions.length;
  const title =
    count === 1 ? "Classmate Milestone" : count + " Classmate Milestones";
  const body =
    count === 1
      ? milestoneDescriptions[0] ?? ""
      : count + " classmates achieved milestones recently!";

  return {
    user_id: studentId,
    type: "peer_milestone",
    title,
    body,
    is_read: false,
    metadata: {
      is_batched: true,
      milestone_count: count,
      descriptions: milestoneDescriptions,
    },
  };
}
