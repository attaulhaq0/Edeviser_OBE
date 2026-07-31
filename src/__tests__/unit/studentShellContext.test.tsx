// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter } from "react-router-dom";
import i18n from "@/lib/i18n";

const mockState = vi.hoisted(() => ({
  level: {
    level: 4,
    title: "Explorer",
    xpTotal: 750,
    xpForCurrentLevel: 500,
    xpForNextLevel: 1000,
    progressPercent: 50,
  },
  completeness: 70,
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "student-1" } }),
}));

vi.mock("@/hooks/useLevel", () => ({
  useLevel: () => ({
    data: mockState.level,
    isPending: false,
  }),
}));

vi.mock("@/hooks/useStudentProfile", () => ({
  useStudentProfile: () => ({
    data: { profile_completeness: mockState.completeness },
    isPending: false,
  }),
}));

import StudentSidebarExtras from "@/components/shared/StudentSidebarExtras";
import StudentLearningProfileRail from "@/features/student/rails/StudentLearningProfileRail";
import StudentSettingsRail from "@/features/student/rails/StudentSettingsRail";

const renderWithAppContext = (children: React.ReactNode) =>
  render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>{children}</MemoryRouter>
    </I18nextProvider>
  );

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

afterEach(cleanup);

describe("student prototype shell context", () => {
  it("renders the student upgrade card", () => {
    renderWithAppContext(<StudentSidebarExtras />);

    expect(
      screen.getByRole("link", { name: /Upgrade to Premium/i })
    ).toHaveAttribute("href", "/student/marketplace");
  });

  it("binds the learning-profile rail completeness to profile data", () => {
    renderWithAppContext(<StudentLearningProfileRail />);

    expect(screen.getByText("🧠 Why this matters")).toBeInTheDocument();
    expect(screen.getByText("70%")).toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", { name: "Profile completeness" })
    ).toHaveAttribute("aria-valuenow", "70");
    expect(
      screen.getByRole("link", { name: "Finish micro-assessments →" })
    ).toHaveAttribute("href", "/student/settings/reassessment");
  });

  it("renders the approved student settings privacy rail", () => {
    renderWithAppContext(<StudentSettingsRail />);

    expect(screen.getByText("🔒 Your data")).toBeInTheDocument();
    expect(
      screen.getByText(/Nothing here is shared with classmates/)
    ).toBeInTheDocument();
  });
});
