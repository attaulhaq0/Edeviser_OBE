// =============================================================================
// TeamProfilePage — Unit tests (Task 10.3)
// Renders team name, members with contribution status, XP, streak,
// cooperation score, badges
// =============================================================================

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock all hooks before importing the component
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' }, institutionId: 'inst-1' }),
}));

vi.mock('@/hooks/useTeamProfile', () => ({
  useTeamProfile: () => ({
    data: {
      id: 'team-1',
      name: 'Alpha Squad',
      xp_total: 1500,
      streak_count: 7,
      cooperation_score: 85,
      health_score: 72,
      health_status: 'healthy',
      active_challenges: [],
    },
    isLoading: false,
  }),
}));

vi.mock('@/hooks/useTeamMembers', () => ({
  useTeamMembersList: () => ({
    data: [
      { id: 'm1', student_id: 'user-1', student_name: 'Alice', role: 'captain', xp_contribution: 800, contribution_status: 'active', joined_at: '2026-01-01' },
      { id: 'm2', student_id: 'user-2', student_name: 'Bob', role: 'member', xp_contribution: 700, contribution_status: 'warning', joined_at: '2026-01-01' },
    ],
    isLoading: false,
  }),
}));

vi.mock('@/hooks/useTeamBadges', () => ({
  useTeamBadges: () => ({ data: [], isLoading: false }),
}));

vi.mock('@/hooks/useReplacementVotes', () => ({
  useReplacementVotes: () => ({ data: [] }),
  useCastVote: () => ({ mutate: vi.fn(), isPending: false }),
  useTeacherOverrideVote: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@/hooks/usePeerTeaching', () => ({
  usePeerTeachingMoments: () => ({ data: [] }),
  useCreateTeachingMoment: () => ({ mutate: vi.fn(), isPending: false }),
  useRecordTeachingMomentView: () => ({ mutate: vi.fn() }),
}));

vi.mock('react-router-dom', () => ({
  useParams: () => ({ teamId: 'team-1' }),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import TeamProfilePage from '@/pages/student/teams/TeamProfilePage';

describe('TeamProfilePage', () => {
  it('renders team name', () => {
    render(<TeamProfilePage />);
    expect(screen.getByText('Alpha Squad')).toBeInTheDocument();
  });

  it('renders team XP', () => {
    render(<TeamProfilePage />);
    expect(screen.getByText('1,500')).toBeInTheDocument();
  });

  it('renders streak count', () => {
    render(<TeamProfilePage />);
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('renders cooperation score', () => {
    render(<TeamProfilePage />);
    const elements = screen.getAllByText('85');
    expect(elements.length).toBeGreaterThanOrEqual(1);
  });

  it('renders member names', () => {
    render(<TeamProfilePage />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('renders captain badge', () => {
    render(<TeamProfilePage />);
    expect(screen.getByText('Captain')).toBeInTheDocument();
  });

  it('renders contribution status badges', () => {
    render(<TeamProfilePage />);
    expect(screen.getByTestId('contribution-status-active')).toBeInTheDocument();
    expect(screen.getByTestId('contribution-status-warning')).toBeInTheDocument();
  });

  it('renders health badge', () => {
    render(<TeamProfilePage />);
    expect(screen.getByTestId('team-health-badge-healthy')).toBeInTheDocument();
  });

  it('renders member count', () => {
    render(<TeamProfilePage />);
    expect(screen.getByText('2 members')).toBeInTheDocument();
  });
});
