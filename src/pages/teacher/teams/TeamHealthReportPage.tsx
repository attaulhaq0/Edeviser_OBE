// =============================================================================
// TeamHealthReportPage — Weekly team health report with flagged teams
// Task 13.1: total teams, healthy/needs_attention/at_risk counts,
//            flagged team list with issues and recommendations
// =============================================================================

import { useMemo } from 'react';
import { parseAsString, useQueryState } from 'nuqs';
import { useAuth } from '@/hooks/useAuth';
import { useCourses } from '@/hooks/useCourses';
import { useTeamHealthScores, type TeamHealthSummary } from '@/hooks/useTeamHealth';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import TeamHealthBadge from '@/components/shared/TeamHealthBadge';
import Shimmer from '@/components/shared/Shimmer';
import { HeartPulse, AlertTriangle, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const getRecommendation = (team: TeamHealthSummary): string => {
  if (team.health_status === 'at_risk') {
    return 'Consider restructuring this team or scheduling a check-in with members.';
  }
  if (team.health_status === 'needs_attention') {
    return 'Monitor this team closely. Encourage more equitable participation.';
  }
  return 'Team is performing well.';
};

const TeamHealthReportPage = () => {
  const { user } = useAuth();
  const { data: paginatedCourses } = useCourses();

  const teacherCourses = useMemo(
    () => (paginatedCourses?.data ?? []).filter((c) => c.teacher_id === user?.id),
    [paginatedCourses, user?.id],
  );

  const [selectedCourseId, setSelectedCourseId] = useQueryState(
    'courseId',
    parseAsString.withDefault(''),
  );

  const effectiveCourseId = selectedCourseId || teacherCourses[0]?.id || '';
  const { data: healthScores, isLoading } = useTeamHealthScores(effectiveCourseId || undefined);

  const counts = useMemo(() => {
    const c = { total: 0, healthy: 0, needs_attention: 0, at_risk: 0 };
    (healthScores ?? []).forEach((t) => {
      c.total++;
      c[t.health_status]++;
    });
    return c;
  }, [healthScores]);

  const flaggedTeams = useMemo(
    () => (healthScores ?? []).filter((t) => t.health_status !== 'healthy'),
    [healthScores],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <HeartPulse className="h-5 w-5 text-blue-600" />
        <h1 className="text-2xl font-bold tracking-tight">Team Health Report</h1>
      </div>

      {/* Course Selector */}
      <Select value={effectiveCourseId} onValueChange={setSelectedCourseId}>
        <SelectTrigger className="w-64 bg-white">
          <SelectValue placeholder="Select course" />
        </SelectTrigger>
        <SelectContent>
          {teacherCourses.map((c) => (
            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Summary KPIs */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Shimmer key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-white border-0 shadow-md rounded-xl p-4 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">Total Teams</p>
                <p className="text-2xl font-black mt-1">{counts.total}</p>
              </div>
              <div className="p-2 rounded-lg bg-blue-50 group-hover:scale-110 transition-transform">
                <HeartPulse className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </Card>
          <Card className="bg-white border-0 shadow-md rounded-xl p-4 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">Healthy</p>
                <p className="text-2xl font-black mt-1 text-green-600">{counts.healthy}</p>
              </div>
              <div className="p-2 rounded-lg bg-green-50 group-hover:scale-110 transition-transform">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </Card>
          <Card className="bg-white border-0 shadow-md rounded-xl p-4 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">Needs Attention</p>
                <p className="text-2xl font-black mt-1 text-yellow-600">{counts.needs_attention}</p>
              </div>
              <div className="p-2 rounded-lg bg-yellow-50 group-hover:scale-110 transition-transform">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
              </div>
            </div>
          </Card>
          <Card className="bg-white border-0 shadow-md rounded-xl p-4 group">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">At Risk</p>
                <p className="text-2xl font-black mt-1 text-red-600">{counts.at_risk}</p>
              </div>
              <div className="p-2 rounded-lg bg-red-50 group-hover:scale-110 transition-transform">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Flagged Teams */}
      <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
        <div
          className="px-6 py-4 flex items-center gap-2"
          style={{ background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)' }}
        >
          <AlertTriangle className="h-5 w-5 text-white" />
          <h2 className="text-lg font-bold tracking-tight text-white">
            Flagged Teams ({flaggedTeams.length})
          </h2>
        </div>
        <div className="p-6">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Shimmer key={i} className="h-20 rounded-lg" />
              ))}
            </div>
          ) : flaggedTeams.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="text-sm text-gray-500">All teams are healthy!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {flaggedTeams.map((team) => (
                <div
                  key={team.team_id}
                  className={cn(
                    'p-4 rounded-xl border',
                    team.health_status === 'at_risk'
                      ? 'border-red-200 bg-red-50'
                      : 'border-yellow-200 bg-yellow-50',
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <p className="text-sm font-semibold">{team.team_name}</p>
                      <TeamHealthBadge score={team.health_score} />
                    </div>
                    <Badge variant="outline" className="text-xs">
                      Co-op: {team.cooperation_score}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-600">{getRecommendation(team)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default TeamHealthReportPage;
