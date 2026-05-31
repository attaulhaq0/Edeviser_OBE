// =============================================================================
// AdaptiveQuizSession — Practice-mode correctness wiring unit tests
// Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6 (Task 11.1)
//
// These tests verify that practice-mode feedback is driven by the value
// produced by `deriveCorrectness` (never a hardcoded `true`), that the feedback
// reflects the evaluated correctness of the submitted answer, and that no
// correctness feedback is shown before the answer is submitted.
// =============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import "@/lib/i18n";

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useParams: () => ({ quizId: "quiz-123" }),
    useNavigate: () => mockNavigate,
  };
});

const mockStartMutateAsync = vi.fn();
const mockSelectMutateAsync = vi.fn();
const mockSubmitMutateAsync = vi.fn();

vi.mock("@/hooks/useAdaptiveQuiz", () => ({
  useStartAdaptiveQuiz: () => ({ mutateAsync: mockStartMutateAsync }),
  useSelectNextQuestion: () => ({ mutateAsync: mockSelectMutateAsync }),
  useSubmitQuizAttempt: () => ({ mutateAsync: mockSubmitMutateAsync }),
}));

// Practice mode is enabled for every test in this file.
vi.mock("@/hooks/usePracticeMode", () => ({
  usePracticeModeConfig: () => ({
    data: { practice_mode_enabled: true },
    isLoading: false,
  }),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "student-1", role: "student" } }),
}));

// Recovery-check useQuery inside the component reads supabase directly.
vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    }),
  },
}));

vi.mock("@/lib/queryKeys", () => ({
  queryKeys: {
    masteryRecovery: { all: ["mastery-recovery"] },
  },
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
  },
}));

import AdaptiveQuizSession from "@/pages/student/quiz/AdaptiveQuizSession";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const createQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

const renderWithProviders = () => {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AdaptiveQuizSession />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

// A question exposing its correct answer so the client can derive correctness.
const questionWithAnswer = (overrides: Record<string, unknown> = {}) => ({
  question: {
    id: "q-1",
    question_text: "What is 2 + 2?",
    question_type: "mcq",
    options: [
      { key: "A", text: "3" },
      { key: "B", text: "4" },
      { key: "C", text: "5" },
      { key: "D", text: "6" },
    ],
    bloom_level: 1,
    clo_id: "clo-1",
    correct_answer: "B",
  },
  question_number: 1,
  total_questions: 5,
  current_target_difficulty: 2.5,
  session_complete: false,
  ...overrides,
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("AdaptiveQuizSession — practice-mode correctness wiring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not show correctness feedback before an answer is submitted (R2.5)", async () => {
    mockStartMutateAsync.mockResolvedValue({ id: "attempt-123" });
    mockSelectMutateAsync.mockResolvedValue(questionWithAnswer());

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("What is 2 + 2?")).toBeInTheDocument();
    });

    expect(screen.queryByText("Correct!")).not.toBeInTheDocument();
    expect(screen.queryByText("Incorrect")).not.toBeInTheDocument();
  });

  it("shows correct feedback when the submitted answer matches the correct answer (R2.3)", async () => {
    mockStartMutateAsync.mockResolvedValue({ id: "attempt-123" });
    // init returns the question; submit triggers a second selectNext call.
    mockSelectMutateAsync
      .mockResolvedValueOnce(questionWithAnswer())
      .mockResolvedValueOnce(
        questionWithAnswer({ question_number: 2, id: "q-2" })
      );

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("What is 2 + 2?")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("4")); // correct answer (key "B")
    fireEvent.click(screen.getByRole("button", { name: /submit answer/i }));

    await waitFor(() => {
      expect(screen.getByText("Correct!")).toBeInTheDocument();
    });

    // The same derived value is recorded for difficulty selection.
    expect(mockSelectMutateAsync).toHaveBeenLastCalledWith(
      expect.objectContaining({ previous_answer_correct: true })
    );
  });

  it("shows incorrect feedback when the submitted answer does not match (R2.2, R2.6)", async () => {
    mockStartMutateAsync.mockResolvedValue({ id: "attempt-123" });
    mockSelectMutateAsync
      .mockResolvedValueOnce(questionWithAnswer())
      .mockResolvedValueOnce(
        questionWithAnswer({ question_number: 2, id: "q-2" })
      );

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("What is 2 + 2?")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("3")); // wrong answer (key "A")
    fireEvent.click(screen.getByRole("button", { name: /submit answer/i }));

    await waitFor(() => {
      expect(screen.getByText("Incorrect")).toBeInTheDocument();
    });

    // The feedback must not claim "Correct!" for an incorrect answer (R2.6).
    expect(screen.queryByText("Correct!")).not.toBeInTheDocument();

    // The recorded correctness equals the displayed correctness (R2.4).
    expect(mockSelectMutateAsync).toHaveBeenLastCalledWith(
      expect.objectContaining({ previous_answer_correct: false })
    );
  });

  it("records incorrect when the question exposes no correct answer (R2.6)", async () => {
    mockStartMutateAsync.mockResolvedValue({ id: "attempt-123" });
    // Question without a correct_answer field — no evidence of correctness.
    const noAnswer = questionWithAnswer();
    delete (noAnswer.question as Record<string, unknown>).correct_answer;
    mockSelectMutateAsync
      .mockResolvedValueOnce(noAnswer)
      .mockResolvedValueOnce(
        questionWithAnswer({ question_number: 2, id: "q-2" })
      );

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("What is 2 + 2?")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("4"));
    fireEvent.click(screen.getByRole("button", { name: /submit answer/i }));

    await waitFor(() => {
      expect(screen.getByText("Incorrect")).toBeInTheDocument();
    });

    expect(mockSelectMutateAsync).toHaveBeenLastCalledWith(
      expect.objectContaining({ previous_answer_correct: false })
    );
  });
});
