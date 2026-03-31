// Task 135.1: Challenge Manager page for teachers
// CRUD form with React Hook Form + Zod, team selector, TanStack Table

import { useState, useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { challengeSchema, type ChallengeInput } from '@/lib/schemas/challenge';
import {
  useChallenges,
  useCreateChallenge,
  useUpdateChallenge,
  useCancelChallenge,
  useAssignTeamsToChallenge,
  type Challenge,
} from '@/hooks/useChallenges';
import { useTeams } from '@/hooks/useTeams';
import { useAuth } from '@/hooks/useAuth';
import { useCourses } from '@/hooks/useCourses';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { DataTable } from '@/components/shared/DataTable';
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from '@/components/ui/form';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2, Plus, Trophy, X } from 'lucide-react';
import { toast } from 'sonner';
import { createColumns } from './columns';

const ChallengeManager = () => {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState<Challenge | null>(null);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);

  // Fetch teacher's courses to let them pick which course the challenge belongs to
  const { data: courses } = useCourses();
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');

  const { data: challenges, isLoading } = useChallenges(selectedCourseId || undefined);
  const { data: teams } = useTeams(selectedCourseId || undefined);
  const createMutation = useCreateChallenge();
  const updateMutation = useUpdateChallenge();
  const cancelMutation = useCancelChallenge();
  const assignTeamsMutation = useAssignTeamsToChallenge();

  const form = useForm<ChallengeInput>({
    resolver: zodResolver(challengeSchema),
    defaultValues: {
      title: '',
      description: '',
      challenge_type: 'course_wide',
      course_id: '',
      goal_metric: 'total_xp',
      goal_target: 100,
      reward_type: 'xp_bonus',
      reward_value: 50,
      start_date: '',
      end_date: '',
    },
  });

  const challengeType = useWatch({ control: form.control, name: 'challenge_type' });

  const handleEdit = (challenge: Challenge) => {
    setEditingChallenge(challenge);
    setSelectedTeamIds([]);
    form.reset({
      title: challenge.title,
      description: challenge.description ?? '',
      challenge_type: challenge.challenge_type,
      course_id: challenge.course_id,
      goal_metric: challenge.goal_metric as ChallengeInput['goal_metric'],
      goal_target: challenge.goal_target,
      reward_type: challenge.reward_type as ChallengeInput['reward_type'],
      reward_value: challenge.reward_value,
      start_date: challenge.start_date,
      end_date: challenge.end_date,
    });
    setShowForm(true);
  };

  const handleCancel = (challenge: Challenge) => {
    cancelMutation.mutate(challenge.id, {
      onSuccess: () => toast.success('Challenge cancelled'),
      onError: (err) => toast.error(err.message),
    });
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const columns = useMemo(() => createColumns(handleEdit, handleCancel), [cancelMutation]);

  const toggleTeam = (teamId: string) => {
    setSelectedTeamIds((prev) =>
      prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId],
    );
  };

  const teamSelectionValid = challengeType !== 'team' || (selectedTeamIds.length >= 2 && selectedTeamIds.length <= 20);

  const onSubmit = (data: ChallengeInput) => {
    if (data.challenge_type === 'team' && !editingChallenge && !teamSelectionValid) {
      toast.error('Select between 2 and 20 teams for a team-based challenge');
      return;
    }

    if (editingChallenge) {
      updateMutation.mutate(
        { id: editingChallenge.id, ...data },
        {
          onSuccess: () => {
            toast.success('Challenge updated');
            resetForm();
          },
          onError: (err) => toast.error(err.message),
        },
      );
    } else {
      createMutation.mutate(
        { ...data, created_by: user?.id ?? '' },
        {
          onSuccess: (result) => {
            if (data.challenge_type === 'team' && selectedTeamIds.length > 0 && result) {
              const challengeId = (result as { id: string }).id;
              assignTeamsMutation.mutate(
                { challengeId, teamIds: selectedTeamIds },
                {
                  onSuccess: () => toast.success('Challenge created with teams assigned'),
                  onError: (err) => toast.error(`Challenge created but team assignment failed: ${err.message}`),
                },
              );
            } else {
              toast.success('Challenge created');
            }
            resetForm();
          },
          onError: (err) => toast.error(err.message),
        },
      );
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingChallenge(null);
    setSelectedTeamIds([]);
    form.reset();
  };

  const openNewForm = () => {
    setEditingChallenge(null);
    setSelectedTeamIds([]);
    form.reset({
      title: '',
      description: '',
      challenge_type: 'course_wide',
      course_id: selectedCourseId,
      goal_metric: 'total_xp',
      goal_target: 100,
      reward_type: 'xp_bonus',
      reward_value: 50,
      start_date: '',
      end_date: '',
    });
    setShowForm(true);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-500" />
          <h1 className="text-2xl font-bold tracking-tight">Challenges</h1>
        </div>
        <Button
          onClick={openNewForm}
          className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95"
        >
          <Plus className="h-4 w-4" /> New Challenge
        </Button>
      </div>

      {/* Course selector */}
      <div className="max-w-xs">
        <Label className="text-sm font-medium text-gray-600 mb-1 block">Course</Label>
        <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
          <SelectTrigger className="bg-white">
            <SelectValue placeholder="Select a course" />
          </SelectTrigger>
          <SelectContent>
            {(courses?.data ?? []).map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* CRUD Form */}
      {showForm && (
        <Card className="bg-white border-0 shadow-md rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold tracking-tight">
              {editingChallenge ? 'Edit Challenge' : 'Create Challenge'}
            </h2>
            <Button variant="ghost" size="sm" onClick={resetForm} className="h-8 w-8 p-0">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl><Input {...field} placeholder="Challenge title" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl><Input {...field} placeholder="Optional description" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="course_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Course</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger className="bg-white"><SelectValue placeholder="Select course" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {(courses?.data ?? []).map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="challenge_type" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger className="bg-white"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="course_wide">Course-Wide</SelectItem>
                        <SelectItem value="team">Team</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="goal_metric" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Goal Metric</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger className="bg-white"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="total_xp">Total XP</SelectItem>
                        <SelectItem value="habits_completed">Habits Completed</SelectItem>
                        <SelectItem value="assignments_submitted">Assignments Submitted</SelectItem>
                        <SelectItem value="quiz_score_avg">Quiz Score Avg</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="goal_target" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Goal Target</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="reward_type" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reward Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger className="bg-white"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="xp_bonus">XP Bonus</SelectItem>
                        <SelectItem value="badge">Badge</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="reward_value" render={({ field }) => (
                <FormItem>
                  <FormLabel>Reward Value {form.getValues('reward_type') === 'xp_bonus' ? '(XP)' : '(Badge ID)'}</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="start_date" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl><Input type="datetime-local" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="end_date" render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <FormControl><Input type="datetime-local" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {/* Team selector — visible only for team-based challenges */}
              {challengeType === 'team' && !editingChallenge && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Select Teams (min 2, max 20) — {selectedTeamIds.length} selected
                  </Label>
                  {!teams || teams.length === 0 ? (
                    <p className="text-xs text-gray-500">No teams found for this course. Create teams first.</p>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                      {teams.map((team) => (
                        <label
                          key={team.id}
                          className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 cursor-pointer"
                        >
                          <Checkbox
                            checked={selectedTeamIds.includes(team.id)}
                            onCheckedChange={() => toggleTeam(team.id)}
                          />
                          <span className="text-sm font-medium">{team.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  {selectedTeamIds.length > 0 && selectedTeamIds.length < 2 && (
                    <p className="text-xs text-red-500">Select at least 2 teams</p>
                  )}
                  {selectedTeamIds.length > 20 && (
                    <p className="text-xs text-red-500">Maximum 20 teams allowed</p>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={isPending || (challengeType === 'team' && !editingChallenge && !teamSelectionValid)}
                  className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95"
                >
                  {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingChallenge ? 'Update Challenge' : 'Create Challenge'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </Card>
      )}

      {/* Challenges Data Table */}
      <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
        <div
          className="px-6 py-4 flex items-center gap-2"
          style={{ background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)' }}
        >
          <Trophy className="h-5 w-5 text-white" />
          <h2 className="text-lg font-bold tracking-tight text-white">All Challenges</h2>
        </div>
        <div className="p-4">
          {!selectedCourseId ? (
            <p className="text-sm text-gray-500 text-center py-8">Select a course to view challenges.</p>
          ) : (
            <DataTable columns={columns} data={challenges ?? []} isLoading={isLoading} />
          )}
        </div>
      </Card>
    </div>
  );
};

export default ChallengeManager;
