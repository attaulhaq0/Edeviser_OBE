// Task 67.2: Discussion Thread List page
// Requirements: 77.6
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, MessageSquare, Search } from "lucide-react";
import { parseAsString, useQueryState } from "nuqs";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import DiscussionThreadCard from "@/components/shared/DiscussionThreadCard";
import { useDiscussionThreads, useCreateThread } from "@/hooks/useDiscussions";
import { useAuth } from "@/hooks/useAuth";
import {
  createThreadSchema,
  type CreateThreadFormData,
} from "@/lib/schemas/discussion";
import { format } from "date-fns";

const DiscussionForum = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [search] = useQueryState("q", parseAsString.withDefault(""));
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: threads, isLoading } = useDiscussionThreads(courseId);
  const createThread = useCreateThread();

  const form = useForm<CreateThreadFormData>({
    resolver: zodResolver(createThreadSchema),
    defaultValues: { course_id: courseId ?? "", title: "", content: "" },
  });

  const filtered = (threads ?? []).filter(
    (t) =>
      !search ||
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.content.toLowerCase().includes(search.toLowerCase())
  );

  const onSubmit = (data: CreateThreadFormData) => {
    if (!user?.id) return;
    createThread.mutate(
      { ...data, course_id: courseId ?? "", author_id: user.id },
      {
        onSuccess: () => {
          toast.success("Thread created");
          setDialogOpen(false);
          form.reset({ course_id: courseId ?? "", title: "", content: "" });
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Discussion Forum</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95 transition-transform duration-100">
              <Plus className="h-4 w-4" /> New Thread
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Discussion Thread</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Thread title..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Content</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="What would you like to discuss?"
                          rows={4}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  disabled={createThread.isPending}
                  className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95 transition-transform duration-100"
                >
                  {createThread.isPending ? "Creating..." : "Create Thread"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search threads..."
          className="ps-9"
          value={search}
          readOnly
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl animate-shimmer" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="bg-white border-0 shadow-md rounded-xl p-8 text-center">
          <MessageSquare className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">
            No discussion threads yet. Start a conversation!
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((thread) => (
            <DiscussionThreadCard
              key={thread.id}
              title={thread.title}
              authorName={thread.author_name ?? "Unknown"}
              createdAt={format(new Date(thread.created_at), "MMM d, yyyy")}
              replyCount={thread.reply_count ?? 0}
              isPinned={thread.is_pinned}
              isResolved={thread.is_resolved}
              onClick={() =>
                navigate(
                  `/student/courses/${courseId}/discussions/${thread.id}`
                )
              }
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default DiscussionForum;
