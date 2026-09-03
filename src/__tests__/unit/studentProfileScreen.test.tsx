// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter } from "react-router-dom";
import i18n from "@/lib/i18n";

const mocks = vi.hoisted(() => ({
  signOut: vi.fn(),
  toggleAnonymous: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "student-1" },
    profile: {
      id: "student-1",
      full_name: "Yusuf Ahmadi",
      email: "student@example.test",
      avatar_url: null,
    },
    signOut: mocks.signOut,
  }),
}));

vi.mock("@/hooks/useLevel", () => ({
  useLevel: () => ({
    data: {
      level: 4,
      xpTotal: 750,
      xpForCurrentLevel: 500,
      xpForNextLevel: 1000,
      progressPercent: 50,
    },
    isLoading: false,
  }),
}));

vi.mock("@/hooks/useStreak", () => ({
  useStreak: () => ({
    data: {
      streak_count: 12,
      last_login_date: "2026-07-29",
      streak_freezes_available: 2,
    },
    isLoading: false,
  }),
}));

vi.mock("@/hooks/useTieredBadges", () => ({
  useTieredBadges: () => ({
    data: [
      {
        id: "badge-1",
        name: "Perfect Day",
        tier: "gold",
      },
    ],
    isLoading: false,
  }),
}));

vi.mock("@/hooks/useStudentProfile", () => ({
  useStudentProfile: () => ({
    data: {
      profile_completeness: 70,
      learning_style: { dominant_style: "visual" },
    },
  }),
}));

vi.mock("@/hooks/useEquippedItems", () => ({
  useEquippedItems: () => ({ data: [], isLoading: false }),
}));

// T30: academic info card — mocked so no real query runs.
vi.mock("@/hooks/useStudentAcademicInfo", () => ({
  useStudentAcademicInfo: () => ({
    data: {
      programs: ["BSc Computer Science"],
      faculty: "College of Engineering",
      courses: [{ code: "CS101", name: "Intro to Programming" }],
    },
    isLoading: false,
  }),
}));

vi.mock("@/hooks/useHeatmapData", () => ({
  useHeatmapData: () => ({
    data: [
      {
        date: "2026-07-29",
        academicCount: 1,
        wellnessCount: 0,
        totalCount: 1,
        habits: [],
      },
    ],
    isLoading: false,
  }),
}));

vi.mock("@/hooks/useLeaderboard", () => ({
  useAnonymousStatus: () => ({
    data: { isAnonymous: false },
    isLoading: false,
  }),
  useToggleAnonymous: () => ({
    mutate: mocks.toggleAnonymous,
    isPending: false,
  }),
}));

import StudentProfilePage from "@/features/student/profile/StudentProfilePage";

afterEach(cleanup);

describe("StudentProfilePage prototype route", () => {
  it("renders real profile, progress, privacy, and account destinations", async () => {
    await i18n.changeLanguage("en");
    render(
      <I18nextProvider i18n={i18n}>
        <MemoryRouter>
          <StudentProfilePage />
        </MemoryRouter>
      </I18nextProvider>
    );

    expect(
      screen.getByRole("heading", { name: "Yusuf Ahmadi" })
    ).toBeInTheDocument();
    expect(screen.getByText("750")).toBeInTheDocument();
    expect(screen.getByText("Perfect Day")).toBeInTheDocument();
    expect(
      screen.getByRole("switch", {
        name: "Appear anonymous on leaderboards",
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Learning Profile/ })
    ).toHaveAttribute("href", "/student/learning-profile");
    expect(screen.getByRole("link", { name: /Settings/ })).toHaveAttribute(
      "href",
      "/student/settings/profile"
    );
  });
});
