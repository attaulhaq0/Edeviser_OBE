// =============================================================================
// CreateTeamPage — Team creation form for student-formed mode
// Task 5.2: name input, member selection from roster
// =============================================================================

import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useCreateTeam } from "@/hooks/useTeams";
import {
  useStudentFormedCourses,
  useCourseRoster,
} from "@/hooks/useTeamFormation";
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
import { Loader2, Users, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

interface CreateTeamFormData {
  name: string;
  course_id: string;
}

const CreateTeamPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation("student");
  const { user, institutionId } = useAuth();
  const studentId = user?.id ?? "";
  const { data: courses, isLoading: coursesLoading } = useStudentFormedCourses(
    studentId || undefined
  );
  const createMutation = useCreateTeam();
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  const form = useForm<CreateTeamFormData>({
    resolver: zodResolver(
      z.object({
        name: z.string().min(2, t("createTeam.validation.nameMin")).max(50),
        course_id: z.string().uuid(t("createTeam.validation.courseRequired")),
      })
    ),
    defaultValues: { name: "", course_id: "" },
  });

  const selectedCourseId = form.watch("course_id");
  const { data: roster, isLoading: rosterLoading } = useCourseRoster(
    selectedCourseId || undefined,
    studentId
  );

  const toggleMember = (id: string) => {
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  // Team size: 2-6 including captain
  const totalSize = selectedMembers.length + 1; // +1 for captain (current user)
  const sizeValid = totalSize >= 2 && totalSize <= 6;

  const onSubmit = (data: CreateTeamFormData) => {
    if (!sizeValid) {
      toast.error(t("createTeam.toast.sizeInvalid"));
      return;
    }

    createMutation.mutate(
      {
        name: data.name,
        course_id: data.course_id,
        institution_id: institutionId ?? "",
        captain_id: studentId,
        created_by: studentId,
        avatar_letter: data.name.charAt(0).toUpperCase(),
      },
      {
        onSuccess: (team) => {
          toast.success(t("createTeam.toast.created"));
          navigate(`/student/teams/${team.id}`);
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="h-8 w-8 p-0"
          aria-label={t("createTeam.back")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">
          {t("createTeam.title")}
        </h1>
      </div>

      {coursesLoading ? (
        <Shimmer className="h-48 rounded-xl" />
      ) : !courses || courses.length === 0 ? (
        <Card className="bg-white border-0 shadow-md rounded-xl p-8 text-center">
          <Users className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500">
            {t("createTeam.noCoursesAvailable")}
          </p>
        </Card>
      ) : (
        <Card className="bg-white border-0 shadow-md rounded-xl p-6 max-w-2xl">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="course_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("createTeam.courseLabel")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-white">
                          <SelectValue
                            placeholder={t("createTeam.selectCourse")}
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {courses.map((c) => (
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
                    <FormLabel>{t("createTeam.teamNameLabel")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("createTeam.teamNamePlaceholder")}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Member Selection */}
              {selectedCourseId && (
                <div className="space-y-2">
                  <FormLabel>
                    {t("createTeam.inviteMembers", { current: totalSize })}
                  </FormLabel>
                  {rosterLoading ? (
                    <Shimmer className="h-24 rounded-lg" />
                  ) : !roster || roster.length === 0 ? (
                    <p className="text-xs text-gray-500">
                      {t("createTeam.noAvailableStudents")}
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                      {roster.map((student) => (
                        <label
                          key={student.student_id}
                          className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 cursor-pointer"
                        >
                          <Checkbox
                            checked={selectedMembers.includes(
                              student.student_id
                            )}
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
                  {totalSize < 2 && (
                    <p className="text-xs text-amber-600">
                      {t("createTeam.selectAtLeastOne")}
                    </p>
                  )}
                </div>
              )}

              <Button
                type="submit"
                disabled={createMutation.isPending || !sizeValid}
                className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95"
              >
                {createMutation.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                {t("createTeam.submit")}
              </Button>
            </form>
          </Form>
        </Card>
      )}
    </div>
  );
};

export default CreateTeamPage;
