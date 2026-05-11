import { useState } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Plus,
  Loader2,
  Trash2,
  Pencil,
  Eye,
  EyeOff,
  GripVertical,
  ClipboardList,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { useAuth } from "@/hooks/useAuth";
import {
  useSurveys,
  useSurvey,
  useSurveyQuestions,
  useCreateSurvey,
  useUpdateSurvey,
  useDeleteSurvey,
  useCreateSurveyQuestion,
  useDeleteSurveyQuestion,
} from "@/hooks/useSurveys";
import type { SurveyType, Survey } from "@/hooks/useSurveys";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

// ─── Schemas ────────────────────────────────────────────────────────────────

const questionSchema = z.object({
  question_text: z.string().min(1, "Question text is required"),
  question_type: z.enum(["likert", "mcq", "text"]),
  options: z.string().optional(),
});

const surveySchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  type: z.enum(["course_exit", "graduate_exit", "employer"]),
  is_active: z.boolean(),
  questions: z
    .array(questionSchema)
    .min(1, "At least one question is required"),
});

type SurveyFormData = z.infer<typeof surveySchema>;

const SURVEY_TYPE_LABELS: Record<SurveyType, string> = {
  course_exit: "Course Exit",
  graduate_exit: "Graduate Exit",
  employer: "Employer",
};

// ─── MCQ Options Field (extracted to use useWatch safely) ───────────────────

const McqOptionsField = ({
  control,
  index,
}: {
  control: ReturnType<typeof useForm<SurveyFormData>>["control"];
  index: number;
}) => {
  const questionType = useWatch({
    control,
    name: `questions.${index}.question_type` as const,
  });
  if (questionType !== "mcq") return null;
  return (
    <FormField
      control={control}
      name={`questions.${index}.options`}
      render={({ field: f }) => (
        <FormItem>
          <FormLabel className="text-xs">Options (comma-separated)</FormLabel>
          <FormControl>
            <Input {...f} placeholder="Option A, Option B, Option C" />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

// ─── Survey Form Dialog ─────────────────────────────────────────────────────

interface SurveyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editSurveyId?: string;
}

const SurveyFormDialog = ({
  open,
  onOpenChange,
  editSurveyId,
}: SurveyFormDialogProps) => {
  const { user, institutionId } = useAuth();
  const { data: existingSurvey } = useSurvey(editSurveyId);
  const { data: existingQuestions } = useSurveyQuestions(editSurveyId);
  const createSurvey = useCreateSurvey();
  const updateSurvey = useUpdateSurvey();
  const createQuestion = useCreateSurveyQuestion();
  const deleteQuestion = useDeleteSurveyQuestion();

  const form = useForm<SurveyFormData>({
    resolver: zodResolver(surveySchema),
    defaultValues: {
      title: "",
      type: "course_exit",
      is_active: true,
      questions: [{ question_text: "", question_type: "likert", options: "" }],
    },
    values:
      editSurveyId && existingSurvey
        ? {
            title: existingSurvey.title,
            type: existingSurvey.type,
            is_active: existingSurvey.is_active,
            questions: (existingQuestions ?? []).map((q) => ({
              question_text: q.question_text,
              question_type: q.question_type,
              options: q.options?.join(", ") ?? "",
            })),
          }
        : undefined,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "questions",
  });

  const isPending =
    createSurvey.isPending ||
    updateSurvey.isPending ||
    createQuestion.isPending ||
    deleteQuestion.isPending;

  const onSubmit = async (data: SurveyFormData) => {
    if (!user?.id || !institutionId) return;

    try {
      if (editSurveyId) {
        await updateSurvey.mutateAsync({
          id: editSurveyId,
          title: data.title,
          type: data.type,
          is_active: data.is_active,
          performedBy: user.id,
        });

        // Delete old questions and re-create
        for (const q of existingQuestions ?? []) {
          await deleteQuestion.mutateAsync({
            id: q.id,
            surveyId: editSurveyId,
          });
        }
        for (let i = 0; i < data.questions.length; i++) {
          const q = data.questions[i]!;
          const options =
            q.question_type === "mcq" && q.options
              ? q.options
                  .split(",")
                  .map((o) => o.trim())
                  .filter(Boolean)
              : null;
          await createQuestion.mutateAsync({
            survey_id: editSurveyId,
            question_text: q.question_text,
            question_type: q.question_type,
            options,
            sort_order: i + 1,
          });
        }
        toast.success("Survey updated");
      } else {
        const survey = await createSurvey.mutateAsync({
          institution_id: institutionId,
          title: data.title,
          type: data.type,
          target_outcomes: [],
          is_active: data.is_active,
          performedBy: user.id,
        });

        for (let i = 0; i < data.questions.length; i++) {
          const q = data.questions[i]!;
          const options =
            q.question_type === "mcq" && q.options
              ? q.options
                  .split(",")
                  .map((o) => o.trim())
                  .filter(Boolean)
              : null;
          await createQuestion.mutateAsync({
            survey_id: survey.id,
            question_text: q.question_text,
            question_type: q.question_type,
            options,
            sort_order: i + 1,
          });
        }
        toast.success("Survey created");
      }
      onOpenChange(false);
      form.reset();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save survey");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editSurveyId ? "Edit Survey" : "Create Survey"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g. Course Exit Survey — Fall 2025"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Survey Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-white">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="course_exit">Course Exit</SelectItem>
                        <SelectItem value="graduate_exit">
                          Graduate Exit
                        </SelectItem>
                        <SelectItem value="employer">Employer</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      onValueChange={(v) => field.onChange(v === "true")}
                      value={String(field.value)}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-white">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="true">Published</SelectItem>
                        <SelectItem value="false">Draft</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Questions */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold">Questions</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    append({
                      question_text: "",
                      question_type: "likert",
                      options: "",
                    })
                  }
                >
                  <Plus className="h-4 w-4" /> Add Question
                </Button>
              </div>

              {fields.map((field, index) => (
                <Card
                  key={field.id}
                  className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-gray-400" />
                      <span className="text-xs font-bold text-gray-500">
                        Q{index + 1}
                      </span>
                    </div>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>

                  <FormField
                    control={form.control}
                    name={`questions.${index}.question_text`}
                    render={({ field: f }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea
                            {...f}
                            placeholder="Enter question text..."
                            rows={2}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`questions.${index}.question_type`}
                    render={({ field: f }) => (
                      <FormItem>
                        <Select onValueChange={f.onChange} value={f.value}>
                          <FormControl>
                            <SelectTrigger className="bg-white">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="likert">Likert (1–5)</SelectItem>
                            <SelectItem value="mcq">Multiple Choice</SelectItem>
                            <SelectItem value="text">Open Text</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <McqOptionsField control={form.control} index={index} />
                </Card>
              ))}
            </div>

            <Button
              type="submit"
              disabled={isPending}
              className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95"
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {editSurveyId ? "Update Survey" : "Create Survey"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

// ─── Main Component ─────────────────────────────────────────────────────────

const SurveyManager = () => {
  const { user } = useAuth();
  const { data: surveys, isLoading } = useSurveys();
  const deleteSurvey = useDeleteSurvey();
  const updateSurvey = useUpdateSurvey();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<Survey | null>(null);

  const handleEdit = (survey: Survey) => {
    setEditId(survey.id);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setEditId(undefined);
    setDialogOpen(true);
  };

  const handleToggleActive = async (survey: Survey) => {
    if (!user?.id) return;
    try {
      await updateSurvey.mutateAsync({
        id: survey.id,
        is_active: !survey.is_active,
        performedBy: user.id,
      });
      toast.success(
        survey.is_active ? "Survey unpublished" : "Survey published"
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update survey"
      );
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget || !user?.id) return;
    try {
      await deleteSurvey.mutateAsync({
        id: deleteTarget.id,
        performedBy: user.id,
      });
      toast.success("Survey deleted");
      setDeleteTarget(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete survey"
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Surveys</h1>
        <Button
          onClick={handleCreate}
          className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95"
        >
          <Plus className="h-4 w-4" /> Create Survey
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl animate-shimmer" />
          ))}
        </div>
      ) : !surveys?.length ? (
        <Card className="bg-white border-0 shadow-md rounded-xl p-8 text-center">
          <ClipboardList className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">
            No surveys yet. Create your first survey to collect indirect
            assessment data.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {surveys.map((survey) => (
            <Card
              key={survey.id}
              className="bg-white border-0 shadow-md rounded-xl p-4"
            >
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold">{survey.title}</h3>
                    <Badge
                      variant={survey.is_active ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {survey.is_active ? "Published" : "Draft"}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500">
                    {SURVEY_TYPE_LABELS[survey.type]} · Created{" "}
                    {new Date(survey.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleActive(survey)}
                    title={survey.is_active ? "Unpublish" : "Publish"}
                  >
                    {survey.is_active ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(survey)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteTarget(survey)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <SurveyFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editSurveyId={editId}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open: boolean) => !open && setDeleteTarget(null)}
        title="Delete Survey"
        description={`Are you sure you want to delete "${deleteTarget?.title}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        confirmLabel="Delete"
        variant="destructive"
      />
    </div>
  );
};

export default SurveyManager;
