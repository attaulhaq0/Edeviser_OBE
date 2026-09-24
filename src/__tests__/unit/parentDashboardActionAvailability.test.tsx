import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createInstance, type i18n } from "i18next";
import { I18nextProvider, useTranslation } from "react-i18next";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LinkedChild } from "@/hooks/useParentDashboard";
import type { ParentCourseProgress } from "@/hooks/useParentProgress";
import en from "@/locales/en/common.json";
import ar from "@/locales/ar/common.json";

const mock = vi.hoisted(() => ({ aggregate: vi.fn(), progress: vi.fn(), from: vi.fn(), insert: vi.fn(), rpc: vi.fn(), invoke: vi.fn(), success: vi.fn() }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "parent-1" } }) }));
vi.mock("@/hooks/useParentDashboardAggregate", () => ({ useParentDashboardAggregate: (id: string | undefined) => mock.aggregate(id) }));
vi.mock("@/hooks/useParentProgress", () => ({ useParentChildProgress: (id: string | undefined) => mock.progress(id) }));
vi.mock("@/lib/supabase", () => ({ supabase: { from: mock.from, rpc: mock.rpc, functions: { invoke: mock.invoke } } }));
vi.mock("sonner", () => ({ toast: { success: mock.success } }));
vi.mock("@/ai/lib/featureGate", () => ({ isAiSurfaceEnabled: () => false }));
// Exercise the routed page re-export and real controls; only business seams are mocked.
import ParentDashboard from "@/pages/parent/ParentDashboard";

const children: LinkedChild[] = [
  { student_id: "s1", student_name: "Yusuf Ahmadi", current_level: 11, xp_total: 1986, current_streak: 3, enrolled_courses: 3, avg_attainment: 92 },
  { student_id: "s2", student_name: "Layla Ahmadi", current_level: 4, xp_total: 620, current_streak: 2, enrolled_courses: 1, avg_attainment: 43 },
];
const courses: Record<string, ParentCourseProgress[]> = {
  s1: [{ course_id: "math", course_name: "Mathematics", course_code: "M1", attainment_percent: 92, has_evidence: true }],
  s2: [{ course_id: "science", course_name: "Science", course_code: "S1", attainment_percent: 43, has_evidence: true }],
};
let client: QueryClient;
const success = (linked = children) => ({
  data: { children: linked, kpis: { linkedChildren: linked.length, totalCourses: 4, avgAttainment: 68, upcomingDeadlines: 1 } },
  isPending: false, isError: false, isSuccess: true,
});
const LocalizedRoutes = () => {
  const { i18n: language } = useTranslation();
  return <div data-testid="parent-context" data-role="parent" dir={language.dir()}>
    <Routes>
      <Route path="/parent/dashboard" element={<ParentDashboard />} />
      <Route path="/parent/notifications" element={<div data-testid="notifications-destination" />} />
      <Route path="/parent/support" element={<div data-testid="support-destination" />} />
      <Route path="/parent/children" element={<div data-testid="children-destination" />} />
    </Routes>
  </div>;
};
const mount = async (locale: "en" | "ar") => {
  const language = createInstance();
  await language.init({
    lng: locale, fallbackLng: false, ns: ["common"], defaultNS: "common",
    resources: { en: { common: en }, ar: { common: ar } },
    interpolation: { escapeValue: false }, react: { useSuspense: false },
  });
  const view = render(<QueryClientProvider client={client}><I18nextProvider i18n={language}>
    <MemoryRouter initialEntries={["/parent/dashboard"]}><LocalizedRoutes /></MemoryRouter>
  </I18nextProvider></QueryClientProvider>);
  return { ...view, language };
};
const interpolate = (text: string, name = "Yusuf") => text.replace(/\{\{name\}\}/g, name);
const assertNoDelivery = () => {
  expect(mock.from).not.toHaveBeenCalled(); expect(mock.insert).not.toHaveBeenCalled();
  expect(mock.rpc).not.toHaveBeenCalled(); expect(mock.invoke).not.toHaveBeenCalled();
  expect(mock.success).not.toHaveBeenCalled();
};

beforeEach(() => {
  vi.clearAllMocks();
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  mock.aggregate.mockReturnValue(success());
  mock.progress.mockImplementation((id: string | undefined) => ({ data: id ? courses[id] ?? [] : [] }));
  mock.from.mockReturnValue({ insert: mock.insert });
  mock.insert.mockResolvedValue({ data: null, error: new Error("Unacknowledged request") });
});
afterEach(() => { cleanup(); client.clear(); });

describe.each(["en", "ar"] as const)("parent dashboard action availability: %s", (locale) => {
  const copy = (locale === "en" ? en : ar).parentDashboard;

  it("keeps both intentions visible and disabled with linked, localized explanations and no write/success", async () => {
    await mount(locale);
    expect(screen.getByTestId("parent-context").getAttribute("dir")).toBe(locale === "ar" ? "rtl" : "ltr");
    const help = screen.getByRole("region", { name: copy.help.title });
    const celebrate = screen.getByRole("region", { name: copy.celebrate.title });
    const reminder = within(help).getByRole("button", { name: copy.help.remindBtn });
    const encouragement = within(celebrate).getByRole("button", { name: copy.celebrate.sendBtn });
    for (const [button, description] of [[reminder, copy.help.unavailable], [encouragement, interpolate(copy.celebrate.unavailable)]] as const) {
      expect(button).toHaveProperty("disabled", true);
      const id = button.getAttribute("aria-describedby");
      expect(id).toBeTruthy(); expect(document.getElementById(id ?? "")?.textContent).toBe(description);
      expect(button.classList.contains("min-h-11")).toBe(true);
      fireEvent.click(button); fireEvent.keyDown(button, { key: "Enter" }); fireEvent.click(button);
    }
    expect(within(help).getByText(copy.help.unavailable)).toBeDefined();
    expect(within(celebrate).getByText(interpolate(copy.celebrate.unavailable))).toBeDefined();
    expect(help.textContent).not.toMatch(/databases|Reminder set|قواعد البيانات/);
    expect(celebrate.textContent).not.toMatch(/Satisfactory|Encouragement sent|تم الإرسال/);
    assertNoDelivery();
  });

  it("preserves long mixed-script names and gives both action sections a wrapping contract", async () => {
    const first = children[0];
    if (!first) throw new Error("Missing child fixture");
    const name = "AlexandriaنورالمعرفةLearningJourney";
    mock.aggregate.mockReturnValue(success([{ ...first, student_name: name }]));
    await mount(locale);
    const help = screen.getByRole("region", { name: copy.help.title });
    const celebrate = screen.getByRole("region", { name: copy.celebrate.title });
    for (const section of [help, celebrate]) {
      expect(section.classList.contains("min-w-0")).toBe(true);
      expect(section.classList.contains("[overflow-wrap:anywhere]")).toBe(true);
    }
    expect(within(help).getByText(interpolate(copy.help.prompt, name))).toBeDefined();
    expect(within(celebrate).getByText(interpolate(copy.celebrate.detail, name))).toBeDefined();
    assertNoDelivery();
  });

  it("offers the real notifications destination and preserves the support link", async () => {
    await mount(locale);
    const notifications = screen.getByRole("link", { name: copy.help.openNotifications });
    expect(notifications.getAttribute("href")).toBe("/parent/notifications");
    expect(notifications.classList.contains("min-h-11")).toBe(true);
    expect(screen.getByRole("link", { name: copy.help.moreIdeas }).getAttribute("href")).toBe("/parent/support");
    fireEvent.click(notifications);
    expect(screen.getByTestId("notifications-destination")).toBeDefined();
    assertNoDelivery();
  });

  it("preserves child selection, actual progress inputs and both action sections", async () => {
    const original = JSON.stringify({ children, courses });
    await mount(locale);
    expect(mock.aggregate).toHaveBeenCalledWith("parent-1");
    expect(mock.progress).toHaveBeenLastCalledWith("s1");
    expect(screen.getByText(interpolate(copy.help.prompt))).toBeDefined();
    expect(screen.getByText("Mathematics", { exact: true })).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Layla" }));
    expect(mock.progress).toHaveBeenLastCalledWith("s2");
    expect(screen.getByText("Science", { exact: true })).toBeDefined();
    expect(screen.getByText(interpolate(copy.help.prompt, "Layla"))).toBeDefined();
    expect(screen.getByText(interpolate(copy.celebrate.detail, "Layla"))).toBeDefined();
    expect(screen.getByRole("button", { name: copy.celebrate.sendBtn })).toHaveProperty("disabled", true);
    expect(JSON.stringify({ children, courses })).toBe(original);
    assertNoDelivery();
  });

  it("keeps the known empty state and children route without offering unavailable actions", async () => {
    mock.aggregate.mockReturnValue(success([]));
    await mount(locale);
    expect(screen.getByText(copy.noChildren)).toBeDefined();
    expect(screen.queryByRole("button", { name: copy.help.remindBtn })).toBeNull();
    expect(screen.queryByRole("button", { name: copy.celebrate.sendBtn })).toBeNull();
    expect(screen.queryByRole("link", { name: copy.help.openNotifications })).toBeNull();
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByTestId("children-destination")).toBeDefined();
    assertNoDelivery();
  });

  it("does not show action availability before the aggregate finishes loading", async () => {
    mock.aggregate.mockReturnValue({ ...success(), isPending: true });
    await mount(locale);
    expect(screen.queryByRole("region", { name: copy.help.title })).toBeNull();
    expect(screen.queryByRole("region", { name: copy.celebrate.title })).toBeNull();
    assertNoDelivery();
  });
});

it("updates action copy/direction live without losing selected child or enabling unsupported actions", async () => {
  const { language }: { language: i18n } = await mount("en");
  fireEvent.click(screen.getByRole("button", { name: "Layla" }));
  await act(async () => { await language.changeLanguage("ar"); });
  expect(screen.getByTestId("parent-context").getAttribute("dir")).toBe("rtl");
  expect(screen.getByText(interpolate(ar.parentDashboard.help.prompt, "Layla"))).toBeDefined();
  expect(screen.getByRole("button", { name: ar.parentDashboard.help.remindBtn })).toHaveProperty("disabled", true);
  expect(screen.getByRole("button", { name: ar.parentDashboard.celebrate.sendBtn })).toHaveProperty("disabled", true);
  assertNoDelivery();
});

it("keeps the new action locale leaves and name placeholders in parity", () => {
  for (const group of ["help", "celebrate"] as const) {
    const english = en.parentDashboard[group], arabic = ar.parentDashboard[group];
    expect(Object.keys(arabic).sort()).toEqual(Object.keys(english).sort());
    for (const [key, value] of Object.entries(english)) {
      const translated = Object.entries(arabic).find(([name]) => name === key)?.[1];
      expect(translated).toBeTruthy();
      expect(translated?.match(/\{\{[^}]+\}\}/g) ?? []).toEqual(value.match(/\{\{[^}]+\}\}/g) ?? []);
    }
  }
});
