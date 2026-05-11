// Task 67.1: Discussion TanStack Query hooks — CRUD for threads and replies
// Requirements: 77
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { logAuditEvent } from "@/lib/auditLogger";
import { awardXP } from "@/lib/xpClient";
import { XP_SCHEDULE } from "@/lib/xpSchedule";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface DiscussionThread {
  id: string;
  course_id: string;
  title: string;
  content: string;
  author_id: string;
  is_pinned: boolean;
  is_resolved: boolean;
  created_at: string;
  updated_at: string;
  author_name?: string;
  reply_count?: number;
}

export interface DiscussionReply {
  id: string;
  thread_id: string;
  content: string;
  author_id: string;
  is_answer: boolean;
  created_at: string;
  updated_at: string;
  author_name?: string;
}

export interface CreateThreadInput {
  course_id: string;
  title: string;
  content: string;
  author_id: string;
}

export interface CreateReplyInput {
  thread_id: string;
  content: string;
  author_id: string;
}

// ─── Cast helpers ───────────────────────────────────────────────────────────

function castThread(row: Record<string, unknown>): DiscussionThread {
  return {
    id: row.id as string,
    course_id: row.course_id as string,
    title: row.title as string,
    content: row.content as string,
    author_id: row.author_id as string,
    is_pinned: (row.is_pinned as boolean) ?? false,
    is_resolved: (row.is_resolved as boolean) ?? false,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    author_name: row.author_name as string | undefined,
    reply_count: row.reply_count as number | undefined,
  };
}

function castReply(row: Record<string, unknown>): DiscussionReply {
  return {
    id: row.id as string,
    thread_id: row.thread_id as string,
    content: row.content as string,
    author_id: row.author_id as string,
    is_answer: (row.is_answer as boolean) ?? false,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    author_name: row.author_name as string | undefined,
  };
}

// ─── Thread Queries ─────────────────────────────────────────────────────────

export const useDiscussionThreads = (courseId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.discussionThreads.list({ courseId }),
    queryFn: async () => {
      if (!courseId) return [];
      const { data, error } = await supabase
        .from("discussion_threads")
        .select(
          "id, course_id, title, content, author_id, is_pinned, is_resolved, created_at, updated_at"
        )
        .eq("course_id", courseId)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) =>
        castThread(r as unknown as Record<string, unknown>)
      );
    },
    enabled: !!courseId,
  });
};

export const useDiscussionThread = (threadId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.discussionThreads.detail(threadId ?? ""),
    queryFn: async () => {
      if (!threadId) return null;
      const { data, error } = await supabase
        .from("discussion_threads")
        .select(
          "id, course_id, title, content, author_id, is_pinned, is_resolved, created_at, updated_at"
        )
        .eq("id", threadId)
        .maybeSingle();
      if (error) throw error;
      return data
        ? castThread(data as unknown as Record<string, unknown>)
        : null;
    },
    enabled: !!threadId,
  });
};

// ─── Reply Queries ──────────────────────────────────────────────────────────

export const useDiscussionReplies = (threadId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.discussionReplies.list({ threadId }),
    queryFn: async () => {
      if (!threadId) return [];
      const { data, error } = await supabase
        .from("discussion_replies")
        .select(
          "id, thread_id, content, author_id, is_answer, created_at, updated_at"
        )
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((r) =>
        castReply(r as unknown as Record<string, unknown>)
      );
    },
    enabled: !!threadId,
  });
};

// ─── Thread Mutations ───────────────────────────────────────────────────────

export const useCreateThread = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateThreadInput) => {
      const { data, error } = await supabase
        .from("discussion_threads")
        .insert({
          course_id: input.course_id,
          title: input.title,
          content: input.content,
          author_id: input.author_id,
        })
        .select()
        .single();
      if (error) throw error;
      return castThread(data as unknown as Record<string, unknown>);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.discussionThreads.list({
          courseId: variables.course_id,
        }),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.discussionThreads.lists(),
      });

      // Task 67.4: Award 10 XP for creating a thread (fire-and-forget)
      // Requirements: 77.4
      awardXP({
        studentId: variables.author_id,
        xpAmount: XP_SCHEDULE.discussion_question,
        source: "discussion_question",
        referenceId: _data.id,
        note: "Created discussion thread",
      }).catch(() => {
        // XP award is fire-and-forget — don't block the main flow
      });
    },
  });
};

export const useCreateReply = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateReplyInput) => {
      const { data, error } = await supabase
        .from("discussion_replies")
        .insert({
          thread_id: input.thread_id,
          content: input.content,
          author_id: input.author_id,
        })
        .select()
        .single();
      if (error) throw error;
      return castReply(data as unknown as Record<string, unknown>);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.discussionReplies.list({
          threadId: variables.thread_id,
        }),
      });
    },
  });
};

// ─── Moderation Mutations ───────────────────────────────────────────────────

export const useTogglePinThread = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      threadId,
      isPinned,
      performedBy,
    }: {
      threadId: string;
      isPinned: boolean;
      performedBy: string;
    }) => {
      const { error } = await supabase
        .from("discussion_threads")
        .update({ is_pinned: isPinned })
        .eq("id", threadId);
      if (error) throw error;
      await logAuditEvent({
        action: isPinned ? "pin" : "unpin",
        entity_type: "discussion_thread",
        entity_id: threadId,
        changes: { is_pinned: isPinned },
        performed_by: performedBy,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.discussionThreads.lists(),
      });
    },
  });
};

export const useMarkAnswer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      replyId,
      threadId,
      performedBy,
    }: {
      replyId: string;
      threadId: string;
      performedBy: string;
      replyAuthorId?: string;
    }) => {
      // Mark the reply as answer
      const { error: replyErr } = await supabase
        .from("discussion_replies")
        .update({ is_answer: true })
        .eq("id", replyId);
      if (replyErr) throw replyErr;
      // Mark thread as resolved
      const { error: threadErr } = await supabase
        .from("discussion_threads")
        .update({ is_resolved: true })
        .eq("id", threadId);
      if (threadErr) throw threadErr;
      await logAuditEvent({
        action: "mark_answer",
        entity_type: "discussion_reply",
        entity_id: replyId,
        changes: { is_answer: true, thread_resolved: true },
        performed_by: performedBy,
      });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.discussionReplies.list({
          threadId: variables.threadId,
        }),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.discussionThreads.lists(),
      });

      // Task 67.4: Award 15 XP to the reply author for correct answer (fire-and-forget)
      // Requirements: 77.5
      if (variables.replyAuthorId) {
        awardXP({
          studentId: variables.replyAuthorId,
          xpAmount: XP_SCHEDULE.discussion_answer,
          source: "discussion_answer",
          referenceId: variables.replyId,
          note: "Answer marked as correct",
        }).catch(() => {
          // XP award is fire-and-forget — don't block the main flow
        });
      }
    },
  });
};

export const useDeleteThread = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      threadId,
      performedBy,
    }: {
      threadId: string;
      performedBy: string;
    }) => {
      const { error } = await supabase
        .from("discussion_threads")
        .delete()
        .eq("id", threadId);
      if (error) throw error;
      await logAuditEvent({
        action: "delete",
        entity_type: "discussion_thread",
        entity_id: threadId,
        changes: null,
        performed_by: performedBy,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.discussionThreads.lists(),
      });
    },
  });
};

export const useDeleteReply = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      replyId: string;
      threadId: string;
      performedBy: string;
    }) => {
      const { error } = await supabase
        .from("discussion_replies")
        .delete()
        .eq("id", input.replyId);
      if (error) throw error;
      await logAuditEvent({
        action: "delete",
        entity_type: "discussion_reply",
        entity_id: input.replyId,
        changes: null,
        performed_by: input.performedBy,
      });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.discussionReplies.list({
          threadId: variables.threadId,
        }),
      });
    },
  });
};
