import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { createInstance } from "i18next";
import { I18nextProvider } from "react-i18next";
import ProfileDropdown from "@/components/shared/ProfileDropdown";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/design-system/primitives";
import { useLevel } from "@/hooks/useLevel";
import { useCourses } from "@/hooks/useCourses";
import { useLinkedChildren } from "@/hooks/useParentDashboard";
import en from "@/locales/en/common.json";
import ar from "@/locales/ar/common.json";
import type { UserRole } from "@/types/app";

const state = vi.hoisted(() => ({
  profile: { id: "actor", role: "student" as UserRole, full_name: "Amina Example", avatar_url: null as string | null, department: "Science" },
  user: { id: "actor", email: "amina@example.test" },
  level: { data: undefined as { level: number; xpTotal: number; progressPercent: number; xpForNextLevel: number } | undefined, isError: false },
  courses: { data: undefined as { count: number | null } | undefined, isError: false },
  children: { data: undefined as { student_name: string }[] | undefined, isError: false },
  signOut: vi.fn(), setThemeMode: vi.fn(), start: vi.fn(),
  ownerKey: "actor-1", patchLatest: vi.fn(),
}));
vi.mock("@/hooks/useAccessibilityPreferences", () => ({ useAccessibilityPreferenceControls: () => ({
  ownerKey: state.ownerKey,
  effective: { font_size: "default", high_contrast: false, reduced_animations: false, dyslexia_font: false, simplified_view: false },
  devicePersistence: { status: "unchanged", error: null }, profileRead: { status: "ready", error: null },
  accountSync: { status: "idle", error: null }, fontRequest: "off", patchLatest: state.patchLatest,
}) }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: state.user, profile: state.profile, signOut: state.signOut }) }));
vi.mock("@/hooks/useTheme", () => ({ useTheme: () => ({ themeMode: "dark", setThemeMode: state.setThemeMode }) }));
vi.mock("@/hooks/useGuidedTour", () => ({ useGuidedTour: () => ({ start: state.start }) }));
vi.mock("@/hooks/useLevel", () => ({ useLevel: vi.fn(() => state.level) }));
vi.mock("@/hooks/useCourses", () => ({ useCourses: vi.fn(() => state.courses) }));
vi.mock("@/hooks/useParentDashboard", () => ({ useLinkedChildren: vi.fn(() => state.children) }));

beforeEach(() => {
  state.profile = { id: "actor", role: "student", full_name: "Amina Example", avatar_url: null, department: "Science" };
  state.level = { data: undefined, isError: false };
  state.courses = { data: undefined, isError: false };
  state.children = { data: undefined, isError: false };
  state.ownerKey = "actor-1";
  vi.clearAllMocks();
});
async function mount(language: "en" | "ar") {
  const i18n = createInstance();
  await i18n.init({ lng: language, fallbackLng: false, resources: { en: { common: en }, ar: { common: ar } }, defaultNS: "common", interpolation: { escapeValue: false } });
  const tree = () => <I18nextProvider i18n={i18n}><MemoryRouter><ProfileDropdown /></MemoryRouter></I18nextProvider>;
  const view = render(tree());
  const t = i18n.getFixedT(language, "common");
  const user = userEvent.setup();
  const trigger = screen.getByRole("button", { name: t("header.accountMenu", { name: state.profile.full_name }) });
  expect(trigger).toHaveClass("min-h-11", "min-w-11");
  await user.click(trigger);
  await screen.findByRole("menu");
  return { t, user, trigger, refresh: () => view.rerender(tree()) };
}

for (const language of ["en", "ar"] as const) describe(`actual account menu / ${language}`, () => {
  it.each([
    ["student", "/student/profile"], ["teacher", "/teacher/settings/profile"],
    ["coordinator", "/coordinator/settings/profile"], ["admin", "/admin/settings/profile"], ["parent", "/parent/profile"],
  ] as const)("preserves the native %s profile destination and institution boundary", async (role, route) => {
    state.profile.role = role;
    const { t, user, trigger } = await mount(language);
    expect(screen.getByRole("menuitem", { name: t("myProfile") })).toHaveAttribute("href", route);
    const institution = screen.queryByRole("menuitem", { name: t("institutionSettings") });
    if (role === "admin") expect(institution).toHaveAttribute("href", "/admin/settings/institution");
    else expect(institution).not.toBeInTheDocument();
    expect(screen.getByText(state.profile.full_name)).toBeInTheDocument();
    await user.click(screen.getByRole("menuitem", { name: t("accessibility.menuLabel") }));
    expect(await screen.findByRole("dialog", { name: t("accessibility.menuLabel") })).toBeInTheDocument();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
  });
  it("closes owned surfaces on a new lifecycle without reopening on a same-account return", async () => {
    const { t, user, refresh } = await mount(language);
    await user.click(screen.getByRole("menuitem", { name: t("accessibility.menuLabel") }));
    await screen.findByRole("dialog");
    state.ownerKey = "actor-2";
    refresh();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    state.ownerKey = "actor-3";
    refresh();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
  it("uses native radio semantics for theme selection and the existing provider setter", async () => {
    const { t, user } = await mount(language);
    const trigger = screen.getByRole("menuitem", { name: t("theme.label") });
    trigger.focus();
    await user.keyboard(language === "ar" ? "{ArrowLeft}" : "{ArrowRight}");
    expect(await screen.findByRole("menuitemradio", { name: t("theme.dark") })).toHaveAttribute("aria-checked", "true");
    await user.click(screen.getByRole("menuitemradio", { name: t("theme.light") }));
    expect(state.setThemeMode).toHaveBeenCalledExactlyOnceWith("light");
  });
  it("retains the existing guided-tour action", async () => {
    const { t, user } = await mount(language);
    await user.click(screen.getByRole("menuitem", { name: t("tour.takeTour") }));
    expect(state.start).toHaveBeenCalledOnce();
  });
  it("does not invent a level/XP value while student data is unavailable", async () => {
    const { t } = await mount(language);
    expect(screen.getByText(t("header.profileSubtitle.student"))).toBeInTheDocument();
    expect(screen.queryByText(/XP/)).not.toBeInTheDocument();
    expect(document.querySelector('img[src*="unsplash"]')).toBeNull();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });
  it("formats genuinely returned zero XP using the application language", async () => {
    state.level.data = { level: 1, xpTotal: 0, progressPercent: 0, xpForNextLevel: 100 };
    const { t } = await mount(language);
    const number = new Intl.NumberFormat(language);
    expect(screen.getByText(t("header.profileSubtitle.studentLevel", { level: number.format(1), xp: number.format(0) }))).toBeInTheDocument();
  });
  it("withholds cached counts when the teacher query fails", async () => {
    state.profile.role = "teacher";
    state.courses = { data: { count: 12 }, isError: true };
    const { t } = await mount(language);
    expect(screen.getByText(t("header.profileSubtitle.teacher"))).toBeInTheDocument();
    expect(screen.queryByText(/Science/)).not.toBeInTheDocument();
  });
  it("keeps known zero courses distinct from missing count", async () => {
    state.profile.role = "teacher";
    state.courses.data = { count: 0 };
    const { t } = await mount(language);
    expect(screen.getByText(t("header.profileSubtitle.teacherDetail", { department: "Science", count: 0, formattedCount: new Intl.NumberFormat(language).format(0) }))).toBeInTheDocument();
  });
  it("does not expose an empty or failed linked-child identity", async () => {
    state.profile.role = "parent";
    state.children = { data: [{ student_name: "Old child" }], isError: true };
    const { t } = await mount(language);
    expect(screen.getByText(t("header.profileSubtitle.parent"))).toBeInTheDocument();
    expect(screen.queryByText(/Old child/)).not.toBeInTheDocument();
  });
});

it.each(["student", "teacher", "coordinator", "admin", "parent"] as const)("withholds mismatched %s identity and disables role-dependent queries", async (role) => {
  state.profile.role = role;
  state.profile.id = "previous-actor";
  const i18n = createInstance();
  await i18n.init({ lng: "en", resources: { en: { common: en } }, defaultNS: "common" });
  render(<I18nextProvider i18n={i18n}><MemoryRouter><ProfileDropdown /></MemoryRouter></I18nextProvider>);
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
  expect(screen.queryByText(state.profile.full_name)).not.toBeInTheDocument();
  expect(useLevel).toHaveBeenLastCalledWith(undefined);
  expect(useCourses).toHaveBeenLastCalledWith({ page: 1, pageSize: 1, teacherId: undefined }, { enabled: false });
  expect(useLinkedChildren).toHaveBeenLastCalledWith(undefined, { enabled: false });
});

it("destroys outgoing menu/dialog handlers even while Radix would suspend exit unmount", async () => {
  const nativeStyle = window.getComputedStyle.bind(window);
  const style = vi.spyOn(window, "getComputedStyle").mockImplementation((node, pseudo) => {
    const computed = nativeStyle(node, pseudo);
    const animated = node.matches('[data-slot="dialog-content"], [data-slot="dropdown-menu-content"], [data-slot="dropdown-menu-sub-content"]');
    return new Proxy(computed, { get(target, property) {
      if (animated && property === "animationName") return node.getAttribute("data-state") === "open" ? "fixture-enter" : "fixture-exit";
      const value: unknown = Reflect.get(target, property, target);
      return typeof value === "function" ? value.bind(target) : value;
    } });
  });
  try {
    // Prove the native-style seam actually holds an unkeyed Radix exit. Without
    // this control, happy-dom's no-animation default would hide the regression.
    const baselineTree = (open: boolean) => <Dialog open={open}><DialogContent><DialogTitle>Baseline</DialogTitle><DialogDescription>Exit control</DialogDescription><Button>Old action</Button></DialogContent></Dialog>;
    const baseline = render(baselineTree(true));
    const heldBaseline = screen.getByRole("button", { name: "Old action" });
    baseline.rerender(baselineTree(false));
    expect(heldBaseline.isConnected).toBe(true);
    baseline.unmount();
    await waitFor(() => expect(document.body.style.pointerEvents).not.toBe("none"));

    const { t, user, refresh } = await mount("en");
    await user.click(screen.getByRole("menuitem", { name: t("accessibility.menuLabel") }));
    const oldSwitch = await screen.findByRole("switch", { name: t("accessibility.highContrast") });
    state.ownerKey = "actor-2";
    refresh();
    expect(oldSwitch.isConnected).toBe(false);
    fireEvent.click(oldSwitch);
    expect(state.patchLatest).not.toHaveBeenCalled();

    await waitFor(() => expect(document.body.style.pointerEvents).not.toBe("none"));
    await user.click(screen.getByRole("button", { name: t("header.accountMenu", { name: state.profile.full_name }) }));
    const theme = screen.getByRole("menuitem", { name: t("theme.label") });
    theme.focus();
    await user.keyboard("{ArrowRight}");
    const oldTheme = await screen.findByRole("menuitemradio", { name: t("theme.light") });
    state.ownerKey = "actor-3";
    refresh();
    expect(oldTheme.isConnected).toBe(false);
    fireEvent.click(oldTheme);
    expect(state.setThemeMode).not.toHaveBeenCalled();
    await waitFor(() => expect(document.body.style.pointerEvents).not.toBe("none"));
    expect(screen.getAllByRole("button", { name: t("header.accountMenu", { name: state.profile.full_name }) })).toHaveLength(1);
    expect(document.querySelectorAll('[data-slot="dialog-content"], [data-slot="dropdown-menu-content"], [data-slot="dropdown-menu-sub-content"]')).toHaveLength(0);
    expect(document.body).not.toHaveAttribute("data-scroll-locked");
  } finally { style.mockRestore(); }
});
