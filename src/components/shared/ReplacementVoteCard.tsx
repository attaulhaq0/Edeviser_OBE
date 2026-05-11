// =============================================================================
// ReplacementVoteCard — Vote initiation, casting, expiry countdown, teacher override
// Task 4.15: captain-only initiation for inactive members, vote casting,
//            expiry countdown, teacher override
// =============================================================================

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  Clock,
  Shield,
  Loader2,
  UserMinus,
} from "lucide-react";
import type { VoteStatus } from "@/hooks/useReplacementVotes";

export interface ReplacementVoteCardProps {
  /** Vote data — null means no active vote (show initiation UI) */
  vote?: {
    id: string;
    targetMemberName: string;
    targetMemberId: string;
    status: VoteStatus;
    votesFor: number;
    votesAgainst: number;
    createdAt: string;
    resolvedAt: string | null;
    teacherOverride: boolean;
  } | null;
  /** Whether the current user is the team captain */
  isCaptain: boolean;
  /** Whether the current user is a teacher */
  isTeacher: boolean;
  /** Whether the current user has already voted */
  hasVoted?: boolean;
  /** Total team members (for majority calculation) */
  totalMembers: number;
  /** Vote expiry duration in hours (default 48) */
  expiryHours?: number;
  /** Callbacks */
  onInitiateVote?: (targetMemberId: string) => void;
  onCastVote?: (voteId: string, voteFor: boolean) => void;
  onTeacherOverride?: (voteId: string, approve: boolean) => void;
  /** Loading states */
  isInitiating?: boolean;
  isCasting?: boolean;
  isOverriding?: boolean;
  /** Inactive members available for vote initiation */
  inactiveMembers?: Array<{ id: string; name: string }>;
  className?: string;
}

/** Calculate remaining time until vote expires */
function getTimeRemaining(
  createdAt: string,
  expiryHours: number
): { hours: number; minutes: number; expired: boolean } {
  const expiryMs = expiryHours * 60 * 60 * 1000;
  const expiresAt = new Date(createdAt).getTime() + expiryMs;
  const remaining = expiresAt - Date.now();

  if (remaining <= 0) {
    return { hours: 0, minutes: 0, expired: true };
  }

  return {
    hours: Math.floor(remaining / (60 * 60 * 1000)),
    minutes: Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000)),
    expired: false,
  };
}

const ReplacementVoteCard = ({
  vote,
  isCaptain,
  isTeacher,
  hasVoted = false,
  totalMembers,
  expiryHours = 48,
  onInitiateVote,
  onCastVote,
  onTeacherOverride,
  isInitiating = false,
  isCasting = false,
  isOverriding = false,
  inactiveMembers = [],
  className,
}: ReplacementVoteCardProps) => {
  const [timeRemaining, setTimeRemaining] = useState(
    vote?.status === "open"
      ? getTimeRemaining(vote.createdAt, expiryHours)
      : null
  );
  const [selectedMember, setSelectedMember] = useState("");

  // Update countdown every minute
  useEffect(() => {
    if (!vote || vote.status !== "open") return;

    const interval = setInterval(() => {
      setTimeRemaining(getTimeRemaining(vote.createdAt, expiryHours));
    }, 60_000);

    return () => clearInterval(interval);
  }, [vote, expiryHours]);

  // ── No active vote: show initiation UI (captain only) ──────────────────────
  if (!vote) {
    if (!isCaptain || inactiveMembers.length === 0) return null;

    return (
      <Card
        className={cn("bg-white border-0 shadow-md rounded-xl p-4", className)}
      >
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <h4 className="text-sm font-bold">Replacement Vote</h4>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          As captain, you can initiate a vote to replace an inactive member.
        </p>

        <div className="space-y-2">
          <select
            value={selectedMember}
            onChange={(e) => setSelectedMember(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
            aria-label="Select inactive member"
          >
            <option value="">Select inactive member...</option>
            {inactiveMembers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>

          <Button
            size="sm"
            variant="destructive"
            disabled={!selectedMember || isInitiating}
            onClick={() => selectedMember && onInitiateVote?.(selectedMember)}
            className="active:scale-95 transition-transform duration-100 gap-1.5"
          >
            {isInitiating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserMinus className="h-4 w-4" />
            )}
            Initiate Vote
          </Button>
        </div>
      </Card>
    );
  }

  // ── Active or resolved vote ────────────────────────────────────────────────
  const isOpen = vote.status === "open";
  const majority = Math.ceil(totalMembers / 2);
  const isPending = isCasting || isOverriding;

  const statusConfig: Record<VoteStatus, { label: string; classes: string }> = {
    open: {
      label: "Open",
      classes: "bg-blue-100 text-blue-700 border-blue-200",
    },
    approved: {
      label: "Approved",
      classes: "bg-green-100 text-green-700 border-green-200",
    },
    rejected: {
      label: "Rejected",
      classes: "bg-red-100 text-red-700 border-red-200",
    },
    expired: {
      label: "Expired",
      classes: "bg-gray-100 text-gray-600 border-gray-200",
    },
  };

  const config = statusConfig[vote.status];

  return (
    <Card
      className={cn("bg-white border-0 shadow-md rounded-xl p-4", className)}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <h4 className="text-sm font-bold">Replacement Vote</h4>
        </div>
        <Badge className={cn("text-[10px] font-bold", config.classes)}>
          {config.label}
        </Badge>
      </div>

      {/* Target member */}
      <p className="text-sm text-gray-700">
        Vote to replace{" "}
        <span className="font-semibold">{vote.targetMemberName}</span>
      </p>

      {/* Vote counts */}
      <div className="flex items-center gap-4 mt-3">
        <div className="flex items-center gap-1.5">
          <ThumbsUp className="h-4 w-4 text-green-500" />
          <span className="text-sm font-bold text-green-600">
            {vote.votesFor}
          </span>
          <span className="text-[10px] text-gray-400">for</span>
        </div>
        <div className="flex items-center gap-1.5">
          <ThumbsDown className="h-4 w-4 text-red-500" />
          <span className="text-sm font-bold text-red-600">
            {vote.votesAgainst}
          </span>
          <span className="text-[10px] text-gray-400">against</span>
        </div>
        <span className="text-[10px] text-gray-400">
          (majority: {majority} votes needed)
        </span>
      </div>

      {/* Countdown */}
      {isOpen && timeRemaining && !timeRemaining.expired && (
        <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-500">
          <Clock className="h-3.5 w-3.5" />
          <span>
            Expires in {timeRemaining.hours}h {timeRemaining.minutes}m
          </span>
        </div>
      )}

      {isOpen && timeRemaining?.expired && (
        <div className="flex items-center gap-1.5 mt-2 text-xs text-red-500">
          <Clock className="h-3.5 w-3.5" />
          <span>Vote has expired</span>
        </div>
      )}

      {/* Teacher override badge */}
      {vote.teacherOverride && (
        <div className="flex items-center gap-1.5 mt-2">
          <Shield className="h-3.5 w-3.5 text-blue-500" />
          <span className="text-xs text-blue-600 font-medium">
            Teacher override applied
          </span>
        </div>
      )}

      {/* Actions */}
      {isOpen && (
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100">
          {/* Member voting */}
          {!isTeacher && !hasVoted && (
            <>
              <Button
                size="sm"
                onClick={() => onCastVote?.(vote.id, true)}
                disabled={isPending}
                className="bg-green-600 hover:bg-green-700 text-white active:scale-95 transition-transform duration-100 gap-1.5"
              >
                {isCasting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ThumbsUp className="h-4 w-4" />
                )}
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onCastVote?.(vote.id, false)}
                disabled={isPending}
                className="active:scale-95 transition-transform duration-100 gap-1.5"
              >
                {isCasting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ThumbsDown className="h-4 w-4" />
                )}
                Reject
              </Button>
            </>
          )}

          {!isTeacher && hasVoted && (
            <span className="text-xs text-gray-500 italic">
              You have already voted
            </span>
          )}

          {/* Teacher override */}
          {isTeacher && (
            <>
              <Button
                size="sm"
                onClick={() => onTeacherOverride?.(vote.id, true)}
                disabled={isPending}
                className="gap-1.5 active:scale-95 transition-transform duration-100"
              >
                {isOverriding ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Shield className="h-4 w-4" />
                )}
                Override: Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onTeacherOverride?.(vote.id, false)}
                disabled={isPending}
                className="gap-1.5 active:scale-95 transition-transform duration-100"
              >
                {isOverriding ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Shield className="h-4 w-4" />
                )}
                Override: Reject
              </Button>
            </>
          )}
        </div>
      )}
    </Card>
  );
};

export default ReplacementVoteCard;
