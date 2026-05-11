import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => vi.fn() };
});

const mockAdminKPIs = vi.fn();
const mockAuditLogs = vi.fn();
const mockOnboardingAnalytics = vi.fn();

vi.mock("@/hooks/useAdminDashboard", () => ({
  useAdminKPIs: () => mockAdminKPIs(),
  useRecentAuditLogs: () => mockAuditLogs(),
  useOnboardingAnalytics: () => mockOnboardingAnalytics(),
  usePendingOnboardingStudents: () => ({ data: [] }),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "admin-1", email: "admin@test.com" },
    profile: {
      id: "admin-1",
      full_name: "Admin User",
      role: "admin",
      institution_id: "inst-1",
      avatar_url: null,
    },
    role: "admin",
    institutionId: "inst-1",
  }),
}));

const mockAIPerformance = vi.fn();

vi.mock("@/hooks/useAIPerformance", () => ({
  useAIPerformance: () => mockAIPerformance(),
}));

vi.mock("date-fns", () => ({
  formatDistanceToNow: () => "2 hours ago",
}));

import AdminDashboard from "@/pages/admin/AdminDashboard";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const defaultKPIs = {
  data: {
    totalUsers: 100,
    activeUsers: 80,
    totalPrograms: 5,
    totalCourses: 20,
    usersByRole: { admin: 2, teacher: 10, student: 68 },
  },
  isLoading: false,
};

const defaultLogs = {
  data: [],
  isLoading: false,
};

const defaultOnboarding = {
  data: { totalStudents: 50, completedOnboarding: 50, completionRate: 100 },
};

const renderDashboard = () =>
  render(
    <MemoryRouter>
      <AdminDashboard />
    </MemoryRouter>
  );

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AdminDashboard — AI Co-Pilot Performance section", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdminKPIs.mockReturnValue(defaultKPIs);
    mockAuditLogs.mockReturnValue(defaultLogs);
    mockOnboardingAnalytics.mockReturnValue(defaultOnboarding);
  });

  it("renders the AI Co-Pilot Performance header", () => {
    mockAIPerformance.mockReturnValue({ data: null, isLoading: false });
    renderDashboard();
    expect(screen.getByText("AI Co-Pilot Performance")).toBeInTheDocument();
  });

  it("shows shimmer loading state when AI data is loading", () => {
    mockAIPerformance.mockReturnValue({ data: null, isLoading: true });
    const { container } = renderDashboard();
    // Shimmer elements inside the AI section
    const shimmers = container.querySelectorAll(".animate-shimmer");
    expect(shimmers.length).toBeGreaterThanOrEqual(3);
  });

  it("displays suggestion acceptance rate metric", () => {
    mockAIPerformance.mockReturnValue({
      data: {
        suggestionAcceptanceRate: 72,
        predictionAccuracyRate: 85,
        draftAcceptanceRate: 60,
        suggestionTotal: 50,
        predictionTotal: 20,
        draftTotal: 30,
      },
      isLoading: false,
    });
    renderDashboard();
    expect(screen.getByText("Suggestion Acceptance")).toBeInTheDocument();
    expect(screen.getByText("72%")).toBeInTheDocument();
    expect(screen.getByText("50 total suggestions")).toBeInTheDocument();
  });

  it("displays prediction accuracy rate metric", () => {
    mockAIPerformance.mockReturnValue({
      data: {
        suggestionAcceptanceRate: 72,
        predictionAccuracyRate: 85,
        draftAcceptanceRate: 60,
        suggestionTotal: 50,
        predictionTotal: 20,
        draftTotal: 30,
      },
      isLoading: false,
    });
    renderDashboard();
    expect(screen.getByText("Prediction Accuracy")).toBeInTheDocument();
    expect(screen.getByText("85%")).toBeInTheDocument();
    expect(screen.getByText("20 validated predictions")).toBeInTheDocument();
  });

  it("displays draft acceptance rate metric", () => {
    mockAIPerformance.mockReturnValue({
      data: {
        suggestionAcceptanceRate: 72,
        predictionAccuracyRate: 85,
        draftAcceptanceRate: 60,
        suggestionTotal: 50,
        predictionTotal: 20,
        draftTotal: 30,
      },
      isLoading: false,
    });
    renderDashboard();
    expect(screen.getByText("Draft Acceptance")).toBeInTheDocument();
    expect(screen.getByText("60%")).toBeInTheDocument();
    expect(screen.getByText("30 feedback drafts")).toBeInTheDocument();
  });

  it("shows 0% defaults when no AI data is available", () => {
    mockAIPerformance.mockReturnValue({ data: null, isLoading: false });
    renderDashboard();
    // All three metrics should show 0%
    const zeroPercents = screen.getAllByText("0%");
    expect(zeroPercents.length).toBeGreaterThanOrEqual(3);
  });

  it("shows 0 totals when no AI data is available", () => {
    mockAIPerformance.mockReturnValue({ data: null, isLoading: false });
    renderDashboard();
    expect(screen.getByText("0 total suggestions")).toBeInTheDocument();
    expect(screen.getByText("0 validated predictions")).toBeInTheDocument();
    expect(screen.getByText("0 feedback drafts")).toBeInTheDocument();
  });
});
