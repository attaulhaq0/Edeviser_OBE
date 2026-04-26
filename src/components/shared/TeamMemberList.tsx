// =============================================================================
// TeamMemberList — Task 4.2
// Member list with roles (captain badge), XP contributions, contribution
// status indicators
// =============================================================================

import { Badge } from '@/components/ui/badge';
import { Crown, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import ContributionStatusBadge from '@/components/shared/ContributionStatusBadge';

export interface TeamMemberData {
  id: string;
  student_id: string;
  student_name: string;
  role: 'captain' | 'member';
  xp_contribution: number;
  contribution_status: 'active' | 'warning' | 'inactive';
  joined_at: string;
}

interface TeamMemberListProps {
  members: TeamMemberData[];
  teamXpTotal: number;
  className?: string;
}

const TeamMemberList = ({ members, teamXpTotal, className }: TeamMemberListProps) => {
  const sorted = [...members].sort((a, b) => {
    // Captain first, then by XP contribution desc
    if (a.role === 'captain' && b.role !== 'captain') return -1;
    if (b.role === 'captain' && a.role !== 'captain') return 1;
    return b.xp_contribution - a.xp_contribution;
  });

  return (
    <div className={cn('space-y-2', className)} data-testid="team-member-list">
      {sorted.map((member) => {
        const contributionPercent =
          teamXpTotal > 0
            ? Math.round((member.xp_contribution / teamXpTotal) * 100)
            : 0;

        return (
          <div
            key={member.id}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors"
            data-testid={`team-member-${member.student_id}`}
          >
            {/* Avatar */}
            <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
              {member.role === 'captain' ? (
                <Crown className="h-4 w-4 text-amber-500" />
              ) : (
                <User className="h-4 w-4 text-slate-400" />
              )}
            </div>

            {/* Name and Role */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium truncate">
                  {member.student_name}
                </span>
                {member.role === 'captain' && (
                  <Badge
                    variant="outline"
                    className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 shrink-0"
                  >
                    Captain
                  </Badge>
                )}
              </div>
            </div>

            {/* XP Contribution */}
            <div className="text-end shrink-0">
              <span className="text-xs font-bold text-amber-600">
                {member.xp_contribution.toLocaleString()} XP
              </span>
              <span className="text-[10px] text-gray-400 ms-1">
                ({contributionPercent}%)
              </span>
            </div>

            {/* Contribution Status */}
            <ContributionStatusBadge status={member.contribution_status} />
          </div>
        );
      })}

      {members.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-4">No members yet.</p>
      )}
    </div>
  );
};

export default TeamMemberList;
