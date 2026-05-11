// =============================================================================
// TeamInvitationCard — Invitation accept/decline with keyboard operability
// Task 4.7: keyboard accessible accept/decline buttons
// =============================================================================

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check, X, Users, Clock, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export interface TeamInvitationCardProps {
  teamName: string;
  invitedBy: string;
  createdAt: string;
  onAccept: () => void;
  onDecline: () => void;
  isAccepting?: boolean;
  isDeclining?: boolean;
  className?: string;
}

const TeamInvitationCard = ({
  teamName,
  invitedBy,
  createdAt,
  onAccept,
  onDecline,
  isAccepting = false,
  isDeclining = false,
  className,
}: TeamInvitationCardProps) => {
  const isPending = isAccepting || isDeclining;

  return (
    <Card
      className={cn("bg-white border-0 shadow-md rounded-xl p-4", className)}
    >
      <div className="flex items-start gap-3">
        {/* Team icon */}
        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
          <Users className="h-5 w-5 text-blue-600" />
        </div>

        <div className="flex-1 min-w-0">
          {/* Title */}
          <p className="text-sm font-semibold">
            Team Invitation: <span className="text-blue-600">{teamName}</span>
          </p>
          <p className="text-xs text-gray-500 mt-0.5">Invited by {invitedBy}</p>
          <div className="flex items-center gap-1 mt-1 text-[10px] text-gray-400">
            <Clock className="h-3 w-3" />
            {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 mt-3">
            <Button
              size="sm"
              onClick={onAccept}
              disabled={isPending}
              className="bg-gradient-to-r from-teal-500 to-blue-600 text-white active:scale-95 transition-transform duration-100 gap-1.5"
              aria-label={`Accept invitation to ${teamName}`}
            >
              {isAccepting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Accept
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onDecline}
              disabled={isPending}
              className="active:scale-95 transition-transform duration-100 gap-1.5"
              aria-label={`Decline invitation to ${teamName}`}
            >
              {isDeclining ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <X className="h-4 w-4" />
              )}
              Decline
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default TeamInvitationCard;
