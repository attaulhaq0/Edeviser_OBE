// =============================================================================
// useSessionReflections — Save session & weekly reflections with XP awards
// =============================================================================

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { useAuth } from "@/hooks/useAuth";
import { countWords } from "@/lib/plannerUtils";
import { toast } from "sonner";
import type { SessionReflection } from "@/types/planner";
import type {
  SessionReflectionInput,
  WeeklyReflectionInput,
} from "@/lib/schemas/planner";

// ─── Row → Domain Mapper ────────────────────────────────────────────────────

function mapReflection(row: Record<string, unknown>): SessionReflection {
  return {
    id: row.id as string,
    sessionId: row.session_id as string,
    studentId: row.student_id as string,
    content: row.content as string,
    wordCount: row.word_count as number,
    createdAt: (row.created_at as string) ?? "",
  };
}

// ─── useSessionReflectionList — fetch reflections for a session ──────────────

export const useSessionReflectionList = (sessionId: string | undefined) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.journal.list({
      sessionId: sessionId ?? "",
      type: "session_reflection",
    }),
    enabled: !!sessionId && !!user,
    queryFn: async (): Promise<SessionReflection[]> => {
      if (!sessionId || !user) return [];

      const { data, error } = await supabase
        .from("session_reflections")
        .select("id, session_id, student_id, content, word_count, created_at")
        .eq("session_id", sessionId)
        .eq("student_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []).map((row) =>
        mapReflection(row as Record<string, unknown>)
      );
    },
  });
};

// ─── useSaveSessionReflection — save reflection with word count + XP ─────────

export const useSaveSessionReflection = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (
      input: SessionReflectionInput
    ): Promise<{ reflection: SessionReflection; xpAwarded: number }> => {
      if (!user) throw new Error("Not authenticated");

      const wordCount = countWords(input.content);

      // Validate minimum word count (schema already validates, but double-check)
      if (wordCount < 30) {
        throw new Error("Reflection must be at least 30 words");
      }

      // Insert reflection record
      const { data, error } = await supabase
        .from("session_reflections")
        .insert({
          session_id: input.sessionId,
          student_id: user.id,
          content: input.content,
          word_count: wordCount,
        } as never)
        .select()
        .single();

      if (error) throw error;

      const reflection = mapReflection(data as Record<string, unknown>);

      // Award XP via award-xp Edge Function with source 'session_reflection'
      let xpAwarded = 0;
      try {
        const { data: xpResult } = await supabase.functions.invoke("award-xp", {
          body: {
            student_id: user.id,
            xp_amount: 10,
            source: "session_reflection",
            reference_id: reflection.id,
          },
        });
        xpAwarded =
          ((xpResult as Record<string, unknown>)?.xp_awarded as number) ?? 0;
      } catch {
        console.error("[useSaveSessionReflection] award-xp invocation failed");
      }

      return { reflection, xpAwarded };
    },
    onSuccess: ({ xpAwarded }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.journal.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.studySessions.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.studentGamification.lists(),
      });

      if (xpAwarded > 0) {
        toast.success(`Reflection saved! +${xpAwarded} XP`);
      } else {
        toast.success("Reflection saved!");
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to save reflection: ${error.message}`);
    },
  });
};

// ─── useSaveWeeklyReflection — save weekly reflection as journal entry ───────

export const useSaveWeeklyReflection = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (
      input: WeeklyReflectionInput
    ): Promise<{ journalEntryId: string; xpAwarded: number }> => {
      if (!user) throw new Error("Not authenticated");

      const wordCount = countWords(input.content);

      // Validate minimum word count
      if (wordCount < 50) {
        throw new Error("Weekly reflection must be at least 50 words");
      }

      // Get the student's first enrolled course for the journal entry
      // (weekly reflections need a course_id for the journal_entries table)
      const { data: enrollments } = await supabase
        .from("student_courses")
        .select("course_id")
        .eq("student_id", user.id)
        .limit(1);

      const courseId = (enrollments?.[0] as Record<string, unknown> | undefined)
        ?.course_id as string | undefined;

      if (!courseId) {
        throw new Error("No enrolled courses found for journal entry");
      }

      // Create journal_entries record (triggers standard journal XP of 20)
      const { data, error } = await supabase
        .from("journal_entries")
        .insert({
          student_id: user.id,
          course_id: courseId,
          content: `# Weekly Reflection — Week of ${input.weekStartDate}\n\n${input.content}`,
          is_shared: false,
        })
        .select()
        .single();

      if (error) throw error;

      const journalEntryId = (data as Record<string, unknown>).id as string;

      // Award journal XP (20 XP for journal entry)
      let xpAwarded = 0;
      try {
        const { data: xpResult } = await supabase.functions.invoke("award-xp", {
          body: {
            student_id: user.id,
            xp_amount: 20,
            source: "journal",
            reference_id: journalEntryId,
          },
        });
        xpAwarded =
          ((xpResult as Record<string, unknown>)?.xp_awarded as number) ?? 0;
      } catch {
        console.error("[useSaveWeeklyReflection] award-xp invocation failed");
      }

      return { journalEntryId, xpAwarded };
    },
    onSuccess: ({ xpAwarded }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.journal.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.studentGamification.lists(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.habitLogs.lists(),
      });

      if (xpAwarded > 0) {
        toast.success(`Weekly reflection saved! +${xpAwarded} XP`);
      } else {
        toast.success("Weekly reflection saved!");
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to save reflection: ${error.message}`);
    },
  });
};
