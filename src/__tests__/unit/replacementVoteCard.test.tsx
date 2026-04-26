// =============================================================================
// ReplacementVoteCard — Unit tests (Task 11.3)
// =============================================================================

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ReplacementVoteCard, {
  type ReplacementVoteData,
} from '@/components/shared/ReplacementVoteCard';

const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

const mockVote: ReplacementVoteData = {
  id: 'vote-1',
  team_id: 'team-1',
  target_member_id: 'member-1',
  target_member_name: 'Charlie',
  initiated_by: 'captain-1',
  initiated_by_name: 'Alice',
  votes_for: 2,
  votes_against: 1,
  total_eligible_voters: 5,
  status: 'active',
  expires_at: futureDate,
  created_at: new Date().toISOString(),
  current_user_voted: false,
};

const defaultProps = {
  vote: mockVote,
  isCaptain: false,
  isTeacher: false,
  onVote: vi.fn(),
  onTeacherOverride: vi.fn(),
};

describe('ReplacementVoteCard', () => {
  it('renders vote initiation info for inactive member', () => {
    render(<ReplacementVoteCard {...defaultProps} />);
    expect(screen.getByText(/Replace Charlie\?/)).toBeInTheDocument();
    expect(screen.getByText(/Alice/)).toBeInTheDocument();
  });

  it('renders vote casting buttons when user has not voted', () => {
    render(<ReplacementVoteCard {...defaultProps} />);
    expect(screen.getByRole('button', { name: /keep member/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /replace/i })).toBeInTheDocument();
  });

  it('does not render vote buttons when user already voted', () => {
    const voted: ReplacementVoteData = {
      ...mockVote,
      current_user_voted: true,
      current_user_vote: 'for',
    };
    render(<ReplacementVoteCard {...defaultProps} vote={voted} />);
    expect(screen.queryByRole('button', { name: /keep member/i })).not.toBeInTheDocument();
    expect(screen.getByText(/You voted: Replace/)).toBeInTheDocument();
  });

  it('displays expiry countdown for active votes', () => {
    render(<ReplacementVoteCard {...defaultProps} />);
    // The countdown shows hours/minutes remaining
    expect(screen.getByText(/remaining/i)).toBeInTheDocument();
  });

  it('renders teacher override buttons when user is teacher', () => {
    render(<ReplacementVoteCard {...defaultProps} isTeacher />);
    expect(screen.getByText('Teacher Override:')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reject/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /approve/i })).toBeInTheDocument();
  });

  it('does not render teacher override for non-teachers', () => {
    render(<ReplacementVoteCard {...defaultProps} isTeacher={false} />);
    expect(screen.queryByText('Teacher Override:')).not.toBeInTheDocument();
  });

  it('shows vote counts', () => {
    render(<ReplacementVoteCard {...defaultProps} />);
    expect(screen.getByText('2')).toBeInTheDocument(); // votes_for
    expect(screen.getByText('1')).toBeInTheDocument(); // votes_against
  });

  it('does not render vote buttons for expired votes', () => {
    const expired: ReplacementVoteData = { ...mockVote, status: 'expired' };
    render(<ReplacementVoteCard {...defaultProps} vote={expired} />);
    expect(screen.queryByRole('button', { name: /keep member/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /replace/i })).not.toBeInTheDocument();
  });
});
