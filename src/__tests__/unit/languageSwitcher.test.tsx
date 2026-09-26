import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createInstance, type i18n } from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import type { ReactNode } from "react";

const state = vi.hoisted(() => ({
  user: null as { id: string } | null,
  profile: null as { id: string; preferred_language?: string; language_preference?: string } | null,
}));
const db = vi.hoisted(() => ({ from: vi.fn(), update: vi.fn(), eq: vi.fn() }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => state }));
vi.mock("@/lib/supabase", () => ({ supabase: { from: db.from } }));

import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";
import { LanguageProvider, useLanguage } from "@/providers/LanguageProvider";

let translations: i18n;
let client: QueryClient;
const Probe = () => {
  const { language, direction } = useLanguage();
  return <output aria-label="language context">{language}/{direction}</output>;
};
const Wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={client}>
    <I18nextProvider i18n={translations}>
      <LanguageProvider>{children}</LanguageProvider>
    </I18nextProvider>
  </QueryClientProvider>
);
const mount = () => render(<><LanguageSwitcher /><Probe /></>, { wrapper: Wrapper });
const assertLanguage = (language: "en" | "ar") => {
  const direction = language === "ar" ? "rtl" : "ltr";
  expect(screen.getByLabelText("language context")).toHaveTextContent(`${language}/${direction}`);
  expect(translations.language).toBe(language);
  expect(localStorage.getItem("edeviser-language")).toBe(language);
  expect(document.documentElement).toHaveAttribute("lang", language);
  expect(document.documentElement).toHaveAttribute("dir", direction);
};

beforeEach(async () => {
  vi.clearAllMocks();
  localStorage.clear();
  state.user = null;
  state.profile = null;
  db.from.mockReturnValue({ update: db.update });
  db.update.mockReturnValue({ eq: db.eq });
  db.eq.mockResolvedValue({ error: null });
  client = new QueryClient({ defaultOptions: { mutations: { retry: false, gcTime: Infinity } } });
  translations = createInstance();
  await translations.use(initReactI18next).init({
    lng: "en", fallbackLng: "en", defaultNS: "common",
    resources: {
      en: { common: { header: { languageMenu: "Language: {{language}}" } } },
      ar: { common: { header: { languageMenu: "اللغة: {{language}}" } } },
    },
  });
});

afterEach(() => {
  cleanup();
  client.clear();
  document.documentElement.removeAttribute("dir");
  document.documentElement.removeAttribute("lang");
  document.documentElement.style.fontFamily = "";
});

describe("LanguageSwitcher through the real language provider", () => {
  it("renders the current language and Globe icon", () => {
    mount();
    const trigger = screen.getByRole("button", { name: "Language: English" });
    expect(trigger).toHaveTextContent("English");
    expect(trigger.querySelector("svg")).toBeInTheDocument();
  });

  it("hydrates an anonymous saved Arabic choice into context, i18n, storage and RTL", () => {
    localStorage.setItem("edeviser-language", "ar");
    mount();
    assertLanguage("ar");
    expect(screen.getByRole("button", { name: "اللغة: العربية" })).toBeInTheDocument();
    expect(db.from).not.toHaveBeenCalled();
  });

  it("uses actual menu selection to synchronize an anonymous choice without database writes", async () => {
    const user = userEvent.setup();
    mount();
    await user.click(screen.getByRole("button", { name: "Language: English" }));
    await user.click(screen.getByRole("menuitem", { name: "العربية" }));
    assertLanguage("ar");
    expect(screen.getByRole("button", { name: "اللغة: العربية" })).toBeInTheDocument();
    expect(db.from).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "اللغة: العربية" }));
    expect(screen.getByRole("menu")).toHaveAttribute("dir", "rtl");
    expect(screen.getByRole("menuitem", { name: "العربية" })).toHaveAttribute("aria-current", "true");
  });

  it("supports keyboard selection and persists only the primary field through the guarded debounce", async () => {
    state.user = { id: "alice" };
    state.profile = { id: "alice", preferred_language: "en", language_preference: "ar" };
    const user = userEvent.setup();
    mount();
    assertLanguage("en");
    await user.click(screen.getByRole("button", { name: "Language: English" }));
    screen.getByRole("menuitem", { name: "العربية" }).focus();
    await user.keyboard("{Enter}");
    assertLanguage("ar");
    await waitFor(() => expect(db.update).toHaveBeenCalledExactlyOnceWith({ preferred_language: "ar" }), { timeout: 2000 });
    expect(db.eq).toHaveBeenCalledExactlyOnceWith("id", "alice");
  });
});
