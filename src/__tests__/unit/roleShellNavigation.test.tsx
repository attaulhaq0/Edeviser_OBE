import { useEffect } from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  createMemoryRouter,
  RouterProvider,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { I18nextProvider } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "@/lib/i18n";
import type { UserRole } from "@/types/app";
import { navItems } from "@/lib/navItems";
import { getPrimaryNavItems, getMoreNavItems } from "@/lib/navPresentation";

const fixture = vi.hoisted(() => ({
  role: "student" as UserRole,
  surveyCount: 1,
}));
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "fixture" },
    profile: { id: "fixture", role: fixture.role },
  }),
}));
vi.mock("@/hooks/useSurveyAssignmentsCount", () => ({
  useSurveyAssignmentsCount: () => ({ data: fixture.surveyCount }),
}));
vi.mock("@/hooks/usePageViewLogger", () => ({ usePageViewLogger: () => {} }));
vi.mock("@/hooks/useIntentPrefetch", () => ({
  useIntentPrefetch: () => () => ({}),
}));
vi.mock("@/ai/lib/featureGate", () => ({ isAiSurfaceEnabled: () => false }));
vi.mock("@/components/shared/StudentSidebarExtras", () => ({
  default: () => null,
}));
vi.mock("@/components/shared/GlobalHeader", () => ({ default: HeaderProbe }));
vi.mock("@/components/shared/GuidedTour", () => ({ default: () => null }));
vi.mock("@/components/shared/EmailVerificationBanner", () => ({
  default: () => null,
}));

import RoleAppShell from "@/app/RoleAppShell";
import { useSidebar } from "@/components/shared/SidebarContext";
import { Button } from "@/components/ui/button";

function HeaderProbe() {
  const { toggle, mobileOpen } = useSidebar();
  return (
    <Button
      onClick={toggle}
      aria-expanded={mobileOpen}
      aria-controls="mobile-navigation"
    >
      Open fixture navigation
    </Button>
  );
}
let navigateFixture: ((path: string) => void) | undefined;
function StateProbe() {
  const { mobileOpen } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    navigateFixture = navigate;
  }, [navigate]);
  return (
    <>
      <output data-testid="open-state">{String(mobileOpen)}</output>
      <output data-testid="path">{location.pathname}</output>
    </>
  );
}
let desktop: boolean;
const listeners = new Set<() => void>();
const resize = (wide: boolean) =>
  act(() => {
    desktop = wide;
    for (const listener of listeners) listener();
  });
const mount = () => {
  const router = createMemoryRouter(
    [
      {
        path: "*",
        element: (
          <RoleAppShell userRole={fixture.role}>
            <StateProbe />
          </RoleAppShell>
        ),
      },
    ],
    {
      initialEntries: [`/${fixture.role}/dashboard`],
    }
  );
  return render(
    <I18nextProvider i18n={i18n}>
      <RouterProvider router={router} />
    </I18nextProvider>
  );
};

beforeEach(async () => {
  fixture.role = "student";
  fixture.surveyCount = 1;
  desktop = false;
  navigateFixture = undefined;
  listeners.clear();
  vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
    media: query,
    matches: query === "(min-width: 640px)" && desktop,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => true,
    addEventListener: (_event: string, listener: unknown) => {
      if (typeof listener === "function") listeners.add(listener as () => void);
    },
    removeEventListener: (_event: string, listener: unknown) => {
      if (typeof listener === "function")
        listeners.delete(listener as () => void);
    },
  }));
  await i18n.changeLanguage("en");
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  listeners.clear();
});

describe("role shell navigation ownership and modal state (not geometry proof)", () => {
  it.each(["student", "teacher", "coordinator", "admin", "parent"] as const)(
    "mounts exactly one bottom bar for %s",
    (role) => {
      fixture.role = role;
      const view = mount();
      expect(
        view.container.querySelectorAll(".new-mobile-tabbar")
      ).toHaveLength(1);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(view.container.querySelector(".app-sidebar")).toBeNull();
      expect(view.container.querySelector(".role-app-shell")).toHaveAttribute(
        "data-role",
        role
      );
    }
  );

  it("opens a named role-scoped modal, then removes its links on Escape", async () => {
    const user = userEvent.setup();
    mount();
    const trigger = screen.getByRole("button", {
      name: "Open fixture navigation",
    });
    await user.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "Primary navigation" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("id", "mobile-navigation");
    expect(dialog).toHaveAttribute("data-role", "student");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(
      within(dialog).getByRole("link", { name: "Courses & Tasks" })
    ).toBeInTheDocument();
    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    );
    expect(screen.getByTestId("open-state")).toHaveTextContent("false");
    expect(
      screen.queryByRole("link", { name: "Courses & Tasks" })
    ).not.toBeInTheDocument();
  });

  it("closes on a navigation link without changing its destination", async () => {
    const user = userEvent.setup();
    mount();
    await user.click(
      screen.getByRole("button", { name: "Open fixture navigation" })
    );
    await user.click(
      within(screen.getByRole("dialog")).getByRole("link", {
        name: "Courses & Tasks",
      })
    );
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    );
    expect(screen.getByTestId("path")).toHaveTextContent("/student/courses");
  });

  it("closes on programmatic navigation/history changes", async () => {
    const user = userEvent.setup();
    mount();
    await user.click(
      screen.getByRole("button", { name: "Open fixture navigation" })
    );
    act(() => {
      navigateFixture?.("/student/progress");
    });
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    );
    expect(screen.getByTestId("path")).toHaveTextContent("/student/progress");
  });

  it("clears modal state at the desktop breakpoint and does not reopen on shrinking", async () => {
    const user = userEvent.setup();
    const view = mount();
    await user.click(
      screen.getByRole("button", { name: "Open fixture navigation" })
    );
    resize(true);
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    );
    expect(view.container.querySelector("aside.app-sidebar")).not.toBeNull();
    expect(screen.getByTestId("open-state")).toHaveTextContent("false");
    resize(false);
    expect(view.container.querySelector("aside.app-sidebar")).toBeNull();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("localizes the modal title and close control in Arabic", async () => {
    await i18n.changeLanguage("ar");
    const user = userEvent.setup();
    mount();
    await user.click(
      screen.getByRole("button", { name: "Open fixture navigation" })
    );
    const dialog = screen.getByRole("dialog", { name: "التنقل الرئيسي" });
    await user.click(
      within(dialog).getByRole("button", { name: "إغلاق قائمة التنقل" })
    );
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    );
  });
  it.each(["student", "teacher", "coordinator", "admin", "parent"] as const)(
    "renders every declared %s destination once in the desktop sidebar",
    (role) => {
      fixture.role = role;
      resize(true);
      const view = mount();
      const links = [
        ...view.container.querySelectorAll<HTMLAnchorElement>(
          "aside.app-sidebar a.sidebar-item"
        ),
      ];
      expect(links.map((item) => item.getAttribute("href"))).toEqual(
        [...getPrimaryNavItems(role), ...getMoreNavItems(role)].map(
          (item) => item.to
        )
      );
      expect(links).toHaveLength(navItems[role].length);
      if (role === "admin") {
        expect(
          links.some(
            (item) =>
              item.getAttribute("href") === "/admin/settings/configuration" &&
              item.textContent?.includes("Institution Settings")
          )
        ).toBe(true);
        expect(
          links.some(
            (item) =>
              item.getAttribute("href") === "/admin/settings/institution"
          )
        ).toBe(false);
      }
    }
  );

  it("hides only unassigned surveys from the actual student drawer", async () => {
    fixture.surveyCount = 0;
    mount();
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Open fixture navigation" }));
    const dialog = screen.getByRole("dialog", { name: "Primary navigation" });
    expect(dialog.querySelector('a[href="/student/surveys"]')).toBeNull();
    expect(dialog.querySelector('a[href="/student/friends"]')).not.toBeNull();
    expect(
      dialog.querySelector('a[href="/student/assignments"]')
    ).not.toBeNull();
  });
  it("marks the real admin configuration or legacy department alias active, never both", () => {
    fixture.role = "admin";
    resize(true);
    const view = mount();
    const settings = view.container.querySelector(
      'a.sidebar-item[href="/admin/settings/configuration"]'
    );
    const departments = view.container.querySelector(
      'a.sidebar-item[href="/admin/departments"]'
    );
    expect(settings).not.toBeNull();
    expect(departments).not.toBeNull();
    act(() => {
      navigateFixture?.("/admin/settings/institution");
    });
    expect(departments).toHaveAttribute("aria-current", "page");
    expect(departments).toHaveAttribute("data-active", "true");
    expect(settings).toHaveAttribute("data-active", "false");
    act(() => {
      navigateFixture?.("/admin/settings/configuration");
    });
    expect(settings).toHaveAttribute("aria-current", "page");
    expect(settings).toHaveAttribute("data-active", "true");
    expect(departments).toHaveAttribute("data-active", "false");
  });

  it("lets the mobile profile tab represent its actual admin legacy alias", () => {
    fixture.role = "admin";
    const view = mount();
    act(() => {
      navigateFixture?.("/admin/profile");
    });
    expect(
      view.container.querySelector(
        '.new-mobile-tabbar a[href="/admin/settings/profile"]'
      )
    ).toHaveAttribute("aria-current", "page");
  });
});
