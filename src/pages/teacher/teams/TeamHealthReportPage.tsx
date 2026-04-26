// =============================================================================
// TeamHealthReportPage — Task 13.1
// Weekly report with total teams, healthy/needs_attention/at_risk counts,
// flagged team list with issues and recommendations
// =============================================================================

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCourses } from '@/hooks/useCourses';
import { useTeamHealthReport } from '@/hooks/useTeamHealthReport';
import TeamHealthBadge from '@/components/shared/TeamHealthBadge';
import TeamHealthChart from '@/components/shared/TeamHealthChart';
import Shimmer from '@/components/shared/Shimmer';
import { Heart, Users, AlertTriangle, CheckCircle, Info } from 'lucide-react';

const TeamHealthReportPage = () => {
  const { data: coursesData } = useCourses();
  const courses = coursesData?.data ?? [];
  const [selectedCourse, setSelectedCourse] = useState('');
  const { data: report, isLoading } = useTeamHealthReport(selectedCourse || undefined);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Heart className="h-5 w-5 text-red-500" />
        <h1 className="text-2xl font-bold tracking-tight">Team Health Report</h1>
      </div>

      <div className="max-w-xs">
        <Select value={selectedCourse} onValueChange={setSelectedCourse}>
          <SelectTrigger className="bg-white">
            <SelectValue placeholder="Select course" />
          </SelectTrigger>
          <SelectContent>
            {courses.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedCourse ? (
        <Card className="bg-white border-0 shadow-md rounded-xl p-8 text-center text-sm text-gray-400">
          Select a course to view the team health report.
        </Card>
      ) : isLoading ? (
        <div className="space-y-4">
          <Shimmer className="h-24 rounded-xl" />
          <Shimmer className="h-48 rounded-xl" />
        </div>
      ) : report ? (
        <>
          {/* KPI Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-white border-0 shadow-md rounded-xl p-4 group">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">Total Teams</p>
                  <p className="text-2xl font-black mt-1">{report.total_teams}</p>
                </div>
                <div className="p-2 rounded-lg bg-blue-50 group-hover:scale-110 transition-transform">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </Card>
            <Card className="bg-white border-0 shadow-md rounded-xl p-4 group">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">Healthy</p>
                  <p className="text-2xl font-black mt-1 text-green-600">{report.healthy_count}</p>
                </div>
                <div className="p-2 rounded-lg bg-green-50 group-hover:scale-110 transition-transform">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </Card>
            <Card className="bg-white border-0 shadow-md rounded-xl p-4 group">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">Needs Attention</p>
                  <p className="text-2xl font-black mt-1 text-yellow-600">{report.needs_attention_count}</p>
                </div>
                <div className="p-2 rounded-lg bg-yellow-50 group-hover:scale-110 transition-transform">
                  <Info className="h-5 w-5 text-yellow-600" />
                </div>
              </div>
            </Card>
            <Card className="bg-white border-0 shadow-md rounded-xl p-4 group">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">At Risk</p>
                  <p className="text-2xl font-black mt-1 text-red-600">{report.at_risk_count}</p>
                </div>
                <div className="p-2 rounded-lg bg-red-50 group-hover:scale-110 transition-transform">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
              </div>
            </Card>
          </div>

          {/* Flagged Teams */}
          <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
            <div
              className="px-6 py-4 flex items-center gap-2"
              style={{ background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)' }}
            >
              <AlertTriangle className="h-5 w-5 text-white" />
              <h2 className="text-lg font-bold tracking-tight text-white">Flagged Teams</h2>
            </div>
            <div className="p-6">
              {report.flagged_teams.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">
                  All teams are healthy. No action needed.
                </p>
              ) : (
                <div className="space-y-4">
                  {report.flagged_teams.map((team) => (
                    <div
                      key={team.team_id}
                      className="p-4 rounded-xl border border-slate-100 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold">{team.team_name}</span>
                          <TeamHealthBadge score={team.health_score} status={team.health_status} />
                        </div>
                        {team.inactive_member_count > 0 && (
                          <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                            {team.inactive_member_count} inactive
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Issues</p>
                          <ul className="space-y-1">
                            {team.issues.map((issue, i) => (
                              <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                                <span className="text-red-400 mt-0.5">•</span>
                                {issue}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Recommendations</p>
                          <ul className="space-y-1">
                            {team.recommendations.map((rec, i) => (
                              <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                                <span className="text-blue-400 mt-0.5">→</span>
                                {rec}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Health Score Trend — Task 13.5 */}
                      {team.health_snapshots && team.health_snapshots.length > 1 && (
                        <div className="mt-3">
                          <TeamHealthChart
                            snapshots={team.health_snapshots}
                            height={120}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </>
      ) : null}
    </div>
  );
};

export default TeamHealthReportPage;
