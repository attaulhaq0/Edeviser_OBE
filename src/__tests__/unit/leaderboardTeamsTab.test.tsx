// =============================================================================
// Leaderboard Teams Tab — Smoke test (Task 10.8)
// Verifies that a "Teams" filter option exists in the leaderboard
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'u1' },
    profile: { role: 'student', institution_id: 'inst-1' },
    role: 'student',
    institutionId: 'inst-1',
  }),
}));

vi.mock('@/hooks/useRealtime', () => ({
  useRealtime: () => ({ isLive: true, retryCount: 0 }),
}));

vi.mock('@/hooks/useLeaderboard', () => ({
  useLeaderboard: () => ({ data: [], isLoading: false }),
  useMyRank: () => ({ data: { rank: 1, xp_total: 100, level: 1 }, isLoading: false }),
  useAnonymousStatus: () => ({ data: { isAnonymous: false } }),
}));

vi.mock('@/hooks/usePersonalBestLeaderboard', () => ({
  usePersonalBestLeaderboard: () => ({ data: [], isLoading: false }),
}));

vi.mock('@/hooks/useMostImprovedLeaderboard', () => ({
  useMostImprovedLeaderboard: () => ({ data: [], isLoading: false }),
}));

vi.mock('@/hooks/useLeagueLeaderboard', () => ({
  useLeagueLeaderboard: () => ({ data: [], isLoading: false }),
  useStudentLeagueTier: () => ({ data: { tier: 'Bronze', xpTotal: 100 }, isLoading: false }),
  useStudentPercentileBand: () => ({
    data: { band: { type: 'band', band: 'Top 50%' }, rank: 1, totalStudents: 1 },
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

vi.mock('canvas-confetti', () => ({ default: vi.fn() }));

vi.mock('framer-motion', async () => {
  const actual = await vi.importActual('framer-motion');
  return { ...actual, useReducedMotion: () => false };
});

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Bar: () => <div />,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Cell: () => null,
}));

vi.mock('nuqs', () => {
  const stateStore = new Map<string, string>();
  return {
    parseAsString: { withDefault: (def: string) => def },
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

const renderPage = () =>
  render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter initialEntries={['/student/leaderboard']}>
        <LeaderboardPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Leaderboard — Teams Tab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a "Teams" mode tab option', () => {
    renderPage();
    expect(screen.getByText('Teams')).toBeInTheDocument();
  });

  it('renders the "Individual" mode tab alongside Teams', () => {
    renderPage();
    expect(screen.getByText('Individual')).toBeInTheDocument();
    expect(screen.getByText('Teams')).toBeInTheDocument();
  });
});
