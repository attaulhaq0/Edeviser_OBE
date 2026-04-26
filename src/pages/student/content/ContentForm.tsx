/**
 * Task 21.3: Content Form — Form for study plans, quiz questions, explanation videos
 */
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createStudentContentSchema } from '@/lib/marketplaceSchemas';
import { useAuth } from '@/hooks/useAuth';
import { useCreateStudentContent } from '@/hooks/useStudentContent';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, X } from 'lucide-react';
import { toast } from 'sonner';

interface ContentFormProps {
  onClose: () => void;
}

interface ContentFormValues {
  content_type: 'study_plan' | 'quiz_question' | 'explanation_video';
  clo_id: string | null;
  title: string;
  content_data: Record<string, unknown>;
}

const ContentForm = ({ onClose }: ContentFormProps) => {
  const { user } = useAuth();
  const createContent = useCreateStudentContent();

  const form = useForm<ContentFormValues>({
    resolver: zodResolver(createStudentContentSchema) as never,
    defaultValues: {
      content_type: 'study_plan',
      clo_id: null,
      title: '',
      content_data: {},
    },
  });

  const contentType = useWatch({ control: form.control, name: 'content_type' });

  const onSubmit = (data: ContentFormValues) => {
    if (!user?.id) return;
    createContent.mutate(
      { ...data, student_id: user.id },
      {
        onSuccess: () => {
          toast.success('Content submitted for review');
          onClose();
        },
        onError: (err) => toast.error(err.message),
      },
    );
  };

  return (
    <Card className="bg-white border-0 shadow-md rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold tracking-tight">Create Content</h2>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="content_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Content Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="study_plan">Study Plan</SelectItem>
                    <SelectItem value="quiz_question">Quiz Question</SelectItem>
                    <SelectItem value="explanation_video">Explanation Video</SelectItem>
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
                  <Input {...field} placeholder="Give your content a descriptive title" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Dynamic fields based on content type */}
          {contentType === 'study_plan' && (
            <FormField
              control={form.control}
              name="content_data"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Study Plan Details</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe your study plan, including topics, schedule, and resources..."
                      rows={5}
                      value={(field.value as Record<string, unknown>)?.description as string ?? ''}
                      onChange={(e) => field.onChange({ ...field.value, description: e.target.value })}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {contentType === 'quiz_question' && (
            <>
              <FormField
                control={form.control}
                name="content_data"
                render={({ field }) => {
                  const data = field.value as Record<string, unknown>;
                  return (
                    <FormItem>
                      <FormLabel>Question Text</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Write your quiz question..."
                          rows={3}
                          value={(data?.question_text as string) ?? ''}
                          onChange={(e) => field.onChange({ ...data, question_text: e.target.value })}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
              <FormField
                control={form.control}
                name="content_data"
                render={({ field }) => {
                  const data = field.value as Record<string, unknown>;
                  return (
                    <FormItem>
                      <FormLabel>Answer Options (one per line)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={"Option A\nOption B\nOption C\nOption D"}
                          rows={4}
                          value={(data?.options as string) ?? ''}
                          onChange={(e) => field.onChange({ ...data, options: e.target.value })}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
              <FormField
                control={form.control}
                name="content_data"
                render={({ field }) => {
                  const data = field.value as Record<string, unknown>;
                  return (
                    <FormItem>
                      <FormLabel>Correct Answer</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Option A"
                          value={(data?.correct_answer as string) ?? ''}
                          onChange={(e) => field.onChange({ ...data, correct_answer: e.target.value })}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            </>
          )}

          {contentType === 'explanation_video' && (
            <FormField
              control={form.control}
              name="content_data"
              render={({ field }) => {
                const data = field.value as Record<string, unknown>;
                return (
                  <FormItem>
                    <FormLabel>Video URL</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://youtube.com/watch?v=..."
                        value={(data?.video_url as string) ?? ''}
                        onChange={(e) => field.onChange({ ...data, video_url: e.target.value })}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
          )}

          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={createContent.isPending}
              className="bg-gradient-to-r from-teal-500 to-blue-600 text-white active:scale-95"
            >
              {createContent.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Submit for Review
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </Form>
    </Card>
  );
};

export default ContentForm;
