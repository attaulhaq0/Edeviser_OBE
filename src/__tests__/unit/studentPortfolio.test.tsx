// @vitest-environment happy-dom
// =============================================================================
// StudentPortfolio — Unit tests
// Validates: Requirement 58 (Student Learning Portfolio)
// =============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import i18n from "@/lib/i18n";

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockUseAuth = vi.fn();
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

const mockUsePortfolio = vi.fn();
const mockToggleMutate = vi.fn();
const mockUseSharingPermission = vi.fn();
vi.mock("@/hooks/usePortfolio", () => ({
  usePortfolio: (...args: unknown[]) => mockUsePortfolio(...args),
  usePortfolioSharingPermission: (...args: unknown[]) =>
    mockUseSharingPermission(...args),
  useTogglePortfolioPublic: () => ({
    mutate: mockToggleMutate,
    isPending: false,
  }),
}));

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  LineChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="line-chart">{children}</div>
  ),
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  Line: () => <div data-testid="line" />,
  Bar: () => <div data-testid="bar" />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { toast } from "sonner";

// ── Fixtures ─────────────────────────────────────────────────────────────────

const basePortfolioData = {
  clos: [
    {
      clo_id: "clo-1",
      clo_title: "Understand OOP",
      blooms_level: "understanding" as const,
      attainment_percent: 88,
      attainment_level: "Excellent" as const,
      course_name: "CS101",
    },
    {
      clo_id: "clo-2",
      clo_title: "Apply Design Patterns",
      blooms_level: "applying" as const,
      attainment_percent: 72,
      attainment_level: "Satisfactory" as const,
      course_name: "CS101",
    },
  ],
  badges: [
    {
      badge_key: "early_bird",
      badge_name: "Early Bird",
      emoji: "🐦",
      awarded_at: "2024-06-10T10:00:00Z",
    },
  ],
  journals: [
    {
      id: "j1",
      content_preview: "Today I learned about polymorphism...",
      created_at: "2024-06-10T10:00:00Z",
      course_name: "CS101",
    },
  ],
  xpTimeline: [
    { date: "2024-06-01", cumulative_xp: 100 },
    { date: "2024-06-10", cumulative_xp: 350 },
  ],
  semesterAttainments: [{ semester_name: "Fall 2024", average_attainment: 78 }],
  totalXP: 350,
  level: 3,
};

// ── Helper ───────────────────────────────────────────────────────────────────

const renderPortfolio = async () => {
  const mod = await import("@/pages/student/portfolio/StudentPortfolio");
  return render(
    <I18nextProvider i18n={i18n}>
      <mod.default />
    </I18nextProvider>
  );
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe("StudentPortfolio", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await i18n.changeLanguage("en");
    mockUseAuth.mockReturnValue({
      user: { id: "student-1" },
      profile: { portfolio_public: false },
    });
    // Default: school has granted public-sharing permission.
    mockUseSharingPermission.mockReturnValue({ data: true });
  });

  it("renders shimmer loading state", async () => {
    mockUsePortfolio.mockReturnValue({ data: undefined, isLoading: true });
    const { container } = await renderPortfolio();
    const shimmers = container.querySelectorAll('[class*="shimmer"]');
    expect(shimmers.length).toBeGreaterThan(0);
  }, 10000);

  it("renders page heading", async () => {
    mockUsePortfolio.mockReturnValue({
      data: basePortfolioData,
      isLoading: false,
    });
    await renderPortfolio();
    expect(screen.getByText("My Portfolio")).toBeInTheDocument();
  }, 10000);

  it("renders KPI cards with correct values", async () => {
    mockUsePortfolio.mockReturnValue({
      data: basePortfolioData,
      isLoading: false,
    });
    await renderPortfolio();
    const totalXpElements = screen.getAllByText("Total XP");
    expect(totalXpElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("350").length).toBeGreaterThanOrEqual(1);
    const levelElements = screen.getAllByText("Level");
    expect(levelElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("3").length).toBeGreaterThanOrEqual(1);
    const closElements = screen.getAllByText("CLOs Mastered");
    expect(closElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("2").length).toBeGreaterThanOrEqual(1);
    const badgesElements = screen.getAllByText("Badges Earned");
    expect(badgesElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("1").length).toBeGreaterThanOrEqual(1);
  }, 10000);

  it("renders CLO mastery grouped by course", async () => {
    mockUsePortfolio.mockReturnValue({
      data: basePortfolioData,
      isLoading: false,
    });
    await renderPortfolio();
    // CS101 appears as both course heading and journal course_name
    expect(screen.getAllByText("CS101").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Understand OOP")).toBeInTheDocument();
    expect(screen.getByText("Apply Design Patterns")).toBeInTheDocument();
  });

  it("renders badge collection", async () => {
    mockUsePortfolio.mockReturnValue({
      data: basePortfolioData,
      isLoading: false,
    });
    await renderPortfolio();
    expect(screen.getByText("Early Bird")).toBeInTheDocument();
    expect(screen.getByText("🐦")).toBeInTheDocument();
  });

  it("renders journal entries", async () => {
    mockUsePortfolio.mockReturnValue({
      data: basePortfolioData,
      isLoading: false,
    });
    await renderPortfolio();
    expect(
      screen.getByText("Today I learned about polymorphism...")
    ).toBeInTheDocument();
  });

  it("shows empty messages when no data", async () => {
    mockUsePortfolio.mockReturnValue({
      data: {
        ...basePortfolioData,
        clos: [],
        badges: [],
        journals: [],
        xpTimeline: [],
        semesterAttainments: [],
      },
      isLoading: false,
    });
    await renderPortfolio();
    expect(screen.getByText("No Attainment Data")).toBeInTheDocument();
    expect(screen.getByText("No Badges Earned")).toBeInTheDocument();
    expect(screen.getByText("No journal entries yet.")).toBeInTheDocument();
    expect(screen.getByText("No XP Data Yet")).toBeInTheDocument();
    expect(screen.getByText("No Semesters Yet")).toBeInTheDocument();
  });

  it("renders public profile toggle", async () => {
    mockUsePortfolio.mockReturnValue({
      data: basePortfolioData,
      isLoading: false,
    });
    await renderPortfolio();
    expect(
      screen.getByLabelText("Toggle public portfolio")
    ).toBeInTheDocument();
    expect(screen.getByText("Public Profile")).toBeInTheDocument();
  });

  it("calls toggleMutation on switch change", async () => {
    mockUsePortfolio.mockReturnValue({
      data: basePortfolioData,
      isLoading: false,
    });
    await renderPortfolio();
    fireEvent.click(screen.getByLabelText("Toggle public portfolio"));
    expect(mockToggleMutate).toHaveBeenCalledWith(
      { userId: "student-1", isPublic: true },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    );
  });

  it("shows copy link button when portfolio is public", async () => {
    mockUseAuth.mockReturnValue({
      user: { id: "student-1" },
      profile: { portfolio_public: true },
    });
    mockUsePortfolio.mockReturnValue({
      data: basePortfolioData,
      isLoading: false,
    });
    await renderPortfolio();
    expect(screen.getByLabelText("Copy shareable link")).toBeInTheDocument();
  });

  it("does not show copy link button when portfolio is private", async () => {
    mockUsePortfolio.mockReturnValue({
      data: basePortfolioData,
      isLoading: false,
    });
    await renderPortfolio();
    expect(
      screen.queryByLabelText("Copy shareable link")
    ).not.toBeInTheDocument();
  });

  it("passes studentId to usePortfolio", async () => {
    mockUsePortfolio.mockReturnValue({
      data: basePortfolioData,
      isLoading: false,
    });
    await renderPortfolio();
    expect(mockUsePortfolio).toHaveBeenCalledWith("student-1");
  });

  // ── Sharing-permission gate (R24.1, R24.2) ──────────────────────────────────

  it("shows the school-permission explanation when sharing is not permitted (R24.2)", async () => {
    mockUseSharingPermission.mockReturnValue({ data: false });
    mockUsePortfolio.mockReturnValue({
      data: basePortfolioData,
      isLoading: false,
    });
    await renderPortfolio();
    expect(
      screen.getByText(i18n.t("student:portfolio.permissionRequired"))
    ).toBeInTheDocument();
  });

  it("does not show the permission explanation once sharing is permitted", async () => {
    mockUseSharingPermission.mockReturnValue({ data: true });
    mockUsePortfolio.mockReturnValue({
      data: basePortfolioData,
      isLoading: false,
    });
    await renderPortfolio();
    expect(
      screen.queryByText(i18n.t("student:portfolio.permissionRequired"))
    ).not.toBeInTheDocument();
  });

  it("keeps the portfolio private and does not call the mutation without permission (R24.1)", async () => {
    mockUseSharingPermission.mockReturnValue({ data: false });
    mockUsePortfolio.mockReturnValue({
      data: basePortfolioData,
      isLoading: false,
    });
    await renderPortfolio();
    fireEvent.click(screen.getByLabelText("Toggle public portfolio"));
    expect(mockToggleMutate).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(
      i18n.t("student:portfolio.toast.permissionDenied")
    );
  });

  it("enables public sharing through the mutation when permission is granted (R24.1)", async () => {
    mockUseSharingPermission.mockReturnValue({ data: true });
    mockUsePortfolio.mockReturnValue({
      data: basePortfolioData,
      isLoading: false,
    });
    await renderPortfolio();
    fireEvent.click(screen.getByLabelText("Toggle public portfolio"));
    expect(mockToggleMutate).toHaveBeenCalledWith(
      { userId: "student-1", isPublic: true },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    );
  });

  it("always allows turning sharing OFF regardless of permission", async () => {
    mockUseSharingPermission.mockReturnValue({ data: false });
    mockUseAuth.mockReturnValue({
      user: { id: "student-1" },
      profile: { portfolio_public: true },
    });
    mockUsePortfolio.mockReturnValue({
      data: basePortfolioData,
      isLoading: false,
    });
    await renderPortfolio();
    fireEvent.click(screen.getByLabelText("Toggle public portfolio"));
    expect(mockToggleMutate).toHaveBeenCalledWith(
      { userId: "student-1", isPublic: false },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    );
  });

  it("adapts sharing controls to Arabic (single language at a time) (R24.5, R24.6)", async () => {
    await i18n.changeLanguage("ar");
    mockUseSharingPermission.mockReturnValue({ data: false });
    mockUsePortfolio.mockReturnValue({
      data: basePortfolioData,
      isLoading: false,
    });
    await renderPortfolio();
    expect(
      screen.getByText(i18n.t("student:portfolio.publicProfile"))
    ).toBeInTheDocument();
    expect(
      screen.getByText(i18n.t("student:portfolio.permissionRequired"))
    ).toBeInTheDocument();
    // The English copy must not be present simultaneously (single language).
    expect(screen.queryByText("Public Profile")).not.toBeInTheDocument();
  });

  // ── Younger-student wording (R22.2) ─────────────────────────────────────────

  it("uses the approachable 'Skills mastered' section title (R22.2)", async () => {
    mockUsePortfolio.mockReturnValue({
      data: basePortfolioData,
      isLoading: false,
    });
    await renderPortfolio();
    expect(
      screen.getByText(i18n.t("student:portfolio.friendly.skillsTitle"))
    ).toBeInTheDocument();
  });

  it("groups outcomes into 'Strengths' and 'Areas improving' (R22.2)", async () => {
    mockUsePortfolio.mockReturnValue({
      data: {
        ...basePortfolioData,
        clos: [
          {
            clo_id: "clo-strong",
            clo_title: "Understand OOP",
            blooms_level: "understanding" as const,
            attainment_percent: 88,
            attainment_level: "Excellent" as const,
            course_name: "CS101",
          },
          {
            clo_id: "clo-weak",
            clo_title: "Master Recursion",
            blooms_level: "applying" as const,
            attainment_percent: 40,
            attainment_level: "Not_Yet" as const,
            course_name: "CS101",
          },
        ],
      },
      isLoading: false,
    });
    await renderPortfolio();
    expect(
      screen.getByText(i18n.t("student:portfolio.friendly.strengths"))
    ).toBeInTheDocument();
    expect(
      screen.getByText(i18n.t("student:portfolio.friendly.areasImproving"))
    ).toBeInTheDocument();
    expect(screen.getByText("Understand OOP")).toBeInTheDocument();
    expect(screen.getByText("Master Recursion")).toBeInTheDocument();
  });

  it("renders the friendly title in Arabic (R22.4)", async () => {
    await i18n.changeLanguage("ar");
    mockUsePortfolio.mockReturnValue({
      data: basePortfolioData,
      isLoading: false,
    });
    await renderPortfolio();
    expect(
      screen.getByText(i18n.t("student:portfolio.friendly.skillsTitle"))
    ).toBeInTheDocument();
  });
});
