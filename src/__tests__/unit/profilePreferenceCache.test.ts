import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { patchCachedProfilePreference, readCachedProfile, isProfileFresh, PROFILE_CACHE_FRESH_MS } from "@/lib/profileCache";
import { createProfilePreferenceSync } from "@/lib/profilePreferenceSync";
import type { Profile } from "@/types/app";

const key = "edeviser.auth.profile.v1";
const profile = (id = "alice", language = "en"): Profile => ({
  id, email: `${id}@example.test`, full_name: id, role: "admin", institution_id: "tenant-one",
  avatar_url: null, is_active: true, onboarding_completed: true, portfolio_public: false,
  theme_preference: "light", preferred_language: language, language_preference: "en",
  notification_preferences: { preserved: true }, last_seen_at: null, tos_accepted_at: null,
  tour_completed_at: null, status: "active", created_at: "2026-01-01T00:00:00Z",
});
const seed = (id = "alice", cachedAt = Date.now()) => {
  const envelope = { userId: id, profile: profile(id), cachedAt, extraMetadata: "preserve" };
  localStorage.setItem(key, JSON.stringify(envelope));
  return envelope;
};

beforeEach(() => { localStorage.clear(); });
afterEach(() => { vi.restoreAllMocks(); localStorage.clear(); });

describe("matching-owner cached preference patch", () => {
  it("changes only supported leaves without refreshing timestamp or other metadata", () => {
    const before = seed("alice", Date.now() - 20_000);
    const patch = { preferred_language: "ar" as const, role: "student", institution_id: "other-tenant" };
    expect(patchCachedProfilePreference("alice", patch)).toBe(true);
    expect(JSON.parse(localStorage.getItem(key)!)).toEqual({
      ...before, profile: { ...before.profile, preferred_language: "ar" },
    });
  });

  it("preserves stale status instead of extending the TTL", () => {
    const before = seed("alice", Date.now() - PROFILE_CACHE_FRESH_MS - 1);
    patchCachedProfilePreference("alice", { theme_preference: "dark" });
    expect(readCachedProfile("alice")?.cachedAt).toBe(before.cachedAt);
    expect(isProfileFresh(before.cachedAt)).toBe(false);
    expect(readCachedProfile("alice")?.profile).toEqual({ ...before.profile, theme_preference: "dark" });
  });

  it.each([
    "{broken",
    JSON.stringify({ userId: "bob", profile: profile("bob"), cachedAt: 10 }),
    JSON.stringify({ userId: "alice", profile: profile("bob"), cachedAt: 10 }),
    JSON.stringify({ userId: "alice", profile: profile(), cachedAt: "invalid" }),
  ])("does not clear or modify foreign/malformed bytes: %s", (raw) => {
    localStorage.setItem(key, raw);
    expect(patchCachedProfilePreference("alice", { preferred_language: "ar" })).toBe(false);
    expect(localStorage.getItem(key)).toBe(raw);
  });

  it("never creates an incomplete profile when no cache exists", () => {
    expect(patchCachedProfilePreference("alice", { preferred_language: "ar" })).toBe(false);
    expect(localStorage.getItem(key)).toBeNull();
  });

  it("treats a blocked localStorage getter as a nonfatal cache miss", () => {
    const original = Object.getOwnPropertyDescriptor(window, "localStorage");
    if (!original) throw new Error("Missing browser storage descriptor");
    Object.defineProperty(window, "localStorage", { configurable: true, get: () => { throw new DOMException("Storage blocked", "SecurityError"); } });
    try {
      expect(patchCachedProfilePreference("alice", { preferred_language: "ar" })).toBe(false);
    } finally {
      Object.defineProperty(window, "localStorage", original);
    }
  });

  it("treats storage failures as nonfatal cache misses", () => {
    seed();
    vi.spyOn(localStorage, "setItem").mockImplementation(() => { throw new Error("quota"); });
    expect(patchCachedProfilePreference("alice", { preferred_language: "ar" })).toBe(false);
  });
});

describe("request-scoped confirmed preference reconciliation", () => {
  it("merges only writes confirmed after a read began, while preserving returned metadata", () => {
    seed();
    const sync = createProfilePreferenceSync(vi.fn());
    const token = sync.setOwner("alice");
    const beforeLanguage = sync.beginRead("alice");
    sync.confirm(token, { preferred_language: "ar" });
    const afterLanguage = sync.beginRead("alice");
    sync.confirm(token, { theme_preference: "dark" });
    const response = { ...profile(), full_name: "fresh name", institution_id: "fresh tenant" };
    expect(sync.reconcile(sync.trackRead(response, beforeLanguage)!)).toEqual({
      ...response, preferred_language: "ar", theme_preference: "dark",
    });
    const later = { ...response };
    expect(sync.reconcile(sync.trackRead(later, afterLanguage)!)).toEqual({ ...later, theme_preference: "dark" });
  });

  it("keeps later-started server preference values authoritative", () => {
    const sync = createProfilePreferenceSync(vi.fn());
    const token = sync.setOwner("alice");
    sync.confirm(token, { preferred_language: "ar" });
    const snapshot = sync.beginRead("alice");
    const response = profile("alice", "en");
    expect(sync.reconcile(sync.trackRead(response, snapshot)!)).toEqual(response);
  });

  it.each(["switch", "same-user-return", "unmount"])("rejects old lifecycle success and old reads after %s", (transition) => {
    const onConfirmed = vi.fn();
    const sync = createProfilePreferenceSync(onConfirmed);
    const old = sync.setOwner("alice");
    const pending = sync.beginRead("alice");
    sync.setOwner(transition === "unmount" ? null : "bob");
    if (transition === "same-user-return") sync.setOwner("alice");
    const bytes = JSON.stringify(seed(transition === "same-user-return" ? "alice" : "bob"));
    sync.confirm(old, { preferred_language: "ar" });
    expect(onConfirmed).not.toHaveBeenCalled();
    expect(localStorage.getItem(key)).toBe(bytes);
    expect(sync.reconcile(sync.trackRead(profile(), pending)!)).toBeUndefined();
  });

  it("rechecks exact ownership when a deferred React state updater executes", () => {
    let stillCurrent: (() => boolean) | undefined;
    const sync = createProfilePreferenceSync((_owner, _patch, guard) => { stillCurrent = guard; });
    const token = sync.setOwner("alice");
    sync.confirm(token, { preferred_language: "ar" });
    expect(stillCurrent?.()).toBe(true);
    sync.setOwner(null);
    sync.setOwner("alice");
    expect(stillCurrent?.()).toBe(false);
  });
});
