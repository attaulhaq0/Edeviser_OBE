// =============================================================================
// ReplacementVoteCard — Task 4.15
// Vote initiation (captain only for inactive members), vote casting,
// expiry countdown, teacher override
// =============================================================================

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, ThumbsUp, ThumbsDown, Clock, Shield, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

export interface ReplacementVoteData {
  id: string;
  team_id: string;
  target_member_id: string;
  target_member_name: string;
  initiated_by: string;
  initiated_by_name: string;
  votes_for: number;
  votes_against: number;
  total_eligible_voters: number;
  status: 'active' | 'approved' | 'rejected' | 'expired';
  expires_at: string;
  created_at: string;
  current_user_voted?: boolean;
  current_user_vote?: 'for' | 'against';
}

interface ReplacementVoteCardProps {
  vote: ReplacementVoteData;
  isCaptain: boolean;
  isTeacher: boolean;
  onVote: (voteId: string, decision: 'for' | 'against') => void;
  onTeacherOverride: (voteId: string, decision: 'approved' | 'rejected') => void;
  isVoting?: boolean;
  isOverriding?: boolean;
  className?: string;
}

const useCountdown = (expiresAt: string) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const update = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft('Expired');
        return;
      }
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setTimeLeft(`${hours}h ${minutes}m remaining`);
    };

    update();
    const interval = setInterval(update, 60_000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  return timeLeft;
};

const ReplacementVoteCard = ({
  vote,
  isCaptain: _isCaptain,
  isTeacher,
  onVote,
  onTeacherOverride,
  isVoting,
  isOverriding,
  className,
}: ReplacementVoteCardProps) => {
  const countdown = useCountdown(vote.expires_at);
  const isActive = vote.status === 'active';
  const majorityNeeded = Math.ceil(vote.total_eligible_voters / 2);
  const totalVotes = vote.votes_for + vote.votes_against;

  return (
    <Card
      className={cn(
        'bg-white border-0 shadow-md rounded-xl p-4',
        !isActive && 'opacity-70',
        className,
      )}
      data-testid={`replacement-vote-${vote.id}`}
    >
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-bold">
                Replace {vote.target_member_name}?
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Initiated by {vote.initiated_by_name} ·{' '}
                {formatDistanceToNow(new Date(vote.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className={cn(
              'text-xs',
              vote.status === 'active' && 'bg-yellow-50 text-yellow-700 border-yellow-200',
              vote.status === 'approved' && 'bg-green-50 text-green-700 border-green-200',
              vote.status === 'rejected' && 'bg-red-50 text-red-700 border-red-200',
              vote.status === 'expired' && 'bg-gray-50 text-gray-500 border-gray-200',
            )}
          >
            {vote.status.charAt(0).toUpperCase() + vote.status.slice(1)}
          </Badge>
        </div>

        {/* Vote Progress */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <ThumbsUp className="h-3.5 w-3.5 text-green-500" />
            <span className="text-xs font-bold text-green-600">{vote.votes_for}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ThumbsDown className="h-3.5 w-3.5 text-red-500" />
            <span className="text-xs font-bold text-red-600">{vote.votes_against}</span>
          </div>
          <span className="text-xs text-gray-400">
            {totalVotes} / {vote.total_eligible_voters} voted · Majority: {majorityNeeded}
          </span>
        </div>

        {/* Countdown */}
        {isActive && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Clock className="h-3 w-3" />
            <span>{countdown}</span>
          </div>
        )}

        {/* Vote Actions (for team members) */}
        {isActive && !vote.current_user_voted && !isTeacher && (
          <div className="flex items-center gap-2 pt-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onVote(vote.id, 'against')}
              disabled={isVoting}
              className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50"
            >
              {isVoting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ThumbsDown className="h-3.5 w-3.5" />}
              Keep Member
            </Button>
            <Button
              size="sm"
              onClick={() => onVote(vote.id, 'for')}
              disabled={isVoting}
              className="h-8 text-xs bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95"
            >
              {isVoting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ThumbsUp className="h-3.5 w-3.5" />}
              Replace
            </Button>
          </div>
        )}

        {/* Already voted indicator */}
        {vote.current_user_voted && (
          <p className="text-xs text-gray-500 italic">
            You voted: {vote.current_user_vote === 'for' ? 'Replace' : 'Keep'}
          </p>
        )}

        {/* Teacher Override */}
        {isActive && isTeacher && (
          <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
            <Shield className="h-4 w-4 text-blue-500" />
            <span className="text-xs font-medium text-gray-600">Teacher Override:</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onTeacherOverride(vote.id, 'rejected')}
              disabled={isOverriding}
              className="h-7 text-xs"
            >
              Reject
            </Button>
            <Button
              size="sm"
              onClick={() => onTeacherOverride(vote.id, 'approved')}
              disabled={isOverriding}
              className="h-7 text-xs bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95"
            >
              {isOverriding && <Loader2 className="h-3 w-3 animate-spin" />}
              Approve
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};

export default ReplacementVoteCard;
