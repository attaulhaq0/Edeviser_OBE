// @vitest-environment happy-dom
// =============================================================================
// CoordinatorProfileNew — professional profile / workspace config (task 3.6)
// Verifies real profile data (name/email from useAuth), the real workspace
// counts + "Programs I Manage" list (useCoordinatorProfileStats, mocked), and
// that the notification-preference toggles flip their ARIA state on click.
// =============================================================================

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en", changeLanguage: () => Promise.resolve() },
  }),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    profile: {
      id: "coord-1",
      full_name: "Dr. Khalid Ibrahim",
      email: "khalid.ibrahim@university.edu",
      role: "coordinator",
      avatar_url: null,
    },
  }),
}));

vi.mock("@/hooks/useConnectedIntegrations", () => ({
  useConnectedIntegrations: () => ({ data: {} }),
}));

vi.mock("@/hooks/useCoordinatorProfileStats", () => ({
  useCoordinatorProfileStats: () => ({
    data: {
      programs: [
        {
          id: "p1",
          code: "SCIENCE",
          name: "Science Department",
          courseCount: 6,
          studentCount: 64,
        },
        {
          id: "p2",
          code: "MATHEMATICS",
          name: "Mathematics Department",
          courseCount: 4,
          studentCount: 32,
        },
      ],
      totals: {
        programs: 2,
        courses: 10,
        students: 96,
        faculty: 5,
        facultyActive: 4,
        facultyInactive: 1,
      },
    },
    isPending: false,
  }),
}));

// Real academic profile + notification-prefs settings hooks (Phase B).
// NOTE: keep the prefs object INLINE inside the factory — vi.mock is hoisted to
// the top of the module, so it cannot reference a top-level const.
vi.mock("@/hooks/useCoordinatorProfileSettings", () => {
  const alertPrefs = {
    ploDrop: true,
    curriculumGap: true,
    evidenceReady: true,
    teacherInactivity: false,
    cqiDeadline: true,
  };
  return {
    useCoordinatorAcademicProfile: () => ({
      data: {
        department: "Computer Science",
        designation: "Program Coordinator",
        academic_rank: "Assistant Professor",
        highest_degree: "PhD",
        years_experience: 11,
      },
      isPending: false,
    }),
    useUpdateCoordinatorAcademicProfile: () => ({
      mutate: vi.fn(),
      isPending: false,
    }),
    useUpdateCoordinatorAlertPrefs: () => ({
      mutate: vi.fn(),
      isPending: false,
    }),
    readCoordinatorAlertPrefs: () => alertPrefs,
    DEFAULT_COORDINATOR_ALERT_PREFS: alertPrefs,
  };
});

import CoordinatorProfileNew from "@/components/shared/CoordinatorProfileNew";

const renderPage = () =>
  render(
    <MemoryRouter>
      <CoordinatorProfileNew />
    </MemoryRouter>
  );

describe("CoordinatorProfileNew", () => {
  it("renders the real name and email from the profile", () => {
    renderPage();
    expect(screen.getByText("Dr. Khalid Ibrahim")).toBeInTheDocument();
    expect(
      screen.getByText("khalid.ibrahim@university.edu")
    ).toBeInTheDocument();
  });

  it("renders the avatar initial when no avatar image is set", () => {
    renderPage();
    // getDisplayFirstName skips the "Dr." honorific → "Khalid" → initial "K".
    expect(screen.getByText("K")).toBeInTheDocument();
  });

  it("renders the real workspace counts and Programs I Manage list", () => {
    renderPage();
    // Real totals (unique numbers) from the stats hook.
    expect(screen.getByText("96")).toBeInTheDocument(); // students
    expect(screen.getByText("10")).toBeInTheDocument(); // courses
    // Real managed programs.
    expect(screen.getByText("Science Department")).toBeInTheDocument();
    expect(screen.getByText("Mathematics Department")).toBeInTheDocument();
  });

  it("renders five notification-preference switches", () => {
    renderPage();
    expect(screen.getAllByRole("switch")).toHaveLength(5);
  });

  it("starts with exactly one switch off and turns it on when clicked", async () => {
    const user = userEvent.setup();
    renderPage();

    // Only "Teacher inactivity" starts off.
    const off = screen.getByRole("switch", { checked: false });
    await user.click(off);

    // After toggling, no switch remains off.
    expect(
      screen.queryByRole("switch", { checked: false })
    ).not.toBeInTheDocument();
  });
});
