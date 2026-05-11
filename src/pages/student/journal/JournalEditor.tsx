// =============================================================================
// JournalEditor — Create/edit journal entries with contextual prompts
// =============================================================================

import { useState, useMemo, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  BookOpen,
  PenLine,
  Share2,
  Loader2,
  Lightbulb,
  X,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import {
  useJournalEntry,
  useCreateJournalEntry,
  useUpdateJournalEntry,
} from "@/hooks/useJournal";
import { useCLOs } from "@/hooks/useCLOs";
import { useStudentCourseProgram } from "@/pages/student/leaderboard/useStudentCourseProgram";
import {
  generateJournalPrompt,
  type GeneratedJournalPrompt,
  type KolbQuestion,
} from "@/lib/journalPromptGenerator";
import { logActivity } from "@/lib/activityLogger";
import { draftManager } from "@/lib/draftManager";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
import Shimmer from "@/components/shared/Shimmer";

// ─── Form Schema ─────────────────────────────────────────────────────────────

const journalFormSchema = z.object({
  course_id: z.string().min(1, "Please select a course"),
  clo_id: z.string().optional(),
  content: z.string().min(50, "Journal entry must be at least 50 characters"),
  is_shared: z.boolean(),
});

type JournalFormData = z.infer<typeof journalFormSchema>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const countWords = (text: string): number =>
  text.trim().split(/\s+/).filter(Boolean).length;

// ─── PromptCard — displays contextual Kolb's Cycle guidance ──────────────────

interface PromptCardProps {
  prompt: GeneratedJournalPrompt;
  onDismiss: () => void;
}

const PromptCard = ({ prompt, onDismiss }: PromptCardProps) => (
  <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
    <div
      className="px-6 py-4 flex items-center justify-between"
      style={{
        background: "linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)",
      }}
    >
      <div className="flex items-center gap-2">
        <Lightbulb className="h-5 w-5 text-white" />
        <h3 className="text-lg font-bold tracking-tight text-white">
          Reflection Prompt
        </h3>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onDismiss}
        className="text-white/80 hover:text-white hover:bg-white/10"
        aria-label="Dismiss prompt"
      >
        <X className="h-4 w-4" />
        Dismiss
      </Button>
    </div>
    <div className="p-6 space-y-4">
      <p className="text-sm text-gray-700 leading-relaxed">
        {prompt.promptText}
      </p>
      <div className="space-y-3">
        {prompt.questions.map((q: KolbQuestion, i: number) => (
          <div
            key={i}
            className="rounded-lg border border-slate-200 bg-slate-50 p-3"
          >
            <p className="text-xs font-bold tracking-wide uppercase text-teal-600 mb-1">
              {q.stage}
            </p>
            <p className="text-sm text-gray-700">{q.question}</p>
          </div>
        ))}
      </div>
    </div>
  </Card>
);

// ─── JournalEditor ───────────────────────────────────────────────────────────

const JournalEditor = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id && id !== "new";
  const { user } = useAuth();
  const userId = user?.id ?? "";

  // State
  const [promptDismissed, setPromptDismissed] = useState(false);

  // Fetch existing entry for edit mode
  const { data: existingEntry, isLoading: isLoadingEntry } = useJournalEntry(
    isEditMode ? id : undefined
  );

  // Fetch student's enrolled courses
  const { courses, isLoading: isLoadingCourses } =
    useStudentCourseProgram(userId);

  // Mutations
  const createMutation = useCreateJournalEntry();
  const updateMutation = useUpdateJournalEntry();

  // Form setup
  const form = useForm<JournalFormData>({
    resolver: zodResolver(journalFormSchema),
    defaultValues: {
      course_id: "",
      clo_id: "",
      content: "",
      is_shared: false,
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (existingEntry) {
      form.reset({
        course_id: existingEntry.course_id,
        clo_id: existingEntry.clo_id ?? "",
        content: existingEntry.content,
        is_shared: existingEntry.is_shared,
      });
    }
  }, [existingEntry, form]);

  // Watch form values for live word count and CLO prompt

  const watchedContent = form.watch("content");
  const watchedCourseId = form.watch("course_id");
  const watchedCloId = form.watch("clo_id");

  // ─── Draft auto-save & restore (new entries only) ──────────────────────────
  const draftKey = `journal-draft-${watchedCourseId || "new"}`;

  // Restore draft on mount for new entries
  useEffect(() => {
    if (isEditMode) return;
    const saved = draftManager.loadDraft<JournalFormData>(draftKey);
    if (saved && saved.content) {
      form.reset(saved);
    }
  }, [draftKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save every 30 seconds for new entries
  useEffect(() => {
    if (isEditMode) return;
    const stop = draftManager.startAutoSave(draftKey, () => form.getValues());
    return stop;
  }, [draftKey, isEditMode, form]);

  const wordCount = useMemo(
    () => countWords(watchedContent ?? ""),
    [watchedContent]
  );
  const charCount = (watchedContent ?? "").length;

  // Fetch CLOs for the selected course
  const { data: closData, isLoading: isLoadingCLOs } = useCLOs(
    watchedCourseId || undefined
  );
  const clos = useMemo(() => closData?.data ?? [], [closData]);

  // Generate contextual prompt when a CLO is selected
  const generatedPrompt = useMemo((): GeneratedJournalPrompt | null => {
    if (!watchedCloId || promptDismissed) return null;
    const selectedCLO = clos.find((c) => c.id === watchedCloId);
    if (!selectedCLO || !selectedCLO.blooms_level) return null;

    return generateJournalPrompt({
      cloTitle: selectedCLO.title,
      bloomsLevel: selectedCLO.blooms_level,
      attainmentLevel: "Developing", // Default — real attainment would come from outcome_attainment
    });
  }, [watchedCloId, clos, promptDismissed]);

  // Reset prompt dismissed state when CLO changes
  useEffect(() => {
    setPromptDismissed(false);
  }, [watchedCloId]);

  // Submit handler
  const onSubmit = (data: JournalFormData) => {
    if (isEditMode) {
      updateMutation.mutate(
        {
          id: id!,
          content: data.content,
          is_shared: data.is_shared,
          clo_id: data.clo_id || undefined,
        },
        {
          onSuccess: () => {
            draftManager.clearDraft(draftKey);
            toast.success("Journal entry updated");
            navigate("/student/journal");
          },
          onError: (err) => toast.error(err.message),
        }
      );
    } else {
      createMutation.mutate(
        {
          course_id: data.course_id,
          content: data.content,
          is_shared: data.is_shared,
          clo_id: data.clo_id || undefined,
        },
        {
          onSuccess: () => {
            draftManager.clearDraft(draftKey);
            // Log activity for journal entry
            if (userId) {
              logActivity({
                student_id: userId,
                event_type: "journal",
                metadata: { course_id: data.course_id },
              });
            }
            toast.success("Journal entry saved");
            navigate("/student/journal");
          },
          onError: (err) => toast.error(err.message),
        }
      );
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const isLoading = isLoadingEntry || isLoadingCourses;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Shimmer className="h-10 w-48 rounded-xl" />
        <Shimmer className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/student/journal")}
          className="text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <BookOpen className="h-6 w-6 text-teal-500" />
        <h1 className="text-2xl font-bold tracking-tight">
          {isEditMode ? "Edit Entry" : "New Journal Entry"}
        </h1>
      </div>

      {/* Contextual Prompt */}
      {generatedPrompt && (
        <PromptCard
          prompt={generatedPrompt}
          onDismiss={() => setPromptDismissed(true)}
        />
      )}

      {/* Editor Form */}
      <Card className="bg-white border-0 shadow-md rounded-xl p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Course Selector */}
            <FormField
              control={form.control}
              name="course_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Course</FormLabel>
                  <FormControl>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={isEditMode}
                    >
                      <SelectTrigger className="w-full bg-white">
                        <SelectValue placeholder="Select a course" />
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

            {/* CLO Selector (optional) */}
            {watchedCourseId && (
              <FormField
                control={form.control}
                name="clo_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Learning Outcome (optional)</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value ?? ""}
                        onValueChange={(v) =>
                          field.onChange(v === "__none__" ? "" : v)
                        }
                      >
                        <SelectTrigger className="w-full bg-white">
                          <SelectValue placeholder="Select a CLO for guided prompts" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">None</SelectItem>
                          {isLoadingCLOs ? (
                            <SelectItem value="__loading__" disabled>
                              Loading…
                            </SelectItem>
                          ) : (
                            clos.map((clo) => (
                              <SelectItem key={clo.id} value={clo.id}>
                                {clo.title}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Content Textarea */}
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Reflection</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Write your reflection here…"
                      rows={10}
                      className="resize-y"
                    />
                  </FormControl>
                  <div className="flex items-center justify-between">
                    <FormMessage />
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span>{charCount} characters</span>
                      <span>·</span>
                      <span data-testid="word-count">{wordCount} words</span>
                    </div>
                  </div>
                </FormItem>
              )}
            />

            {/* Share Toggle */}
            <FormField
              control={form.control}
              name="is_shared"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-3">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        aria-label="Share with teacher"
                      />
                    </FormControl>
                    <Label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                      <Share2 className="h-4 w-4 text-gray-500" />
                      Share with teacher
                    </Label>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Submit */}
            <Button
              type="submit"
              disabled={isPending}
              className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95 text-white"
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              <PenLine className="h-4 w-4" />
              {isEditMode ? "Update Entry" : "Save Entry"}
            </Button>
          </form>
        </Form>
      </Card>
    </div>
  );
};

export default JournalEditor;
