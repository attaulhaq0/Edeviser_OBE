// =============================================================================
// MasteryRecoveryPanel — Unit tests
// Validates: Task 19.5 — 3-step display, step completion checkmarks, retry gating
// =============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockUseRecoveryPathway = vi.fn();
const mockUseCompleteRecoveryStep = vi.fn();

vi.mock("@/hooks/useMasteryRecovery", () => ({
  useRecoveryPathway: (...args: unknown[]) => mockUseRecoveryPathway(...args),
  useCompleteRecoveryStep: () => mockUseCompleteRecoveryStep(),
}));

import MasteryRecoveryPanel from "@/components/shared/MasteryRecoveryPanel";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const defaultProps = {
  recoveryId: "rec-1",
  studentId: "student-1",
  cloId: "clo-1",
  cloTitle: "Apply data structures",
  courseId: "course-1",
};

const renderPanel = (props = {}) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MasteryRecoveryPanel {...defaultProps} {...props} />
    </QueryClientProvider>
  );
};

const makePathway = (overrides: Record<string, unknown> = {}) => ({
  id: "rec-1",
  student_id: "student-1",
  clo_id: "clo-1",
  course_id: "course-1",
  institution_id: "inst-1",
  failure_count: 2,
  status: "active",
  ai_tutor_completed: false,
  practice_completed: false,
  peer_suggestion_applicable: true,
  peer_suggestion_shown: false,
  activated_at: "2025-01-15T10:00:00Z",
  ...overrides,
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("MasteryRecoveryPanel — 3-step display", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCompleteRecoveryStep.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
  });

  it("renders all 3 recovery steps", () => {
    mockUseRecoveryPathway.mockReturnValue({
      data: makePathway(),
      isLoading: false,
    });
    renderPanel();

    expect(screen.getByText("AI Tutor Session")).toBeInTheDocument();
    expect(screen.getByText("Practice Questions")).toBeInTheDocument();
    expect(screen.getByText("Peer Study Group")).toBeInTheDocument();
  });

  it("renders Recovery Pathway header", () => {
    mockUseRecoveryPathway.mockReturnValue({
      data: makePathway(),
      isLoading: false,
    });
    renderPanel();

    expect(screen.getByText("Recovery Pathway")).toBeInTheDocument();
  });

  it("displays CLO title in description", () => {
    mockUseRecoveryPathway.mockReturnValue({
      data: makePathway(),
      isLoading: false,
    });
    renderPanel();

    expect(screen.getByText("Apply data structures")).toBeInTheDocument();
  });

  it("marks Peer Study Group as optional", () => {
    mockUseRecoveryPathway.mockReturnValue({
      data: makePathway(),
      isLoading: false,
    });
    renderPanel();

    expect(screen.getByText("Optional")).toBeInTheDocument();
  });

  it("returns null when pathway data is not found", () => {
    mockUseRecoveryPathway.mockReturnValue({
      data: null,
      isLoading: false,
    });
    const { container } = renderPanel();

    expect(container.innerHTML).toBe("");
  });
});

// ── Step completion checkmarks ──────────────────────────────────────────────

describe("MasteryRecoveryPanel — Step completion checkmarks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCompleteRecoveryStep.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
  });

  it("shows green background for completed AI Tutor step", () => {
    mockUseRecoveryPathway.mockReturnValue({
      data: makePathway({ ai_tutor_completed: true }),
      isLoading: false,
    });
    const { container } = renderPanel();

    const steps = container.querySelectorAll('[class*="border-green-200"]');
    expect(steps.length).toBeGreaterThanOrEqual(1);
  });

  it("shows green background for completed Practice step", () => {
    mockUseRecoveryPathway.mockReturnValue({
      data: makePathway({ practice_completed: true }),
      isLoading: false,
    });
    const { container } = renderPanel();

    const greenSteps = container.querySelectorAll('[class*="bg-green-50"]');
    expect(greenSteps.length).toBeGreaterThanOrEqual(1);
  });

  it("shows slate background for incomplete steps", () => {
    mockUseRecoveryPathway.mockReturnValue({
      data: makePathway({
        ai_tutor_completed: false,
        practice_completed: false,
      }),
      isLoading: false,
    });
    const { container } = renderPanel();

    const slateSteps = container.querySelectorAll('[class*="bg-slate-50"]');
    expect(slateSteps.length).toBeGreaterThanOrEqual(2);
  });

  it("shows green circle with check icon for completed steps", () => {
    mockUseRecoveryPathway.mockReturnValue({
      data: makePathway({ ai_tutor_completed: true, practice_completed: true }),
      isLoading: false,
    });
    const { container } = renderPanel();

    const greenCircles = container.querySelectorAll('[class*="bg-green-500"]');
    expect(greenCircles.length).toBeGreaterThanOrEqual(2);
  });
});

// ── Retry button gating ─────────────────────────────────────────────────────

describe("MasteryRecoveryPanel — Retry button gating", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCompleteRecoveryStep.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
  });

  it("disables retry button when no steps are completed", () => {
    mockUseRecoveryPathway.mockReturnValue({
      data: makePathway({
        ai_tutor_completed: false,
        practice_completed: false,
      }),
      isLoading: false,
    });
    renderPanel();

    const retryButton = screen.getByRole("button", {
      name: /complete.*steps.*unlock/i,
    });
    expect(retryButton).toBeDisabled();
  });

  it("disables retry button when only AI Tutor is completed", () => {
    mockUseRecoveryPathway.mockReturnValue({
      data: makePathway({
        ai_tutor_completed: true,
        practice_completed: false,
      }),
      isLoading: false,
    });
    renderPanel();

    const retryButton = screen.getByRole("button", {
      name: /complete.*steps.*unlock/i,
    });
    expect(retryButton).toBeDisabled();
  });

  it("disables retry button when only Practice is completed", () => {
    mockUseRecoveryPathway.mockReturnValue({
      data: makePathway({
        ai_tutor_completed: false,
        practice_completed: true,
      }),
      isLoading: false,
    });
    renderPanel();

    const retryButton = screen.getByRole("button", {
      name: /complete.*steps.*unlock/i,
    });
    expect(retryButton).toBeDisabled();
  });

  it("enables retry button when both required steps are completed", () => {
    mockUseRecoveryPathway.mockReturnValue({
      data: makePathway({ ai_tutor_completed: true, practice_completed: true }),
      isLoading: false,
    });
    renderPanel();

    const retryButton = screen.getByRole("button", { name: /retry quiz/i });
    expect(retryButton).not.toBeDisabled();
  });

  it('shows "In Progress" badge when steps are incomplete', () => {
    mockUseRecoveryPathway.mockReturnValue({
      data: makePathway({
        ai_tutor_completed: false,
        practice_completed: false,
      }),
      isLoading: false,
    });
    renderPanel();

    expect(screen.getByText("In Progress")).toBeInTheDocument();
  });

  it('shows "Ready to Retry" badge when all required steps are complete', () => {
    mockUseRecoveryPathway.mockReturnValue({
      data: makePathway({ ai_tutor_completed: true, practice_completed: true }),
      isLoading: false,
    });
    renderPanel();

    expect(screen.getByText("Ready to Retry")).toBeInTheDocument();
  });
});
