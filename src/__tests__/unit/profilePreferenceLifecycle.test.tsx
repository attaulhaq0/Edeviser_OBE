import { act, cleanup, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createInstance, type i18n } from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

interface ProfileFixture {
  id: string;
  theme_preference?: string;
  preferred_language?: string;
}

const state = vi.hoisted(() => ({
  user: null as { id: string } | null,
  profile: null as ProfileFixture | null,
}));
const db = vi.hoisted(() => ({
  from: vi.fn(), update: vi.fn(),
  eq: vi.fn<(column: string, id: string) => Promise<{ error: Error | null }>>(),
}));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => state }));
vi.mock("@/lib/supabase", () => ({ supabase: { from: db.from } }));

import { ThemeProvider, useTheme } from "@/providers/ThemeProvider";
import { LanguageProvider, useLanguage } from "@/providers/LanguageProvider";

let client: QueryClient;
let translations: i18n;
const signIn = (id: string, theme = "light", language = "en") => {
  state.user = { id };
  state.profile = { id, theme_preference: theme, preferred_language: language };
};
const Wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={client}>
    <I18nextProvider i18n={translations}>
      <LanguageProvider><ThemeProvider>{children}</ThemeProvider></LanguageProvider>
    </I18nextProvider>
  </QueryClientProvider>
);
const mount = () => renderHook(() => ({ theme: useTheme(), locale: useLanguage() }), { wrapper: Wrapper });
const advance = async (milliseconds = 900) => {
  await act(async () => { await vi.advanceTimersByTimeAsync(milliseconds); });
};

beforeEach(async () => {
  vi.clearAllMocks();
  state.user = null;
  state.profile = null;
  localStorage.clear();
  document.documentElement.className = "";
  client = new QueryClient({ defaultOptions: { mutations: { retry: false, gcTime: Infinity } } });
  db.from.mockReturnValue({ update: db.update });
  db.update.mockReturnValue({ eq: db.eq });
  db.eq.mockResolvedValue({ error: null });
  translations = createInstance();
  await translations.use(initReactI18next).init({
    lng: "en", fallbackLng: "en", resources: { en: { translation: {} }, ar: { translation: {} } },
  });
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  client.clear();
  vi.useRealTimers();
  vi.restoreAllMocks();
  document.documentElement.className = "";
  document.documentElement.removeAttribute("lang");
  document.documentElement.removeAttribute("dir");
  document.documentElement.style.fontFamily = "";
});

describe("profile preference lifecycle", () => {
  it("hydrates a different account and synchronizes storage, i18n and document direction", () => {
    signIn("alice");
    const { result, rerender } = mount();
    signIn("bob", "dark", "ar");
    rerender();
    expect(result.current.theme.theme).toBe("dark");
    expect(result.current.locale.language).toBe("ar");
    expect(translations.language).toBe("ar");
    expect(localStorage.getItem("theme")).toBe("dark");
    expect(localStorage.getItem("edeviser-language")).toBe("ar");
    expect(document.documentElement).toHaveAttribute("dir", "rtl");
    expect(document.documentElement).toHaveAttribute("lang", "ar");
    expect(db.from).not.toHaveBeenCalled();
  });

  it("accepts fresh profile preferences after cache hydration when there is no local choice", () => {
    signIn("alice");
    const { result, rerender } = mount();
    signIn("alice", "dark", "ar");
    rerender();
    expect(result.current.theme.theme).toBe("dark");
    expect(result.current.locale.language).toBe("ar");
  });

  it("does not hydrate a previous user's profile while the next user's profile loads", async () => {
    localStorage.setItem("theme", "dark");
    await translations.changeLanguage("ar");
    signIn("alice", "light", "en");
    state.user = { id: "bob" };
    const { result } = mount();
    expect(result.current.theme.theme).toBe("dark");
    expect(result.current.locale.language).toBe("ar");
    expect(db.from).not.toHaveBeenCalled();
  });

  it("debounces rapid choices and keeps the authenticated owner in mutation variables", async () => {
    signIn("alice");
    const { result } = mount();
    act(() => {
      result.current.theme.setTheme("dark");
      result.current.theme.setTheme("light");
      result.current.theme.setTheme("dark");
    });
    await advance(799);
    expect(db.from).not.toHaveBeenCalled();
    await advance(1);
    expect(db.update).toHaveBeenCalledExactlyOnceWith({ theme_preference: "dark" });
    expect(db.eq).toHaveBeenCalledExactlyOnceWith("id", "alice");
  });

  it.each(["switch", "logout", "unmount"] as const)("cancels both unsent writes on %s", async (transition) => {
    signIn("alice");
    const view = mount();
    act(() => {
      view.result.current.theme.setTheme("dark");
      view.result.current.locale.setLanguage("ar");
    });
    await advance(400);
    if (transition === "unmount") view.unmount();
    else {
      if (transition === "switch") signIn("bob");
      else { state.user = null; state.profile = null; }
      view.rerender();
    }
    await advance();
    expect(db.from).not.toHaveBeenCalled();
    if (transition === "switch") {
      // Both profiles originally saved en/light: identity must still rehydrate.
      expect(view.result.current.theme.theme).toBe("light");
      expect(view.result.current.locale.language).toBe("en");
      expect(document.documentElement).toHaveAttribute("dir", "ltr");
    }
  });

  it.each(["bob", "alice"])("rejects retained setters after logout and sign-in as %s", async (nextOwner) => {
    signIn("alice");
    const { result, rerender } = mount();
    const previousThemeSetter = result.current.theme.setTheme;
    const previousLanguageSetter = result.current.locale.setLanguage;
    state.user = null;
    state.profile = null;
    rerender();
    signIn(nextOwner);
    rerender();
    act(() => { previousThemeSetter("dark"); previousLanguageSetter("ar"); });
    await advance();
    expect(result.current.theme.theme).toBe("light");
    expect(result.current.locale.language).toBe("en");
    expect(localStorage.getItem("theme")).toBe("light");
    expect(db.from).not.toHaveBeenCalled();
  });

  it("rejects retained setters after unmount", async () => {
    signIn("alice");
    const { result, unmount } = mount();
    const previousThemeSetter = result.current.theme.setTheme;
    const previousLanguageSetter = result.current.locale.setLanguage;
    unmount();
    act(() => { previousThemeSetter("dark"); previousLanguageSetter("ar"); });
    await advance();
    expect(localStorage.getItem("theme")).toBe("light");
    expect(localStorage.getItem("edeviser-language")).toBe("en");
    expect(db.from).not.toHaveBeenCalled();
  });

  it("rehydrates the same account after logout instead of retaining an unsaved choice", () => {
    signIn("alice");
    const { result, rerender } = mount();
    act(() => { result.current.theme.setTheme("dark"); result.current.locale.setLanguage("ar"); });
    state.user = null;
    state.profile = null;
    rerender();
    signIn("alice");
    rerender();
    expect(result.current.theme.theme).toBe("light");
    expect(result.current.locale.language).toBe("en");
  });

  it("does not replace a newer local choice with a late profile response", async () => {
    state.user = { id: "alice" };
    const { result, rerender } = mount();
    act(() => { result.current.theme.setTheme("dark"); result.current.locale.setLanguage("ar"); });
    signIn("alice", "light", "en");
    rerender();
    expect(result.current.theme.theme).toBe("dark");
    expect(result.current.locale.language).toBe("ar");
    await advance();
    expect(db.update).toHaveBeenCalledWith({ theme_preference: "dark" });
    expect(db.update).toHaveBeenCalledWith({ preferred_language: "ar" });
    expect(db.eq.mock.calls.map((call) => call[1])).toEqual(["alice", "alice"]);
  });

  it("supports local anonymous choices without scheduling database writes", async () => {
    const { result } = mount();
    act(() => { result.current.theme.setTheme("dark"); result.current.locale.setLanguage("ar"); });
    await advance();
    expect(result.current.theme.theme).toBe("dark");
    expect(result.current.locale.language).toBe("ar");
    expect(translations.language).toBe("ar");
    expect(db.from).not.toHaveBeenCalled();
  });

  it.each(["bob", "alice"])("does not revive a queued old-lifecycle mutation after sign-in as %s", async (nextOwner) => {
    let completeFirst: ((value: { error: null }) => void) | undefined;
    db.eq.mockImplementationOnce(() => new Promise((resolve) => { completeFirst = resolve; }));
    signIn("alice");
    const { result, rerender } = mount();
    act(() => { result.current.theme.setTheme("dark"); });
    await advance();
    expect(db.eq).toHaveBeenCalledTimes(1);
    act(() => { result.current.locale.setLanguage("ar"); });
    await advance();
    expect(db.eq).toHaveBeenCalledTimes(1);
    if (nextOwner === "alice") {
      state.user = null;
      state.profile = null;
      rerender();
    }
    signIn(nextOwner);
    rerender();
    await act(async () => {
      if (!completeFirst) throw new Error("Expected the first preference write to start");
      completeFirst({ error: null });
    });
    await advance();
    expect(db.eq).toHaveBeenCalledTimes(1);
  });

  it("handles failed writes without retrying or reverting the local choice", async () => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    db.eq.mockResolvedValueOnce({ error: new Error("fixture failure") });
    signIn("alice");
    const { result } = mount();
    act(() => { result.current.theme.setTheme("dark"); });
    await advance(5000);
    expect(db.eq).toHaveBeenCalledTimes(1);
    expect(result.current.theme.theme).toBe("dark");
    expect(errorLog).toHaveBeenCalledWith("[ProfilePreferences] Failed to save preference:", "fixture failure");
  });
});
