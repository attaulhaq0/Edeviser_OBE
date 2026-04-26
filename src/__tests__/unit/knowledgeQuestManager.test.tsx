// Task 26.5: Knowledge Quest Manager — Quest CRUD form, date validation
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import KnowledgeQuestManager from '@/pages/admin/marketplace/KnowledgeQuestManager';

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockQuests = [
  {
    id: 'q-1',
    title: 'Math Challenge',
    description: 'Complete 5 math quizzes',
    quest_type: 'quiz_challenge',
    start_date: '2025-01-01T00:00:00Z',
    end_date: '2025-01-31T00:00:00Z',
    reward_type: 'xp',
    reward_item_id: null,
    reward_xp_amount: 200,
    target_clo_ids: [],
  },
];

vi.mock('@/hooks/useKnowledgeQuestAdmin', () => ({
  useAdminKnowledgeQuests: () => ({ data: mockQuests, isLoading: false }),
  useCreateKnowledgeQuest: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateKnowledgeQuest: () => ({ mutate: vi.fn(), isPending: false }),
}));

const createWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
};

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('KnowledgeQuestManager', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('renders the page title', () => {
    render(<KnowledgeQuestManager />, { wrapper: createWrapper() });
    expect(screen.getByText('Knowledge Quests')).toBeDefined();
  });

  it('renders the "New Quest" button', () => {
    render(<KnowledgeQuestManager />, { wrapper: createWrapper() });
    expect(screen.getByText('New Quest')).toBeDefined();
  });

  it('displays quest data in the table', () => {
    render(<KnowledgeQuestManager />, { wrapper: createWrapper() });
    expect(screen.getByText('Math Challenge')).toBeDefined();
  });

  it('shows quest type badge', () => {
    render(<KnowledgeQuestManager />, { wrapper: createWrapper() });
    expect(screen.getByText('quiz challenge')).toBeDefined();
  });

  it('shows reward info', () => {
    render(<KnowledgeQuestManager />, { wrapper: createWrapper() });
    expect(screen.getByText('200 XP')).toBeDefined();
  });

  it('opens create form when New Quest is clicked', () => {
    render(<KnowledgeQuestManager />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByText('New Quest'));
    expect(screen.getByRole('heading', { name: 'Create Quest' })).toBeDefined();
    expect(screen.getByLabelText('Title')).toBeDefined();
  });

  it('shows quest type select in form', () => {
    render(<KnowledgeQuestManager />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByText('New Quest'));
    expect(screen.getByText('Quest Type')).toBeDefined();
  });

  it('shows date fields in form', () => {
    render(<KnowledgeQuestManager />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByText('New Quest'));
    expect(screen.getByText('Start Date')).toBeDefined();
    expect(screen.getByText('End Date')).toBeDefined();
  });

  it('closes form when Cancel is clicked', () => {
    render(<KnowledgeQuestManager />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByText('New Quest'));
    expect(screen.getByRole('heading', { name: 'Create Quest' })).toBeDefined();
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByRole('heading', { name: 'Create Quest' })).toBeNull();
  });
});
