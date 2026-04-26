// =============================================================================
// ChallengeFormPage — Task 6.4
// Challenge creation form with cooperative as default type, type-specific goal
// inputs, XP Race acknowledgment checkbox, XP Race limit warning, date pickers,
// reward configuration
// =============================================================================

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  createChallengeSchema,
  type CreateChallengeInput,
} from '@/lib/schemas/challenge';
import {
  CHALLENGE_TYPES,
  CHALLENGE_TYPE_OPTIONS,
  type ChallengeTypeId,
} from '@/lib/challengeTypes';
import { useAuth } from '@/hooks/useAuth';
import { useCourses } from '@/hooks/useCourses';
import { useCreateChallenge } from '@/hooks/useChallenges';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const ChallengeFormPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: paginatedCourses } = useCourses();
  const courses = useMemo(
    () => (paginatedCourses?.data ?? []).filter((c) => c.teacher_id === user?.id),
    [paginatedCourses, user?.id],
  );
  const createMutation = useCreateChallenge();

  const form = useForm<CreateChallengeInput>({
    resolver: zodResolver(createChallengeSchema) as never,
    defaultValues: {
      title: '',
      description: '',
      challenge_type: 'cooperative',
      participation_mode: 'team',
      goal_target: 100,
      start_date: '',
      end_date: '',
      reward_xp: 100,
      reward_badge_id: null,
      xp_race_acknowledged: false,
    },
  });

  const challengeType = useWatch({ control: form.control, name: 'challenge_type' });
  const typeConfig = CHALLENGE_TYPES[challengeType as ChallengeTypeId] ?? CHALLENGE_TYPES.cooperative;

  const onSubmit = (data: CreateChallengeInput) => {
    createMutation.mutate(
      { ...data, created_by: user?.id ?? '' } as never,
      {
        onSuccess: () => {
          toast.success('Challenge created');
          navigate('/teacher/challenges');
        },
        onError: (err) => toast.error(err.message),
      },
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/teacher/challenges')}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Create Challenge</h1>
      </div>

      <Card className="bg-white border-0 shadow-md rounded-xl p-6 max-w-2xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl><Input placeholder="e.g. Team XP Sprint" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl><Input placeholder="Optional description" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Course (stored externally, not in schema) */}
            <div>
              <FormLabel>Course</FormLabel>
              <Select onValueChange={() => {}}>
                <SelectTrigger className="bg-white mt-1">
                  <SelectValue placeholder="Select course" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.code} — {c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="challenge_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Challenge Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CHALLENGE_TYPE_OPTIONS.map((typeId) => (
                          <SelectItem key={typeId} value={typeId}>
                            {CHALLENGE_TYPES[typeId].label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription className="text-xs">{typeConfig.description}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="participation_mode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Participation</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {typeConfig.supportsTeam && <SelectItem value="team">Team</SelectItem>}
                        {typeConfig.supportsIndividual && <SelectItem value="individual">Individual</SelectItem>}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="goal_target"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Goal Target ({typeConfig.goalUnit})</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={typeConfig.minTarget}
                      max={typeConfig.maxTarget}
                      disabled={typeConfig.fixedTarget !== undefined}
                      {...field}
                      value={typeConfig.fixedTarget ?? field.value}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription className="text-xs">{typeConfig.goalDescription}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl><Input type="datetime-local" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <FormControl><Input type="datetime-local" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="reward_xp"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reward XP (50–500)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={50}
                      max={500}
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* XP Race acknowledgment */}
            {challengeType === 'xp_race' && (
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800">
                      XP Race challenges are competitive by nature
                    </p>
                    <p className="text-xs text-yellow-700 mt-1">
                      Maximum 2 active XP Race challenges per course. Research shows excessive
                      competition can reduce intrinsic motivation for some learners.
                    </p>
                    <FormField
                      control={form.control}
                      name="xp_race_acknowledged"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2 mt-3">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="text-sm font-medium text-yellow-800 cursor-pointer">
                            I understand the competitive nature of XP Race challenges
                          </FormLabel>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95"
              >
                {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Create Challenge
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/teacher/challenges')}>
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </Card>
    </div>
  );
};

export default ChallengeFormPage;
