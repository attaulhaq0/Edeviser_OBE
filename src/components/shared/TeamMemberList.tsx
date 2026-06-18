// =============================================================================
// TeamMemberList — Member list with roles, XP contributions, contribution status
// Task 4.2: captain badge, XP contributions, contribution status indicators
// =============================================================================

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Crown, User } from "lucide-react";
import ContributionStatusBadge from "@/components/shared/ContributionStatusBadge";
import type { ContributionStatus } from "@/lib/contributionThresholds";

export interface TeamMemberItem {
  id: string;
  studentId: string;
  displayName: string;
  avatarUrl?: string | null;
  role: "captain" | "member";
  xpContribution: number;
  contributionStatus: ContributionStatus;
}

export interface TeamMemberListProps {
  members: TeamMemberItem[];
  totalTeamXp?: number;
  className?: string;
}

const TeamMemberList = ({
  members,
  totalTeamXp = 0,
  className,
}: TeamMemberListProps) => {
  const sorted = [...members].sort((a, b) => {
    // Captain first, then by XP descending
    if (a.role === "captain" && b.role !== "captain") return -1;
    if (a.role !== "captain" && b.role === "captain") return 1;
    return b.xpContribution - a.xpContribution;
  });

  return (
    <div
      className={cn("space-y-2", className)}
      role="list"
      aria-label="Team members"
    >
      {sorted.map((member) => {
        const pct =
          totalTeamXp > 0
            ? Math.round((member.xpContribution / totalTeamXp) * 100)
            : 0;

        return (
          <div
            key={member.id}
            role="listitem"
            className="flex items-center gap-3 rounded-lg p-2 hover:bg-slate-50 transition-colors"
          >
            {/* Avatar */}
            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
              {member.avatarUrl ? (
                <img
                  src={member.avatarUrl}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <User className="h-4 w-4 text-blue-600" />
              )}
            </div>

            {/* Name + Role */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium truncate">
                  {member.displayName}
                </span>
                {member.role === "captain" && (
                  <Badge
                    variant="outline"
                    className="text-[10px] font-bold text-amber-600 border-amber-300 bg-amber-50 gap-0.5 px-1.5"
                    aria-label="Team captain"
                  >
                    <Crown className="h-3 w-3" />
                    Captain
                  </Badge>
                )}
              </div>
              {/* XP contribution bar */}
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-amber-400 transition-all duration-300"
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
                <span className="text-[10px] font-medium text-gray-500 tabular-nums w-12 text-end">
                  {member.xpContribution} XP
                </span>
              </div>
            </div>

            {/* Contribution Status */}
            <ContributionStatusBadge status={member.contributionStatus} />
          </div>
        );
      })}

      {members.length === 0 && (
        <p className="text-xs text-gray-400 text-center py-4">No members yet</p>
      )}
    </div>
  );
};

export default TeamMemberList;
