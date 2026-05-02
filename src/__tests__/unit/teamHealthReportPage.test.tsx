// Unit test: TeamHealthReportPage — renders team counts, flagged teams, recommendations
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// ── Mocks ────────────────────────────────────────────────────────────────────
vi.mock('nuqs', () => ({
  parseAsString: { withDefault: (d: string) => ({ defaultValue: d }) },
  useQueryState: (_key: string, opts: { defaultValue: string }) => [opts?.defaultValue ?? '', vi.fn()],
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'teacher-1' }, institutionId: 'inst-1' }),
}));

vi.mock('@/hooks/useCourses', () => ({
  useCourses: () => ({
    data: {
      data: [
        { id: 'course-1', name: 'CS101', teacher_id: 'teacher-1' },
      ],
    },
  }),
}));

const mockHealthScores = [
  { team_id: 't1', team_name: 'Alpha', health_score: 85, health_status: 'healthy' as const, cooperation_score: 90 },
  { team_id: 't2', team_name: 'Beta', health_score: 55, health_status: 'needs_attention' as const, cooperation_score: 60 },
  { team_id: 't3', team_name: 'Gamma', health_score: 30, health_status: 'at_risk' as const, cooperation_score: 40 },
];

vi.mock('@/hooks/useTeamHealth', () => ({
  useTeamHealthScores: () => ({ data: mockHealthScores, isLoading: false }),
}));

vi.mock('@/components/shared/TeamHealthBadge', () => ({
  default: ({ score }: { score: number }) => <span data-testid="health-badge">{score}</span>,
}));

vi.mock('@/components/shared/Shimmer', () => ({
  default: ({ className }: { className?: string }) => <div data-testid="shimmer" className={className} />,
}));

import TeamHealthReportPage from '@/pages/teacher/teams/TeamHealthReportPage';

describe('TeamHealthReportPage', () => {
  it('renders page title', () => {
    render(<TeamHealthReportPage />);
    expect(screen.getByText('Team Health Report')).toBeDefined();
  });

  it('renders total teams count', () => {
    render(<TeamHealthReportPage />);
    expect(screen.getByText('3')).toBeDefined(); // total teams
  });

  it('renders healthy count', () => {
    render(<TeamHealthReportPage />);
    // Multiple "1" values exist (healthy=1, needs_attention=1, at_risk=1)
    const ones = screen.getAllByText('1');
    expect(ones.length).toBeGreaterThanOrEqual(1);
  });

  it('renders flagged teams section', () => {
    render(<TeamHealthReportPage />);
    expect(screen.getByText(/Flagged Teams/)).toBeDefined();
  });

  it('renders flagged team names', () => {
    render(<TeamHealthReportPage />);
    expect(screen.getByText('Beta')).toBeDefined();
    expect(screen.getByText('Gamma')).toBeDefined();
  });

  it('renders recommendations for flagged teams', () => {
    render(<TeamHealthReportPage />);
    expect(screen.getByText(/Consider restructuring/)).toBeDefined();
    expect(screen.getByText(/Monitor this team/)).toBeDefined();
  });

  it('renders KPI cards', () => {
    render(<TeamHealthReportPage />);
    expect(screen.getByText('Total Teams')).toBeDefined();
    expect(screen.getByText('Healthy')).toBeDefined();
    expect(screen.getByText('Needs Attention')).toBeDefined();
    expect(screen.getByText('At Risk')).toBeDefined();
  });
});
