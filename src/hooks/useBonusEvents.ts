import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { logAuditEvent } from '@/lib/auditLogger';
import { useAuth } from '@/hooks/useAuth';
import type { CreateBonusEventFormData } from '@/lib/schemas/bonusXPEvent';

// Bridge the generated types gap until database.ts is regenerated.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as unknown as { from: (table: string) => any };

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BonusXPEvent {
  id: string;
  title: string;
  multiplier: number;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
}

export interface BonusEventFilters {
  search?: string;
}

// ─── useBonusEvents — list all bonus events ─────────────────────────────────

export const useBonusEvents = (filters: BonusEventFilters = {}) => {
  return useQuery({
    queryKey: queryKeys.bonusXPEvents.list(filters as Record<string, unknown>),
    queryFn: async (): Promise<BonusXPEvent[]> => {
      let query = db
        .from('bonus_xp_events')
        .select('*')
        .order('starts_at', { ascending: false });

      if (filters.search) {
        query = query.ilike('title', `%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as BonusXPEvent[];
    },
    staleTime: 30_000,
  });
};

// ─── useBonusEvent — single event detail ────────────────────────────────────

export const useBonusEvent = (id: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.bonusXPEvents.detail(id ?? ''),
    queryFn: async (): Promise<BonusXPEvent | null> => {
      const { data, error } = await db
        .from('bonus_xp_events')
        .select('*')
        .eq('id', id!)
        .maybeSingle();

      if (error) throw error;
      return data as BonusXPEvent | null;
    },
    enabled: !!id,
    staleTime: 30_000,
  });
};

// ─── useActiveBonusEvent — currently active bonus event ─────────────────────

export const useActiveBonusEvent = () => {
  return useQuery({
    queryKey: queryKeys.bonusXPEvents.list({ active: true }),
    queryFn: async (): Promise<BonusXPEvent | null> => {
      const now = new Date().toISOString();

      const { data, error } = await db
        .from('bonus_xp_events')
        .select('*')
        .eq('is_active', true)
        .lte('starts_at', now)
        .gte('ends_at', now)
        .maybeSingle();

      if (error) throw error;
      return data as BonusXPEvent | null;
    },
    staleTime: 30_000,
  });
};

// ─── useCreateBonusEvent — insert with audit logging ────────────────────────

export const useCreateBonusEvent = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: CreateBonusEventFormData): Promise<BonusXPEvent> => {
      const { data: result, error } = await db
        .from('bonus_xp_events')
        .insert({ ...data, created_by: user?.id })
        .select()
        .single();

      if (error) throw error;

      const event = result as BonusXPEvent;

      await logAuditEvent({
        action: 'create',
        entity_type: 'bonus_xp_event',
        entity_id: event.id,
        changes: data as unknown as Record<string, unknown>,
        performed_by: user?.id ?? 'unknown',
      });

      return event;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bonusXPEvents.lists() });
    },
  });
};

// ─── useUpdateBonusEvent — update with audit logging ────────────────────────

export const useUpdateBonusEvent = (id: string) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: Partial<CreateBonusEventFormData>): Promise<BonusXPEvent> => {
      const { data: result, error } = await db
        .from('bonus_xp_events')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      await logAuditEvent({
        action: 'update',
        entity_type: 'bonus_xp_event',
        entity_id: id,
        changes: data as Record<string, unknown>,
        performed_by: user?.id ?? 'unknown',
      });

      return result as BonusXPEvent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bonusXPEvents.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.bonusXPEvents.detail(id) });
    },
  });
};

// ─── useDeleteBonusEvent — soft delete (set is_active=false) ────────────────

export const useDeleteBonusEvent = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string): Promise<BonusXPEvent> => {
      const { data: result, error } = await db
        .from('bonus_xp_events')
        .update({ is_active: false })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      await logAuditEvent({
        action: 'soft_delete',
        entity_type: 'bonus_xp_event',
        entity_id: id,
        changes: { is_active: false },
        performed_by: user?.id ?? 'unknown',
      });

      return result as BonusXPEvent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.bonusXPEvents.lists() });
    },
  });
};
