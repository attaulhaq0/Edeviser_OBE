import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { logAuditEvent } from "@/lib/auditLogger";
import { useAuth } from "@/hooks/useAuth";

export interface AcademicCalendarEvent {
  id: string;
  institution_id: string;
  title: string;
  event_type: string;
  start_date: string;
  end_date: string | null;
  is_recurring: boolean;
  created_at: string;
}

export interface CreateAcademicEventInput {
  title: string;
  event_type: string;
  start_date: string;
  end_date?: string;
  is_recurring?: boolean;
}

export const useAcademicCalendarEvents = () => {
  return useQuery({
    queryKey: queryKeys.academicCalendarEvents.all,
    queryFn: async (): Promise<AcademicCalendarEvent[]> => {
      const { data, error } = await supabase
        .from("academic_calendar_events")
        .select("*")
        .order("start_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as AcademicCalendarEvent[];
    },
  });
};

export const useCreateAcademicEvent = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: CreateAcademicEventInput) => {
      const institutionId = user?.user_metadata?.institution_id;
      if (!institutionId || typeof institutionId !== "string") {
        throw new Error(
          "Missing institution_id — cannot create calendar event"
        );
      }
      const insertPayload = {
        title: input.title,
        event_type: input.event_type,
        start_date: input.start_date,
        end_date: input.end_date || input.start_date,
        is_recurring: input.is_recurring,
        institution_id: institutionId,
      };
      const { data, error } = await supabase
        .from("academic_calendar_events")
        .insert(insertPayload)
        .select()
        .single();
      if (error) throw error;
      await logAuditEvent({
        action: "create",
        entity_type: "academic_calendar_event",
        entity_id: data.id,
        changes: input as unknown as Record<string, unknown>,
        performed_by: user?.id ?? "",
      });
      return data;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.academicCalendarEvents.all }),
  });
};

export const useDeleteAcademicEvent = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("academic_calendar_events")
        .delete()
        .eq("id", id);
      if (error) throw error;
      await logAuditEvent({
        action: "delete",
        entity_type: "academic_calendar_event",
        entity_id: id,
        changes: {},
        performed_by: user?.id ?? "",
      });
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.academicCalendarEvents.all }),
  });
};
