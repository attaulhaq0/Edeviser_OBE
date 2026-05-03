// =============================================================================
// useSaleEvents — Admin sale event CRUD
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { CreateSaleEventInput } from '@/lib/marketplaceSchemas';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SaleEvent {
  id: string;
  name: string;
  discount_percentage: number;
  start_date: string;
  end_date: string;
  created_by: string;
  created_at: string;
  status: 'active' | 'scheduled' | 'expired';
  item_ids: string[];
}

// ─── useSaleEvents — list all sale events ────────────────────────────────────

export const useSaleEvents = () => {
  return useQuery({
    queryKey: queryKeys.marketplace.saleEvents(),
    queryFn: async (): Promise<SaleEvent[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: events, error } = await (supabase as any)
        .from('sale_events')
        .select('id, name, discount_percentage, start_date, end_date, created_by, created_at')
        .order('start_date', { ascending: false });

      if (error) throw error;

      // Fetch item associations
      const eventIds = ((events ?? []) as Array<Record<string, unknown>>).map((e) => e.id as string);
      const itemMap = new Map<string, string[]>();

      if (eventIds.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: junctionData, error: junctionError } = await (supabase as any)
          .from('sale_event_items')
          .select('sale_event_id, item_id')
          .in('sale_event_id', eventIds);

        if (!junctionError && junctionData) {
          for (const row of junctionData as Array<{ sale_event_id: string; item_id: string }>) {
            const existing = itemMap.get(row.sale_event_id) ?? [];
            existing.push(row.item_id);
            itemMap.set(row.sale_event_id, existing);
          }
        }
      }

      const now = new Date();

      return ((events ?? []) as Array<Record<string, unknown>>).map((event) => {
        const start = new Date(event.start_date as string);
        const end = new Date(event.end_date as string);
        let status: 'active' | 'scheduled' | 'expired';
        if (now >= start && now < end) {
          status = 'active';
        } else if (now < start) {
          status = 'scheduled';
        } else {
          status = 'expired';
        }

        return {
          id: event.id as string,
          name: event.name as string,
          discount_percentage: event.discount_percentage as number,
          start_date: event.start_date as string,
          end_date: event.end_date as string,
          created_by: event.created_by as string,
          created_at: event.created_at as string,
          status,
          item_ids: itemMap.get(event.id as string) ?? [],
        };
      });
    },
    staleTime: 30_000,
  });
};

// ─── useCreateSaleEvent ──────────────────────────────────────────────────────

export const useCreateSaleEvent = () => {
  const queryClient = useQueryClient();
  const { user, institutionId } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateSaleEventInput): Promise<void> => {
      if (!user || !institutionId) throw new Error('Not authenticated');

      const { item_ids, ...eventData } = input;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: event, error: eventError } = await (supabase as any)
        .from('sale_events')
        .insert({
          ...eventData,
          institution_id: institutionId,
          created_by: user.id,
        })
        .select('id')
        .single();

      if (eventError) throw eventError;

      // Insert junction records
      const junctionRows = item_ids.map((itemId) => ({
        sale_event_id: event.id,
        item_id: itemId,
      }));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: junctionError } = await (supabase as any)
        .from('sale_event_items')
        .insert(junctionRows);

      if (junctionError) throw junctionError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.marketplace.saleEvents() });
      queryClient.invalidateQueries({ queryKey: ['marketplace', 'items'] });
      toast.success('Sale event created');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create sale event');
    },
  });
};

// ─── useCancelSaleEvent ──────────────────────────────────────────────────────

export const useCancelSaleEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventId: string): Promise<void> => {
      // Set end_date to now to effectively cancel the sale
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('sale_events')
        .update({ end_date: new Date().toISOString() })
        .eq('id', eventId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.marketplace.saleEvents() });
      queryClient.invalidateQueries({ queryKey: ['marketplace', 'items'] });
      toast.success('Sale event cancelled');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to cancel sale event');
    },
  });
};
