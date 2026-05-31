// =============================================================================
// AdaptiveQuizSession — Practice-mode feedback rendering unit tests (Task 11.4)
// Validates: Requirements 2.2, 2.3, 2.5
//
// These tests focus on what the student SEES in practice mode:
//   - the correct-answer panel renders on a correct submission (R2.3)
//   - the incorrect panel renders on a wrong submission AND the correct answer
//     is revealed (R2.2)
//   - NO correctness feedback renders before the student submits (R2.5)
//
// Correctness-wiring (R2.1/2.4/2.6) is covered separately in
// `adaptiveQuizSessionPractice.test.tsx`; this file deliberately asserts the
// rendered feedback panels and the correct-answer reveal.
// =============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
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

// An MCQ question exposing its correct answer (key "B" / text "4").
const mcqQuestion = (overrides: Record<string, unknown> = {}) => ({
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

/** Selects an answer by option label and submits it. */
const answerAndSubmit = (optionLabel: string) => {
  fireEvent.click(screen.getByRole("radio", { name: optionLabel }));
  fireEvent.click(screen.getByRole("button", { name: /submit answer/i }));
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("AdaptiveQuizSession — practice feedback rendering (Task 11.4)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders no correctness feedback panel before an answer is submitted (R2.5)", async () => {
    mockStartMutateAsync.mockResolvedValue({ id: "attempt-123" });
    mockSelectMutateAsync.mockResolvedValue(mcqQuestion());

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("What is 2 + 2?")).toBeInTheDocument();
    });

    // Neither the correct nor the incorrect panel is present pre-submission.
    expect(screen.queryByText("Correct!")).not.toBeInTheDocument();
    expect(screen.queryByText("Incorrect")).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("practice-correct-answer-reveal")
    ).not.toBeInTheDocument();

    // The action available is "Submit Answer" (not "Next Question").
    expect(
      screen.getByRole("button", { name: /submit answer/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /next question/i })
    ).not.toBeInTheDocument();
  });

  it("renders the correct-answer panel on a correct submission (R2.3)", async () => {
    mockStartMutateAsync.mockResolvedValue({ id: "attempt-123" });
    mockSelectMutateAsync
      .mockResolvedValueOnce(mcqQuestion())
      .mockResolvedValueOnce(mcqQuestion({ question_number: 2, id: "q-2" }));

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("What is 2 + 2?")).toBeInTheDocument();
    });

    answerAndSubmit("B. 4"); // correct option

    await waitFor(() => {
      expect(screen.getByText("Correct!")).toBeInTheDocument();
    });

    // The incorrect panel and the reveal copy must NOT appear for a correct answer.
    expect(screen.queryByText("Incorrect")).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("practice-correct-answer-reveal")
    ).not.toBeInTheDocument();

    // Once feedback shows, the student advances via "Next Question".
    expect(
      screen.getByRole("button", { name: /next question/i })
    ).toBeInTheDocument();
  });

  it("renders the incorrect panel and reveals the correct answer on a wrong submission (R2.2)", async () => {
    mockStartMutateAsync.mockResolvedValue({ id: "attempt-123" });
    mockSelectMutateAsync
      .mockResolvedValueOnce(mcqQuestion())
      .mockResolvedValueOnce(mcqQuestion({ question_number: 2, id: "q-2" }));

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("What is 2 + 2?")).toBeInTheDocument();
    });

    answerAndSubmit("A. 3"); // wrong option

    await waitFor(() => {
      expect(screen.getByText("Incorrect")).toBeInTheDocument();
    });

    // The correct answer is revealed to the student (R2.2): "4" is the text of
    // the correct option (key "B").
    const reveal = screen.getByTestId("practice-correct-answer-reveal");
    expect(reveal).toBeInTheDocument();
    expect(within(reveal).getByText("4")).toBeInTheDocument();

    // The incorrect panel must never claim the answer was correct.
    expect(screen.queryByText("Correct!")).not.toBeInTheDocument();
  });

  it("reveals the correct answer in the question options when feedback is shown (R2.2)", async () => {
    mockStartMutateAsync.mockResolvedValue({ id: "attempt-123" });
    mockSelectMutateAsync
      .mockResolvedValueOnce(mcqQuestion())
      .mockResolvedValueOnce(mcqQuestion({ question_number: 2, id: "q-2" }));

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("What is 2 + 2?")).toBeInTheDocument();
    });

    answerAndSubmit("A. 3"); // wrong option

    await waitFor(() => {
      expect(screen.getByText("Incorrect")).toBeInTheDocument();
    });

    // The correct option button is highlighted as correct (green) once the
    // reveal is active, so the student can see which option was right.
    const correctOption = screen.getByRole("radio", { name: "B. 4" });
    expect(correctOption.className).toContain("green");

    // The answered options are disabled during feedback (no re-answering).
    expect(correctOption).toBeDisabled();
  });

  it("renders the incorrect panel with a graceful fallback when no correct answer is available (R2.2, R2.6)", async () => {
    mockStartMutateAsync.mockResolvedValue({ id: "attempt-123" });
    // Question without a `correct_answer` field — there is nothing to reveal.
    const noAnswer = mcqQuestion();
    delete (noAnswer.question as Record<string, unknown>).correct_answer;
    mockSelectMutateAsync
      .mockResolvedValueOnce(noAnswer)
      .mockResolvedValueOnce(mcqQuestion({ question_number: 2, id: "q-2" }));

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByText("What is 2 + 2?")).toBeInTheDocument();
    });

    answerAndSubmit("B. 4"); // any answer; absent correct_answer ⇒ incorrect

    await waitFor(() => {
      expect(screen.getByText("Incorrect")).toBeInTheDocument();
    });

    // With no correct answer to reveal, the dedicated reveal element is absent
    // and the panel falls back to a non-misleading "review later" message
    // rather than claiming the answer was correct (R2.6).
    expect(
      screen.queryByTestId("practice-correct-answer-reveal")
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/review the correct answer and explanation/i)
    ).toBeInTheDocument();
    expect(screen.queryByText("Correct!")).not.toBeInTheDocument();
  });
});
