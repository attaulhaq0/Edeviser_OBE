// =============================================================================
// CreateTeamPage — Task 5.2
// Team creation form for student-formed mode (name input, member selection)
// =============================================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createTeamSchema } from '@/lib/schemas/team';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
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
import { supabase } from '@/lib/supabase';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { toast } from 'sonner';
import { Loader2, Users, Plus } from 'lucide-react';

type FormValues = z.infer<typeof createTeamSchema>;

const CreateTeamPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  // Get student's enrolled courses
  const { data: enrollments } = useQuery({
    queryKey: ['student-enrollments', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_courses')
        .select('course_id, courses:course_id (id, name, team_formation_mode)')
        .eq('student_id', user!.id)
        .eq('status', 'active');
      if (error) throw error;
      return (data ?? []) as unknown as Array<{
        course_id: string;
        courses: { id: string; name: string; team_formation_mode: string } | null;
      }>;
    },
    enabled: !!user?.id,
  });

  const studentFormedCourses = (enrollments ?? [])
    .filter((e) => e.courses?.team_formation_mode === 'student_formed')
    .map((e) => e.courses!);

  const form = useForm<FormValues>({
    resolver: zodResolver(createTeamSchema),
    defaultValues: {
      name: '',
      course_id: '',
      member_ids: [],
    },
  });

  // eslint-disable-next-line react-hooks/incompatible-library
  const selectedCourseId = form.watch('course_id');

  // Get classmates for the selected course
  const { data: classmates } = useQuery({
    queryKey: ['course-classmates', selectedCourseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_courses')
        .select('student_id, profiles:student_id (id, full_name)')
        .eq('course_id', selectedCourseId)
        .neq('student_id', user!.id);
      if (error) throw error;
      return (data ?? []) as unknown as Array<{
        student_id: string;
        profiles: { id: string; full_name: string } | null;
      }>;
    },
    enabled: !!selectedCourseId && !!user?.id,
  });

  const createTeamMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      // Create team
      const { data: team, error: teamError } = await supabase
        .from('teams' as never)
        .insert({
          name: data.name,
          course_id: data.course_id,
          captain_id: user!.id,
          created_by: user!.id,
          institution_id: user!.user_metadata?.institution_id,
        } as never)
        .select()
        .single();
      if (teamError) throw teamError;

      const teamId = (team as { id: string }).id;

      // Add captain as first member
      const members = [
        { team_id: teamId, student_id: user!.id, role: 'captain' },
        ...data.member_ids.map((id) => ({ team_id: teamId, student_id: id, role: 'member' })),
      ];

      const { error: memberError } = await supabase
        .from('team_members' as never)
        .insert(members as never);
      if (memberError) throw memberError;

      return teamId;
    },
    onSuccess: (teamId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.teams.lists() });
      toast.success('Team created!');
      navigate(`/student/teams/${teamId}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const toggleMember = (studentId: string) => {
    setSelectedMembers((prev) => {
      const next = prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId];
      form.setValue('member_ids', next);
      return next;
    });
  };

  const onSubmit = (data: FormValues) => {
    createTeamMutation.mutate({ ...data, member_ids: selectedMembers });
  };

  if (studentFormedCourses.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Create Team</h1>
        <Card className="bg-white border-0 shadow-md rounded-xl p-8 text-center">
          <Users className="h-8 w-8 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">
            No courses with student-formed teams available. Your teacher manages team assignments.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Create Team</h1>

      <Card className="bg-white border-0 shadow-md rounded-xl p-6 max-w-2xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="course_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Course</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                    >
                      <option value="">Select a course</option>
                      {studentFormedCourses.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Team Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., The Innovators" maxLength={50} />
                  </FormControl>
                  <FormDescription>2-50 characters, unique within the course</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedCourseId && (
              <div className="space-y-2">
                <FormLabel>
                  Invite Members ({selectedMembers.length} selected, 1-5 additional)
                </FormLabel>
                {!classmates || classmates.length === 0 ? (
                  <p className="text-xs text-gray-500">No available classmates found.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                    {classmates.map((c) => (
                      <label
                        key={c.student_id}
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 cursor-pointer"
                      >
                        <Checkbox
                          checked={selectedMembers.includes(c.student_id)}
                          onCheckedChange={() => toggleMember(c.student_id)}
                          disabled={
                            !selectedMembers.includes(c.student_id) &&
                            selectedMembers.length >= 5
                          }
                        />
                        <span className="text-sm font-medium">
                          {c.profiles?.full_name ?? 'Unknown'}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            <Button
              type="submit"
              disabled={createTeamMutation.isPending}
              className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95"
            >
              {createTeamMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Create Team
            </Button>
          </form>
        </Form>
      </Card>
    </div>
  );
};

export default CreateTeamPage;
