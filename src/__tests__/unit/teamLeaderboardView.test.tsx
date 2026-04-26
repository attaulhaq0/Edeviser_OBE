// =============================================================================
// TeamLeaderboardView — Unit tests (Task 10.5)
// Renders team rows, medal icons for top 3, highlight current team,
// cooperation score sort
// =============================================================================

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TeamLeaderboardView, { type TeamLeaderboardEntry } from '@/components/shared/TeamLeaderboardView';

const mockEntries: TeamLeaderboardEntry[] = [
  { team_id: 't1', team_name: 'Alpha', xp_total: 3000, streak_count: 10, member_count: 4, cooperation_score: 90, health_score: 85, health_status: 'healthy' },
  { team_id: 't2', team_name: 'Beta', xp_total: 2500, streak_count: 5, member_count: 3, cooperation_score: 95, health_score: 70, health_status: 'healthy' },
  { team_id: 't3', team_name: 'Gamma', xp_total: 2000, streak_count: 3, member_count: 5, cooperation_score: 60, health_score: 45, health_status: 'needs_attention' },
  { team_id: 't4', team_name: 'Delta', xp_total: 1000, streak_count: 0, member_count: 2, cooperation_score: 30, health_score: 25, health_status: 'at_risk' },
];

describe('TeamLeaderboardView', () => {
  it('renders all team rows', () => {
    render(<TeamLeaderboardView entries={mockEntries} />);
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
    expect(screen.getByText('Gamma')).toBeInTheDocument();
    expect(screen.getByText('Delta')).toBeInTheDocument();
  });

  it('renders team leaderboard container', () => {
    render(<TeamLeaderboardView entries={mockEntries} />);
    expect(screen.getByTestId('team-leaderboard-view')).toBeInTheDocument();
  });

  it('renders rank indicators for top 3', () => {
    render(<TeamLeaderboardView entries={mockEntries} />);
    expect(screen.getByTestId('team-rank-1')).toBeInTheDocument();
    expect(screen.getByTestId('team-rank-2')).toBeInTheDocument();
    expect(screen.getByTestId('team-rank-3')).toBeInTheDocument();
  });

  it('highlights current team', () => {
    render(<TeamLeaderboardView entries={mockEntries} currentTeamId="t2" />);
    const row = screen.getByTestId('team-rank-2');
    expect(row.className).toContain('ring-2');
    expect(screen.getByText('(Your Team)')).toBeInTheDocument();
  });

  it('displays XP totals', () => {
    render(<TeamLeaderboardView entries={mockEntries} />);
    expect(screen.getByText('3,000 XP')).toBeInTheDocument();
    expect(screen.getByText('2,500 XP')).toBeInTheDocument();
  });

  it('shows cooperation score sort toggle', () => {
    render(<TeamLeaderboardView entries={mockEntries} />);
    expect(screen.getByText('Sort by Cooperation')).toBeInTheDocument();
  });

  it('toggles sort mode when clicked', () => {
    render(<TeamLeaderboardView entries={mockEntries} />);
    const sortButton = screen.getByText('Sort by Cooperation');
    fireEvent.click(sortButton);
    // After clicking, button should show "Sort by XP"
    expect(screen.getByText('Sort by XP')).toBeInTheDocument();
  });

  it('shows empty state when no entries', () => {
    render(<TeamLeaderboardView entries={[]} />);
    expect(screen.getByText('No teams yet.')).toBeInTheDocument();
  });

  it('shows loading shimmer when isLoading', () => {
    const { container } = render(<TeamLeaderboardView entries={[]} isLoading />);
    const shimmers = container.querySelectorAll('.animate-shimmer');
    expect(shimmers.length).toBeGreaterThan(0);
  });
});
