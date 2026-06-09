import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { logAuditEvent } from "@/lib/auditLogger";
import { awardPerfectDayIfComplete } from "@/lib/perfectDay";
import { useAuth } from "@/hooks/useAuth";
import type { Database } from "@/types/database";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface JournalEntry {
  id: string;
  student_id: string;
  course_id: string;
  content: string;
  clo_id: string | null;
  is_shared: boolean;
  created_at: string;
}

// ─── Filter types ───────────────────────────────────────────────────────────

export interface JournalEntryFilters {
  courseId?: string;
}

// ─── Mutation input types ───────────────────────────────────────────────────

export interface CreateJournalEntryInput {
  course_id: string;
  content: string;
  clo_id?: string;
  is_shared?: boolean;
}

export interface UpdateJournalEntryInput {
  id: string;
  content?: string;
  is_shared?: boolean;
  clo_id?: string;
}

// ─── useJournalEntries — list entries for the current student ───────────────

export const useJournalEntries = (filters: JournalEntryFilters = {}) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.journal.list(filters as Record<string, unknown>),
    queryFn: async (): Promise<JournalEntry[]> => {
      if (!user) throw new Error("Not authenticated");

      let query = supabase
        .from("journal_entries")
        .select(
          "id, student_id, course_id, content, clo_id, is_shared, created_at"
        )
        .eq("student_id", user.id)
        .order("created_at", { ascending: false });

      if (filters.courseId) {
        query = query.eq("course_id", filters.courseId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as JournalEntry[];
    },
    enabled: !!user,
  });
};

// ─── useJournalEntry — single entry by id ───────────────────────────────────

export const useJournalEntry = (id?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.journal.detail(id ?? ""),
    queryFn: async (): Promise<JournalEntry | null> => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("journal_entries")
        .select(
          "id, student_id, course_id, content, clo_id, is_shared, created_at"
        )
        .eq("id", id!)
        .eq("student_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data as JournalEntry | null;
    },
    enabled: !!id && !!user,
  });
};

// ─── useCreateJournalEntry — insert a new journal entry ─────────────────────

export const useCreateJournalEntry = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (
      input: CreateJournalEntryInput
    ): Promise<JournalEntry> => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("journal_entries")
        .insert({
          student_id: user.id,
          course_id: input.course_id,
          content: input.content,
          clo_id: input.clo_id ?? null,
          is_shared: input.is_shared ?? false,
        })
        .select()
        .single();

      if (error) throw error;

      const entry = data as unknown as JournalEntry;

      await logAuditEvent({
        action: "create",
        entity_type: "journal_entry",
        entity_id: entry.id,
        changes: {
          course_id: input.course_id,
          clo_id: input.clo_id ?? null,
        } as Record<string, unknown>,
        performed_by: user.id,
      });

      // Record the canonical 'journal' academic habit for today (UTC) and, if
      // this completes all 4 daily habits, award the idempotent Perfect Day.
      // Fire-and-forget: a habit-write failure must never break the entry save.
      try {
        const today = new Date().toISOString().split("T")[0] as string;
        await supabase.from("habit_logs").upsert(
          {
            student_id: user.id,
            habit_type: "journal",
            date: today,
            completed_at: new Date().toISOString(),
          },
          { onConflict: "student_id,habit_type,date" }
        );
        await awardPerfectDayIfComplete(user.id);
      } catch {
        console.error("[useCreateJournalEntry] journal habit write failed");
      }

      // Journal XP: a substantive entry (≥50 words, computed client-side) grants
      // the advertised +20 XP. The server enforces the canonical 20 amount and a
      // daily idempotent reference, so a student cannot farm XP by re-saving.
      // Fire-and-forget: an XP/badge failure must never break the entry save.
      const wordCount = input.content
        .trim()
        .split(/\s+/)
        .filter((word) => word.length > 0).length;

      if (wordCount >= 50) {
        try {
          await supabase.functions.invoke("award-xp", {
            body: {
              student_id: user.id,
              source: "journal",
              xp_amount: 20,
            },
          });
          await supabase.functions.invoke("check-badges", {
            body: {
              student_id: user.id,
              trigger: "journal",
            },
          });
        } catch {
          console.error("[useCreateJournalEntry] journal XP award failed");
        }
      }

      return entry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.journal.lists() });
    },
  });
};

// ─── useUpdateJournalEntry — update an existing journal entry ───────────────

export const useUpdateJournalEntry = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (
      input: UpdateJournalEntryInput
    ): Promise<JournalEntry> => {
      if (!user) throw new Error("Not authenticated");

      const updates: Database["public"]["Tables"]["journal_entries"]["Update"] =
        {};

      if (input.content !== undefined) {
        updates.content = input.content;
      }

      if (input.is_shared !== undefined) {
        updates.is_shared = input.is_shared;
      }

      if (input.clo_id !== undefined) {
        updates.clo_id = input.clo_id;
      }

      const { data, error } = await supabase
        .from("journal_entries")
        .update(updates)
        .eq("id", input.id)
        .eq("student_id", user.id)
        .select()
        .single();

      if (error) throw error;

      const entry = data as unknown as JournalEntry;

      await logAuditEvent({
        action: "update",
        entity_type: "journal_entry",
        entity_id: entry.id,
        changes: updates,
        performed_by: user.id,
      });

      return entry;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.journal.lists() });
      queryClient.invalidateQueries({
        queryKey: queryKeys.journal.detail(variables.id),
      });
    },
  });
};

// ─── useDeleteJournalEntry — delete a journal entry ─────────────────────────

export const useDeleteJournalEntry = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("journal_entries")
        .delete()
        .eq("id", id)
        .eq("student_id", user.id);

      if (error) throw error;

      await logAuditEvent({
        action: "delete",
        entity_type: "journal_entry",
        entity_id: id,
        changes: null,
        performed_by: user.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.journal.lists() });
    },
  });
};
