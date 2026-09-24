// Real AuthProvider + LanguageProvider + menu interactions. Only external
// Supabase/analytics effects are mocked; cache storage and i18n are real.
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nextProvider } from "react-i18next";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Profile } from "@/types/app";
import { StrictMode, useEffect } from "react";

const db = vi.hoisted(() => ({
  from: vi.fn(), profileFetch: vi.fn(), update: vi.fn(), writeEq: vi.fn(),
  getSession: vi.fn(), onAuthStateChange: vi.fn(),
  listener: null as ((event: AuthChangeEvent, session: Session | null) => void) | null,
}));
vi.mock("@/lib/supabase", () => ({ supabase: {
  from: db.from,
  auth: { getSession: db.getSession, onAuthStateChange: db.onAuthStateChange },
} }));
vi.mock("@/lib/analyticsConsent", () => ({
  hasAnalyticsConsent: () => false, identifyAnalyticsUser: vi.fn(),
  resetAnalyticsUser: vi.fn(), captureAnalyticsEvent: vi.fn(),
}));
vi.mock("@/lib/activityLogger", () => ({ logActivity: vi.fn() }));
vi.mock("@/lib/perfectDay", () => ({ awardPerfectDayIfComplete: vi.fn() }));

import { AuthProvider } from "@/providers/AuthProvider";
import { LanguageProvider, useLanguage } from "@/providers/LanguageProvider";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";
import { useAuth } from "@/hooks/useAuth";
import i18n from "@/lib/i18n";
import { PROFILE_CACHE_FRESH_MS, readCachedProfile, writeCachedProfile } from "@/lib/profileCache";

const user: User = {
  id: "alice", email: "alice@example.test", aud: "authenticated",
  app_metadata: {}, user_metadata: {}, created_at: "2026-01-01T00:00:00Z",
};
const session: Session = {
  user, access_token: "unit-token", refresh_token: "unit-refresh", expires_in: 3600, token_type: "bearer",
};
const profile = (patch: Partial<Profile> = {}): Profile => ({
  id: "alice", email: "alice@example.test", full_name: "initial profile", role: "admin",
  institution_id: "unit-institution", avatar_url: null, is_active: true,
  onboarding_completed: true, portfolio_public: false, theme_preference: "light",
  preferred_language: "en", language_preference: "en", notification_preferences: null,
  last_seen_at: null, tos_accepted_at: null, tour_completed_at: null,
  status: "active", created_at: "2026-01-01T00:00:00Z", ...patch,
});
const deferredProfile = () => {
  let resolve: (value: { data: Profile | null; error: null }) => void = () => { throw new Error("Promise not initialized"); };
  const promise = new Promise<{ data: Profile | null; error: null }>((done) => { resolve = done; });
  return { promise, resolve };
};
let client: QueryClient;
let latestLanguageSetter: ReturnType<typeof useLanguage>["setLanguage"] | undefined;
const Probe = () => {
  const language = useLanguage();
  const auth = useAuth();
  useEffect(() => { latestLanguageSetter = language.setLanguage; }, [language.setLanguage]);
  return <>
    <output aria-label="language context">{language.language}/{language.direction}</output>
    <output aria-label="profile revision">{auth.profile?.full_name ?? "loading"}</output>
    <output aria-label="profile owner">{auth.user?.id ?? "anonymous"}</output>
    <output aria-label="profile language">{auth.profile?.preferred_language ?? "unset"}</output>
    <output aria-label="auth loading">{String(auth.isLoading)}</output>
    <button onClick={() => { void auth.refetchProfile(); }}>Refresh profile fixture</button>
  </>;
};
const Harness = ({ languageKey = 0 }: { languageKey?: number }) => (
  <QueryClientProvider client={client}>
    <I18nextProvider i18n={i18n}>
      <AuthProvider><LanguageProvider key={languageKey}><LanguageSwitcher /><Probe /></LanguageProvider></AuthProvider>
    </I18nextProvider>
  </QueryClientProvider>
);
const mount = () => render(<Harness />);
const emit = async (event: AuthChangeEvent = "INITIAL_SESSION", nextSession: Session | null = session) => {
  await act(async () => {
    if (!db.listener) throw new Error("Auth subscription was not registered");
    db.listener(event, nextSession);
  });
};
const chooseArabic = async () => {
  const interaction = userEvent.setup();
  await interaction.click(screen.getByRole("button", { name: /^(Language|اللغة):/ }));
  await interaction.click(screen.getByRole("menuitem", { name: "العربية" }));
};
const assertLanguage = (language: "ar" | "en") => {
  const direction = language === "ar" ? "rtl" : "ltr";
  expect(screen.getByLabelText("language context")).toHaveTextContent(`${language}/${direction}`);
  expect(i18n.language).toBe(language);
  expect(localStorage.getItem("edeviser-language")).toBe(language);
  expect(document.documentElement).toHaveAttribute("dir", direction);
  expect(document.documentElement).toHaveAttribute("lang", language);
  expect(screen.getByRole("button", { name: /^(Language|اللغة):/ })).toHaveTextContent(language === "ar" ? "العربية" : "English");
};
const cache = (cachedProfile: Profile, stale = false) => {
  if (!stale) writeCachedProfile("alice", cachedProfile);
  else localStorage.setItem("edeviser.auth.profile.v1", JSON.stringify({
    userId: "alice", profile: cachedProfile, cachedAt: Date.now() - PROFILE_CACHE_FRESH_MS - 1000,
  }));
};

beforeEach(async () => {
  vi.resetAllMocks();
  latestLanguageSetter = undefined;
  localStorage.clear();
  await i18n.changeLanguage("en");
  db.listener = null;
  db.onAuthStateChange.mockImplementation((callback: typeof db.listener) => {
    db.listener = callback;
    return { data: { subscription: { unsubscribe: vi.fn() } } };
  });
  db.getSession.mockResolvedValue({ data: { session: null }, error: null });
  db.profileFetch.mockResolvedValue({ data: profile(), error: null });
  db.from.mockImplementation((table: string) => {
    if (table !== "profiles") throw new Error(`Unexpected table ${table}`);
    return {
      select: () => ({ eq: () => ({ maybeSingle: db.profileFetch }) }),
      update: db.update,
    };
  });
  db.update.mockReturnValue({ eq: db.writeEq });
  db.writeEq.mockResolvedValue({ error: null });
  client = new QueryClient({ defaultOptions: { mutations: { retry: false, gcTime: Infinity } } });
});

afterEach(async () => {
  cleanup();
  client.clear();
  await i18n.changeLanguage("en");
  localStorage.clear();
});

describe("successful preference persistence survives hydration", () => {
  it("automatically publishes a fresh setter after batched auth B to the same A session object", async () => {
    cache(profile());
    mount();
    await emit();
    const retired = latestLanguageSetter;
    if (!retired) throw new Error("Language setter was not published");
    const bob = deferredProfile();
    const alice = deferredProfile();
    db.profileFetch.mockReturnValueOnce(bob.promise).mockReturnValueOnce(alice.promise);
    await act(async () => {
      if (!db.listener) throw new Error("Missing auth listener");
      // The same A session/user object returns, but its old profile is cleared
      // while A's new read is pending. The owner generation must refresh setters.
      db.listener("SIGNED_IN", { ...session, user: { ...user, id: "bob" } });
      db.listener("SIGNED_IN", session);
    });
    expect(latestLanguageSetter).not.toBe(retired);
    expect(screen.getByLabelText("profile owner")).toHaveTextContent("alice");
    expect(screen.getByLabelText("profile revision")).toHaveTextContent("loading");
    expect(screen.getByLabelText("profile language")).toHaveTextContent("unset");
    expect(screen.getByLabelText("auth loading")).toHaveTextContent("true");
    act(() => retired("ar"));
    assertLanguage("en");
    expect(db.writeEq).not.toHaveBeenCalled();
    await chooseArabic(); // No forced rerender: use the live, automatically updated control.
    await waitFor(() => {
      expect(db.writeEq).toHaveBeenCalledExactlyOnceWith("id", "alice");
      expect(client.isMutating()).toBe(0); // The successful write/journal confirmation has settled.
    }, { timeout: 2000 });
    expect(db.update).toHaveBeenCalledExactlyOnceWith({ preferred_language: "ar" });
    assertLanguage("ar");
    // A confirmed preference must not manufacture an incomplete profile/cache.
    expect(screen.getByLabelText("profile revision")).toHaveTextContent("loading");
    expect(screen.getByLabelText("profile language")).toHaveTextContent("unset");
    expect(screen.getByLabelText("auth loading")).toHaveTextContent("true");
    expect(localStorage.getItem("edeviser.auth.profile.v1")).toBeNull();
    await act(async () => {
      bob.resolve({ data: profile({ id: "bob", full_name: "stale Bob" }), error: null });
    });
    expect(screen.getByLabelText("profile owner")).toHaveTextContent("alice");
    expect(screen.getByLabelText("profile revision")).toHaveTextContent("loading");
    expect(screen.getByLabelText("auth loading")).toHaveTextContent("true");
    await act(async () => {
      alice.resolve({ data: profile({ full_name: "current Alice" }), error: null });
    });
    expect(screen.getByLabelText("profile revision")).toHaveTextContent("current Alice");
    expect(screen.getByLabelText("profile language")).toHaveTextContent("ar");
    expect(screen.getByLabelText("auth loading")).toHaveTextContent("false");
    expect(readCachedProfile("alice")?.profile).toMatchObject({
      id: "alice", full_name: "current Alice", preferred_language: "ar", language_preference: "en",
    });
    expect(db.writeEq).toHaveBeenCalledExactlyOnceWith("id", "alice");
    assertLanguage("ar");
  });

  it("hydrates the live StrictMode replay when initial auth arrived before first cleanup", async () => {
    const first = deferredProfile();
    const replay = deferredProfile();
    db.profileFetch.mockReturnValueOnce(first.promise).mockReturnValueOnce(replay.promise);
    db.onAuthStateChange.mockImplementation((listener: (event: AuthChangeEvent, value: Session | null) => void) => {
      db.listener = listener;
      listener("INITIAL_SESSION", session);
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
    render(<StrictMode><Harness /></StrictMode>);
    expect(db.profileFetch).toHaveBeenCalledTimes(2);
    await act(async () => { replay.resolve({ data: profile({ full_name: "live StrictMode lifecycle", preferred_language: "ar" }), error: null }); });
    expect(screen.getByLabelText("profile revision")).toHaveTextContent("live StrictMode lifecycle");
    const before = localStorage.getItem("edeviser.auth.profile.v1");
    await act(async () => { first.resolve({ data: profile({ full_name: "disposed StrictMode lifecycle" }), error: null }); });
    expect(screen.getByLabelText("profile revision")).toHaveTextContent("live StrictMode lifecycle");
    expect(localStorage.getItem("edeviser.auth.profile.v1")).toBe(before);
    assertLanguage("ar");
  });

  it("keeps a successful menu save after a full remount inside the fresh-cache window", async () => {
    cache(profile());
    const before = readCachedProfile("alice");
    const view = mount();
    await emit();
    await chooseArabic();
    await waitFor(() => expect(db.writeEq).toHaveBeenCalledExactlyOnceWith("id", "alice"), { timeout: 2000 });
    await waitFor(() => expect(readCachedProfile("alice")?.profile.preferred_language).toBe("ar"));
    expect(readCachedProfile("alice")).toEqual({ ...before, profile: { ...before?.profile, preferred_language: "ar" } });
    expect(screen.getByLabelText("profile language")).toHaveTextContent("ar");

    view.unmount();
    mount();
    await emit();
    expect(db.profileFetch).not.toHaveBeenCalled();
    assertLanguage("ar");
  });

  it("reconciles a pre-save revalidation response without losing other fresh profile fields", async () => {
    const pending = deferredProfile();
    db.profileFetch.mockReturnValueOnce(pending.promise);
    cache(profile(), true);
    const before = readCachedProfile("alice");
    const view = mount();
    await emit();
    await chooseArabic();
    await waitFor(() => expect(readCachedProfile("alice")?.profile.preferred_language).toBe("ar"), { timeout: 2000 });
    expect(readCachedProfile("alice")?.cachedAt).toBe(before?.cachedAt);
    await act(async () => {
      pending.resolve({ data: profile({ full_name: "fresh unrelated metadata", department: "fresh department" }), error: null });
    });
    expect(screen.getByLabelText("profile language")).toHaveTextContent("ar");
    expect(readCachedProfile("alice")?.profile).toMatchObject({
      preferred_language: "ar", language_preference: "en", full_name: "fresh unrelated metadata", department: "fresh department",
    });
    view.unmount();
    mount();
    await emit();
    expect(db.profileFetch).toHaveBeenCalledTimes(1);
    assertLanguage("ar");
  });

  it("updates AuthContext so remounting only LanguageProvider retains the successful save", async () => {
    cache(profile());
    const view = mount();
    await emit();
    await chooseArabic();
    await waitFor(() => expect(screen.getByLabelText("profile language")).toHaveTextContent("ar"), { timeout: 2000 });
    view.rerender(<Harness languageKey={1} />);
    assertLanguage("ar");
  });

  it("does not overlay an older confirmed preference onto a later-started explicit fetch", async () => {
    cache(profile());
    const view = mount();
    await emit();
    await chooseArabic();
    await waitFor(() => expect(readCachedProfile("alice")?.profile.preferred_language).toBe("ar"), { timeout: 2000 });
    db.profileFetch.mockResolvedValueOnce({ data: profile({ preferred_language: "en", full_name: "later server choice" }), error: null });
    await userEvent.setup().click(screen.getByRole("button", { name: "Refresh profile fixture" }));
    await waitFor(() => expect(screen.getByLabelText("profile revision")).toHaveTextContent("later server choice"));
    expect(readCachedProfile("alice")?.profile.preferred_language).toBe("en");
    expect(screen.getByLabelText("profile language")).toHaveTextContent("en");
    assertLanguage("ar"); // Existing local-choice policy still owns the mounted UI.
    view.unmount();
    mount();
    await emit();
    assertLanguage("en");
  });
});

describe("Auth profile responses cannot bypass language ownership", () => {
  it.each(["old-profile", "null-profile"])("does not publish an old-lifecycle %s after Alice returns", async (response) => {
    const pending = deferredProfile();
    db.profileFetch.mockReturnValueOnce(pending.promise);
    mount();
    await emit();
    await emit("SIGNED_OUT", null);
    writeCachedProfile("bob", profile({ id: "bob", full_name: "Bob" }));
    await emit("SIGNED_IN", { ...session, user: { ...user, id: "bob" } });
    await emit("SIGNED_OUT", null);
    cache(profile({ full_name: "new Alice lifecycle" }));
    await emit("SIGNED_IN");
    const before = localStorage.getItem("edeviser.auth.profile.v1");
    await act(async () => {
      pending.resolve({ data: response === "null-profile" ? null : profile({ full_name: "old Alice response", preferred_language: "ar" }), error: null });
    });
    expect(screen.getByLabelText("profile revision")).toHaveTextContent("new Alice lifecycle");
    expect(localStorage.getItem("edeviser.auth.profile.v1")).toBe(before);
    assertLanguage("en");
  });

  it("preserves a menu choice when a cache-miss profile response arrives later", async () => {
    const pending = deferredProfile();
    db.profileFetch.mockReturnValue(pending.promise);
    mount();
    await emit();
    expect(screen.getByLabelText("profile owner")).toHaveTextContent("alice");
    await chooseArabic();
    await act(async () => { pending.resolve({ data: profile({ full_name: "late network" }), error: null }); });
    expect(screen.getByLabelText("profile revision")).toHaveTextContent("late network");
    assertLanguage("ar");
  });

  it("preserves a menu choice after a later cached SIGNED_IN hydration for the same user", async () => {
    cache(profile({ full_name: "initial cache" }));
    mount();
    await emit();
    await chooseArabic();
    cache(profile({ full_name: "late cache" }));
    await emit("SIGNED_IN");
    expect(screen.getByLabelText("profile revision")).toHaveTextContent("late cache");
    expect(db.profileFetch).not.toHaveBeenCalled();
    assertLanguage("ar");
  });

  it("preserves a menu choice when stale-cache revalidation returns", async () => {
    const pending = deferredProfile();
    db.profileFetch.mockReturnValue(pending.promise);
    cache(profile({ full_name: "stale cache" }), true);
    mount();
    await emit();
    expect(screen.getByLabelText("profile revision")).toHaveTextContent("stale cache");
    await chooseArabic();
    await act(async () => { pending.resolve({ data: profile({ full_name: "fresh profile" }), error: null }); });
    expect(screen.getByLabelText("profile revision")).toHaveTextContent("fresh profile");
    assertLanguage("ar");
  });

  it("still accepts fresh preferred language when the user has not made a local choice", async () => {
    const pending = deferredProfile();
    db.profileFetch.mockReturnValue(pending.promise);
    cache(profile(), true);
    mount();
    await emit();
    assertLanguage("en");
    await act(async () => {
      pending.resolve({ data: profile({ preferred_language: "ar", language_preference: "en" }), error: null });
    });
    assertLanguage("ar");
  });

  it.each([
    { preferred_language: "ar", language_preference: "en", expected: "ar" },
    { preferred_language: "en", language_preference: "ar", expected: "en" },
    { preferred_language: undefined, language_preference: "ar", expected: "ar" },
    { preferred_language: "invalid", language_preference: "ar", expected: "ar" },
  ] as const)("hydrates preferred=$preferred_language / legacy=$language_preference consistently", async (values) => {
    cache(profile(values));
    mount();
    await emit();
    assertLanguage(values.expected);
  });

  it("keeps the saved language when both profile fields are unsupported", async () => {
    localStorage.setItem("edeviser-language", "ar");
    cache(profile({ preferred_language: "invalid", language_preference: "unsupported" }));
    mount();
    await emit();
    assertLanguage("ar");
  });
});
