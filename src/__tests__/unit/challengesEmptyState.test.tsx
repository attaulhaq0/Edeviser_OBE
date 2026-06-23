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
