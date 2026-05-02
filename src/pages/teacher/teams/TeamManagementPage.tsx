// =============================================================================
// TeamManagementPage — Teacher team management with health badges,
// accountability metrics, filter by health status and has-inactive-members
// Task 5.3
// =============================================================================

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { parseAsString, useQueryState } from 'nuqs';
import { useAuth } from '@/hooks/useAuth';
import { useCourses } from '@/hooks/useCourses';
import { useTeams, useSoftDeleteTeam } from '@/hooks/useTeams';
import { useTeamHealthScores, type HealthStatus } from '@/hooks/useTeamHealth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import TeamHealthBadge from '@/components/shared/TeamHealthBadge';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import Shimmer from '@/components/shared/Shimmer';
import {
  Plus,
  Search,
  Users,
  Pencil,
  Trash2,
  HeartPulse,
} from 'lucide-react';
import { toast } from 'sonner';

const TeamManagementPage = () => {
  const navigate = useNavigate();
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
  const [search, setSearch] = useQueryState('q', parseAsString.withDefault(''));
  const [healthFilter, setHealthFilter] = useState<string>('all');
  const [deleteTeamId, setDeleteTeamId] = useState<string | null>(null);

  const effectiveCourseId = selectedCourseId || teacherCourses[0]?.id || '';
  const { data: teams, isLoading } = useTeams(effectiveCourseId || undefined);
  const { data: healthScores } = useTeamHealthScores(effectiveCourseId || undefined);
  const deleteMutation = useSoftDeleteTeam();

  // Build health lookup
  const healthMap = useMemo(() => {
    const map = new Map<string, { health_score: number; health_status: HealthStatus; cooperation_score: number }>();
    (healthScores ?? []).forEach((h) => {
      map.set(h.team_id, {
        health_score: h.health_score,
        health_status: h.health_status,
        cooperation_score: h.cooperation_score,
      });
    });
    return map;
  }, [healthScores]);

  // Filter teams
  const filteredTeams = useMemo(() => {
    let result = teams ?? [];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter((t) => t.name.toLowerCase().includes(q));
    }

    if (healthFilter && healthFilter !== 'all') {
      result = result.filter((t) => {
        const health = healthMap.get(t.id);
        return health?.health_status === healthFilter;
      });
    }

    return result;
  }, [teams, search, healthFilter, healthMap]);

  const handleDelete = () => {
    if (!deleteTeamId) return;
    deleteMutation.mutate(deleteTeamId, {
      onSuccess: () => {
        toast.success('Team deleted');
        setDeleteTeamId(null);
      },
      onError: (err) => toast.error(err.message),
    });
  };

  // Summary counts
  const healthCounts = useMemo(() => {
    const counts = { healthy: 0, needs_attention: 0, at_risk: 0 };
    (teams ?? []).forEach((t) => {
      const status = healthMap.get(t.id)?.health_status ?? 'healthy';
      counts[status]++;
    });
    return counts;
  }, [teams, healthMap]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Team Management</h1>
        <Button
          onClick={() => navigate('/teacher/teams/new')}
          className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95"
        >
          <Plus className="h-4 w-4" /> New Team
        </Button>
      </div>

      {/* Health Summary KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-white border-0 shadow-md rounded-xl p-4">
          <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">Healthy</p>
          <p className="text-2xl font-black text-green-600">{healthCounts.healthy}</p>
        </Card>
        <Card className="bg-white border-0 shadow-md rounded-xl p-4">
          <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">Needs Attention</p>
          <p className="text-2xl font-black text-yellow-600">{healthCounts.needs_attention}</p>
        </Card>
        <Card className="bg-white border-0 shadow-md rounded-xl p-4">
          <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">At Risk</p>
          <p className="text-2xl font-black text-red-600">{healthCounts.at_risk}</p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <Select value={effectiveCourseId} onValueChange={setSelectedCourseId}>
          <SelectTrigger className="w-64 bg-white">
            <SelectValue placeholder="Select course" />
          </SelectTrigger>
          <SelectContent>
            {teacherCourses.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative flex-1 max-w-sm">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search teams..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-9"
          />
        </div>

        <Select value={healthFilter} onValueChange={setHealthFilter}>
          <SelectTrigger className="w-48 bg-white">
            <SelectValue placeholder="Health status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="healthy">Healthy</SelectItem>
            <SelectItem value="needs_attention">Needs Attention</SelectItem>
            <SelectItem value="at_risk">At Risk</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Teams List */}
      <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
        <div
          className="px-6 py-4 flex items-center gap-2"
          style={{ background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)' }}
        >
          <Users className="h-5 w-5 text-white" />
          <h2 className="text-lg font-bold tracking-tight text-white">
            Teams ({filteredTeams.length})
          </h2>
        </div>
        <div className="p-6">
          {!effectiveCourseId ? (
            <p className="text-sm text-gray-500 text-center py-6">Select a course to manage teams.</p>
          ) : isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Shimmer key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          ) : filteredTeams.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">No teams found.</p>
          ) : (
            <div className="space-y-2">
              {filteredTeams.map((team) => {
                const health = healthMap.get(team.id);
                return (
                  <div
                    key={team.id}
                    className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-600 shrink-0">
                        {team.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{team.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-gray-500">
                            {team.member_count ?? 0} members
                          </span>
                          <span className="text-xs text-amber-600 font-medium">
                            {team.xp_total.toLocaleString()} XP
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <TeamHealthBadge score={health?.health_score ?? team.health_score} />
                      {health && (
                        <Badge variant="outline" className="text-xs">
                          Co-op: {health.cooperation_score}
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/teacher/teams/${team.id}/edit`)}
                        className="h-8 w-8 p-0"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteTeamId(team.id)}
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      {/* Team Health Link */}
      <Button
        variant="outline"
        onClick={() => navigate('/teacher/team-health')}
        className="gap-2"
      >
        <HeartPulse className="h-4 w-4" />
        View Team Health Report
      </Button>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTeamId}
        onOpenChange={(open: boolean) => { if (!open) setDeleteTeamId(null); }}
        title="Delete Team"
        description="This will soft-delete the team. Historical data will be preserved."
        onConfirm={handleDelete}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
};

export default TeamManagementPage;
