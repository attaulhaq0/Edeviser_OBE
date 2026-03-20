// =============================================================================
// PostQuizReview — Unit tests (Page-level)
// Validates: Requirement 10 (Student Post-Quiz Review), Task 10.2
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('@/lib/supabase', () => {
  const mockFrom = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            id: 'attempt-1',
            quiz_id: 'quiz-1',
            score: 75,
            answers: { 'q-1': 'B', 'q-2': 'A', 'q-3': 'C' },
            question_sequence: [
              { question_id: 'q-1' },
              { question_id: 'q-2' },
              { question_id: 'q-3' },
            ],
          },
          error: null,
        }),
      }),
      in: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'q-1',
            question_text: 'What is OOP?',
            question_type: 'mcq',
            options: [
              { key: 'A', text: 'A paradigm' },
              { key: 'B', text: 'Object-Oriented Programming' },
            ],
            correct_answer: { value: 'B', explanation: 'OOP stands for Object-Oriented Programming' },
            explanation: 'OOP is a programming paradigm based on objects.',
            bloom_level: 2,
            clo_id: 'clo-1',
          },
          {
            id: 'q-2',
            question_text: 'Is Java compiled?',
            question_type: 'true_false',
            options: null,
            correct_answer: { value: 'True', explanation: 'Java is compiled to bytecode' },
            explanation: 'Java uses a compiler to produce bytecode.',
            bloom_level: 1,
            clo_id: 'clo-1',
          },
          {
            id: 'q-3',
            question_text: 'Name a sorting algorithm.',
            question_type: 'short_answer',
            options: null,
            correct_answer: { value: 'QuickSort', explanation: 'QuickSort is a common sorting algorithm' },
            explanation: null,
            bloom_level: 3,
            clo_id: 'clo-2',
          },
        ],
        error: null,
      }),
    }),
  });

  return {
    supabase: {
      from: mockFrom,
    },
  };
});

vi.mock('@/lib/queryKeys', () => ({
  queryKeys: {
    quizAttempts: {
      detail: (id: string) => ['quizAttempts', 'detail', id],
    },
  },
}));

import PostQuizReview from '@/pages/student/quiz/PostQuizReview';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/student/quizzes/quiz-1/review/attempt-1']}>
        <Routes>
          <Route path="/student/quizzes/:quizId/review/:attemptId" element={children} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('PostQuizReview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays overall score', async () => {
    render(<PostQuizReview />, { wrapper: createWrapper() });

    // Wait for data to load
    expect(await screen.findByText('75%')).toBeInTheDocument();
    expect(screen.getByText(/Overall Score/)).toBeInTheDocument();
  });

  it('displays AI explanation text for questions that have one', async () => {
    render(<PostQuizReview />, { wrapper: createWrapper() });

    expect(
      await screen.findByText('OOP is a programming paradigm based on objects.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Java uses a compiler to produce bytecode.'),
    ).toBeInTheDocument();
  });

  it('renders CLO badges for questions', async () => {
    render(<PostQuizReview />, { wrapper: createWrapper() });

    // CLO IDs are used as badge text (clo_title falls back to clo_id)
    await screen.findByText('75%');
    const cloBadges = screen.getAllByText(/clo-/);
    expect(cloBadges.length).toBeGreaterThan(0);
  });

  it('renders Bloom\'s level badges', async () => {
    render(<PostQuizReview />, { wrapper: createWrapper() });

    await screen.findByText('75%');
    // Bloom's labels: Understanding (2), Remembering (1), Applying (3)
    expect(screen.getByText('Understanding')).toBeInTheDocument();
    expect(screen.getByText('Remembering')).toBeInTheDocument();
    expect(screen.getByText('Applying')).toBeInTheDocument();
  });

  it('shows "Get Help" link for incorrect answers', async () => {
    render(<PostQuizReview />, { wrapper: createWrapper() });

    await screen.findByText('75%');
    // q-2 answer is 'A' but correct is 'True', so it's incorrect
    // q-3 answer is 'C' but correct is 'QuickSort', so it's incorrect
    const helpLinks = screen.getAllByText(/Get Help/);
    expect(helpLinks.length).toBeGreaterThan(0);
  });

  it('shows correct/incorrect indicators per question', async () => {
    render(<PostQuizReview />, { wrapper: createWrapper() });

    await screen.findByText('75%');
    // q-1: answer 'B' === correct 'B' → Correct
    // q-2: answer 'A' !== correct 'True' → Incorrect
    // q-3: answer 'C' !== correct 'QuickSort' → Incorrect
    expect(screen.getByText('Correct')).toBeInTheDocument();
    expect(screen.getAllByText('Incorrect').length).toBe(2);
  });

  it('displays per-CLO score breakdown section', async () => {
    render(<PostQuizReview />, { wrapper: createWrapper() });

    await screen.findByText('75%');
    expect(screen.getByText('Per-CLO Score Breakdown')).toBeInTheDocument();
    // clo-1: q-1 correct, q-2 incorrect → 50%
    // clo-2: q-3 incorrect → 0%
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('"Get Help" links are scoped to the question CLO', async () => {
    render(<PostQuizReview />, { wrapper: createWrapper() });

    await screen.findByText('75%');
    const helpLinks = screen.getAllByText(/Get Help/);
    // q-2 (clo-1) and q-3 (clo-2) are incorrect
    const hrefs = helpLinks.map((link) => link.closest('a')?.getAttribute('href'));
    expect(hrefs).toContain('/student/ai-tutor?clo=clo-1');
    expect(hrefs).toContain('/student/ai-tutor?clo=clo-2');
  });

  it('labels AI explanations with "AI Explanation" heading', async () => {
    render(<PostQuizReview />, { wrapper: createWrapper() });

    await screen.findByText('75%');
    // Two questions have explanations (q-1 and q-2), q-3 has null
    const labels = screen.getAllByText('AI Explanation');
    expect(labels.length).toBe(2);
  });

  it('does not show "Get Help" link for correct answers', async () => {
    render(<PostQuizReview />, { wrapper: createWrapper() });

    await screen.findByText('75%');
    // q-1 is correct, so only 2 help links (for q-2 and q-3)
    const helpLinks = screen.getAllByText(/Get Help/);
    expect(helpLinks.length).toBe(2);
  });

  it('renders "Back to Dashboard" button', async () => {
    render(<PostQuizReview />, { wrapper: createWrapper() });

    await screen.findByText('75%');
    expect(screen.getByRole('link', { name: /Back to Dashboard/i })).toBeInTheDocument();
  });
});
