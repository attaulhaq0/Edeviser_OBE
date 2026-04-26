// =============================================================================
// TeamInvitationCard — Unit tests (Task 10.7)
// =============================================================================

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TeamInvitationCard, {
  type TeamInvitation,
} from '@/components/shared/TeamInvitationCard';

const mockInvitation: TeamInvitation = {
  id: 'inv-1',
  team_id: 'team-1',
  team_name: 'Alpha Squad',
  invited_by_name: 'Alice',
  status: 'pending',
  created_at: new Date().toISOString(),
  member_count: 3,
};

const defaultProps = {
  invitation: mockInvitation,
  onAccept: vi.fn(),
  onDecline: vi.fn(),
};

describe('TeamInvitationCard', () => {
  it('renders accept and decline buttons for pending invitation', () => {
    render(<TeamInvitationCard {...defaultProps} />);
    expect(
      screen.getByRole('button', { name: /accept/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /decline/i }),
    ).toBeInTheDocument();
  });

  it('accept button is keyboard accessible (focusable and activatable)', async () => {
    const onAccept = vi.fn();
    render(<TeamInvitationCard {...defaultProps} onAccept={onAccept} />);

    const acceptBtn = screen.getByRole('button', { name: /accept/i });
    acceptBtn.focus();
    expect(acceptBtn).toHaveFocus();

    await userEvent.keyboard('{Enter}');
    expect(onAccept).toHaveBeenCalledWith('inv-1');
  });

  it('decline button is keyboard accessible (focusable and activatable)', async () => {
    const onDecline = vi.fn();
    render(<TeamInvitationCard {...defaultProps} onDecline={onDecline} />);

    const declineBtn = screen.getByRole('button', { name: /decline/i });
    declineBtn.focus();
    expect(declineBtn).toHaveFocus();

    await userEvent.keyboard('{Enter}');
    expect(onDecline).toHaveBeenCalledWith('inv-1');
  });

  it('renders team name and inviter name', () => {
    render(<TeamInvitationCard {...defaultProps} />);
    expect(screen.getByText('Alpha Squad')).toBeInTheDocument();
    expect(screen.getByText(/Alice/)).toBeInTheDocument();
  });

  it('does not render action buttons for non-pending invitations', () => {
    const accepted: TeamInvitation = { ...mockInvitation, status: 'accepted' };
    render(<TeamInvitationCard {...defaultProps} invitation={accepted} />);
    expect(screen.queryByRole('button', { name: /accept/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /decline/i })).not.toBeInTheDocument();
  });
});
