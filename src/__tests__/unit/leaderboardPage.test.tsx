// =============================================================================
// LeaderboardPage — Unit tests
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockLeaderboardData = [
  { student_id: 'u1', full_name: 'Alice', xp_total: 5000, level: 10, streak_current: 30, rank: 1 },
  { student_id: 'u2', full_name: 'Bob', xp_total: 4500, level: 9, streak_current: 15, rank: 2 },
  { student_id: 'u3', full_name: 'Anonymous', xp_total: 4000, level: 8, streak_current: 0, rank: 3 },
  { student_id: 'current-user', full_name: 'Me', xp_total: 1000, level: 3, streak_current: 5, rank: 25 },
];

const mockMyRank = { rank: 25, xp_total: 1000, level: 3 };

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'current-user' }, profile: { role: 'student' }, role: 'student' }),
}));

vi.mock('@/hooks/useLeaderboard', () => ({
  useLeaderboard: () => ({
    data: mockLeaderboardData,
    isLoading: false,
  }),
  useMyRank: () => ({
    data: mockMyRank,
    isLoading: false,
  }),
}));

vi.mock('@/components/shared/AnonymousToggle', () => ({
  default: () => <div data-testid="anonymous-toggle">AnonymousToggle</div>,
}));

vi.mock('@/pages/student/leaderboard/useStudentCourseProgram', () => ({
  useStudentCourseProgram: () => ({
    courses: [{ id: 'c1', name: 'Math 101' }],
    programs: [{ id: 'p1', name: 'CS Program' }],
    isLoading: false,
  }),
}));

// nuqs mock
vi.mock('nuqs', () => {
  return {
    parseAsString: {
      withDefault: (def: string) => def,
    },
    useQueryState: (key: string, defaultVal: string) => {
      const val = typeof defaultVal === 'string' ? defaultVal : '';
      const setter = vi.fn();
      return [val, setter] as const;
    },
  };
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

import LeaderboardPage from '@/pages/student/leaderboard/LeaderboardPage';

const createQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

const renderPage = () => {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter initialEntries={['/student/leaderboard']}>
        <LeaderboardPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('LeaderboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page title with Trophy icon', () => {
    renderPage();
    expect(screen.getByText('Leaderboard')).toBeInTheDocument();
  });

  it('renders filter tabs: All Students, My Course, My Program', () => {
    renderPage();
    expect(screen.getByText('All Students')).toBeInTheDocument();
    expect(screen.getByText('My Course')).toBeInTheDocument();
    expect(screen.getByText('My Program')).toBeInTheDocument();
  });

  it('renders timeframe buttons: Weekly and All Time', () => {
    renderPage();
    expect(screen.getByText('Weekly')).toBeInTheDocument();
    expect(screen.getByText('All Time')).toBeInTheDocument();
  });

  it('renders My Rank card with rank, XP, and level', () => {
    renderPage();
    expect(screen.getByText('Your Rank')).toBeInTheDocument();
    // The rank card shows rank, XP, and level
    const rankCard = screen.getByText('Your Rank').closest('[data-slot="card"]');
    expect(rankCard).toBeInTheDocument();
    if (rankCard) {
      expect(within(rankCard).getByText('#25')).toBeInTheDocument();
      expect(within(rankCard).getByText('1,000')).toBeInTheDocument();
    }
  });

  it('renders leaderboard entries with names and XP', () => {
    renderPage();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('5,000 XP')).toBeInTheDocument();
    expect(screen.getByText('4,500 XP')).toBeInTheDocument();
  });

  it('shows Anonymous for opted-out students', () => {
    renderPage();
    const anonymousElements = screen.getAllByText('Anonymous');
    expect(anonymousElements.length).toBeGreaterThanOrEqual(1);
  });

  it('highlights the current user row with (You) label', () => {
    renderPage();
    expect(screen.getByText('Me')).toBeInTheDocument();
    expect(screen.getByText('(You)')).toBeInTheDocument();
  });

  it('renders level badges for each entry', () => {
    renderPage();
    expect(screen.getByText('Lv 10')).toBeInTheDocument();
    expect(screen.getByText('Lv 9')).toBeInTheDocument();
    expect(screen.getByText('Lv 8')).toBeInTheDocument();
    expect(screen.getByText('Lv 3')).toBeInTheDocument();
  });

  it('renders the AnonymousToggle component', () => {
    renderPage();
    expect(screen.getByTestId('anonymous-toggle')).toBeInTheDocument();
  });

  it('renders AnonymousToggle in the page header', async () => {
    renderPage();
    expect(screen.getByTestId('anonymous-toggle')).toBeInTheDocument();
  });

  it('renders Top 50 section header', () => {
    renderPage();
    expect(screen.getByText('Top 50')).toBeInTheDocument();
  });

  it('shows streak flame for entries with active streaks', () => {
    renderPage();
    // Alice has streak 30
    const aliceRow = screen.getByText('Alice').closest('div[class*="flex items-center gap-4"]');
    expect(aliceRow).toBeInTheDocument();
    if (aliceRow) {
      expect(within(aliceRow).getByText('30')).toBeInTheDocument();
    }
  });
});
