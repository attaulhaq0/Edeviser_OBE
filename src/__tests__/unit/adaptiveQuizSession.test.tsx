// =============================================================================
// AdaptiveQuizSession — Unit tests
// Validates: Requirement 7 (Adaptive Quiz Session Flow), Task 10.1
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
  useParams: () => ({ quizId: 'quiz-123' }),
  useNavigate: () => mockNavigate,
}));

const mockStartMutateAsync = vi.fn();
const mockSelectMutateAsync = vi.fn();
const mockSubmitMutateAsync = vi.fn();

vi.mock('@/hooks/useAdaptiveQuiz', () => ({
  useStartAdaptiveQuiz: () => ({
    mutateAsync: mockStartMutateAsync,
  }),
  useSelectNextQuestion: () => ({
    mutateAsync: mockSelectMutateAsync,
  }),
  useSubmitQuizAttempt: () => ({
    mutateAsync: mockSubmitMutateAsync,
  }),
}));

vi.mock('@/hooks/usePracticeMode', () => ({
  usePracticeModeConfig: () => ({ data: null, isLoading: false }),
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
  },
}));

import AdaptiveQuizSession from '@/pages/student/quiz/AdaptiveQuizSession';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const mockQuestion = {
  question: {
    id: 'q-1',
    question_text: 'What is 2 + 2?',
    question_type: 'mcq',
    options: [
      { key: 'A', text: '3' },
      { key: 'B', text: '4' },
      { key: 'C', text: '5' },
      { key: 'D', text: '6' },
    ],
    bloom_level: 1,
    clo_id: 'clo-1',
  },
  question_number: 1,
  total_questions: 5,
  current_target_difficulty: 2.5,
  session_complete: false,
};

const setupSuccessfulInit = () => {
  mockStartMutateAsync.mockResolvedValue({ id: 'attempt-123' });
  mockSelectMutateAsync.mockResolvedValue(mockQuestion);
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('AdaptiveQuizSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows loading spinner during initialization', () => {
    mockStartMutateAsync.mockReturnValue(new Promise(() => {})); // never resolves
    render(<AdaptiveQuizSession />);
    expect(screen.getByText('Preparing your adaptive quiz...')).toBeInTheDocument();
  });

  it('renders progress bar with correct width after loading', async () => {
    setupSuccessfulInit();
    const { container } = render(<AdaptiveQuizSession />);

    await waitFor(() => {
      expect(screen.getByText('Question 1 of 5')).toBeInTheDocument();
    });

    // Progress bar: 1/5 = 20%
    const progressBar = container.querySelector('[style*="width"]');
    expect(progressBar).not.toBeNull();
    expect(progressBar?.getAttribute('style')).toContain('20%');
  });

  it('displays formatted timer', async () => {
    setupSuccessfulInit();
    render(<AdaptiveQuizSession />);

    await waitFor(() => {
      expect(screen.getByText('Question 1 of 5')).toBeInTheDocument();
    });

    // Default time limit is 1800 seconds = 30:00
    expect(screen.getByText('30:00')).toBeInTheDocument();
  });

  it('renders the question text', async () => {
    setupSuccessfulInit();
    render(<AdaptiveQuizSession />);

    await waitFor(() => {
      expect(screen.getByText('What is 2 + 2?')).toBeInTheDocument();
    });
  });

  it('disables submit button when no answer is selected', async () => {
    setupSuccessfulInit();
    render(<AdaptiveQuizSession />);

    await waitFor(() => {
      expect(screen.getByText('Question 1 of 5')).toBeInTheDocument();
    });

    const submitButton = screen.getByRole('button', { name: /submit answer/i });
    expect(submitButton).toBeDisabled();
  });

  it('enables submit button when an answer is selected', async () => {
    setupSuccessfulInit();
    render(<AdaptiveQuizSession />);

    await waitFor(() => {
      expect(screen.getByText('What is 2 + 2?')).toBeInTheDocument();
    });

    // Select an answer
    fireEvent.click(screen.getByText('4'));

    const submitButton = screen.getByRole('button', { name: /submit answer/i });
    expect(submitButton).not.toBeDisabled();
  });

  it('shows error state when session fails to load', async () => {
    mockStartMutateAsync.mockRejectedValue(new Error('Network error'));
    render(<AdaptiveQuizSession />);

    await waitFor(() => {
      expect(screen.getByText(/Unable to load quiz/)).toBeInTheDocument();
    });
  });

  it('shows "Finish Quiz" on the last question', async () => {
    mockStartMutateAsync.mockResolvedValue({ id: 'attempt-123' });
    mockSelectMutateAsync.mockResolvedValue({
      ...mockQuestion,
      question_number: 5,
      total_questions: 5,
    });

    render(<AdaptiveQuizSession />);

    await waitFor(() => {
      expect(screen.getByText('Question 5 of 5')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /finish quiz/i })).toBeInTheDocument();
  });
});
