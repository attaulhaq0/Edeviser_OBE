/** Five-minute profile activity hint, never a transport/presence connection. */
export const RECENT_ACTIVITY_WINDOW_MS = 5 * 60 * 1000;

export const hasRecentActivity = (
  lastSeenAt: string | null | undefined,
  nowMs: number = Date.now()
): boolean => {
  if (!lastSeenAt || !Number.isFinite(nowMs)) return false;
  const seen = Date.parse(lastSeenAt);
  if (!Number.isFinite(seen)) return false;
  const age = nowMs - seen;
  // Future clock skew is unknown, not evidence that someone is active.
  return age >= 0 && age < RECENT_ACTIVITY_WINDOW_MS;
};
