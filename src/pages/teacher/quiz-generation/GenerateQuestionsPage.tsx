import { useState } from "react";
import { useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Sparkles, Check, X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";

import QuestionPreview from "@/components/shared/QuestionPreview";
import DifficultyBadge from "@/components/shared/DifficultyBadge";
import { InlineNoCLOs } from "@/components/shared/EmptyState";

import { useCLOs } from "@/hooks/useCLOs";
import { useGenerateQuestions } from "@/hooks/useGenerateQuestions";
import type {
  GenerateQuestionsResponse,
  GeneratedQuestion,
} from "@/hooks/useGenerateQuestions";
import { useApproveQuestion, useRejectQuestion } from "@/hooks/useReviewQueue";

// ─── Form schema (client-side, adds course_id at submit time) ───────────────

const formSchema = z.object({
  clo_ids: z.array(z.string().uuid()).min(1, "Select at least one CLO"),
  bloom_levels: z
    .array(z.number().int().min(1).max(6))
    .min(1, "Select at least one Bloom's level"),
  question_types: z
    .array(z.enum(["mcq", "true_false", "short_answer", "fill_in_blank"]))
    .min(1, "Select at least one question type"),
  question_count: z.number().int().min(1).max(50),
});

type FormValues = z.infer<typeof formSchema>;

// ─── Constants ──────────────────────────────────────────────────────────────

const BLOOM_LEVELS = [
  { value: 1, label: "Remembering" },
  { value: 2, label: "Understanding" },
  { value: 3, label: "Applying" },
  { value: 4, label: "Analyzing" },
  { value: 5, label: "Evaluating" },
  { value: 6, label: "Creating" },
] as const;

const QUESTION_TYPES = [
  { value: "mcq" as const, label: "MCQ" },
  { value: "true_false" as const, label: "True/False" },
  { value: "short_answer" as const, label: "Short Answer" },
  { value: "fill_in_blank" as const, label: "Fill in Blank" },
] as const;

// ─── Page Component ─────────────────────────────────────────────────────────

const GenerateQuestionsPage = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const closQuery = useCLOs(courseId);
  const generateMutation = useGenerateQuestions();
  const approveMutation = useApproveQuestion();
  const rejectMutation = useRejectQuestion();

  const [result, setResult] = useState<GenerateQuestionsResponse | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clo_ids: [],
      bloom_levels: [],
      question_types: [],
      question_count: 10,
    },
  });

  const clos = closQuery.data?.data ?? [];

  const onSubmit = (values: FormValues) => {
    if (!courseId) return;

    generateMutation.mutate(
      { ...values, course_id: courseId },
      {
        onSuccess: (data) => {
          setResult(data);
          toast.success(`Generated ${data.questions.length} questions`);
        },
        onError: (err) => {
          toast.error(err.message || "Failed to generate questions");
        },
      }
    );
  };

  const handleApprove = (questionId: string) => {
    approveMutation.mutate(
      { id: questionId },
      {
        onSuccess: () => toast.success("Question approved"),
        onError: (err) => toast.error(err.message),
      }
    );
  };

  const handleReject = (questionId: string) => {
    rejectMutation.mutate(
      { id: questionId },
      {
        onSuccess: () => toast.success("Question rejected"),
        onError: (err) => toast.error(err.message),
      }
    );
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Generate Questions</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Generation Form */}
        <Card className="bg-white border-0 shadow-md rounded-xl p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* CLO Multi-Select */}
              <FormField
                control={form.control}
                name="clo_ids"
                render={() => (
                  <FormItem>
                    <FormLabel>Course Learning Outcomes</FormLabel>
                    <div className="space-y-2 max-h-48 overflow-y-auto rounded-md border p-3">
                      {clos.map((clo) => (
                        <FormField
                          key={clo.id}
                          control={form.control}
                          name="clo_ids"
                          render={({ field }) => (
                            <FormItem className="flex items-center gap-2">
                              <FormControl>
                                <Checkbox
                                  checked={field.value.includes(clo.id)}
                                  onCheckedChange={(checked) => {
                                    field.onChange(
                                      checked
                                        ? [...field.value, clo.id]
                                        : field.value.filter(
                                            (v: string) => v !== clo.id
                                          )
                                    );
                                  }}
                                />
                              </FormControl>
                              <Label className="text-sm font-normal cursor-pointer">
                                {clo.title}
                              </Label>
                            </FormItem>
                          )}
                        />
                      ))}
                      {clos.length === 0 && <InlineNoCLOs />}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Bloom's Level Checkboxes */}
              <FormField
                control={form.control}
                name="bloom_levels"
                render={() => (
                  <FormItem>
                    <FormLabel>Bloom&apos;s Taxonomy Levels</FormLabel>
                    <div className="grid grid-cols-2 gap-2">
                      {BLOOM_LEVELS.map((level) => (
                        <FormField
                          key={level.value}
                          control={form.control}
                          name="bloom_levels"
                          render={({ field }) => (
                            <FormItem className="flex items-center gap-2">
                              <FormControl>
                                <Checkbox
                                  checked={field.value.includes(level.value)}
                                  onCheckedChange={(checked) => {
                                    field.onChange(
                                      checked
                                        ? [...field.value, level.value]
                                        : field.value.filter(
                                            (v: number) => v !== level.value
                                          )
                                    );
                                  }}
                                />
                              </FormControl>
                              <Label className="text-sm font-normal cursor-pointer">
                                {level.value}. {level.label}
                              </Label>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Question Type Checkboxes */}
              <FormField
                control={form.control}
                name="question_types"
                render={() => (
                  <FormItem>
                    <FormLabel>Question Types</FormLabel>
                    <div className="grid grid-cols-2 gap-2">
                      {QUESTION_TYPES.map((type) => (
                        <FormField
                          key={type.value}
                          control={form.control}
                          name="question_types"
                          render={({ field }) => (
                            <FormItem className="flex items-center gap-2">
                              <FormControl>
                                <Checkbox
                                  checked={field.value.includes(type.value)}
                                  onCheckedChange={(checked) => {
                                    field.onChange(
                                      checked
                                        ? [...field.value, type.value]
                                        : field.value.filter(
                                            (v: string) => v !== type.value
                                          )
                                    );
                                  }}
                                />
                              </FormControl>
                              <Label className="text-sm font-normal cursor-pointer">
                                {type.label}
                              </Label>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Question Count */}
              <FormField
                control={form.control}
                name="question_count"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of Questions (1–50)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={50}
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Generate Button */}
              <Button
                type="submit"
                disabled={generateMutation.isPending}
                className="w-full bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95 transition-transform"
              >
                {generateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {generateMutation.isPending
                  ? "Generating..."
                  : "Generate Questions"}
              </Button>
            </form>
          </Form>
        </Card>

        {/* Results Panel */}
        <div className="space-y-4">
          {result && result.warnings.length > 0 && (
            <Card className="bg-yellow-50 border border-yellow-200 shadow-md rounded-xl p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="space-y-1">
                  {result.warnings.map((warning, i) => (
                    <p key={i} className="text-sm text-yellow-800">
                      {warning}
                    </p>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {result?.questions.map((question, index) => (
            <GeneratedQuestionCard
              key={`${result.generation_id}-${index}`}
              question={question}
              index={index}
              onApprove={handleApprove}
              onReject={handleReject}
              isApproving={approveMutation.isPending}
              isRejecting={rejectMutation.isPending}
            />
          ))}

          {!result && (
            <Card className="bg-white border-0 shadow-md rounded-xl p-6 flex items-center justify-center min-h-[200px]">
              <p className="text-sm text-gray-500">
                Generated questions will appear here.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Generated Question Card ────────────────────────────────────────────────

interface GeneratedQuestionCardProps {
  question: GeneratedQuestion;
  index: number;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  isApproving: boolean;
  isRejecting: boolean;
}

const GeneratedQuestionCard = ({
  question,
  index,
  onApprove,
  onReject,
  isApproving,
  isRejecting,
}: GeneratedQuestionCardProps) => {
  // The generation_id from the response is the batch id; individual question ids
  // come from the question_bank after insertion. We use the question_text as a
  // fallback identifier since the Edge Function inserts rows and returns them.
  const questionId = (question as GeneratedQuestion & { id?: string }).id;

  return (
    <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
      <div className="px-4 py-3 bg-slate-50 border-b flex items-center justify-between">
        <span className="text-xs font-bold tracking-widest uppercase text-gray-500">
          Question {index + 1}
        </span>
        <DifficultyBadge difficulty={question.difficulty_rating} />
      </div>
      <div className="p-4 space-y-3">
        <QuestionPreview
          questionText={question.question_text}
          questionType={
            question.question_type as
              | "mcq"
              | "true_false"
              | "short_answer"
              | "fill_in_blank"
          }
          options={
            question.options?.map(({ key, text }) => ({ key, text })) ?? null
          }
          disabled
        />

        {questionId && (
          <div className="flex items-center gap-2 pt-2">
            <Button
              size="sm"
              variant="outline"
              disabled={isApproving}
              onClick={() => onApprove(questionId)}
              className="text-green-700 border-green-300 hover:bg-green-50"
            >
              <Check className="h-4 w-4" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={isRejecting}
              onClick={() => onReject(questionId)}
              className="text-red-700 border-red-300 hover:bg-red-50"
            >
              <X className="h-4 w-4" />
              Reject
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};

export default GenerateQuestionsPage;
