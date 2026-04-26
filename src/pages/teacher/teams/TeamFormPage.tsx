// =============================================================================
// TeamFormPage — Task 5.4
// Create/edit team form (name, member selection from enrollment roster)
// =============================================================================

import { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createTeamSchema, type CreateTeamInput } from '@/lib/schemas/team';
import { useAuth } from '@/hooks/useAuth';
import { useCourses } from '@/hooks/useCourses';
import { useCreateTeam } from '@/hooks/useTeams';
import { useEnrollments } from '@/hooks/useEnrollments';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Loader2, Users } from 'lucide-react';
import { toast } from 'sonner';

const TeamFormPage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;
  const { user, institutionId } = useAuth();

  const { data: paginatedCourses } = useCourses();
  const courses = useMemo(
    () => (paginatedCourses?.data ?? []).filter((c) => c.teacher_id === user?.id),
    [paginatedCourses, user?.id],
  );

  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

  const { data: enrollments } = useEnrollments(selectedCourseId || undefined);
  const createMutation = useCreateTeam();

  const form = useForm<CreateTeamInput>({
    resolver: zodResolver(createTeamSchema),
    defaultValues: {
      name: '',
      course_id: '' as `${string}-${string}-${string}-${string}-${string}`,
      member_ids: [],
    },
  });

  const enrolledStudents = useMemo(
    () => {
      const data = enrollments as unknown as { data?: Array<Record<string, unknown>> } | Array<Record<string, unknown>> | undefined;
      const items = Array.isArray(data) ? data : (data?.data ?? []);
      return items.map((e: Record<string, unknown>) => ({
        id: e.student_id as string,
        name: (e as Record<string, unknown>).student_name as string ?? 'Student',
      }));
    },
    [enrollments],
  );

  const toggleMember = (studentId: string) => {
    setSelectedMemberIds((prev) => {
      const next = prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId];
      form.setValue('member_ids', next as `${string}-${string}-${string}-${string}-${string}`[]);
      return next;
    });
  };

  const onSubmit = (data: CreateTeamInput) => {
    if (selectedMemberIds.length < 2) {
      toast.error('Select at least 2 members');
      return;
    }
    if (selectedMemberIds.length > 6) {
      toast.error('Maximum 6 members per team');
      return;
    }

    createMutation.mutate(
      {
        name: data.name,
        course_id: selectedCourseId,
        created_by: user?.id ?? '',
        institution_id: institutionId ?? undefined,
        captain_id: selectedMemberIds[0],
        member_ids: selectedMemberIds,
      },
      {
        onSuccess: () => {
          toast.success('Team created');
          navigate('/teacher/teams');
        },
        onError: (err) => toast.error(err.message),
      },
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/teacher/teams')}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">
          {isEditMode ? 'Edit Team' : 'Create Team'}
        </h1>
      </div>

      <Card className="bg-white border-0 shadow-md rounded-xl p-6 max-w-2xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Course Selection */}
            <div>
              <Label className="text-sm font-medium">Course</Label>
              <Select
                value={selectedCourseId}
                onValueChange={(v) => {
                  setSelectedCourseId(v);
                  setSelectedMemberIds([]);
                  form.setValue('course_id', v as `${string}-${string}-${string}-${string}-${string}`);
                }}
              >
                <SelectTrigger className="bg-white mt-1">
                  <SelectValue placeholder="Select a course" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.code} — {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Team Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Team Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Alpha Squad" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Member Selection */}
            {selectedCourseId && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  <Users className="h-4 w-4 inline me-1" />
                  Select Members (2–6) — {selectedMemberIds.length} selected
                </Label>
                {enrolledStudents.length === 0 ? (
                  <p className="text-xs text-gray-500">No enrolled students found.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto border rounded-lg p-3">
                    {enrolledStudents.map((student: { id: string; name: string }) => (
                      <label
                        key={student.id}
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 cursor-pointer"
                      >
                        <Checkbox
                          checked={selectedMemberIds.includes(student.id)}
                          onCheckedChange={() => toggleMember(student.id)}
                        />
                        <span className="text-sm font-medium">{student.name}</span>
                      </label>
                    ))}
                  </div>
                )}
                {selectedMemberIds.length > 0 && selectedMemberIds.length < 2 && (
                  <p className="text-xs text-red-500">Select at least 2 members</p>
                )}
                {selectedMemberIds.length > 6 && (
                  <p className="text-xs text-red-500">Maximum 6 members</p>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={createMutation.isPending || selectedMemberIds.length < 2 || selectedMemberIds.length > 6}
                className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95"
              >
                {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {isEditMode ? 'Update Team' : 'Create Team'}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/teacher/teams')}>
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </Card>
    </div>
  );
};

export default TeamFormPage;
