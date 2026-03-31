// =============================================================================
// LeaderboardPage — Unit tests (updated for Personal Best & Most Improved tabs)
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

const mockWeeklyXP = [
  { weekStart: '2025-06-02', weekLabel: 'Week 1', xp: 100, isCurrentWeek: false, isPersonalBest: false },
  { weekStart: '2025-06-09', weekLabel: 'Week 2', xp: 150, isCurrentWeek: false, isPersonalBest: false },
  { weekStart: '2025-06-16', weekLabel: 'Week 3', xp: 200, isCurrentWeek: false, isPersonalBest: true },
  { weekStart: '2025-06-23', weekLabel: 'Week 4', xp: 120, isCurrentWeek: false, isPersonalBest: false },
  { weekStart: '2025-06-30', weekLabel: 'Week 5', xp: 80, isCurrentWeek: false, isPersonalBest: false },
  { weekStart: '2025-07-07', weekLabel: 'Week 6', xp: 90, isCurrentWeek: false, isPersonalBest: false },
  { weekStart: '2025-07-14', weekLabel: 'Week 7', xp: 110, isCurrentWeek: false, isPersonalBest: false },
  { weekStart: '2025-07-21', weekLabel: 'Week 8', xp: 130, isCurrentWeek: true, isPersonalBest: false },
];

const mockMostImproved = [
  { student_id: 'u1', student_name: 'Alice', current_4_week_xp: 500, previous_4_week_xp: 200, improvement_percent: 150, xp_delta: 300 },
  { student_id: 'u2', student_name: 'Bob', current_4_week_xp: 400, previous_4_week_xp: 250, improvement_percent: 60, xp_delta: 150 },
  { student_id: 'current-user', student_name: 'Me', current_4_week_xp: 300, previous_4_week_xp: 200, improvement_percent: 50, xp_delta: 100 },
];

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'current-user' }, profile: { role: 'student', institution_id: 'inst-1' }, role: 'student', institutionId: 'inst-1' }),
}));

vi.mock('@/hooks/useRealtime', () => ({
  useRealtime: () => ({ isLive: true, retryCount: 0 }),
}));

vi.mock('@/hooks/useLeaderboard', () => ({
  useLeaderboard: () => ({ data: mockLeaderboardData, isLoading: false }),
  useMyRank: () => ({ data: mockMyRank, isLoading: false }),
  useAnonymousStatus: () => ({ data: { isAnonymous: false } }),
}));

vi.mock('@/hooks/usePersonalBestLeaderboard', () => ({
  usePersonalBestLeaderboard: () => ({ data: mockWeeklyXP, isLoading: false }),
}));

vi.mock('@/hooks/useMostImprovedLeaderboard', () => ({
  useMostImprovedLeaderboard: () => ({ data: mockMostImproved, isLoading: false }),
}));

vi.mock('@/hooks/useLeagueLeaderboard', () => ({
  useLeagueLeaderboard: () => ({ data: [], isLoading: false }),
  useStudentLeagueTier: () => ({ data: { tier: 'Silver', xpTotal: 1000 }, isLoading: false }),
  useStudentPercentileBand: () => ({ data: { band: { type: 'band', band: 'Bottom 50%' }, rank: 25, totalStudents: 4 }, isLoading: false }),
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

// Mock canvas-confetti
vi.mock('canvas-confetti', () => ({ default: vi.fn() }));

// Mock framer-motion useReducedMotion
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual('framer-motion');
  return { ...actual, useReducedMotion: () => false };
});

// Mock recharts to avoid SVG rendering issues in jsdom
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Cell: () => null,
}));

// nuqs mock
vi.mock('nuqs', () => {
  const stateStore = new Map<string, string>();
  return {
    parseAsString: {
      withDefault: (def: string) => def,
    },
    useQueryState: (_key: string, defaultVal: string) => {
      const val = stateStore.get(_key) ?? (typeof defaultVal === 'string' ? defaultVal : '');
      const setter = vi.fn((newVal: string) => { stateStore.set(_key, newVal); });
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

  it('renders mode tabs: Individual and Teams', () => {
    renderPage();
    expect(screen.getByText('Individual')).toBeInTheDocument();
    expect(screen.getByText('Teams')).toBeInTheDocument();
  });

  it('renders leaderboard tab navigation: Top XP, Personal Best, Most Improved', () => {
    renderPage();
    expect(screen.getByText('Top XP')).toBeInTheDocument();
    expect(screen.getByText('Personal Best')).toBeInTheDocument();
    expect(screen.getByText('Most Improved')).toBeInTheDocument();
  });

  it('renders filter tabs: All Students, My Course, My Program in Top XP view', () => {
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
    const rankCard = screen.getByText('Your Rank').closest('[data-slot="card"]');
    expect(rankCard).toBeInTheDocument();
    if (rankCard) {
      // With percentile bands, rank 25 out of 4 entries shows as "Bottom 50%"
      expect(within(rankCard as HTMLElement).getByText('Bottom 50%')).toBeInTheDocument();
      expect(within(rankCard as HTMLElement).getByText('1,000')).toBeInTheDocument();
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

  it('renders Top 50 section header', () => {
    renderPage();
    expect(screen.getByText('Top 50')).toBeInTheDocument();
  });

  it('renders League tab in navigation', () => {
    renderPage();
    expect(screen.getByText('League')).toBeInTheDocument();
  });

  it('shows streak flame for entries with active streaks', () => {
    renderPage();
    const aliceRow = screen.getByText('Alice').closest('div[class*="flex items-center gap-4"]');
    expect(aliceRow).toBeInTheDocument();
    if (aliceRow) {
      expect(within(aliceRow as HTMLElement).getByText('30')).toBeInTheDocument();
    }
  });
});
