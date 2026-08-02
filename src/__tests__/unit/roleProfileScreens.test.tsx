// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";
import i18n from "@/lib/i18n";
import type { Profile, UserRole } from "@/types/app";

const state = vi.hoisted(() => ({
  role: "admin" as UserRole,
}));

const baseProfile: Profile = {
  id: "user-1",
  email: "profile@example.test",
  full_name: "Prototype User",
  role: "admin",
  institution_id: "institution-1",
  avatar_url: null,
  is_active: true,
  onboarding_completed: true,
  portfolio_public: false,
  theme_preference: "system",
  language_preference: "en",
  notification_preferences: {},
  last_seen_at: null,
  tos_accepted_at: null,
  tour_completed_at: null,
  status: "active",
  created_at: "2026-01-01T00:00:00Z",
  department: "Computer Science",
  designation: "Assistant Professor",
  academic_rank: "Lecturer",
  highest_degree: "PhD",
};

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-1" },
    profile: { ...baseProfile, role: state.role },
  }),
}));

vi.mock("@/providers/ThemeProvider", () => ({
  useTheme: () => ({ theme: "system", setTheme: vi.fn() }),
}));

vi.mock("@/hooks/useAdminDashboardAggregate", () => ({
  useAdminDashboardAggregate: () => ({
    data: {
      totalUsers: 1240,
      activeUsers: 1141,
      totalPrograms: 18,
      totalCourses: 96,
      usersByRole: { student: 1240, teacher: 86 },
    },
    isPending: false,
  }),
}));

vi.mock("@/hooks/useAdminDashboard", () => ({
  useRecentAuditLogs: () => ({
    data: [],
    isPending: false,
    isError: false,
  }),
}));

vi.mock("@/hooks/useConnectedIntegrations", () => ({
  useConnectedIntegrations: () => ({
    data: {},
    isPending: false,
    isError: false,
  }),
}));

vi.mock("@/hooks/useInstitutionProfile", () => ({
  useInstitutionProfile: () => ({
    data: {
      id: "institution-1",
      name: "Noor International School",
      slug: "noor-international-school",
      logo_url: null,
      accreditation_body: null,
      created_at: "2026-01-01T00:00:00Z",
    },
    isPending: false,
    isError: false,
  }),
}));

vi.mock("@/hooks/useTeacherDashboardAggregate", () => ({
  useTeacherDashboardAggregate: () => ({
    data: {
      kpis: {
        totalStudents: 84,
        pendingSubmissions: 12,
        gradedThisWeek: 31,
        avgAttainment: 76,
        atRiskCount: 3,
      },
      bloomsDistribution: [],
    },
    isPending: false,
  }),
}));

vi.mock("@/hooks/useParentDashboardAggregate", () => ({
  useParentDashboardAggregate: () => ({
    data: {
      kpis: {
        linkedChildren: 2,
        totalCourses: 7,
        avgAttainment: 82,
        upcomingDeadlines: 3,
      },
      children: [
        {
          student_id: "student-1",
          student_name: "Maya",
          current_level: 4,
          xp_total: 750,
          current_streak: 12,
          enrolled_courses: 4,
          avg_attainment: 84,
        },
        {
          student_id: "student-2",
          student_name: "Yusuf",
          current_level: 3,
          xp_total: 620,
          current_streak: 6,
          enrolled_courses: 3,
          avg_attainment: 80,
        },
      ],
    },
    isPending: false,
  }),
}));

vi.mock("@/hooks/useCourses", () => ({
  useCourses: () => ({
    data: {
      count: 3,
      page: 1,
      pageSize: 6,
      data: [
        {
          id: "course-1",
          code: "CS101",
          name: "Introduction to Programming",
          semester: "Fall",
          academic_year: "2026",
        },
      ],
    },
    isPending: false,
  }),
  useTeacherCourses: () => ({
    data: {
      count: 3,
      page: 1,
      pageSize: 6,
      data: [
        {
          id: "course-1",
          code: "CS101",
          name: "Introduction to Programming",
          semester: "Fall",
          academic_year: "2026",
        },
      ],
    },
    isPending: false,
  }),
}));

vi.mock("@/hooks/useCLOs", () => ({
  useCLOs: () => ({
    data: { count: 27, page: 1, pageSize: 1, data: [] },
    isPending: false,
  }),
}));

vi.mock("@/components/shared/AvatarUpload", () => ({
  default: () => <div>Avatar upload control</div>,
}));

vi.mock("@/components/shared/EmailPreferencesSection", () => ({
  default: () => <div>Email preference controls</div>,
}));

import AdminProfilePage from "@/pages/admin/settings/AdminProfilePage";
import TeacherProfilePage from "@/pages/teacher/settings/TeacherProfilePage";
import ParentProfilePage from "@/pages/parent/settings/ParentProfilePage";

const renderPage = (page: ReactNode) =>
  render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>{page}</MemoryRouter>
    </I18nextProvider>
  );

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

afterEach(cleanup);

describe("prototype role profile screens", () => {
  it("renders the institution admin profile with real aggregate values", () => {
    state.role = "admin";
    renderPage(<AdminProfilePage />);

    expect(screen.getByText("Prototype User")).toBeInTheDocument();
    expect(screen.getByText("1,240")).toBeInTheDocument();
    expect(screen.getByText("Institution settings")).toBeInTheDocument();
    expect(screen.getByText("Role & permissions")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Users" })).toHaveAttribute(
      "href",
      "/admin/users"
    );
  });

  it("renders the teacher academic profile and teaching workspace", () => {
    state.role = "teacher";
    renderPage(<TeacherProfilePage />);

    expect(screen.getAllByText("Assistant Professor").length).toBeGreaterThan(
      0
    );
    expect(screen.getByText("84")).toBeInTheDocument();
    expect(screen.getByText("Teaching impact")).toBeInTheDocument();
    expect(
      screen.getByText("AI autonomy for your classes")
    ).toBeInTheDocument();
    expect(screen.getByText("My classes")).toBeInTheDocument();
  });

  it("renders the parent profile with verified child context", () => {
    state.role = "parent";
    renderPage(<ParentProfilePage />);

    expect(screen.getByText(/Guardian of Maya & Yusuf/)).toBeInTheDocument();
    expect(screen.getByText("82%")).toBeInTheDocument();
    expect(screen.getByText("Linked learners")).toBeInTheDocument();
    expect(screen.getByText("Privacy & what you can see")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Support/i })).toHaveAttribute(
      "href",
      "/parent/support"
    );
  });
});
