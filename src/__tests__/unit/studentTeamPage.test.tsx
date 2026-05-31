// @vitest-environment happy-dom
// =============================================================================
// StudentTeamPage — join/create path & empty-state behavior (Task 19.2)
//
// Covers Requirement 12:
//  - R12.3: while unassigned to any team, the My Team surface explains how
//           teams work and surfaces a path to join or create a team.
//  - R12.3a: when an assigned student has no team data to display, the surface
//            renders the shared NoTeams empty-state component.
//  - R12.6: the genuine zero-data fallback uses the shared EmptyState library
//           rather than an inline ad-hoc empty state.
// =============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { I18nextProvider } from "react-i18next";

import i18n from "@/lib/i18n";

// ─── Mock state controls ─────────────────────────────────────────────────────

interface MockState {
  courseId: string | null;
  courseLoading: boolean;
  myTeamId: string | null;
  teamIdLoading: boolean;
  teams: Array<{ id: string; name: string }>;
  teamsLoading: boolean;
}

const state: MockState = {
  courseId: "course-1",
  courseLoading: false,
  myTeamId: null,
  teamIdLoading: false,
  teams: [],
  teamsLoading: false,
};

const resetState = () => {
  state.courseId = "course-1";
  state.courseLoading = false;
  state.myTeamId = null;
  state.teamIdLoading = false;
  state.teams = [];
  state.teamsLoading = false;
};

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "student-1" } }),
}));

vi.mock("@tanstack/react-query", () => ({
  // useFirstEnrolledCourseId is the only direct useQuery consumer in the page.
  useQuery: () => ({ data: state.courseId, isLoading: state.courseLoading }),
}));

vi.mock("@/lib/supabase", () => ({ supabase: {} }));

vi.mock("@/hooks/useTeamLeaderboard", () => ({
  useMyTeamId: () => ({ data: state.myTeamId, isLoading: state.teamIdLoading }),
}));

vi.mock("@/hooks/useTeams", () => ({
  useTeams: () => ({ data: state.teams, isLoading: state.teamsLoading }),
  useTeamGamification: () => ({ data: null }),
}));

vi.mock("@/components/shared/TeamDashboardCard", () => ({
  default: ({ team }: { team: { name: string } }) => (
    <div data-testid="team-dashboard-card">{team.name}</div>
  ),
}));

vi.mock("@/pages/student/leaderboard/TeamLeaderboard", () => ({
  default: () => <div data-testid="team-leaderboard" />,
}));

import StudentTeamPage from "@/pages/student/team/StudentTeamPage";

const renderPage = () =>
  render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        <StudentTeamPage />
      </MemoryRouter>
    </I18nextProvider>
  );

beforeEach(() => {
  resetState();
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("StudentTeamPage", () => {
  it("explains how teams work and surfaces a join/create path when unassigned (R12.3)", () => {
    state.myTeamId = null;
    renderPage();

    expect(
      screen.getByText(i18n.t("student:team.unassignedTitle"))
    ).toBeTruthy();
    expect(
      screen.getByText(i18n.t("student:team.howItWorksDescription"))
    ).toBeTruthy();

    const joinLink = screen.getByRole("link", {
      name: new RegExp(i18n.t("student:team.joinOrCreate"), "i"),
    });
    expect(joinLink.getAttribute("href")).toBe("/student/teams/new");
  });

  it("renders the team dashboard when assigned with team data", () => {
    state.myTeamId = "team-1";
    state.teams = [{ id: "team-1", name: "Code Warriors" }];
    renderPage();

    expect(screen.getByTestId("team-dashboard-card")).toBeTruthy();
    expect(screen.getByText("Code Warriors")).toBeTruthy();
  });

  it("renders the shared NoTeams empty state when assigned but team data is missing (R12.3a, R12.6)", () => {
    state.myTeamId = "team-1";
    state.teams = []; // assigned, but no matching team row to display
    renderPage();

    // NoTeams shared empty state copy (common namespace)
    expect(screen.getByText(i18n.t("common:empty.noTeams.title"))).toBeTruthy();
    // The unassigned join/create path must NOT show for an assigned student.
    expect(
      screen.queryByText(i18n.t("student:team.unassignedTitle"))
    ).toBeNull();
  });
});
