// =============================================================================
// TeamManagementPage — Task 5.3
// List teams for teacher's courses with health badges, accountability metrics,
// filter by health status and has-inactive-members, create/edit/delete actions
// =============================================================================

import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Shimmer from '@/components/shared/Shimmer';
import TeamHealthBadge from '@/components/shared/TeamHealthBadge';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useAuth } from '@/hooks/useAuth';
import { useCourses } from '@/hooks/useCourses';
import { useTeams, useSoftDeleteTeam, type Team } from '@/hooks/useTeams';
import {
  Users,
  Plus,
  Search,
  Pencil,
  Trash2,
  Flame,
  Zap,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';

type HealthFilter = 'all' | 'healthy' | 'needs_attention' | 'at_risk';

const TeamManagementPage = () => {
  const { user } = useAuth();
  const { data: paginatedCourses } = useCourses();
  const courses = useMemo(
    () => (paginatedCourses?.data ?? []).filter((c) => c.teacher_id === user?.id),
    [paginatedCourses, user?.id],
  );

  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [healthFilter, setHealthFilter] = useState<HealthFilter>('all');
  const [deleteTarget, setDeleteTarget] = useState<Team | null>(null);

  const effectiveCourseId = selectedCourseId || (courses.length > 0 ? courses[0]!.id : '');
  const { data: teams = [], isLoading } = useTeams(effectiveCourseId || undefined);
  const deleteMutation = useSoftDeleteTeam();

  const filteredTeams = useMemo(() => {
    let result = teams;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((t) => t.name.toLowerCase().includes(q));
    }
    if (healthFilter !== 'all') {
      result = result.filter((t) => t.health_status === healthFilter);
    }
    return result;
  }, [teams, searchQuery, healthFilter]);

  const healthCounts = useMemo(() => {
    const counts = { healthy: 0, needs_attention: 0, at_risk: 0 };
    for (const t of teams) {
      const status = t.health_status ?? 'healthy';
      if (status in counts) counts[status as keyof typeof counts]++;
    }
    return counts;
  }, [teams]);

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success(`Team "${deleteTarget.name}" deleted`);
        setDeleteTarget(null);
      },
      onError: (err) => toast.error(err.message),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Team Management</h1>
        <Link to="/teacher/teams/new">
          <Button className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95">
            <Plus className="h-4 w-4" /> Create Team
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <Select value={effectiveCourseId} onValueChange={setSelectedCourseId}>
          <SelectTrigger className="w-56 bg-white">
            <SelectValue placeholder="Select course" />
          </SelectTrigger>
          <SelectContent>
            {courses.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.code} — {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search teams..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ps-9"
          />
        </div>

        <Select value={healthFilter} onValueChange={(v) => setHealthFilter(v as HealthFilter)}>
          <SelectTrigger className="w-48 bg-white">
            <SelectValue placeholder="Health status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All ({teams.length})</SelectItem>
            <SelectItem value="healthy">Healthy ({healthCounts.healthy})</SelectItem>
            <SelectItem value="needs_attention">Needs Attention ({healthCounts.needs_attention})</SelectItem>
            <SelectItem value="at_risk">At Risk ({healthCounts.at_risk})</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Health Summary KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-white border-0 shadow-md rounded-xl p-4">
          <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">Healthy</p>
          <p className="text-2xl font-black text-green-600 mt-1">{healthCounts.healthy}</p>
        </Card>
        <Card className="bg-white border-0 shadow-md rounded-xl p-4">
          <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">Needs Attention</p>
          <p className="text-2xl font-black text-yellow-600 mt-1">{healthCounts.needs_attention}</p>
        </Card>
        <Card className="bg-white border-0 shadow-md rounded-xl p-4">
          <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">At Risk</p>
          <p className="text-2xl font-black text-red-600 mt-1">{healthCounts.at_risk}</p>
        </Card>
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
            <p className="text-sm text-gray-500 text-center py-8">Select a course to manage teams.</p>
          ) : isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Shimmer key={i} className="h-20 rounded-lg" />
              ))}
            </div>
          ) : filteredTeams.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">No teams found.</p>
          ) : (
            <div className="space-y-3">
              {filteredTeams.map((team) => (
                <div
                  key={team.id}
                  className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-600">
                      {team.avatar_letter ?? team.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-bold">{team.name}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Users className="h-3 w-3" /> {team.member_count ?? 0}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-amber-600">
                          <Zap className="h-3 w-3" /> {team.xp_total ?? 0} XP
                        </span>
                        <span className="flex items-center gap-1 text-xs text-orange-500">
                          <Flame className="h-3 w-3" /> {team.streak_count ?? 0}d
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <TeamHealthBadge score={team.health_score ?? 100} />
                    {team.cooperation_score !== undefined && team.cooperation_score < 50 && (
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 text-xs">
                        <AlertTriangle className="h-3 w-3 me-1" /> Low Coop
                      </Badge>
                    )}
                    <Link to={`/teacher/teams/${team.id}/edit`}>
                      <Button variant="ghost" size="sm">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteTarget(team)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open: boolean) => { if (!open) setDeleteTarget(null); }}
        title={`Delete "${deleteTarget?.name}"?`}
        description="This will soft-delete the team. Historical data will be preserved."
        onConfirm={handleDelete}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
};

export default TeamManagementPage;
