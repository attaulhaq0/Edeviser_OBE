import { createElement, lazy, useEffect, type ReactNode } from "react";
import { act, cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  createMemoryRouter,
  Outlet,
  RouterProvider,
  Link,
  useLocation,
} from "react-router-dom";
import { I18nextProvider } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "@/lib/i18n";

const state = vi.hoisted(() => ({
  headerMounts: 0,
  role: "teacher",
  analytics: vi.fn(),
}));
vi.mock("@/lib/analyticsConsent", () => ({
  captureAnalyticsEvent: state.analytics,
}));
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "fixture" },
    profile: { id: "fixture", role: state.role, onboarding_completed: true },
  }),
}));
vi.mock("@/hooks/useSurveyAssignmentsCount", () => ({
  useSurveyAssignmentsCount: () => ({ data: 0 }),
}));
vi.mock("@/hooks/usePageViewLogger", () => ({ usePageViewLogger: () => {} }));
vi.mock("@/hooks/useIntentPrefetch", () => ({
  useIntentPrefetch: () => () => ({}),
}));
vi.mock("@/ai/lib/featureGate", () => ({ isAiSurfaceEnabled: () => false }));
vi.mock("@/components/shared/StudentSidebarExtras", () => ({
  default: () => null,
}));
vi.mock("@/components/shared/GuidedTour", () => ({ default: () => null }));
vi.mock("@/components/shared/EmailVerificationBanner", () => ({
  default: () => null,
}));
vi.mock("@/components/shared/GlobalHeader", () => ({
  default: function FixtureHeader() {
    useEffect(() => {
      state.headerMounts++;
    }, []);
    return (
      <header>
        <Link to={`/${state.role}/healthy`}>Healthy page</Link>
        <Link to={`/${state.role}/broken`}>Broken page</Link>
      </header>
    );
  },
}));
vi.mock("@/features/teacher/dashboard/TeacherDashboardRail", () => ({
  default: () => <aside>Teacher context rail</aside>,
}));
vi.mock("@/features/student/rails/StudentFallbackRail", () => ({
  default: () => <aside>Student context rail</aside>,
}));
import RoleAppShell from "@/app/RoleAppShell";
import AdminLayout from "@/pages/admin/AdminLayout";
import CoordinatorLayout from "@/pages/coordinator/CoordinatorLayout";
import TeacherLayout from "@/pages/teacher/TeacherLayout";
import StudentLayout from "@/pages/student/StudentLayout";
import ParentLayout from "@/pages/parent/ParentLayout";
import ErrorBoundary from "@/components/shared/ErrorBoundary";

const Broken = () => {
  throw new Error("PRIVATE_INTERNAL_EXCEPTION_DO_NOT_RENDER");
};
const Healthy = () => <p>Healthy owned page</p>;
function RoleFixture({ rail }: { rail?: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <RoleAppShell
      userRole="teacher"
      rail={
        rail ??
        (pathname.endsWith("/rail-broken") ? (
          <Broken />
        ) : (
          <aside>Healthy context rail</aside>
        ))
      }
    >
      <Outlet />
    </RoleAppShell>
  );
}
const mountRole = (path: string, rail?: ReactNode) => {
  const router = createMemoryRouter(
    [
      {
        path: "/teacher/*",
        element: <RoleFixture rail={rail} />,
        children: [
          { path: "broken", element: <Broken /> },
          { path: "healthy", element: <Healthy /> },
          { path: "rail-broken", element: <Healthy /> },
        ],
      },
    ],
    { initialEntries: [path] }
  );
  return render(
    <I18nextProvider i18n={i18n}>
      <RouterProvider router={router} />
    </I18nextProvider>
  );
};

beforeEach(async () => {
  state.headerMounts = 0;
  state.role = "teacher";
  state.analytics.mockClear();
  vi.spyOn(console, "error").mockImplementation(() => {});
  await i18n.changeLanguage("en");
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("S07 route-local errors and accessible lazy states", () => {
  it.each(["admin", "coordinator", "teacher", "student", "parent"] as const)(
    "keeps real %s layout/nav when a nested leaf fails",
    (role) => {
      state.role = role;
      const layout = {
        admin: AdminLayout,
        coordinator: CoordinatorLayout,
        teacher: TeacherLayout,
        student: StudentLayout,
        parent: ParentLayout,
      }[role];
      const router = createMemoryRouter(
        [
          {
            path: `/${role}/*`,
            element: createElement(layout),
            children: [
              { path: "broken", element: <Broken /> },
              { path: "healthy", element: <Healthy /> },
            ],
          },
        ],
        { initialEntries: [`/${role}/broken`] }
      );
      render(
        <I18nextProvider i18n={i18n}>
          <RouterProvider router={router} />
        </I18nextProvider>
      );
      expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
      expect(document.querySelector(".role-app-shell")).toHaveAttribute(
        "data-role",
        role
      );
      expect(screen.getAllByRole("navigation").length).toBeGreaterThan(0);
      expect(
        within(screen.getByRole("main")).getByRole("alert")
      ).toHaveTextContent("Reload this page to try again");
      expect(state.analytics).toHaveBeenCalledWith("route_error_shown", {
        path: `/${role}/broken`,
      });
      expect(screen.getByRole("main")).not.toHaveTextContent(
        "PRIVATE_INTERNAL_EXCEPTION_DO_NOT_RENDER"
      );
    }
  );
  it("preserves the role shell, healthy rail and event contract on a failing page", async () => {
    const user = userEvent.setup();
    mountRole("/teacher/broken");
    const shell = screen.getByRole("main");
    expect(shell).toHaveAttribute("id", "main-content");
    expect(screen.getByText("Healthy context rail")).toBeInTheDocument();
    expect(
      within(shell).getByRole("heading", { name: "Page unavailable" })
    ).toBeInTheDocument();
    expect(within(shell).getByRole("alert")).toHaveTextContent(
      "Reload this page to try again"
    );
    expect(
      within(shell).getByRole("button", { name: "Reload page" })
    ).toHaveClass("min-h-11");
    expect(shell).not.toHaveTextContent(
      "PRIVATE_INTERNAL_EXCEPTION_DO_NOT_RENDER"
    );
    expect(screen.getAllByRole("navigation").length).toBeGreaterThan(0);
    expect(state.analytics).toHaveBeenCalledTimes(1);
    expect(state.analytics).toHaveBeenCalledWith("route_error_shown", {
      path: "/teacher/broken",
    });
    const headerMounts = state.headerMounts;
    await user.click(screen.getByRole("link", { name: "Healthy page" }));
    expect(await screen.findByText("Healthy owned page")).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Page unavailable" })
    ).toBeNull();
    expect(state.headerMounts).toBe(headerMounts);
    expect(state.analytics).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("link", { name: "Broken page" }));
    expect(
      await screen.findByRole("heading", { name: "Page unavailable" })
    ).toBeInTheDocument();
    expect(state.analytics).toHaveBeenCalledTimes(2);
  });

  it("contains independent rail errors without replacing content or showing rail below xl", () => {
    mountRole("/teacher/rail-broken");
    expect(screen.getByText("Healthy owned page")).toBeInTheDocument();
    const rail = screen.getByRole("complementary", {
      name: "Page unavailable",
    });
    expect(rail).toHaveClass("hidden", "xl:block");
    expect(rail).not.toHaveTextContent(
      "PRIVATE_INTERNAL_EXCEPTION_DO_NOT_RENDER"
    );
    expect(state.analytics).toHaveBeenCalledWith("route_error_shown", {
      path: "/teacher/rail-broken",
    });
    expect(screen.getAllByRole("navigation").length).toBeGreaterThan(0);
  });

  it("announces lazy work in English and Arabic without hiding the shell", async () => {
    for (const [language, loading] of [
      ["en", "Loading page…"],
      ["ar", "جارٍ تحميل الصفحة…"],
    ] as const) {
      await i18n.changeLanguage(language);
      let release: ((value: { default: () => ReactNode }) => void) | undefined;
      const Pending = lazy(
        () =>
          new Promise<{ default: () => ReactNode }>((resolve) => {
            release = resolve;
          })
      );
      // Exercise the real shared boundary as a leaf, not a mock skeleton.
      const router = createMemoryRouter(
        [
          {
            path: "/teacher/healthy",
            element: (
              <RoleAppShell userRole="teacher">
                <Pending />
              </RoleAppShell>
            ),
          },
        ],
        { initialEntries: ["/teacher/healthy"] }
      );
      render(
        <I18nextProvider i18n={i18n}>
          <RouterProvider router={router} />
        </I18nextProvider>
      );
      expect(
        within(screen.getByRole("main")).getByRole("status", { name: loading })
      ).toHaveAttribute("aria-busy", "true");
      expect(screen.getAllByRole("navigation").length).toBeGreaterThan(0);
      expect(release).toBeTypeOf("function");
      await act(async () =>
        release?.({ default: () => <p>Loaded owned page</p> })
      );
      expect(await screen.findByText("Loaded owned page")).toBeInTheDocument();
      cleanup();
    }
  });

  it("localizes the error recovery without leaking the thrown Arabic-route details", async () => {
    await i18n.changeLanguage("ar");
    mountRole("/teacher/broken");
    expect(
      screen.getByRole("heading", { name: "الصفحة غير متاحة" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "إعادة تحميل الصفحة" })
    ).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("أعد تحميل الصفحة");
    expect(screen.getByRole("main")).not.toHaveTextContent(
      "PRIVATE_INTERNAL_EXCEPTION_DO_NOT_RENDER"
    );
  });

  it("does not disclose exception details in the global emergency fallback", () => {
    render(
      <ErrorBoundary>
        <Broken />
      </ErrorBoundary>
    );
    expect(
      screen.getByText(/The application could not continue/)
    ).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(
      "PRIVATE_INTERNAL_EXCEPTION_DO_NOT_RENDER"
    );
  });
});
