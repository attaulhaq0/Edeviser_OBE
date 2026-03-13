import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarDays, Clock, CheckCircle, Trophy } from 'lucide-react';
import type { StarterWeekSession } from '@/hooks/useStarterWeekPlan';

export interface StarterWeekHeroCardProps {
  sessions: StarterWeekSession[];
  onViewPlan: () => void;
  /** Whether the starter week has ended (7+ days since first session) */
  isPostWeek?: boolean;
}

const StarterWeekHeroCard = ({
  sessions,
  onViewPlan,
  isPostWeek = false,
}: StarterWeekHeroCardProps) => {
  const totalSessions = sessions.length;
  const completedSessions = sessions.filter((s) => s.status === 'completed').length;
  const totalMinutes = sessions.reduce((sum, s) => sum + s.duration_minutes, 0);
  const completedMinutes = sessions
    .filter((s) => s.status === 'completed')
    .reduce((sum, s) => sum + s.duration_minutes, 0);

  if (isPostWeek) {
    const completionRate = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;

    return (
      <Card
        className="border-0 shadow-lg rounded-xl overflow-hidden text-white"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #312e81 100%)' }}
      >
        <div className="p-6 space-y-3">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-400" />
            <h2 className="text-lg font-bold tracking-tight">Starter Week Complete!</h2>
          </div>
          <p className="text-sm text-white/70">
            You completed {completedSessions} of {totalSessions} sessions ({completionRate}%) for a total of {completedMinutes} minutes of study time.
          </p>
          {completionRate >= 80 && (
            <p className="text-xs text-amber-300 font-medium">Great start — keep the momentum going!</p>
          )}
        </div>
      </Card>
    );
  }

  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const timeDisplay = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

  return (
    <Card
      className="border-0 shadow-lg rounded-xl overflow-hidden text-white"
      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #312e81 100%)' }}
    >
      <div className="p-6 space-y-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Your Starter Week Plan</h2>
          <p className="text-sm text-white/70 mt-1">AI-generated study sessions to kick off your semester</p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1 text-white/60">
              <CalendarDays className="h-3 w-3" />
              <span className="text-[10px] font-black tracking-widest uppercase">Sessions</span>
            </div>
            <p className="text-xl font-black">{totalSessions}</p>
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-1 text-white/60">
              <Clock className="h-3 w-3" />
              <span className="text-[10px] font-black tracking-widest uppercase">Total Time</span>
            </div>
            <p className="text-xl font-black">{timeDisplay}</p>
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-1 text-white/60">
              <CheckCircle className="h-3 w-3" />
              <span className="text-[10px] font-black tracking-widest uppercase">Done</span>
            </div>
            <p className="text-xl font-black">{completedSessions}/{totalSessions}</p>
          </div>
        </div>

        <Button
          onClick={onViewPlan}
          className="bg-white/10 hover:bg-white/20 text-white border border-white/20 text-sm font-semibold active:scale-95 transition-transform duration-100"
        >
          View Plan
        </Button>
      </div>
    </Card>
  );
};

export default StarterWeekHeroCard;
