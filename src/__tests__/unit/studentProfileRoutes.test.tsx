// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter } from "react-router-dom";
import i18n from "@/lib/i18n";
import type { StudentProfile } from "@/hooks/useStudentProfile";

const state: {
  profile: StudentProfile | null;
  profileError: boolean;
  badgesError: boolean;
} = {
  profile: null,
  profileError: false,
  badgesError: false,
};

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "student-1" } }),
}));

vi.mock("@/hooks/useStudentProfile", () => ({
  useStudentProfile: () => ({
    data: state.profile,
    isLoading: false,
    isError: state.profileError,
    refetch: vi.fn(),
  }),
}));

vi.mock("@/hooks/useTieredBadges", () => ({
  useTieredBadges: () => ({
    data: [],
    isLoading: false,
    isError: state.badgesError,
    refetch: vi.fn(),
  }),
  usePinBadge: () => ({ mutate: vi.fn() }),
  useUnpinBadge: () => ({ mutate: vi.fn() }),
}));

import LearningProfilePage from "@/pages/student/profile/LearningProfilePage";
import StudentBadgesPage from "@/pages/student/badges/StudentBadgesPage";

const renderPage = (page: React.ReactNode) =>
  render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>{page}</MemoryRouter>
    </I18nextProvider>
  );

describe("student badge and learning-profile route surfaces", () => {
  beforeEach(() => {
    state.profile = null;
    state.profileError = false;
    state.badgesError = false;
  });

  it("offers onboarding when no learning profile exists", () => {
    renderPage(<LearningProfilePage />);

    expect(
      screen.getByText(i18n.t("student:learningProfile.emptyTitle"))
    ).toBeTruthy();
    expect(
      screen
        .getByRole("link", {
          name: i18n.t("student:learningProfile.completeProfile"),
        })
        .getAttribute("href")
    ).toBe("/student/onboarding/complete-profile");
  });

  it("shows a recoverable learning-profile error", () => {
    state.profileError = true;
    renderPage(<LearningProfilePage />);

    expect(
      screen.getByText(i18n.t("student:learningProfile.loadError"))
    ).toBeTruthy();
  });

  it("renders the badges route with the real badge collection state", () => {
    renderPage(<StudentBadgesPage />);

    expect(screen.getByText(i18n.t("student:badges.title"))).toBeTruthy();
    expect(screen.getByTestId("badge-collection")).toBeTruthy();
  });
});
