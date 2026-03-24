// =============================================================================
// JournalListPage — Unit tests
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ─── Mock data ───────────────────────────────────────────────────────────────

const mockEntries = [
  {
    id: 'j1',
    student_id: 'u1',
    course_id: 'c1',
    content: 'This is my first reflection entry about the course material and how I understood the key concepts presented in class.',
    clo_id: null,
    is_shared: false,
    created_at: '2025-01-15T10:00:00Z',
  },
  {
    id: 'j2',
    student_id: 'u1',
    course_id: 'c2',
    content: 'I shared this entry with my teacher to get feedback on my understanding of the learning outcomes.',
    clo_id: 'clo-1',
    is_shared: true,
    created_at: '2025-01-16T14:30:00Z',
  },
];

const mockCourses = [
  { id: 'c1', name: 'Math 101' },
  { id: 'c2', name: 'Physics 201' },
];

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'u1' },
    profile: { role: 'student', institution_id: 'inst-1' },
    role: 'student',
    institutionId: 'inst-1',
  }),
}));

vi.mock('@/hooks/useJournal', () => ({
  useJournalEntries: () => ({
    data: mockEntries,
    isLoading: false,
  }),
}));

vi.mock('@/pages/student/leaderboard/useStudentCourseProgram', () => ({
  useStudentCourseProgram: () => ({
    courses: mockCourses,
    programs: [],
    isLoading: false,
  }),
}));

vi.mock('nuqs', () => ({
  parseAsString: {
    withDefault: (def: string) => def,
  },
  useQueryState: (_key: string, defaultVal: string) => {
    const val = typeof defaultVal === 'string' ? defaultVal : 'all';
    return [val, vi.fn()] as const;
  },
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

import JournalListPage from '@/pages/student/journal/JournalListPage';

const createQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

const renderPage = () =>
  render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter initialEntries={['/student/journal']}>
        <JournalListPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('JournalListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page title', () => {
    renderPage();
    expect(screen.getByText('Reflection Journal')).toBeInTheDocument();
  });

  it('renders the New Entry button', () => {
    renderPage();
    expect(screen.getByText('New Entry')).toBeInTheDocument();
  });

  it('renders journal entry cards with content preview', () => {
    renderPage();
    expect(screen.getByText(/This is my first reflection/)).toBeInTheDocument();
    expect(screen.getByText(/I shared this entry/)).toBeInTheDocument();
  });

  it('shows course name badges on entries', () => {
    renderPage();
    expect(screen.getByText('Math 101')).toBeInTheDocument();
    expect(screen.getByText('Physics 201')).toBeInTheDocument();
  });

  it('shows Shared badge for shared entries', () => {
    renderPage();
    expect(screen.getByText('Shared')).toBeInTheDocument();
  });

  it('shows word count for each entry', () => {
    renderPage();
    // First entry has ~20 words
    const wordCounts = screen.getAllByText(/\d+ words/);
    expect(wordCounts.length).toBe(2);
  });

  it('navigates to new entry on button click', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByText('New Entry'));
    expect(mockNavigate).toHaveBeenCalledWith('/student/journal/new');
  });

  it('navigates to entry editor on card click', async () => {
    const user = userEvent.setup();
    renderPage();
    const firstCard = screen.getByText(/This is my first reflection/).closest('[role="button"]');
    if (firstCard) await user.click(firstCard);
    expect(mockNavigate).toHaveBeenCalledWith('/student/journal/j1');
  });

  it('renders course filter dropdown', () => {
    renderPage();
    expect(screen.getByText('All Courses')).toBeInTheDocument();
  });
});
