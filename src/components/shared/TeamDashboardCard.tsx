// Task 129.2 + 132.6: Team Dashboard Card with team streak display and team badges

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Flame, Users, Trophy } from 'lucide-react';
import type { Team, TeamGamification } from '@/hooks/useTeams';
import TeamBadgeDisplay from '@/components/shared/TeamBadgeDisplay';

interface TeamDashboardCardProps {
  team: Team;
  gamification?: TeamGamification | null;
  showBadges?: boolean;
}

const TeamDashboardCard = ({ team, gamification, showBadges = true }: TeamDashboardCardProps) => (
  <Card className="bg-white border-0 shadow-md rounded-xl p-4 group hover:shadow-lg transition-shadow">
    <div className="flex items-center gap-3">
      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-lg font-bold text-blue-600">
        {team.avatar_letter}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{team.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-slate-500 flex items-center gap-1">
            <Users className="h-3 w-3" />{team.member_count ?? 0}
          </span>
          {gamification && (
            <>
              <Badge variant="outline" className="text-[10px]">{gamification.xp_total} XP</Badge>
            </>
          )}
        </div>
      </div>
    </div>

    {/* Team Streak Display */}
    {gamification && (gamification.streak_current > 0 || gamification.streak_longest > 0) && (
      <div className="mt-3 flex items-center gap-3 px-1" data-testid="team-streak-display">
        <div className="flex items-center gap-1.5">
          <div className="p-1 rounded-md bg-orange-50">
            <Flame className="h-4 w-4 text-orange-500 animate-streak-flame" />
          </div>
          <div className="flex items-baseline gap-1">
            <span
              className="text-lg font-black bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent"
              data-testid="team-streak-current"
            >
              {gamification.streak_current}
            </span>
            <span className="text-[10px] font-medium text-gray-500">day streak</span>
          </div>
        </div>
        {gamification.streak_longest > 0 && (
          <div className="flex items-center gap-1 text-xs text-gray-400" data-testid="team-streak-longest">
            <Trophy className="h-3 w-3" />
            <span>Best: {gamification.streak_longest}d</span>
          </div>
        )}
      </div>
    )}

    {/* Team Badges */}
    {showBadges && (
      <div className="mt-3">
        <TeamBadgeDisplay teamId={team.id} compact />
      </div>
    )}
  </Card>
);

export default TeamDashboardCard;
