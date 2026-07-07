// =============================================================================
// Per-user dashboard snapshot cache (Option J — SWR shell-first for KPIs)
// =============================================================================
//
// Stores the last-known student dashboard aggregate in localStorage so the KPI
// cards render INSTANTLY on repeat loads and hard refreshes (localStorage
// survives Ctrl+Shift+R), then the query revalidates in the background
// (stale-while-revalidate). This does NOT help a brand-new user's first-ever
// load (nothing cached yet) — that path is addressed by critical-first
// sequencing and the server-side snapshot read-model.
//
// SECURITY (cross-user no-leak): identical guarantee to profileCache. A single
// key is used and overwritten per user; a snapshot is ONLY ever returned for the
// exact user id that owns it, and it is cleared on sign-out. It stores derived
// dashboard numbers only — never auth tokens or secrets. RLS remains the source
// of truth; this is non-authoritative UI hydration.
// =============================================================================

const STORAGE_KEY = "edeviser.dashboard.student.v1";

/**
 * Snapshots older than this are ignored on read (and dropped). SWR still
 * revalidates anything fresher; this is just an upper bound so a device that
 * hasn't been used in a long time doesn't flash very old numbers.
 */
export const DASHBOARD_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24h

interface CachedDashboardEnvelope<T> {
  userId: string;
  data: T;
  cachedAt: number;
}

const isBrowser = (): boolean =>
  typeof window !== "undefined" && typeof window.localStorage !== "undefined";

/**
 * Returns the cached dashboard snapshot for `userId` (with its capture time), or
 * null on miss / foreign owner / too-old / parse error. A foreign or stale entry
 * is proactively removed so it can never linger on the device.
 */
export const readCachedDashboard = <T>(
  userId: string
): { data: T; cachedAt: number } | null => {
  if (!isBrowser() || !userId) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<CachedDashboardEnvelope<T>>;
    // Identity guard (cross-user no-leak): only return a snapshot to its owner.
    if (
      !parsed ||
      parsed.userId !== userId ||
      typeof parsed.cachedAt !== "number" ||
      parsed.data === undefined
    ) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    if (Date.now() - parsed.cachedAt > DASHBOARD_CACHE_MAX_AGE_MS) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return { data: parsed.data as T, cachedAt: parsed.cachedAt };
  } catch {
    return null;
  }
};

/** Persists `data` as the current user's dashboard snapshot. */
export const writeCachedDashboard = <T>(userId: string, data: T): void => {
  if (!isBrowser() || !userId) return;
  try {
    const envelope: CachedDashboardEnvelope<T> = {
      userId,
      data,
      cachedAt: Date.now(),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
  } catch {
    // Non-fatal: a full or blocked localStorage must never break the dashboard.
  }
};

/** Removes the cached dashboard snapshot. Called on sign-out / unauthenticated load. */
export const clearCachedDashboard = (): void => {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
};
