// =============================================================================
// TeamCard — Task 4.1
// Compact team display (name, XP, streak, member count, health score badge)
// with gradient header
// =============================================================================

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Flame, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import TeamHealthBadge from '@/components/shared/TeamHealthBadge';
import CooperationScoreDisplay from '@/components/shared/CooperationScoreDisplay';

export interface TeamCardData {
  id: string;
  name: string;
  captain_id: string;
  xp_total: number;
  streak_count: number;
  member_count: number;
  cooperation_score: number;
  health_score: number;
  health_status: 'healthy' | 'needs_attention' | 'at_risk';
}

interface TeamCardProps {
  team: TeamCardData;
  isCurrentTeam?: boolean;
  onClick?: () => void;
  className?: string;
}

const TeamCard = ({ team, isCurrentTeam, onClick, className }: TeamCardProps) => {
  return (
    <Card
      className={cn(
        'bg-white border-0 shadow-md rounded-xl overflow-hidden group hover:shadow-lg transition-shadow',
        isCurrentTeam && 'ring-2 ring-blue-400',
        onClick && 'cursor-pointer',
        className,
      )}
      onClick={onClick}
      data-testid={`team-card-${team.id}`}
    >
      {/* Gradient Header */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)' }}
      >
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold text-white">
            {team.name.charAt(0).toUpperCase()}
          </div>
          <h3 className="text-sm font-bold text-white truncate">{team.name}</h3>
        </div>
        <div className="flex items-center gap-1.5 text-white/80">
          <Users className="h-3.5 w-3.5" />
          <span className="text-xs font-medium">{team.member_count}</span>
        </div>
      </div>

      {/* Stats Body */}
      <div className="p-4 space-y-3">
        {/* XP and Streak Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Zap className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-bold text-amber-600">
              {team.xp_total.toLocaleString()} XP
            </span>
          </div>
          {team.streak_count > 0 && (
            <div className="flex items-center gap-1">
              <Flame className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-bold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
                {team.streak_count}
              </span>
              <span className="text-[10px] text-gray-400">day streak</span>
            </div>
          )}
        </div>

        {/* Health and Cooperation */}
        <div className="flex items-center justify-between">
          <TeamHealthBadge score={team.health_score} status={team.health_status} />
          <CooperationScoreDisplay score={team.cooperation_score} compact />
        </div>

        {isCurrentTeam && (
          <Badge
            variant="outline"
            className="text-xs bg-blue-50 text-blue-700 border-blue-200"
          >
            Your Team
          </Badge>
        )}
      </div>
    </Card>
  );
};

export default TeamCard;
