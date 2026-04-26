// =============================================================================
// TeamInvitationCard — Task 4.7
// Invitation accept/decline with keyboard operability
// =============================================================================

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Check, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

export interface TeamInvitation {
  id: string;
  team_id: string;
  team_name: string;
  invited_by_name: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  created_at: string;
  member_count: number;
}

interface TeamInvitationCardProps {
  invitation: TeamInvitation;
  onAccept: (invitationId: string) => void;
  onDecline: (invitationId: string) => void;
  isAccepting?: boolean;
  isDeclining?: boolean;
  className?: string;
}

const TeamInvitationCard = ({
  invitation,
  onAccept,
  onDecline,
  isAccepting,
  isDeclining,
  className,
}: TeamInvitationCardProps) => {
  const isPending = invitation.status === 'pending';
  const isProcessing = isAccepting || isDeclining;

  return (
    <Card
      className={cn(
        'bg-white border-0 shadow-md rounded-xl p-4',
        !isPending && 'opacity-60',
        className,
      )}
      data-testid={`team-invitation-${invitation.id}`}
    >
      <div className="flex items-start gap-3">
        {/* Team Avatar */}
        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
          <Users className="h-5 w-5 text-blue-600" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">{invitation.team_name}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Invited by {invitation.invited_by_name} ·{' '}
            {formatDistanceToNow(new Date(invitation.created_at), { addSuffix: true })}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {invitation.member_count} member{invitation.member_count !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Actions */}
        {isPending && (
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDecline(invitation.id)}
              disabled={isProcessing}
              className="h-8 px-3 text-xs text-red-600 border-red-200 hover:bg-red-50"
              aria-label={`Decline invitation from ${invitation.team_name}`}
            >
              {isDeclining ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <X className="h-3.5 w-3.5" />
              )}
              Decline
            </Button>
            <Button
              size="sm"
              onClick={() => onAccept(invitation.id)}
              disabled={isProcessing}
              className="h-8 px-3 text-xs bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95"
              aria-label={`Accept invitation from ${invitation.team_name}`}
            >
              {isAccepting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              Accept
            </Button>
          </div>
        )}

        {/* Status for non-pending */}
        {!isPending && (
          <span
            className={cn(
              'text-xs font-bold px-2 py-1 rounded',
              invitation.status === 'accepted' && 'bg-green-50 text-green-700',
              invitation.status === 'declined' && 'bg-red-50 text-red-700',
              invitation.status === 'expired' && 'bg-gray-50 text-gray-500',
            )}
          >
            {invitation.status.charAt(0).toUpperCase() + invitation.status.slice(1)}
          </span>
        )}
      </div>
    </Card>
  );
};

export default TeamInvitationCard;
