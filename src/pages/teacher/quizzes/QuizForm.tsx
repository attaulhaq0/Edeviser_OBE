import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createQuizSchema, type CreateQuizFormData } from "@/lib/schemas/quiz";
import { useQuiz, useCreateQuiz, useUpdateQuiz } from "@/hooks/useQuizzes";
import { useCourses } from "@/hooks/useCourses";
import { useCLOs } from "@/hooks/useCLOs";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { PracticeModeToggle } from "@/components/shared/PracticeModeToggle";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { InlineNoCLOs } from "@/components/shared/EmptyState";

// ─── Shared form fields ──────────────────────────────────────────────────────

interface QuizFormFieldsProps {
  form: ReturnType<typeof useForm<CreateQuizFormData>>;
  onSubmit: (data: CreateQuizFormData) => void;
  isPending: boolean;
  isEditMode: boolean;
}

const QuizFormFields = ({
  form,
  onSubmit,
  isPending,
  isEditMode,
}: QuizFormFieldsProps) => {
  const navigate = useNavigate();
  const selectedCourseId = useWatch({
    control: form.control,
    name: "course_id",
  });
  const isAdaptive = useWatch({ control: form.control, name: "is_adaptive" });

  const { data: paginatedCourses, isLoading: isLoadingCourses } = useCourses();
  const courses = paginatedCourses?.data ?? [];
  const { data: paginatedCLOs, isLoading: isLoadingCLOs } = useCLOs(
    selectedCourseId || undefined
  );
  const clos = paginatedCLOs?.data ?? [];

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((data) => {
          const isoDate = data.due_date.includes("Z")
            ? data.due_date
            : new Date(data.due_date).toISOString();
          onSubmit({ ...data, due_date: isoDate });
        })}
        className="space-y-6"
      >
        {/* Section 1: Basic Details */}
        <Card className="bg-white border-0 shadow-md rounded-xl p-6">
          <h2 className="text-lg font-bold tracking-tight mb-4">
            Basic Details
          </h2>
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Midterm Quiz — Data Structures"
                      {...field}
                    />
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
                    <Textarea
                      placeholder="Describe the quiz objectives…"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="course_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Course</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isLoadingCourses || isEditMode}
                  >
                    <FormControl>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Select a course" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {courses.map((course) => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.code} — {course.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        {...field}
                        value={
                          field.value
                            ? field.value.includes("T")
                              ? field.value.slice(0, 16)
                              : field.value
                            : ""
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="time_limit_minutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time Limit (minutes)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        placeholder="30"
                        {...field}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value ? Number(e.target.value) : null
                          )
                        }
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="max_attempts"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Attempts</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        placeholder="1"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        value={field.value ?? 1}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </Card>

        {/* Section 2: CLO Linking */}
        <Card className="bg-white border-0 shadow-md rounded-xl p-6">
          <h2 className="text-lg font-bold tracking-tight mb-4">CLO Linking</h2>
          {selectedCourseId ? (
            isLoadingCLOs ? (
              <div className="animate-shimmer h-20 rounded-lg" />
            ) : clos.length === 0 ? (
              <InlineNoCLOs />
            ) : (
              <FormField
                control={form.control}
                name="clo_ids"
                render={() => (
                  <FormItem>
                    <div className="space-y-2">
                      {clos.map((clo) => (
                        <FormField
                          key={clo.id}
                          control={form.control}
                          name="clo_ids"
                          render={({ field }) => (
                            <FormItem className="flex items-center gap-3">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(clo.id)}
                                  onCheckedChange={(checked) => {
                                    const current = field.value ?? [];
                                    field.onChange(
                                      checked
                                        ? [...current, clo.id]
                                        : current.filter(
                                            (id: string) => id !== clo.id
                                          )
                                    );
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="text-sm font-normal cursor-pointer">
                                {clo.title}
                              </FormLabel>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )
          ) : (
            <p className="text-sm text-gray-500">
              Select a course to see available CLOs.
            </p>
          )}
        </Card>

        {/* Section 3: Quiz Settings — Adaptive & Practice Mode */}
        <Card className="bg-white border-0 shadow-md rounded-xl p-6">
          <h2 className="text-lg font-bold tracking-tight mb-4">
            Quiz Settings
          </h2>
          <div className="space-y-4">
            {/* Adaptive Mode Toggle */}
            <FormField
              control={form.control}
              name="is_adaptive"
              render={({ field }) => (
                <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 p-4">
                  <div className="space-y-0.5">
                    <Label
                      htmlFor="is-adaptive"
                      className="text-sm font-medium"
                    >
                      Enable Adaptive Mode
                    </Label>
                    <p className="text-xs text-gray-500">
                      Questions adapt to each student's ability level in real
                      time
                    </p>
                  </div>
                  <Switch
                    id="is-adaptive"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    aria-label="Enable Adaptive Mode"
                  />
                </div>
              )}
            />

            {/* Adaptation Config — shown only when adaptive is enabled */}
            {isAdaptive && (
              <div className="ms-4 space-y-3 border-s-2 border-blue-200 ps-4">
                <FormField
                  control={form.control}
                  name="adaptation_config.initial_difficulty"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Initial Difficulty (1.0–5.0)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={5}
                          step={0.1}
                          placeholder="2.5"
                          {...field}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value
                                ? Number(e.target.value)
                                : undefined
                            )
                          }
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <FormField
                    control={form.control}
                    name="adaptation_config.difficulty_step_up"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Step Up</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0.1}
                            max={2}
                            step={0.1}
                            placeholder="0.3"
                            {...field}
                            onChange={(e) =>
                              field.onChange(Number(e.target.value))
                            }
                            value={field.value ?? 0.3}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="adaptation_config.difficulty_step_down"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Step Down</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0.1}
                            max={2}
                            step={0.1}
                            placeholder="0.5"
                            {...field}
                            onChange={(e) =>
                              field.onChange(Number(e.target.value))
                            }
                            value={field.value ?? 0.5}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="adaptation_config.difficulty_range"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Difficulty Range (±)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0.1}
                            max={2}
                            step={0.1}
                            placeholder="0.5"
                            {...field}
                            onChange={(e) =>
                              field.onChange(Number(e.target.value))
                            }
                            value={field.value ?? 0.5}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            {/* Practice Mode Toggle */}
            <FormField
              control={form.control}
              name="practice_mode_enabled"
              render={({ field }) => (
                <PracticeModeToggle
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />

            {/* Published Toggle */}
            <FormField
              control={form.control}
              name="is_published"
              render={({ field }) => (
                <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 p-4">
                  <div className="space-y-0.5">
                    <Label
                      htmlFor="is-published"
                      className="text-sm font-medium"
                    >
                      Publish Quiz
                    </Label>
                    <p className="text-xs text-gray-500">
                      Make this quiz visible and available to students
                    </p>
                  </div>
                  <Switch
                    id="is-published"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    aria-label="Publish Quiz"
                  />
                </div>
              )}
            />
          </div>
        </Card>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button
            type="submit"
            disabled={isPending}
            className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95 text-white"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEditMode ? "Update Quiz" : "Create Quiz"}
          </Button>
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
};

// ─── Create mode form ────────────────────────────────────────────────────────

const CreateQuizForm = () => {
  const navigate = useNavigate();
  const createMutation = useCreateQuiz();

  const form = useForm<CreateQuizFormData>({
    resolver: zodResolver(createQuizSchema) as never,
    defaultValues: {
      title: "",
      description: "",
      course_id: "" as `${string}-${string}-${string}-${string}-${string}`,
      clo_ids: [],
      time_limit_minutes: null,
      max_attempts: 1,
      is_published: false,
      due_date: "",
      questions: [],
      is_adaptive: false,
      adaptation_config: {
        difficulty_step_up: 0.3,
        difficulty_step_down: 0.5,
        difficulty_range: 0.5,
      },
      practice_mode_enabled: false,
    },
  });

  const onSubmit = (data: CreateQuizFormData) => {
    createMutation.mutate(data, {
      onSuccess: () => {
        toast.success("Quiz created successfully");
        navigate(-1);
      },
      onError: (err) => toast.error(err.message),
    });
  };

  return (
    <QuizFormFields
      form={form as never}
      onSubmit={onSubmit}
      isPending={createMutation.isPending}
      isEditMode={false}
    />
  );
};

// ─── Edit mode form ──────────────────────────────────────────────────────────

const EditQuizForm = ({ quizId }: { quizId: string }) => {
  const navigate = useNavigate();
  const { data: existing, isLoading } = useQuiz(quizId);
  const updateMutation = useUpdateQuiz();

  const form = useForm<CreateQuizFormData>({
    resolver: zodResolver(createQuizSchema) as never,
    defaultValues: {
      title: "",
      description: "",
      course_id: "" as `${string}-${string}-${string}-${string}-${string}`,
      clo_ids: [],
      time_limit_minutes: null,
      max_attempts: 1,
      is_published: false,
      due_date: "",
      questions: [],
      is_adaptive: false,
      adaptation_config: {
        difficulty_step_up: 0.3,
        difficulty_step_down: 0.5,
        difficulty_range: 0.5,
      },
      practice_mode_enabled: false,
    },
  });

  useEffect(() => {
    if (existing) {
      const adaptConfig = existing.adaptation_config as Record<
        string,
        unknown
      > | null;
      form.reset({
        title: existing.title,
        description: existing.description ?? "",
        course_id:
          existing.course_id as `${string}-${string}-${string}-${string}-${string}`,
        clo_ids: (existing.clo_ids ??
          []) as `${string}-${string}-${string}-${string}-${string}`[],
        time_limit_minutes: existing.time_limit_minutes,
        max_attempts: existing.max_attempts,
        is_published: existing.is_published,
        due_date: existing.due_date,
        questions: [], // Questions are managed separately
        is_adaptive: existing.is_adaptive,
        adaptation_config: {
          initial_difficulty:
            (adaptConfig?.initial_difficulty as number) ?? undefined,
          difficulty_step_up:
            (adaptConfig?.difficulty_step_up as number) ?? 0.3,
          difficulty_step_down:
            (adaptConfig?.difficulty_step_down as number) ?? 0.5,
          difficulty_range: (adaptConfig?.difficulty_range as number) ?? 0.5,
        },
        practice_mode_enabled: existing.practice_mode_enabled,
      });
    }
  }, [existing, form]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const onSubmit = (data: CreateQuizFormData) => {
    updateMutation.mutate(
      { id: quizId, ...data },
      {
        onSuccess: () => {
          toast.success("Quiz updated successfully");
          navigate(-1);
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  return (
    <QuizFormFields
      form={form as never}
      onSubmit={onSubmit}
      isPending={updateMutation.isPending}
      isEditMode
    />
  );
};

// ─── Main page component ─────────────────────────────────────────────────────

const QuizForm = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditMode = !!id;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">
          {isEditMode ? "Edit Quiz" : "Create Quiz"}
        </h1>
      </div>

      {isEditMode ? <EditQuizForm quizId={id} /> : <CreateQuizForm />}
    </div>
  );
};

export default QuizForm;
