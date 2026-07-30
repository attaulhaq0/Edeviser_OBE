// @vitest-environment happy-dom
// =============================================================================
// Sidebar — prototype primary/MORE navigation
// Feature: prototype-frontend-rebuild, Task 1.2.2
// =============================================================================

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter } from "react-router-dom";
import { Circle } from "lucide-react";
import i18n from "@/lib/i18n";
import type { NavItem } from "@/lib/navItems";

const mockState = vi.hoisted(() => ({
  navItems: { student: [] } as Record<string, unknown[]>,
  surveyData: 0 as number | undefined,
}));

vi.mock("@/lib/navItems", () => ({ navItems: mockState.navItems }));
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ profile: { role: "student" } }),
}));
vi.mock("@/hooks/useSurveyAssignmentsCount", () => ({
  useSurveyAssignmentsCount: () => ({ data: mockState.surveyData }),
}));
vi.mock("@/components/shared/StudentSidebarExtras", () => ({
  default: () => null,
}));
vi.mock("@/components/shared/MobileTabBar", () => ({ default: () => null }));

import Sidebar from "@/components/shared/Sidebar";
import { SidebarProvider } from "@/components/shared/SidebarContext";

const studentItems = (): NavItem[] => [
  { to: "/student/dashboard", labelKey: "nav.mobile.home", icon: Circle },
  { to: "/student/learning-path", labelKey: "nav.mobile.learn", icon: Circle },
  { to: "/student/tutor", labelKey: "nav.mobile.tutor", icon: Circle },
  { to: "/student/progress", labelKey: "nav.mobile.progress", icon: Circle },
  { to: "/student/profile", labelKey: "nav.me", icon: Circle },
  { to: "/student/courses", labelKey: "nav.coursesTasks", icon: Circle },
  { to: "/student/today", labelKey: "nav.dailyReview", icon: Circle },
  { to: "/student/habits", labelKey: "nav.wellness", icon: Circle },
  { to: "/student/planner", labelKey: "nav.focus", icon: Circle },
  { to: "/student/challenges", labelKey: "nav.quests", icon: Circle },
  { to: "/student/leaderboard", labelKey: "nav.leaderboard", icon: Circle },
  { to: "/student/team", labelKey: "nav.myTeam", icon: Circle },
  { to: "/student/journal", labelKey: "nav.journal", icon: Circle },
  { to: "/student/calendar", labelKey: "nav.calendar", icon: Circle },
  { to: "/student/marketplace", labelKey: "nav.shop", icon: Circle },
  { to: "/student/notifications", labelKey: "nav.notifications", icon: Circle },
  { to: "/student/settings/profile", labelKey: "nav.settings", icon: Circle },
  { to: "/student/surveys", labelKey: "nav.surveys", icon: Circle },
];

const renderSidebar = (initialPath = "/student/dashboard") =>
  render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter initialEntries={[initialPath]}>
        <SidebarProvider>
          <Sidebar />
        </SidebarProvider>
      </MemoryRouter>
    </I18nextProvider>
  );

beforeEach(async () => {
  await i18n.changeLanguage("en");
  mockState.navItems.student = studentItems();
  mockState.surveyData = 0;
});

afterEach(cleanup);

describe("Sidebar primary/MORE navigation", () => {
  it("keeps the student prototype destinations in the right primary and MORE order", () => {
    renderSidebar();

    const links = screen.getAllByRole("link");
    expect(links.slice(0, 5).map((link) => link.textContent)).toEqual([
      expect.stringContaining("Home"),
      expect.stringContaining("Learn"),
      expect.stringContaining("Tutor"),
      expect.stringContaining("Progress"),
      expect.stringContaining("Me"),
    ]);

    const moreLabel = screen.getByText("More");
    const more = moreLabel.parentElement;
    if (!more) throw new Error("expected the MORE section");
    expect(
      within(more).getByRole("link", { name: "Courses & Tasks" })
    ).toBeInTheDocument();
    expect(
      within(more).queryByRole("link", { name: "Settings" })
    ).not.toBeInTheDocument();
  });

  it("keeps conditional Surveys out of the sidebar even if the item exists in data", () => {
    renderSidebar();
    expect(
      screen.queryByRole("link", { name: "Surveys" })
    ).not.toBeInTheDocument();
  });

  it("marks the active route exactly once", () => {
    renderSidebar("/student/progress");
    expect(screen.getAllByText("(current page)")).toHaveLength(1);
  });
});
