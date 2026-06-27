// @vitest-environment happy-dom
// =============================================================================
// Challenges — empty-state fallback & seed-failure resilience (Task 19.4)
//
// Covers Requirement 12:
//  - R12.1: the Challenges surface presents starter challenges; when none are
//           joined/seeded it must not be hollow — it renders the shared
//           NoChallenges empty state.
//  - R12.6: the genuine zero-data fallback uses the shared EmptyState library
//           (NoChallenges) rather than an inline ad-hoc empty state.
//  - R12.8: if the seed migrations fail to run, the surface SHALL still load
//           and render its empty-state component rather than being blocked.
//
// Both Challenge list surfaces (ChallengeListView and ChallengeListPage) are
// verified for the zero-data path and for "no crash" mounting when the data
// hook returns an empty array (seed-absent) or undefined (query produced no
// rows).
// =============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { I18nextProvider } from "react-i18next";

import i18n from "@/lib/i18n";
import type { Challenge } from "@/hooks/useChallenges";

// ─── Mock state controls ─────────────────────────────────────────────────────

interface MockState {
  challenges: Challenge[] | undefined;
  isLoading: boolean;
}

const state: MockState = {
  challenges: [],
  isLoading: false,
};

const resetState = () => {
  state.challenges = [];
  state.isLoading = false;
};

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "student-1" } }),
}));

vi.mock("@/hooks/useChallenges", () => ({
  useStudentChallenges: () => ({
    data: state.challenges,
    isLoading: state.isLoading,
  }),
  useChallengeProgress: () => ({ data: [] }),
  useChallengeParticipantsBatch: () => ({ data: {} }),
}));

vi.mock("@/hooks/useRealtime", () => ({
  useRealtime: () => ({ isLive: true, retryCount: 0 }),
}));

// The list surfaces only consume `useQueryClient` from react-query directly;
// the data hooks themselves are mocked above, so a stub client is sufficient.
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  useQuery: () => ({ data: undefined, isLoading: false }),
}));

import ChallengeListView from "@/pages/student/challenges/ChallengeListView";
import ChallengeListPage from "@/pages/student/challenges/ChallengeListPage";

const renderView = () =>
  render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        <ChallengeListView />
      </MemoryRouter>
    </I18nextProvider>
  );

const renderPage = () =>
  render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        <ChallengeListPage />
      </MemoryRouter>
    </I18nextProvider>
  );

const noChallengesTitle = i18n.t("common:empty.noChallenges.title");

beforeEach(() => {
  resetState();
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("Challenges empty-state fallback (R12.1, R12.6, R12.8)", () => {
  it("ChallengeListView renders the shared NoChallenges empty state on zero data", () => {
    state.challenges = [];
    renderView();

    // Surface still mounts (heading visible) — seed-failure resilience.
    expect(screen.getByText("Challenges")).toBeTruthy();
    // Shared EmptyState_Library component is rendered for the active tab.
    expect(screen.getByText(noChallengesTitle)).toBeTruthy();
  });

  it("ChallengeListView still loads (no crash) when the hook returns undefined (seed-absent)", () => {
    // Simulates a query that produced no rows / failed seed: data is undefined.
    state.challenges = undefined;
    renderView();

    expect(screen.getByText("Challenges")).toBeTruthy();
    expect(screen.getByText(noChallengesTitle)).toBeTruthy();
  });

  it("ChallengeListPage renders the shared NoChallenges empty state on zero data", () => {
    state.challenges = [];
    renderPage();

    expect(screen.getByText("Challenges")).toBeTruthy();
    expect(screen.getByText(noChallengesTitle)).toBeTruthy();
  });

  it("ChallengeListPage still loads (no crash) when the hook returns undefined (seed-absent)", () => {
    state.challenges = undefined;
    renderPage();

    expect(screen.getByText("Challenges")).toBeTruthy();
    expect(screen.getByText(noChallengesTitle)).toBeTruthy();
  });
});

// ─── Live-schema rendering regression (goal_metric drift) ────────────────────
// Guards the fix for the runtime crash "column social_challenges.goal_metric
// does not exist". The legacy query/types referenced columns that are absent
// from the live `social_challenges` table. These tests assert the cards render
// from the LIVE columns (`participation_mode`, `goal_target`, `reward_xp`,
// `reward_badge_id`) and never the removed ones (`goal_metric`, `reward_type`,
// `reward_value`). If a regression reintroduces the legacy fields, the reward/
// goal assertions below fail (undefined values) — catching it before runtime.

const makeChallenge = (overrides: Partial<Challenge> = {}): Challenge => ({
  id: "ch-1",
  course_id: "course-1",
  institution_id: "inst-1",
  title: "XP Sprint",
  description: "Earn XP together",
  challenge_type: "xp_race",
  participation_mode: "team",
  goal_target: 100,
  start_date: "2026-01-01T00:00:00Z",
  end_date: "2026-12-31T00:00:00Z",
  reward_xp: 150,
  reward_badge_id: null,
  status: "active",
  created_by: "teacher-1",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  ...overrides,
});

describe("Challenges live-schema rendering (no goal_metric drift)", () => {
  it("ChallengeListView renders reward_xp, goal_target and the team label from live columns", () => {
    state.challenges = [makeChallenge()];
    renderView();

    expect(screen.getByText("XP Sprint")).toBeTruthy();
    expect(screen.getByText("Goal: 100")).toBeTruthy();
    // reward comes from reward_xp, not the removed reward_value
    expect(screen.getByText("+150 XP")).toBeTruthy();
    // team/individual comes from participation_mode, not legacy challenge_type
    expect(screen.getByText("Team")).toBeTruthy();
  });

  it("ChallengeListView shows a Badge reward when reward_badge_id is set", () => {
    state.challenges = [
      makeChallenge({
        id: "ch-2",
        reward_badge_id: "badge-1",
        participation_mode: "individual",
      }),
    ];
    renderView();

    expect(screen.getByText("Badge")).toBeTruthy();
    expect(screen.getByText("Individual")).toBeTruthy();
  });

  it("ChallengeListPage renders live reward_xp and the challenge_type label", () => {
    state.challenges = [makeChallenge()];
    renderPage();

    expect(screen.getByText("XP Sprint")).toBeTruthy();
    expect(screen.getByText("Goal: 100")).toBeTruthy();
    expect(screen.getByText("+150 XP")).toBeTruthy();
    // challenge_type → humanized label (academic/habit/xp_race/...)
    expect(screen.getByText("XP Race")).toBeTruthy();
  });
});
