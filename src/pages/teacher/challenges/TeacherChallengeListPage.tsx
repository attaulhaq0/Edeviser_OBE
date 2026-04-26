// =============================================================================
// TeacherChallengeListPage — Task 6.3
// Teacher's challenge management list with create/edit actions
// =============================================================================

import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useCourses } from '@/hooks/useCourses';
import { useChallenges, useCancelChallenge, type Challenge } from '@/hooks/useChallenges';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Shimmer from '@/components/shared/Shimmer';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Trophy, Plus, Pencil, XCircle, Handshake, Target } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const statusColors: Record<string, string> = {
  draft: 'bg-blue-50 text-blue-700 border-blue-200',
  active: 'bg-green-50 text-green-700 border-green-200',
  ended: 'bg-gray-50 text-gray-600 border-gray-200',
  completed: 'bg-gray-50 text-gray-600 border-gray-200',
  cancelled: 'bg-red-50 text-red-600 border-red-200',
};

const TeacherChallengeListPage = () => {
  const { user } = useAuth();
  const { data: paginatedCourses } = useCourses();
  const courses = useMemo(
    () => (paginatedCourses?.data ?? []).filter((c) => c.teacher_id === user?.id),
    [paginatedCourses, user?.id],
  );

  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [cancelTarget, setCancelTarget] = useState<Challenge | null>(null);

  const effectiveCourseId = selectedCourseId || (courses.length > 0 ? courses[0]!.id : '');
  const { data: challenges, isLoading } = useChallenges(effectiveCourseId || undefined);
  const cancelMutation = useCancelChallenge();

  const handleCancel = () => {
    if (!cancelTarget) return;
    cancelMutation.mutate(cancelTarget.id, {
      onSuccess: () => {
        toast.success('Challenge cancelled');
        setCancelTarget(null);
      },
      onError: (err) => toast.error(err.message),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-500" />
          <h1 className="text-2xl font-bold tracking-tight">Challenges</h1>
        </div>
        <Link to="/teacher/challenges/new">
          <Button className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95">
            <Plus className="h-4 w-4" /> New Challenge
          </Button>
        </Link>
      </div>

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

      <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
        <div
          className="px-6 py-4 flex items-center gap-2"
          style={{ background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)' }}
        >
          <Trophy className="h-5 w-5 text-white" />
          <h2 className="text-lg font-bold tracking-tight text-white">All Challenges</h2>
        </div>
        <div className="p-6">
          {!effectiveCourseId ? (
            <p className="text-sm text-gray-500 text-center py-8">Select a course.</p>
          ) : isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Shimmer key={i} className="h-20 rounded-lg" />
              ))}
            </div>
          ) : !challenges || challenges.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">No challenges yet.</p>
          ) : (
            <div className="space-y-3">
              {challenges.map((ch) => (
                <div
                  key={ch.id}
                  className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:bg-slate-50"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="p-2 rounded-lg bg-amber-50">
                      {ch.challenge_type === 'cooperative' ? (
                        <Handshake className="h-4 w-4 text-amber-600" />
                      ) : (
                        <Target className="h-4 w-4 text-amber-600" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate">{ch.title}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge className={`text-xs ${statusColors[ch.status] ?? ''}`}>
                          {ch.status}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {format(new Date(ch.start_date), 'MMM d')} — {format(new Date(ch.end_date), 'MMM d, yyyy')}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          Goal: {ch.goal_target}
                        </Badge>
                        <Badge className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                          +{ch.reward_xp ?? ch.reward_value ?? 0} XP
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {ch.status === 'draft' && (
                      <Link to={`/teacher/challenges/${ch.id}/edit`}>
                        <Button variant="ghost" size="sm">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </Link>
                    )}
                    {(ch.status === 'draft' || ch.status === 'active') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCancelTarget(ch)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      <ConfirmDialog
        open={!!cancelTarget}
        onOpenChange={(open: boolean) => { if (!open) setCancelTarget(null); }}
        title={`Cancel "${cancelTarget?.title}"?`}
        description="This will cancel the challenge. Active participants will not receive rewards."
        onConfirm={handleCancel}
        isPending={cancelMutation.isPending}
      />
    </div>
  );
};

export default TeacherChallengeListPage;
