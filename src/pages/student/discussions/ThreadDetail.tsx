// Task 67.3: Thread Detail page with replies
// Requirements: 77.2, 77.3
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Pin, CheckCircle2, MessageSquare, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormField, FormItem, FormControl, FormMessage } from '@/components/ui/form';
import { useDiscussionThread, useDiscussionReplies, useCreateReply, useMarkAnswer } from '@/hooks/useDiscussions';
import { useAuth } from '@/hooks/useAuth';
import { createReplySchema, type CreateReplyFormData } from '@/lib/schemas/discussion';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const ThreadDetail = () => {
  const { courseId, threadId } = useParams<{ courseId: string; threadId: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { data: thread, isLoading: threadLoading } = useDiscussionThread(threadId);
  const { data: replies, isLoading: repliesLoading } = useDiscussionReplies(threadId);
  const createReply = useCreateReply();
  const markAnswer = useMarkAnswer();
  const isTeacher = profile?.role === 'teacher';

  const form = useForm<CreateReplyFormData>({
    resolver: zodResolver(createReplySchema),
    defaultValues: { thread_id: threadId ?? '', content: '' },
  });

  const onSubmitReply = (data: CreateReplyFormData) => {
    if (!user?.id || !threadId) return;
    createReply.mutate(
      { thread_id: threadId, content: data.content, author_id: user.id },
      {
        onSuccess: () => {
          toast.success('Reply posted');
          form.reset({ thread_id: threadId, content: '' });
        },
        onError: (err) => toast.error(err.message),
      },
    );
  };

  const handleMarkAnswer = (replyId: string, replyAuthorId: string) => {
    if (!user?.id || !threadId) return;
    markAnswer.mutate(
      { replyId, threadId, performedBy: user.id, replyAuthorId },
      {
        onSuccess: () => toast.success('Reply marked as answer'),
        onError: (err) => toast.error(err.message),
      },
    );
  };

  if (threadLoading) {
    return <div className="space-y-4"><div className="h-32 rounded-xl animate-shimmer" /><div className="h-48 rounded-xl animate-shimmer" /></div>;
  }

  if (!thread) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-gray-500">Thread not found.</p>
        <Button variant="ghost" onClick={() => navigate(-1)} className="mt-4">Go back</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate(`/student/courses/${courseId}/discussions`)} className="gap-1">
        <ArrowLeft className="h-4 w-4" /> Back to Forum
      </Button>

      {/* Thread header */}
      <Card className="bg-white border-0 shadow-md rounded-xl p-6">
        <div className="flex items-start gap-2">
          {thread.is_pinned && <Pin className="h-4 w-4 text-blue-500 mt-1 shrink-0" />}
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold tracking-tight">{thread.title}</h1>
              {thread.is_resolved && (
                <span className="text-[10px] font-bold tracking-widest uppercase text-green-600 bg-green-50 px-2 py-0.5 rounded">
                  Resolved
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {thread.author_name ?? 'Unknown'} · {format(new Date(thread.created_at), 'MMM d, yyyy h:mm a')}
            </p>
            <p className="text-sm text-gray-700 mt-3 whitespace-pre-wrap">{thread.content}</p>
          </div>
        </div>
      </Card>

      {/* Replies */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-gray-500 flex items-center gap-1">
          <MessageSquare className="h-4 w-4" /> {replies?.length ?? 0} Replies
        </h2>

        {repliesLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-20 rounded-xl animate-shimmer" />
            ))}
          </div>
        ) : (replies ?? []).length === 0 ? (
          <p className="text-sm text-gray-400 py-4">No replies yet. Be the first to respond.</p>
        ) : (
          (replies ?? []).map((reply) => (
            <Card
              key={reply.id}
              className={cn(
                'bg-white border-0 shadow-sm rounded-xl p-4',
                reply.is_answer && 'border-2 border-green-200 bg-green-50/30',
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  {reply.is_answer && (
                    <div className="flex items-center gap-1 mb-1">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                      <span className="text-[10px] font-bold tracking-widest uppercase text-green-600">Accepted Answer</span>
                    </div>
                  )}
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{reply.content}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    {reply.author_name ?? 'Unknown'} · {format(new Date(reply.created_at), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
                {isTeacher && !reply.is_answer && !thread.is_resolved && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMarkAnswer(reply.id, reply.author_id)}
                    disabled={markAnswer.isPending}
                    className="text-green-600 hover:text-green-700 shrink-0"
                  >
                    <CheckCircle2 className="h-4 w-4" /> Mark Answer
                  </Button>
                )}
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Reply form */}
      <Card className="bg-white border-0 shadow-md rounded-xl p-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmitReply)} className="space-y-3">
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea placeholder="Write a reply..." rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              disabled={createReply.isPending}
              className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95 transition-transform duration-100"
            >
              {createReply.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Post Reply
            </Button>
          </form>
        </Form>
      </Card>
    </div>
  );
};

export default ThreadDetail;
