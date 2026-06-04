// =============================================================================
// ChallengeFormPage — Challenge creation/edit form
// Task 6.4: cooperative default, type-specific goals, XP Race acknowledgment,
//           date pickers, reward configuration
// =============================================================================

import { useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { useCourses } from "@/hooks/useCourses";
import {
  useCreateChallenge,
  useUpdateChallenge,
  useChallenges,
  useActiveXpRaceCount,
} from "@/hooks/useChallenges";
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
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ArrowLeft, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const challengeFormSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(100),
  description: z.string().max(500).default(""),
  challenge_type: z.enum([
    "academic",
    "habit",
    "xp_race",
    "blooms_climb",
    "cooperative",
  ]),
  participation_mode: z.enum(["team", "individual"]),
  goal_target: z.number().int().positive("Goal must be positive"),
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().min(1, "End date is required"),
  reward_xp: z
    .number()
    .int()
    .min(50, "Minimum 50 XP")
    .max(500, "Maximum 500 XP"),
  reward_badge_id: z.string().nullable().optional(),
  course_id: z.string().uuid("Select a course"),
  xp_race_acknowledged: z.boolean().optional(),
});

type ChallengeFormData = z.infer<typeof challengeFormSchema>;

const ChallengeFormPage = () => {
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

  const createMutation = useCreateChallenge();
  const updateMutation = useUpdateChallenge();

  const form = useForm<ChallengeFormData>({
    resolver: zodResolver(challengeFormSchema) as never,
    defaultValues: {
      title: "",
      description: "",
      challenge_type: "cooperative", // cooperative as default per spec
      participation_mode: "team",
      goal_target: 100,
      start_date: "",
      end_date: "",
      reward_xp: 100,
      reward_badge_id: null,
      course_id: "",
      xp_race_acknowledged: false,
    },
  });

  const challengeType = useWatch({
    control: form.control,
    name: "challenge_type",
  });
  const courseId = useWatch({ control: form.control, name: "course_id" });

  // XP Race limit check
  const { data: activeXpRaceCount } = useActiveXpRaceCount(
    courseId || undefined
  );
  const xpRaceLimitReached = (activeXpRaceCount ?? 0) >= 2;

  // Load existing challenge for edit mode
  const { data: existingChallenges } = useChallenges(courseId || undefined);
  const existingChallenge = isEditMode
    ? (existingChallenges ?? []).find((c) => c.id === id)
    : null;

  useEffect(() => {
    if (existingChallenge) {
      form.reset({
        title: existingChallenge.title,
        description: existingChallenge.description,
        challenge_type: existingChallenge.challenge_type,
        participation_mode: existingChallenge.participation_mode,
        goal_target: existingChallenge.goal_target,
        start_date: existingChallenge.start_date.slice(0, 16),
        end_date: existingChallenge.end_date.slice(0, 16),
        reward_xp: existingChallenge.reward_xp,
        reward_badge_id: existingChallenge.reward_badge_id,
        course_id: existingChallenge.course_id,
      });
    }
  }, [existingChallenge, form]);

  const onSubmit = (data: ChallengeFormData) => {
    // Feature: qa-partner-review-remediation — Req 2.4 / 2.5
    // XP Race acknowledgment gate. This runs through `form.handleSubmit`, so it
    // is re-evaluated against the current form snapshot on EVERY submit attempt
    // (never cached or "once per session"). It must short-circuit before any
    // create/update mutation is dispatched. Acknowledgment must be an explicit
    // `true` — undefined/false/any non-true value blocks submission. The
    // `xp_race_acknowledged` field stays a UI-only gate (see
    // `src/lib/schemas/challenge.ts`) and is never sent to the database.
    if (
      data.challenge_type === "xp_race" &&
      data.xp_race_acknowledged !== true
    ) {
      toast.error("XP Race challenges require explicit acknowledgment");
      return;
    }

    if (
      data.challenge_type === "xp_race" &&
      xpRaceLimitReached &&
      !isEditMode
    ) {
      toast.error("Maximum of 2 concurrent XP Race challenges per course");
      return;
    }

    if (isEditMode && id) {
      updateMutation.mutate(
        {
          id,
          title: data.title,
          description: data.description,
          goal_target: data.goal_target,
          start_date: data.start_date,
          end_date: data.end_date,
          reward_xp: data.reward_xp,
          reward_badge_id: data.reward_badge_id ?? null,
        },
        {
          onSuccess: () => {
            toast.success("Challenge updated");
            navigate("/teacher/challenges");
          },
          onError: (err) => toast.error(err.message),
        }
      );
    } else {
      createMutation.mutate(
        {
          ...data,
          institution_id: institutionId ?? undefined,
          created_by: user?.id ?? "",
        },
        {
          onSuccess: () => {
            toast.success("Challenge created");
            navigate("/teacher/challenges");
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
          onClick={() => navigate("/teacher/challenges")}
          className="h-8 w-8 p-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">
          {isEditMode ? "Edit Challenge" : "Create Challenge"}
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
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Challenge title" {...field} />
                  </FormControl>
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
                  <FormControl>
                    <Input placeholder="Optional description" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="challenge_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Challenge Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isEditMode}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-white">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="cooperative">
                          Cooperative (Recommended)
                        </SelectItem>
                        <SelectItem value="academic">Academic</SelectItem>
                        <SelectItem value="habit">Habit</SelectItem>
                        <SelectItem value="xp_race">XP Race</SelectItem>
                        <SelectItem value="blooms_climb">
                          Bloom&apos;s Climb
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="participation_mode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Participation Mode</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isEditMode}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-white">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="team">Team</SelectItem>
                        <SelectItem value="individual">Individual</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="goal_target"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Goal Target</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reward_xp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reward XP (50-500)</FormLabel>
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
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
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* XP Race Warning & Acknowledgment */}
            {challengeType === "xp_race" && (
              <div className="space-y-3">
                {xpRaceLimitReached && !isEditMode && (
                  <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                    <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                    <p className="text-xs text-red-700">
                      Maximum of 2 concurrent XP Race challenges per course
                      reached.
                    </p>
                  </div>
                )}
                <FormField
                  control={form.control}
                  name="xp_race_acknowledged"
                  render={({ field }) => (
                    <FormItem className="flex items-start gap-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div>
                        <FormLabel className="text-sm font-medium">
                          I acknowledge that XP Race challenges create
                          competitive pressure
                        </FormLabel>
                        <FormDescription className="text-xs text-gray-500">
                          Research shows cooperative challenges benefit most
                          learners. XP Race is limited to 2 concurrent per
                          course.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <Button
                type="submit"
                disabled={
                  isPending ||
                  (challengeType === "xp_race" &&
                    xpRaceLimitReached &&
                    !isEditMode)
                }
                className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95"
              >
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {isEditMode ? "Update Challenge" : "Create Challenge"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/teacher/challenges")}
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

export default ChallengeFormPage;
