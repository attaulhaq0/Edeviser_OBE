// Task 67.5: Discussion Moderation page for Teachers
// Requirements: 77.3
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Pin, PinOff, Trash2, CheckCircle2, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import {
  useDiscussionThreads,
  useTogglePinThread,
  useDeleteThread,
} from "@/hooks/useDiscussions";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const DiscussionModeration = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    data: threadsPages,
    isLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useDiscussionThreads(courseId);
  const togglePin = useTogglePinThread();
  const deleteThread = useDeleteThread();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const threads = threadsPages?.pages.flatMap((p) => p.threads) ?? [];

  const handlePin = (threadId: string, currentlyPinned: boolean) => {
    if (!user?.id) return;
    togglePin.mutate(
      { threadId, isPinned: !currentlyPinned, performedBy: user.id },
      {
        onSuccess: () =>
          toast.success(currentlyPinned ? "Thread unpinned" : "Thread pinned"),
        onError: (err) => toast.error(err.message),
      }
    );
  };

  const handleDelete = (threadId: string) => {
    if (!user?.id) return;
    deleteThread.mutate(
      { threadId, performedBy: user.id },
      {
        onSuccess: () => {
          toast.success("Thread deleted");
          setDeleteTarget(null);
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">
          Discussion Moderation
        </h1>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl animate-shimmer" />
          ))}
        </div>
      ) : threads.length === 0 ? (
        <Card className="bg-white border-0 shadow-md rounded-xl p-8 text-center">
          <MessageSquare className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">
            No discussion threads in this course.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {threads.map((thread) => (
            <Card
              key={thread.id}
              className={cn(
                "bg-white border-0 shadow-sm rounded-xl p-4",
                thread.is_pinned && "border border-blue-200 bg-blue-50/30"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  role="button"
                  tabIndex={0}
                  onClick={() =>
                    navigate(
                      `/teacher/courses/${courseId}/discussions/${thread.id}`
                    )
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter")
                      navigate(
                        `/teacher/courses/${courseId}/discussions/${thread.id}`
                      );
                  }}
                >
                  <div className="flex items-center gap-2">
                    {thread.is_pinned && (
                      <Pin className="h-3 w-3 text-blue-500 shrink-0" />
                    )}
                    <h3 className="text-sm font-bold truncate">
                      {thread.title}
                    </h3>
                    {thread.is_resolved && (
                      <span className="flex items-center gap-0.5 text-[10px] font-bold tracking-widest uppercase text-green-600 bg-green-50 px-1.5 py-0.5 rounded shrink-0">
                        <CheckCircle2 className="h-3 w-3" /> Resolved
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {format(new Date(thread.created_at), "MMM d, yyyy")} ·{" "}
                    {thread.reply_count ?? 0} replies
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePin(thread.id, thread.is_pinned)}
                    disabled={togglePin.isPending}
                    aria-label={
                      thread.is_pinned ? "Unpin thread" : "Pin thread"
                    }
                  >
                    {thread.is_pinned ? (
                      <PinOff className="h-4 w-4" />
                    ) : (
                      <Pin className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteTarget(thread.id)}
                    className="text-red-500 hover:text-red-600"
                    aria-label="Delete thread"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
          {hasNextPage && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? "Loading..." : "Load more"}
              </Button>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete Thread"
        description="This will permanently delete this thread and all its replies. This action cannot be undone."
        variant="destructive"
        isPending={deleteThread.isPending}
        onConfirm={() => {
          if (deleteTarget) handleDelete(deleteTarget);
        }}
      />
    </div>
  );
};

export default DiscussionModeration;
