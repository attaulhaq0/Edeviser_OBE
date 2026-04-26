// Task 26.3: Bonus question popup — rendering, timer, answer submission
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import BonusQuestionPopup from '@/components/shared/BonusQuestionPopup';

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockMutate = vi.fn();
vi.mock('@/hooks/useBonusQuestion', () => ({
  useSubmitBonusAnswer: () => ({ mutate: mockMutate, isPending: false }),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() } }));

const mockQuestion = {
  id: 'q-1',
  question_text: 'What is 2 + 2?',
  options: [
    { key: 'A', text: 'Three' },
    { key: 'B', text: 'Four' },
    { key: 'C', text: 'Five' },
  ],
  correct_answer: 'B',
  clo_id: 'clo-1',
};

const createWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
};

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('BonusQuestionPopup', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('renders question text when open', () => {
    render(
      <BonusQuestionPopup question={mockQuestion} studentId="s-1" open onOpenChange={vi.fn()} />,
      { wrapper: createWrapper() },
    );
    expect(screen.getByText('What is 2 + 2?')).toBeDefined();
  });

  it('renders all answer options', () => {
    render(
      <BonusQuestionPopup question={mockQuestion} studentId="s-1" open onOpenChange={vi.fn()} />,
      { wrapper: createWrapper() },
    );
    expect(screen.getByText('Three')).toBeDefined();
    expect(screen.getByText('Four')).toBeDefined();
    expect(screen.getByText('Five')).toBeDefined();
  });

  it('renders the title "Bonus Question!"', () => {
    render(
      <BonusQuestionPopup question={mockQuestion} studentId="s-1" open onOpenChange={vi.fn()} />,
      { wrapper: createWrapper() },
    );
    expect(screen.getByText('Bonus Question!')).toBeDefined();
  });

  it('shows submit button', () => {
    render(
      <BonusQuestionPopup question={mockQuestion} studentId="s-1" open onOpenChange={vi.fn()} />,
      { wrapper: createWrapper() },
    );
    expect(screen.getByText('Submit Answer')).toBeDefined();
  });

  it('submit button is disabled when no answer selected', () => {
    render(
      <BonusQuestionPopup question={mockQuestion} studentId="s-1" open onOpenChange={vi.fn()} />,
      { wrapper: createWrapper() },
    );
    const submitBtn = screen.getByText('Submit Answer');
    expect(submitBtn.closest('button')?.disabled).toBe(true);
  });

  it('enables submit after selecting an answer', () => {
    render(
      <BonusQuestionPopup question={mockQuestion} studentId="s-1" open onOpenChange={vi.fn()} />,
      { wrapper: createWrapper() },
    );
    fireEvent.click(screen.getByText('Four'));
    const submitBtn = screen.getByText('Submit Answer');
    expect(submitBtn.closest('button')?.disabled).toBe(false);
  });

  it('calls submitAnswer mutation on submit', () => {
    render(
      <BonusQuestionPopup question={mockQuestion} studentId="s-1" open onOpenChange={vi.fn()} />,
      { wrapper: createWrapper() },
    );
    fireEvent.click(screen.getByText('Four'));
    fireEvent.click(screen.getByText('Submit Answer'));
    expect(mockMutate).toHaveBeenCalledWith(
      { questionId: 'q-1', answer: 'B', studentId: 's-1' },
      expect.any(Object),
    );
  });

  it('renders nothing when question is null', () => {
    const { container } = render(
      <BonusQuestionPopup question={null as never} studentId="s-1" open onOpenChange={vi.fn()} />,
      { wrapper: createWrapper() },
    );
    expect(container.innerHTML).toBe('');
  });
});
