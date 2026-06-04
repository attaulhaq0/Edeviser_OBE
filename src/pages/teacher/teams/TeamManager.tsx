// Task 129.1: Team Manager page

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Plus, Loader2, Users, Shuffle } from "lucide-react";
import { toast } from "sonner";
import { NoTeams } from "@/components/shared/EmptyState";
import { useAuth } from "@/hooks/useAuth";
import { useCourses } from "@/hooks/useCourses";
import {
  useTeams,
  useCreateTeam,
  useAutoGenerateTeams,
} from "@/hooks/useTeams";
import { useCourseRoster } from "@/hooks/useTeamFormation";

const teamSchema = z.object({
  name: z.string().min(1, "Team name is required"),
  course_id: z.string().min(1, "Course is required"),
  // A team captain must be a real student in the course — never the creating
  // teacher (who is not a team member). Required so `teams.captain_id`
  // (NOT NULL, FK → profiles) is populated with a valid member.
  captain_id: z.string().uuid("Select a team captain"),
});

const autoGenSchema = z.object({
  course_id: z.string().min(1, "Course is required"),
  team_size: z.number().min(2).max(6),
});

const TeamManager = () => {
  const { user, institutionId } = useAuth();
  const { data: coursesData } = useCourses();
  const courses = coursesData?.data ?? [];
  const [selectedCourse, setSelectedCourse] = useState("");
  const { data: teams = [], isLoading } = useTeams(selectedCourse || undefined);
  const createMutation = useCreateTeam();
  const autoGenMutation = useAutoGenerateTeams();

  const form = useForm<z.infer<typeof teamSchema>>({
    resolver: zodResolver(teamSchema),
    defaultValues: { name: "", course_id: "", captain_id: "" },
  });

  // Roster for the manual create form's captain selector — scoped to the
  // course chosen inside that form (independent of the page-level filter).
  const createCourseId = form.watch("course_id");
  const { data: createRoster = [], isLoading: createRosterLoading } =
    useCourseRoster(createCourseId || undefined);

  const autoForm = useForm<z.infer<typeof autoGenSchema>>({
    resolver: zodResolver(autoGenSchema),
    defaultValues: { course_id: "", team_size: 4 },
  });

  const onSubmit = (data: z.infer<typeof teamSchema>) => {
    createMutation.mutate(
      {
        name: data.name,
        course_id: data.course_id,
        institution_id: institutionId ?? "",
        // Captain is the selected student member, not the creating teacher.
        captain_id: data.captain_id,
        created_by: user?.id ?? "",
      },
      {
        onSuccess: () => {
          toast.success("Team created");
          form.reset();
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  const onAutoGenerate = (data: z.infer<typeof autoGenSchema>) => {
    autoGenMutation.mutate(
      {
        ...data,
        created_by: user?.id ?? "",
        institution_id: institutionId ?? "",
      },
      {
        onSuccess: (result) =>
          toast.success(
            `Created ${result.teams_created} teams with ${result.students_assigned} students`
          ),
        onError: (err) => toast.error(err.message),
      }
    );
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Team Management</h1>

      <div className="flex items-center gap-4">
        <Select value={selectedCourse} onValueChange={setSelectedCourse}>
          <SelectTrigger className="w-64 bg-white">
            <SelectValue placeholder="Select course" />
          </SelectTrigger>
          <SelectContent>
            {courses.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden gap-0 py-0">
        <div
          className="px-6 py-4 flex items-center gap-2"
          style={{
            background: "var(--brand-gradient)",
          }}
        >
          <Users className="h-5 w-5 text-white" />
          <h2 className="text-lg font-bold tracking-tight text-white">Teams</h2>
        </div>
        <div className="p-6">
          {!selectedCourse ? (
            <p className="text-sm text-slate-400 text-center py-6">
              Select a course to manage teams.
            </p>
          ) : isLoading ? (
            <Shimmer className="h-32 rounded-lg" />
          ) : teams.length === 0 ? (
            <NoTeams />
          ) : (
            <div className="space-y-2">
              {teams.map((team) => (
                <div
                  key={team.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-600">
                      {team.avatar_letter}
                    </div>
                    <span className="text-sm font-medium">{team.name}</span>
                  </div>
                  <span className="text-xs text-slate-400">
                    {team.member_count ?? 0} members
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-6">
        <Card className="bg-white border-0 shadow-md rounded-xl p-6">
          <h2 className="text-lg font-bold tracking-tight mb-4">Create Team</h2>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="course_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Course</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={(value) => {
                          field.onChange(value);
                          // Roster changes with the course — clear any stale captain.
                          form.setValue("captain_id", "");
                        }}
                      >
                        <SelectTrigger className="bg-white">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {courses.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="captain_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Team Captain</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={!createCourseId || createRosterLoading}
                      >
                        <SelectTrigger className="bg-white">
                          <SelectValue
                            placeholder={
                              !createCourseId
                                ? "Select a course first"
                                : createRosterLoading
                                ? "Loading students…"
                                : createRoster.length === 0
                                ? "No enrolled students"
                                : "Select a captain"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {createRoster.map((student) => (
                            <SelectItem
                              key={student.student_id}
                              value={student.student_id}
                            >
                              {student.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95"
              >
                {createMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}{" "}
                Create
              </Button>
            </form>
          </Form>
        </Card>

        <Card className="bg-white border-0 shadow-md rounded-xl p-6">
          <h2 className="text-lg font-bold tracking-tight mb-4">
            Auto-Generate Teams
          </h2>
          <Form {...autoForm}>
            <form
              onSubmit={autoForm.handleSubmit(onAutoGenerate)}
              className="space-y-4"
            >
              <FormField
                control={autoForm.control}
                name="course_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Course</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger className="bg-white">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {courses.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={autoForm.control}
                name="team_size"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Team Size (2–6)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={2}
                        max={6}
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value) || 4)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                disabled={autoGenMutation.isPending}
                variant="outline"
                className="gap-2"
              >
                {autoGenMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Shuffle className="h-4 w-4" />
                )}{" "}
                Generate
              </Button>
            </form>
          </Form>
        </Card>
      </div>
    </div>
  );
};

export default TeamManager;
