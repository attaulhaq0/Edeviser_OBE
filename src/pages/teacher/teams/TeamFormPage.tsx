// =============================================================================
// TeamFormPage — Create/edit team form for teachers
// Task 5.4: name, member selection from enrollment roster
// =============================================================================

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { useCourses } from "@/hooks/useCourses";
import { useCreateTeam, useUpdateTeam, useTeams } from "@/hooks/useTeams";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Shimmer from "@/components/shared/Shimmer";
import { Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const teamFormSchema = z.object({
  name: z.string().min(2, "Team name must be at least 2 characters").max(50),
  course_id: z.string().uuid("Select a course"),
});

type TeamFormData = z.infer<typeof teamFormSchema>;

interface RosterStudent {
  student_id: string;
  full_name: string;
}

const useCourseRoster = (courseId?: string) => {
  return useQuery({
    queryKey: queryKeys.enrollments.list({ courseId, rosterAll: true }),
    queryFn: async (): Promise<RosterStudent[]> => {
      const { data, error } = await supabase
        .from("student_courses")
        .select("student_id, profiles!inner(full_name)")
        .eq("course_id", courseId!)
        .eq("status", "active");
      if (error) throw error;

      return (
        (data ?? []) as Array<{
          student_id: string;
          profiles: { full_name: string };
        }>
      ).map((row) => ({
        student_id: row.student_id,
        full_name: row.profiles.full_name,
      }));
    },
    enabled: !!courseId,
  });
};

const TeamFormPage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;
  const { user, institutionId } = useAuth();
  const { data: paginatedCourses } = useCourses();

  const teacherCourses = useMemo(
    () =>
      (paginatedCourses?.data ?? []).filter((c) => c.teacher_id === user?.id),
    [paginatedCourses, user?.id]
  );

  const createMutation = useCreateTeam();
  const updateMutation = useUpdateTeam();
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  const form = useForm<TeamFormData>({
    resolver: zodResolver(teamFormSchema),
    defaultValues: { name: "", course_id: "" },
  });

  const selectedCourseId = form.watch("course_id");
  const { data: roster, isLoading: rosterLoading } = useCourseRoster(
    selectedCourseId || undefined
  );

  // Load existing team data for edit mode
  const { data: existingTeams } = useTeams(selectedCourseId || undefined);
  const existingTeam = isEditMode
    ? (existingTeams ?? []).find((t) => t.id === id)
    : null;

  useEffect(() => {
    if (existingTeam) {
      form.reset({
        name: existingTeam.name,
        course_id: existingTeam.course_id,
      });
    }
  }, [existingTeam, form]);

  const toggleMember = (studentId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(studentId)
        ? prev.filter((m) => m !== studentId)
        : [...prev, studentId]
    );
  };

  const totalSize = selectedMembers.length;
  const sizeValid = isEditMode || (totalSize >= 2 && totalSize <= 6);

  const onSubmit = (data: TeamFormData) => {
    if (isEditMode && id) {
      updateMutation.mutate(
        { id, name: data.name },
        {
          onSuccess: () => {
            toast.success("Team updated");
            navigate("/teacher/teams");
          },
          onError: (err) => toast.error(err.message),
        }
      );
    } else {
      if (!sizeValid) {
        toast.error("Select 2-6 members for the team");
        return;
      }
      createMutation.mutate(
        {
          name: data.name,
          course_id: data.course_id,
          institution_id: institutionId ?? "",
          captain_id: selectedMembers[0] ?? "",
          created_by: user?.id ?? "",
          avatar_letter: data.name.charAt(0).toUpperCase(),
        },
        {
          onSuccess: () => {
            toast.success("Team created");
            navigate("/teacher/teams");
          },
          onError: (err) => toast.error(err.message),
        }
      );
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/teacher/teams")}
          className="h-8 w-8 p-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">
          {isEditMode ? "Edit Team" : "Create Team"}
        </h1>
      </div>

      <Card className="bg-white border-0 shadow-md rounded-xl p-6 max-w-2xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="course_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Course</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isEditMode}
                  >
                    <FormControl>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Select a course" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {teacherCourses.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                    <Input placeholder="e.g. Team Alpha" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Member Selection (create mode only) */}
            {!isEditMode && selectedCourseId && (
              <div className="space-y-2">
                <FormLabel>Select Members ({totalSize}/6)</FormLabel>
                {rosterLoading ? (
                  <Shimmer className="h-24 rounded-lg" />
                ) : !roster || roster.length === 0 ? (
                  <p className="text-xs text-gray-500">
                    No enrolled students found.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto border rounded-lg p-3">
                    {roster.map((student) => (
                      <label
                        key={student.student_id}
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 cursor-pointer"
                      >
                        <Checkbox
                          checked={selectedMembers.includes(student.student_id)}
                          onCheckedChange={() =>
                            toggleMember(student.student_id)
                          }
                          disabled={
                            !selectedMembers.includes(student.student_id) &&
                            totalSize >= 6
                          }
                        />
                        <span className="text-sm font-medium">
                          {student.full_name}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
                {totalSize > 0 && totalSize < 2 && (
                  <p className="text-xs text-amber-600">
                    Select at least 2 members.
                  </p>
                )}
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <Button
                type="submit"
                disabled={isPending || (!isEditMode && !sizeValid)}
                className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95"
              >
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {isEditMode ? "Update Team" : "Create Team"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/teacher/teams")}
              >
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
