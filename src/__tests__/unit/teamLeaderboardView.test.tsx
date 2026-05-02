// Unit test: TeamLeaderboardView — renders team rows, medal icons, highlight current team, cooperation score sort
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TeamLeaderboardView from '@/components/shared/TeamLeaderboardView';
import type { TeamLeaderboardEntry } from '@/hooks/useTeamLeaderboard';

const mockEntries: TeamLeaderboardEntry[] = [
  { team_id: 't1', team_name: 'Alpha', avatar_letter: 'A', member_count: 4, xp_total: 5000, xp_this_week: 500, streak_count: 7, cooperation_score: 90, health_score: 85, rank: 1 },
  { team_id: 't2', team_name: 'Beta', avatar_letter: 'B', member_count: 3, xp_total: 4000, xp_this_week: 400, streak_count: 3, cooperation_score: 75, health_score: 70, rank: 2 },
  { team_id: 't3', team_name: 'Gamma', avatar_letter: 'G', member_count: 5, xp_total: 3000, xp_this_week: 300, streak_count: 0, cooperation_score: 60, health_score: 55, rank: 3 },
  { team_id: 't4', team_name: 'Delta', avatar_letter: 'D', member_count: 2, xp_total: 2000, xp_this_week: 200, streak_count: 0, cooperation_score: 50, health_score: 40, rank: 4 },
];

describe('TeamLeaderboardView', () => {
  it('renders all team rows', () => {
    render(
      <TeamLeaderboardView
        entries={mockEntries}
        scope="course"
        sortBy="xp_total"
      />,
    );
    expect(screen.getByText('Alpha')).toBeDefined();
    expect(screen.getByText('Beta')).toBeDefined();
    expect(screen.getByText('Gamma')).toBeDefined();
    expect(screen.getByText('Delta')).toBeDefined();
  });

  it('renders medal icons for top 3', () => {
    render(
      <TeamLeaderboardView
        entries={mockEntries}
        scope="course"
        sortBy="xp_total"
      />,
    );
    expect(screen.getByText('🥇')).toBeDefined();
    expect(screen.getByText('🥈')).toBeDefined();
    expect(screen.getByText('🥉')).toBeDefined();
  });

  it('highlights current team', () => {
    render(
      <TeamLeaderboardView
        entries={mockEntries}
        currentTeamId="t2"
        scope="course"
        sortBy="xp_total"
      />,
    );
    expect(screen.getByText('(Your Team)')).toBeDefined();
  });

  it('shows sort toggle button', () => {
    const onSortChange = vi.fn();
    render(
      <TeamLeaderboardView
        entries={mockEntries}
        scope="course"
        sortBy="xp_total"
        onSortChange={onSortChange}
      />,
    );
    const sortButton = screen.getByText('Sort by Co-op Score');
    expect(sortButton).toBeDefined();
    fireEvent.click(sortButton);
    expect(onSortChange).toHaveBeenCalledWith('cooperation_score');
  });

  it('toggles sort from cooperation_score to xp_total', () => {
    const onSortChange = vi.fn();
    render(
      <TeamLeaderboardView
        entries={mockEntries}
        scope="course"
        sortBy="cooperation_score"
        onSortChange={onSortChange}
      />,
    );
    const sortButton = screen.getByText('Sort by XP');
    fireEvent.click(sortButton);
    expect(onSortChange).toHaveBeenCalledWith('xp_total');
  });

  it('shows empty state when no entries', () => {
    render(
      <TeamLeaderboardView
        entries={[]}
        scope="course"
        sortBy="xp_total"
      />,
    );
    expect(screen.getByText('No teams found')).toBeDefined();
  });
});
