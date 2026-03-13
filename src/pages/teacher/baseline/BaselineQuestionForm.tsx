import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { baselineQuestionSchema } from '@/lib/onboardingSchemas';
import type { z } from 'zod';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { useCLOs } from '@/hooks/useCLOs';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

type BaselineQuestionFormData = z.infer<typeof baselineQuestionSchema>;

const BaselineQuestionForm = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const { data: closResult } = useCLOs(courseId);
  const clos = closResult?.data ?? [];

  const form = useForm<BaselineQuestionFormData>({
    resolver: zodResolver(baselineQuestionSchema),
    defaultValues: {
      question_text: '',
      options: ['', '', '', ''],
      correct_option: 0,
      clo_id: '',
      difficulty_level: 'medium',
    },
  });

  const createQuestion = useMutation({
    mutationFn: async (data: BaselineQuestionFormData) => {
      const institutionId = profile?.institution_id ?? '';
      const { data: result, error } = await supabase
        .from('onboarding_questions')
        .insert({
          institution_id: institutionId,
          assessment_type: 'baseline' as const,
          question_text: data.question_text,
          options: data.options.map((text) => ({ option_text: text })),
          correct_option: data.correct_option,
          clo_id: data.clo_id,
          course_id: courseId ?? null,
          difficulty_level: data.difficulty_level,
          sort_order: 0,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.onboarding.questions('baseline'),
      });
      toast.success('Baseline question created');
      navigate(`/teacher/baseline/${courseId}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const onSubmit = (data: BaselineQuestionFormData) => {
    createQuestion.mutate(data);
  };

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        onClick={() => navigate(`/teacher/baseline/${courseId}`)}
        className="gap-1 text-gray-500"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Baseline
      </Button>

      <h1 className="text-2xl font-bold tracking-tight">Add Baseline Question</h1>

      <Card className="bg-white border-0 shadow-md rounded-xl p-6 max-w-2xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="question_text"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Question Text</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Enter the question..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 4 answer options */}
            {[0, 1, 2, 3].map((idx) => (
              <FormField
                key={idx}
                control={form.control}
                name={`options.${idx}`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Option {idx + 1}</FormLabel>
                    <FormControl>
                      <Input placeholder={`Answer option ${idx + 1}`} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}

            <FormField
              control={form.control}
              name="correct_option"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Correct Answer</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(Number(v))}
                    value={String(field.value)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select correct option" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="0">Option 1</SelectItem>
                      <SelectItem value="1">Option 2</SelectItem>
                      <SelectItem value="2">Option 3</SelectItem>
                      <SelectItem value="3">Option 4</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="clo_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CLO Mapping</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select CLO" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {clos.map((clo) => (
                        <SelectItem key={clo.id} value={clo.id}>
                          {clo.title}
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
              name="difficulty_level"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Difficulty</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select difficulty" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={createQuestion.isPending}
              className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95"
            >
              {createQuestion.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Question
            </Button>
          </form>
        </Form>
      </Card>
    </div>
  );
};

export default BaselineQuestionForm;
