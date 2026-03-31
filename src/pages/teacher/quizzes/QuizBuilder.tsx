import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  useQuiz,
  useCreateQuiz,
  useUpdateQuiz,
  useQuizQuestions,
  useCreateQuizQuestion,
  useUpdateQuizQuestion,
  useDeleteQuizQuestion,
} from '@/hooks/useQuizzes';
import type { QuizQuestion } from '@/hooks/useQuizzes';
import { useCourses } from '@/hooks/useCourses';
import { useCLOs } from '@/hooks/useCLOs';
import { useAuth } from '@/hooks/useAuth';
import { logAuditEvent } from '@/lib/auditLogger';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ArrowLeft, Loader2, Plus, Trash2, Pencil } from 'lucide-react';
import { toast } from 'sonner';

// ─── Question Form Schema ────────────────────────────────────────────────────

const questionFormSchema = z.object({
  question_text: z.string().min(1, 'Question text is required'),
  question_type: z.enum(['mcq_single', 'mcq_multi', 'true_false', 'short_answer', 'fill_blank']),
  options: z.array(z.string()).nullable(),
  correct_answer: z.union([z.string(), z.array(z.string())]),
  points: z.number().min(0, 'Points must be 0 or more'),
  sort_order: z.number().int().min(0),
});

type QuestionFormData = z.infer<typeof questionFormSchema>;

// ─── Question Type Labels ────────────────────────────────────────────────────

const QUESTION_TYPE_LABELS: Record<string, string> = {
  mcq_single: 'MCQ (Single)',
  mcq_multi: 'MCQ (Multi)',
  true_false: 'True / False',
  short_answer: 'Short Answer',
  fill_blank: 'Fill in the Blank',
};

// ─── Question Dialog ─────────────────────────────────────────────────────────

interface QuestionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quizId: string;
  existingQuestion?: QuizQuestion;
  nextSortOrder: number;
}

const QuestionDialog = ({
  open,
  onOpenChange,
  quizId,
  existingQuestion,
  nextSortOrder,
}: QuestionDialogProps) => {
  const createQuestion = useCreateQuizQuestion();
  const updateQuestion = useUpdateQuizQuestion();
  const [options, setOptions] = useState<string[]>(
    existingQuestion?.options ?? ['', ''],
  );

  const form = useForm<QuestionFormData>({
    resolver: zodResolver(questionFormSchema) as never,
    defaultValues: existingQuestion
      ? {
          question_text: existingQuestion.question_text,
          question_type: existingQuestion.question_type,
          options: existingQuestion.options,
          correct_answer: existingQuestion.correct_answer,
          points: existingQuestion.points,
          sort_order: existingQuestion.sort_order,
        }
      : {
          question_text: '',
          question_type: 'mcq_single',
          options: ['', ''],
          correct_answer: '',
          points: 1,
          sort_order: nextSortOrder,
        },
  });

  // eslint-disable-next-line react-hooks/incompatible-library
  const questionType = form.watch('question_type');

  const handleTypeChange = (type: string) => {
    form.setValue('question_type', type as QuestionFormData['question_type']);
    if (type === 'true_false') {
      setOptions(['True', 'False']);
      form.setValue('options', ['True', 'False']);
      form.setValue('correct_answer', 'True');
    } else if (type === 'short_answer' || type === 'fill_blank') {
      setOptions([]);
      form.setValue('options', null);
      form.setValue('correct_answer', '');
    } else {
      if (options.length < 2) {
        setOptions(['', '']);
        form.setValue('options', ['', '']);
      }
    }
  };

  const onSubmit = (data: QuestionFormData) => {
    const finalOptions =
      data.question_type === 'short_answer' ? null : options.filter(Boolean).length > 0 ? options.filter(Boolean) : null;

    const payload = { ...data, options: finalOptions, quiz_id: quizId };

    if (existingQuestion) {
      updateQuestion.mutate(
        { ...payload, id: existingQuestion.id },
        {
          onSuccess: () => {
            toast.success('Question updated');
            onOpenChange(false);
          },
          onError: (err) => toast.error(err.message),
        },
      );
    } else {
      createQuestion.mutate(payload, {
        onSuccess: () => {
          toast.success('Question added');
          onOpenChange(false);
        },
        onError: (err) => toast.error(err.message),
      });
    }
  };

  const isPending = createQuestion.isPending || updateQuestion.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{existingQuestion ? 'Edit Question' : 'Add Question'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="question_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Question Type</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(v) => {
                      field.onChange(v);
                      handleTypeChange(v);
                    }}
                  >
                    <FormControl>
                      <SelectTrigger className="bg-white">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(QUESTION_TYPE_LABELS).map(([val, label]) => (
                        <SelectItem key={val} value={val}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="question_text"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Question Text</FormLabel>
                  <FormControl>
                    <Textarea rows={3} placeholder="Enter question..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {(questionType === 'mcq_single' || questionType === 'mcq_multi') && (
              <div className="space-y-2">
                <Label>Options</Label>
                {options.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-6">{String.fromCharCode(65 + idx)}.</span>
                    <Input
                      value={opt}
                      onChange={(e) => {
                        const next = [...options];
                        next[idx] = e.target.value;
                        setOptions(next);
                        form.setValue('options', next);
                      }}
                      placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                    />
                    {options.length > 2 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const next = options.filter((_, i) => i !== idx);
                          setOptions(next);
                          form.setValue('options', next);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                ))}
                {options.length < 6 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setOptions([...options, '']);
                      form.setValue('options', [...options, '']);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add Option
                  </Button>
                )}
              </div>
            )}

            {questionType === 'true_false' && (
              <FormField
                control={form.control}
                name="correct_answer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correct Answer</FormLabel>
                    <Select
                      value={typeof field.value === 'string' ? field.value : ''}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-white">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="True">True</SelectItem>
                        <SelectItem value="False">False</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {questionType === 'mcq_single' && (
              <FormField
                control={form.control}
                name="correct_answer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correct Answer</FormLabel>
                    <Select
                      value={typeof field.value === 'string' ? field.value : ''}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-white">
                          <SelectValue placeholder="Select correct option" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {options.filter(Boolean).map((opt, idx) => (
                          <SelectItem key={idx} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {questionType === 'mcq_multi' && (
              <FormField
                control={form.control}
                name="correct_answer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correct Answers (select all that apply)</FormLabel>
                    <div className="space-y-2">
                      {options.filter(Boolean).map((opt, idx) => {
                        const selected = Array.isArray(field.value) ? field.value : [];
                        return (
                          <div key={idx} className="flex items-center gap-2">
                            <Checkbox
                              checked={selected.includes(opt)}
                              onCheckedChange={(checked) => {
                                const next = checked
                                  ? [...selected, opt]
                                  : selected.filter((v: string) => v !== opt);
                                field.onChange(next);
                              }}
                            />
                            <span className="text-sm">{opt}</span>
                          </div>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {(questionType === 'short_answer' || questionType === 'fill_blank') && (
              <FormField
                control={form.control}
                name="correct_answer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correct Answer</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Expected answer..."
                        value={typeof field.value === 'string' ? field.value : ''}
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="points"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Points</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={isPending}
              className="w-full bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95 text-white"
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              {existingQuestion ? 'Update Question' : 'Add Question'}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

// ─── Quiz Builder Page ───────────────────────────────────────────────────────

const quizMetaSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().optional(),
  course_id: z.string().min(1, 'Course is required'),
  clo_ids: z.array(z.string()).min(1, 'At least 1 CLO required'),
  time_limit_minutes: z.number().int().min(1).nullable(),
  max_attempts: z.number().int().min(1),
  is_published: z.boolean(),
  due_date: z.string().min(1, 'Due date is required'),
});

type QuizMetaFormData = z.infer<typeof quizMetaSchema>;

const QuizBuilder = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEditMode = !!id;

  const { data: existingQuiz, isLoading: isLoadingQuiz } = useQuiz(id);
  const { data: questions, isLoading: isLoadingQuestions } = useQuizQuestions(id);
  const createQuiz = useCreateQuiz();
  const updateQuiz = useUpdateQuiz();
  const deleteQuestion = useDeleteQuizQuestion();

  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuizQuestion | undefined>();

  const { data: paginatedCourses, isLoading: isLoadingCourses } = useCourses();
  const courses = paginatedCourses?.data ?? [];

  const form = useForm<QuizMetaFormData>({
    resolver: zodResolver(quizMetaSchema) as never,
    defaultValues: {
      title: '',
      description: '',
      course_id: '',
      clo_ids: [],
      time_limit_minutes: null,
      max_attempts: 1,
      is_published: false,
      due_date: '',
    },
  });

  // eslint-disable-next-line react-hooks/incompatible-library
  const selectedCourseId = form.watch('course_id');
  const { data: paginatedCLOs, isLoading: isLoadingCLOs } = useCLOs(selectedCourseId || undefined);
  const clos = paginatedCLOs?.data ?? [];

  // Populate form when editing
  useState(() => {
    if (existingQuiz) {
      form.reset({
        title: existingQuiz.title,
        description: existingQuiz.description ?? '',
        course_id: existingQuiz.course_id,
        clo_ids: existingQuiz.clo_ids,
        time_limit_minutes: existingQuiz.time_limit_minutes,
        max_attempts: existingQuiz.max_attempts,
        is_published: existingQuiz.is_published,
        due_date: existingQuiz.due_date?.slice(0, 16) ?? '',
      });
    }
  });

  // Re-populate when quiz data loads
  if (existingQuiz && !form.formState.isDirty && form.getValues('title') === '' && existingQuiz.title) {
    form.reset({
      title: existingQuiz.title,
      description: existingQuiz.description ?? '',
      course_id: existingQuiz.course_id,
      clo_ids: existingQuiz.clo_ids,
      time_limit_minutes: existingQuiz.time_limit_minutes,
      max_attempts: existingQuiz.max_attempts,
      is_published: existingQuiz.is_published,
      due_date: existingQuiz.due_date?.includes('T')
        ? existingQuiz.due_date.slice(0, 16)
        : existingQuiz.due_date ?? '',
    });
  }

  const onSubmit = (data: QuizMetaFormData) => {
    const isoDate = data.due_date.includes('Z')
      ? data.due_date
      : new Date(data.due_date).toISOString();

    if (isEditMode && id) {
      updateQuiz.mutate(
        {
          id,
          title: data.title,
          description: data.description,
          clo_ids: data.clo_ids as `${string}-${string}-${string}-${string}-${string}`[],
          time_limit_minutes: data.time_limit_minutes,
          max_attempts: data.max_attempts,
          is_published: data.is_published,
          due_date: isoDate,
        },
        {
          onSuccess: () => {
            toast.success('Quiz updated');
            if (user?.id) {
              logAuditEvent({
                action: 'update',
                entity_type: 'quiz',
                entity_id: id,
                changes: data,
                performed_by: user.id,
              });
            }
          },
          onError: (err) => toast.error(err.message),
        },
      );
    } else {
      createQuiz.mutate(
        {
          ...data,
          course_id: data.course_id as `${string}-${string}-${string}-${string}-${string}`,
          clo_ids: data.clo_ids as `${string}-${string}-${string}-${string}-${string}`[],
          due_date: isoDate,
          questions: [],
          is_adaptive: false,
          practice_mode_enabled: false,
        },
        {
          onSuccess: (result) => {
            toast.success('Quiz created — now add questions');
            if (user?.id) {
              logAuditEvent({
                action: 'create',
                entity_type: 'quiz',
                entity_id: (result as { id: string })?.id ?? '',
                changes: data,
                performed_by: user.id,
              });
            }
            const newId = (result as { id: string })?.id;
            if (newId) navigate(`/teacher/quizzes/${newId}/build`, { replace: true });
          },
          onError: (err) => toast.error(err.message),
        },
      );
    }
  };

  const handleDeleteQuestion = (questionId: string) => {
    if (!id) return;
    deleteQuestion.mutate(
      { id: questionId, quiz_id: id },
      {
        onSuccess: () => toast.success('Question removed'),
        onError: (err) => toast.error(err.message),
      },
    );
  };

  const isPending = createQuiz.isPending || updateQuiz.isPending;

  if (isEditMode && isLoadingQuiz) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">
          {isEditMode ? 'Edit Quiz' : 'Create Quiz'}
        </h1>
      </div>

      {/* Quiz Metadata Form */}
      <Card className="bg-white border-0 shadow-md rounded-xl p-6">
        <h2 className="text-lg font-bold tracking-tight mb-4">Quiz Details</h2>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Midterm Quiz — Data Structures" {...field} />
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
                    <Textarea rows={2} placeholder="Describe the quiz objectives…" {...field} />
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
                      {courses.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.code} — {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* CLO Linking */}
            {selectedCourseId ? (
              isLoadingCLOs ? (
                <div className="animate-shimmer h-16 rounded-lg" />
              ) : clos.length === 0 ? (
                <p className="text-sm text-gray-500">No CLOs found for this course.</p>
              ) : (
                <FormField
                  control={form.control}
                  name="clo_ids"
                  render={() => (
                    <FormItem>
                      <FormLabel>Linked CLOs</FormLabel>
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
                                          : current.filter((v: string) => v !== clo.id),
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
              <p className="text-sm text-gray-500">Select a course to see CLOs.</p>
            )}

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
                        value={field.value?.includes('T') ? field.value.slice(0, 16) : field.value}
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
                    <FormLabel>Time Limit (min)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        placeholder="30"
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
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
                        value={field.value ?? 1}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Publish Toggle */}
            <FormField
              control={form.control}
              name="is_published"
              render={({ field }) => (
                <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 p-4">
                  <div className="space-y-0.5">
                    <Label htmlFor="is-published" className="text-sm font-medium">
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

            <Button
              type="submit"
              disabled={isPending}
              className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95 text-white"
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              {isEditMode ? 'Update Quiz' : 'Create Quiz'}
            </Button>
          </form>
        </Form>
      </Card>

      {/* Questions Section — only in edit mode */}
      {isEditMode && id && (
        <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
          <div
            className="px-6 py-4 flex items-center justify-between"
            style={{ background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)' }}
          >
            <h2 className="text-lg font-bold tracking-tight text-white">Questions</h2>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setEditingQuestion(undefined);
                setQuestionDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1" /> Add Question
            </Button>
          </div>
          <div className="p-6 space-y-3">
            {isLoadingQuestions ? (
              <div className="animate-shimmer h-24 rounded-lg" />
            ) : !questions || questions.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No questions yet. Click "Add Question" to get started.
              </p>
            ) : (
              questions.map((q, idx) => (
                <div
                  key={q.id}
                  className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 p-4"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      <span className="text-gray-400 mr-2">Q{idx + 1}.</span>
                      {q.question_text}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-gray-400">
                        {QUESTION_TYPE_LABELS[q.question_type] ?? q.question_type}
                      </span>
                      <span className="text-xs text-gray-400">{q.points} pts</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingQuestion(q);
                        setQuestionDialogOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteQuestion(q.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {/* Question Dialog */}
      {isEditMode && id && (
        <QuestionDialog
          open={questionDialogOpen}
          onOpenChange={setQuestionDialogOpen}
          quizId={id}
          existingQuestion={editingQuestion}
          nextSortOrder={questions?.length ?? 0}
        />
      )}
    </div>
  );
};

export default QuizBuilder;
