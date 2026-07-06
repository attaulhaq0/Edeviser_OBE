import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Mock IntersectionObserver
// ---------------------------------------------------------------------------
let ioCallback: IntersectionObserverCallback | null = null;
class MockIntersectionObserver implements IntersectionObserver {
  root = null;
  rootMargin = "";
  thresholds: ReadonlyArray<number> = [];
  constructor(cb: IntersectionObserverCallback) {
    ioCallback = cb;
  }
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
  takeRecords = () => [];
}

const enterView = () => {
  act(() => {
    ioCallback?.(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      {} as IntersectionObserver
    );
  });
};

// ---------------------------------------------------------------------------
// Mocks: i18n, the team card, and the four team hooks
// ---------------------------------------------------------------------------
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@/components/shared/TeamDashboardCard", () => ({
  default: () => <div data-testid="team-card" />,
}));

const useFirstEnrolledCourseId = vi.fn();
const useMyTeamId = vi.fn();
const useTeams = vi.fn();
const useTeamGamification = vi.fn();

vi.mock("@/hooks/useFirstEnrolledCourse", () => ({
  useFirstEnrolledCourseId: (...args: unknown[]) =>
    useFirstEnrolledCourseId(...args),
}));
vi.mock("@/hooks/useTeamLeaderboard", () => ({
  useMyTeamId: (...args: unknown[]) => useMyTeamId(...args),
}));
vi.mock("@/hooks/useTeams", () => ({
  useTeams: (...args: unknown[]) => useTeams(...args),
  useTeamGamification: (...args: unknown[]) => useTeamGamification(...args),
}));

import StudentTeamSection from "../StudentTeamSection";

describe("StudentTeamSection (viewport-gated)", () => {
  beforeEach(() => {
    ioCallback = null;
    // The course hook respects `enabled` so the gating is observable end-to-end.
    useFirstEnrolledCourseId
      .mockReset()
      .mockImplementation(
        (_studentId: unknown, opts?: { enabled?: boolean }) => ({
          data: opts?.enabled ? "course-1" : undefined,
        })
      );
    useMyTeamId.mockReset().mockReturnValue({ data: "team-1" });
    useTeams
      .mockReset()
      .mockReturnValue({ data: [{ id: "team-1", name: "Team One" }] });
    useTeamGamification.mockReset().mockReturnValue({
      data: { id: "team-1", team_id: "team-1", xp_total: 0, streak_count: 0 },
    });
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not fire team queries or render the card until scrolled into view", () => {
    const { queryByTestId } = render(<StudentTeamSection studentId="stu-1" />);

    // Before intersection: course hook disabled, downstream ids undefined, no card.
    expect(useFirstEnrolledCourseId).toHaveBeenLastCalledWith("stu-1", {
      enabled: false,
    });
    expect(useMyTeamId).toHaveBeenLastCalledWith(undefined, undefined);
    expect(queryByTestId("team-card")).toBeNull();

    enterView();

    // After intersection: hooks enabled with real ids, card renders.
    expect(useFirstEnrolledCourseId).toHaveBeenLastCalledWith("stu-1", {
      enabled: true,
    });
    expect(useMyTeamId).toHaveBeenLastCalledWith("stu-1", "course-1");
    expect(queryByTestId("team-card")).not.toBeNull();
  });
});
