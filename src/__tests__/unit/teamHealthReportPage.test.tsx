// =============================================================================
// TeamHealthReportPage — Unit tests (Task 13.4)
// Report renders team counts, flagged teams, recommendations
// =============================================================================

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/hooks/useCourses', () => ({
  useCourses: () => ({
    data: {
      data: [
        { id: 'c1', name: 'CS101' },
        { id: 'c2', name: 'MATH201' },
      ],
    },
  }),
}));

vi.mock('@/hooks/useTeamHealthReport', () => ({
  useTeamHealthReport: (courseId: string | undefined) => ({
    data: courseId
      ? {
          total_teams: 8,
          healthy_count: 5,
          needs_attention_count: 2,
          at_risk_count: 1,
          flagged_teams: [
            {
              team_id: 't1',
              team_name: 'Struggling Squad',
              health_score: 35,
              health_status: 'at_risk' as const,
              inactive_member_count: 2,
              issues: ['High XP inequality (Gini: 0.72)', 'Declining engagement trend'],
              recommendations: ['Consider member reassignment', 'Schedule team check-in'],
              health_snapshots: [],
            },
            {
              team_id: 't2',
              team_name: 'Needs Work',
              health_score: 55,
              health_status: 'needs_attention' as const,
              inactive_member_count: 1,
              issues: ['Low challenge participation'],
              recommendations: ['Encourage challenge enrollment'],
              health_snapshots: [],
            },
          ],
        }
      : null,
    isLoading: false,
  }),
}));

vi.mock('@/components/shared/TeamHealthBadge', () => ({
  default: ({ score, status }: { score: number; status: string }) => (
    <span data-testid={`health-badge-${status}`}>{score}</span>
  ),
}));

vi.mock('@/components/shared/TeamHealthChart', () => ({
  default: () => <div data-testid="health-chart" />,
}));

vi.mock('@/components/shared/Shimmer', () => ({
  default: ({ className }: { className: string }) => <div className={className} />,
}));

import TeamHealthReportPage from '@/pages/teacher/teams/TeamHealthReportPage';

describe('TeamHealthReportPage', () => {
  it('renders page title', () => {
    render(<TeamHealthReportPage />);
    expect(screen.getByText('Team Health Report')).toBeInTheDocument();
  });

  it('shows course selector', () => {
    render(<TeamHealthReportPage />);
    expect(screen.getByText('Select course')).toBeInTheDocument();
  });

  it('shows prompt to select course when none selected', () => {
    render(<TeamHealthReportPage />);
    expect(screen.getByText('Select a course to view the team health report.')).toBeInTheDocument();
  });
});
