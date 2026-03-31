import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { logAuditEvent } from '@/lib/auditLogger';
import { useAuth } from '@/hooks/useAuth';

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
    queryKey: ['academicCalendarEvents'],
    queryFn: async (): Promise<AcademicCalendarEvent[]> => {
      const { data, error } = await supabase
        .from('academic_calendar_events')
        .select('*')
        .order('start_date', { ascending: true });
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const insertPayload: any = {
        ...input,
        end_date: input.end_date || input.start_date,
        institution_id: user?.user_metadata?.institution_id,
      };
      const { data, error } = await supabase
        .from('academic_calendar_events')
        .insert(insertPayload)
        .select()
        .single();
      if (error) throw error;
      await logAuditEvent({ action: 'create', entity_type: 'academic_calendar_event', entity_id: data.id, changes: input as unknown as Record<string, unknown>, performed_by: user?.id ?? '' });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['academicCalendarEvents'] }),
  });
};

export const useDeleteAcademicEvent = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('academic_calendar_events').delete().eq('id', id);
      if (error) throw error;
      await logAuditEvent({ action: 'delete', entity_type: 'academic_calendar_event', entity_id: id, changes: {}, performed_by: user?.id ?? '' });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['academicCalendarEvents'] }),
  });
};
