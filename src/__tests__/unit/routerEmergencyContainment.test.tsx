import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { Link, MemoryRouter } from "react-router-dom";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import i18n from "@/lib/i18n";

const state = vi.hoisted(() => ({ role: "admin", analytics: vi.fn() }));
vi.mock("@/lib/analyticsConsent", () => ({
  captureAnalyticsEvent: state.analytics,
}));
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "fixture" },
    role: state.role,
    profile: { role: state.role },
    isLoading: false,
  }),
}));
vi.mock("@/pages/LoginPage", () => ({
  default: () => {
    throw new Error("PRIVATE_LOGIN_ERROR");
  },
}));
vi.mock("@/pages/admin/AdminLayout", () => ({
  default: () => {
    throw new Error("PRIVATE_LAYOUT_ERROR");
  },
}));
vi.mock("@/pages/student/planner/FocusModePage", () => ({
  default: () => {
    throw new Error("PRIVATE_FOCUS_ERROR");
  },
}));
vi.mock("@/pages/NotFoundPage", () => ({
  default: () => <p>Healthy recovery page</p>,
}));
import AppRouter from "@/router/AppRouter";
const mount = (path: string) =>
  render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter initialEntries={[path]}>
        <Link to="/recover">Visit recovery page</Link>
        <AppRouter />
      </MemoryRouter>
    </I18nextProvider>
  );
beforeEach(async () => {
  state.role = "admin";
  state.analytics.mockClear();
  vi.spyOn(console, "error").mockImplementation(() => {});
  await i18n.changeLanguage("en");
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("S07 public, immersive and emergency router tiers", () => {
  it("keeps the public main and actionable copy after a login leaf fails", async () => {
    mount("/login");
    const main = await screen.findByRole("main");
    expect(main).toHaveAttribute("id", "main-content");
    expect(await within(main).findByRole("alert")).toHaveTextContent(
      "Reload this page to try again"
    );
    expect(
      within(main).getByRole("button", { name: "Reload page" })
    ).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("PRIVATE_LOGIN_ERROR");
    expect(state.analytics).toHaveBeenCalledWith("route_error_shown", {
      path: "/login",
    });
  });

  it("contains standalone protected focus failure inside an accessible immersive main", async () => {
    state.role = "student";
    mount("/student/focus/session-id");
    const main = await screen.findByRole("main");
    expect(main).toHaveAttribute("id", "main-content");
    expect(main).toHaveAttribute("tabindex", "-1");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Reload this page to try again"
    );
    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
    expect(document.body).not.toHaveTextContent("PRIVATE_FOCUS_ERROR");
    expect(state.analytics).toHaveBeenCalledWith("route_error_shown", {
      path: "/student/focus/session-id",
    });
  });

  it("lets browser navigation recover from a pre-shell layout exception without fake success", async () => {
    mount("/admin/dashboard");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Reload this page to try again"
    );
    expect(screen.queryByRole("main")).toBeNull();
    expect(state.analytics).toHaveBeenCalledTimes(1);
    expect(state.analytics).toHaveBeenCalledWith("route_error_shown", {
      path: "/admin/dashboard",
    });
    await userEvent
      .setup()
      .click(screen.getByRole("link", { name: "Visit recovery page" }));
    expect(
      await screen.findByText("Healthy recovery page")
    ).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
    expect(screen.queryByRole("alert")).toBeNull();
    expect(state.analytics).toHaveBeenCalledTimes(1);
  });
});
