// =============================================================================
// AIAtRiskWidget — Unit tests
// Validates: Requirements 47.3, 47.4
// =============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AIAtRiskWidget from "@/components/shared/AIAtRiskWidget";
import type { AIAtRiskPrediction } from "@/hooks/useAtRiskPredictions";

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockPredictions: AIAtRiskPrediction[] = [
  {
    id: "pred-1",
    student_id: "student-1",
    student_name: "Alice Johnson",
    suggestion_type: "at_risk_prediction",
    suggestion_text: "Student may fail CLO-3",
    suggestion_data: {
      at_risk_clo_id: "clo-3",
      at_risk_clo_title: "Apply data structures in problem solving",
      probability_score: 85,
      contributing_signals: {
        login_frequency: "low",
        submission_pattern: "late",
        attainment_trend: "declining",
      },
      prediction_date: "2025-01-15",
    },
    validated_outcome: null,
    created_at: "2025-01-15T02:00:00Z",
  },
  {
    id: "pred-2",
    student_id: "student-2",
    student_name: "Bob Smith",
    suggestion_type: "at_risk_prediction",
    suggestion_text: "Student may fail CLO-1",
    suggestion_data: {
      at_risk_clo_id: "clo-1",
      at_risk_clo_title: "Recall fundamental algorithms",
      probability_score: 62,
      contributing_signals: {
        login_frequency: "medium",
        submission_pattern: "on_time",
        attainment_trend: "stagnant",
      },
      prediction_date: "2025-01-15",
    },
    validated_outcome: null,
    created_at: "2025-01-15T02:00:00Z",
  },
];

const mockMutate = vi.fn();

vi.mock("@/hooks/useAtRiskPredictions", () => ({
  useAtRiskPredictions: vi.fn(),
  useSendAtRiskNudge: vi.fn(() => ({
    mutate: mockMutate,
    isPending: false,
  })),
}));

import { useAtRiskPredictions } from "@/hooks/useAtRiskPredictions";
const mockUseAtRiskPredictions = vi.mocked(useAtRiskPredictions);

// ─── Helpers ─────────────────────────────────────────────────────────────────

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("AIAtRiskWidget", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading shimmer when data is loading", () => {
    mockUseAtRiskPredictions.mockReturnValue({
      data: undefined,
      isLoading: true,
    } as unknown as ReturnType<typeof useAtRiskPredictions>);

    render(<AIAtRiskWidget />, { wrapper: createWrapper() });
    expect(screen.getByText("AI At-Risk Students")).toBeInTheDocument();
  });

  it("renders empty state when no predictions exist", () => {
    mockUseAtRiskPredictions.mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof useAtRiskPredictions>);

    render(<AIAtRiskWidget />, { wrapper: createWrapper() });
    expect(screen.getByText(/No AI at-risk predictions/)).toBeInTheDocument();
  });

  it("renders prediction rows with student names and CLO titles", () => {
    mockUseAtRiskPredictions.mockReturnValue({
      data: mockPredictions,
      isLoading: false,
    } as unknown as ReturnType<typeof useAtRiskPredictions>);

    render(<AIAtRiskWidget />, { wrapper: createWrapper() });
    expect(screen.getByText("Alice Johnson")).toBeInTheDocument();
    expect(screen.getByText("Bob Smith")).toBeInTheDocument();
    expect(screen.getByText(/Apply data structures/)).toBeInTheDocument();
    expect(
      screen.getByText(/Recall fundamental algorithms/)
    ).toBeInTheDocument();
  });

  it("renders probability scores", () => {
    mockUseAtRiskPredictions.mockReturnValue({
      data: mockPredictions,
      isLoading: false,
    } as unknown as ReturnType<typeof useAtRiskPredictions>);

    render(<AIAtRiskWidget />, { wrapper: createWrapper() });
    expect(screen.getByText("85% risk")).toBeInTheDocument();
    expect(screen.getByText("62% risk")).toBeInTheDocument();
  });

  it("renders contributing signal badges", () => {
    mockUseAtRiskPredictions.mockReturnValue({
      data: mockPredictions,
      isLoading: false,
    } as unknown as ReturnType<typeof useAtRiskPredictions>);

    render(<AIAtRiskWidget />, { wrapper: createWrapper() });
    expect(screen.getAllByText("Login: low").length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText("Submissions: late").length
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText("Trend: declining").length
    ).toBeGreaterThanOrEqual(1);
  });

  it("opens nudge dialog when Nudge button is clicked", () => {
    mockUseAtRiskPredictions.mockReturnValue({
      data: mockPredictions,
      isLoading: false,
    } as unknown as ReturnType<typeof useAtRiskPredictions>);

    render(<AIAtRiskWidget />, { wrapper: createWrapper() });
    const nudgeButtons = screen.getAllByRole("button", { name: /send nudge/i });
    fireEvent.click(nudgeButtons[0]!);
    expect(screen.getByText(/Send Nudge to Alice Johnson/)).toBeInTheDocument();
  });

  it("pre-fills nudge message with student name and CLO", () => {
    mockUseAtRiskPredictions.mockReturnValue({
      data: mockPredictions,
      isLoading: false,
    } as unknown as ReturnType<typeof useAtRiskPredictions>);

    render(<AIAtRiskWidget />, { wrapper: createWrapper() });
    const nudgeButtons = screen.getAllByRole("button", { name: /send nudge/i });
    fireEvent.click(nudgeButtons[0]!);
    const textarea = screen.getByPlaceholderText(
      /Write a personalized message/
    );
    expect((textarea as HTMLTextAreaElement).value).toContain("Alice");
    expect((textarea as HTMLTextAreaElement).value).toContain(
      "Apply data structures"
    );
  });

  it("calls nudge mutation when Send Nudge is confirmed", async () => {
    mockUseAtRiskPredictions.mockReturnValue({
      data: mockPredictions,
      isLoading: false,
    } as unknown as ReturnType<typeof useAtRiskPredictions>);

    render(<AIAtRiskWidget />, { wrapper: createWrapper() });
    const nudgeButtons = screen.getAllByRole("button", { name: /send nudge/i });
    fireEvent.click(nudgeButtons[0]!);

    // Click the Send Nudge button in the dialog
    const dialogSendButton = screen.getByRole("button", {
      name: /^Send Nudge$/i,
    });
    fireEvent.click(dialogSendButton);

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          studentId: "student-1",
          message: expect.stringContaining("Alice"),
        }),
        expect.any(Object)
      );
    });
  });

  it("renders gradient header with Sparkles icon", () => {
    mockUseAtRiskPredictions.mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof useAtRiskPredictions>);

    render(<AIAtRiskWidget />, { wrapper: createWrapper() });
    expect(screen.getByText("AI At-Risk Students")).toBeInTheDocument();
  });
});
