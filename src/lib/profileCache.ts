import type { Profile, UserRole } from "@/types/app";

// =============================================================================
// Shell-first profile cache (Option J, Phase 0)
// =============================================================================
//
// Purpose: let the app shell + route render instantly on reload by hydrating
// the user's profile from localStorage, instead of blocking first paint on a
// `profiles` SELECT (the verified "blank spinner on open" root cause).
//
// SECURITY MODEL — read this before changing anything:
//   - This cache is NON-AUTHORITATIVE. It only pre-fills UI state (name, role,
//     institution) so the router can resolve a dashboard immediately. Row Level
//     Security remains the sole source of truth server-side; a stale or tampered
//     cache can at most render the wrong shell for one paint, never grant data
//     access, because every query still authorizes against the live JWT + RLS.
//   - It is IDENTITY-GUARDED: a cached profile is only ever returned for the
//     exact user id that owns it (cross-user no-leak). A single storage key is
//     used and overwritten per user, and it is cleared on sign-out.
//   - It stores the profile row only — never auth tokens or secrets.
// =============================================================================

const STORAGE_KEY = "edeviser.auth.profile.v1";

/**
 * A cached profile is treated as "fresh" within this window. A reload inside it
 * skips the background revalidation entirely, which is what collapses the
 * just-signed-in double profile fetch (signIn fetches + seeds the cache, then
 * the SIGNED_IN event hydrates from that fresh cache instead of refetching).
 */
export const PROFILE_CACHE_FRESH_MS = 30_000;

interface CachedProfileEnvelope {
  userId: string;
  profile: Profile;
  cachedAt: number;
}

const VALID_ROLES: readonly UserRole[] = [
  "admin",
  "coordinator",
  "teacher",
  "student",
  "parent",
];

const isBrowser = (): boolean =>
  typeof window !== "undefined" && typeof window.localStorage !== "undefined";

/**
 * Validates the stored envelope AND enforces the identity guard: the cached
 * profile must belong to `expectedUserId`. This is the cross-user no-leak
 * invariant — user B can never hydrate user A's cached profile.
 */
const isValidEnvelope = (
  value: unknown,
  expectedUserId: string
): value is CachedProfileEnvelope => {
  if (typeof value !== "object" || value === null) return false;
  const env = value as Record<string, unknown>;
  if (typeof env.userId !== "string" || typeof env.cachedAt !== "number") {
    return false;
  }
  if (env.userId !== expectedUserId) return false;

  const profile = env.profile as Partial<Profile> | undefined;
  if (!profile || typeof profile !== "object") return false;
  if (profile.id !== expectedUserId) return false;
  if (!VALID_ROLES.includes(profile.role as UserRole)) return false;

  return true;
};

/**
 * Returns the cached profile for `userId` (with its cache timestamp), or null on
 * miss / mismatch / parse error. A foreign or malformed entry is proactively
 * removed so it can never linger on the device.
 */
export const readCachedProfile = (
  userId: string
): { profile: Profile; cachedAt: number } | null => {
  if (!isBrowser() || !userId) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (!isValidEnvelope(parsed, userId)) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return { profile: parsed.profile, cachedAt: parsed.cachedAt };
  } catch {
    return null;
  }
};

/**
 * Persists `profile` for `userId`. No-ops if the profile's id does not match the
 * user id (defensive: never cache a profile under the wrong identity).
 */
export const writeCachedProfile = (userId: string, profile: Profile): void => {
  if (!isBrowser() || !userId || profile.id !== userId) return;
  try {
    const envelope: CachedProfileEnvelope = {
      userId,
      profile,
      cachedAt: Date.now(),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
  } catch {
    // Non-fatal: a full or blocked localStorage must never break auth.
  }
};

/** Removes the cached profile. Called on sign-out and on any unauthenticated load. */
export const clearCachedProfile = (): void => {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
};

/** True if a cache entry captured at `cachedAt` is still within the fresh window. */
export const isProfileFresh = (cachedAt: number): boolean =>
  Date.now() - cachedAt < PROFILE_CACHE_FRESH_MS;
