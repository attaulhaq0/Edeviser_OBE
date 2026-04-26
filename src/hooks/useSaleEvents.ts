import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import type { CreateSaleEventInput } from '@/lib/marketplaceSchemas';

export const useSaleEvents = () => {
  return useQuery({
    queryKey: queryKeys.marketplace.saleEvents(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sale_events')
        .select('*, sale_event_items(item_id)')
        .order('start_date', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
};

export const useCreateSaleEvent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateSaleEventInput & { institution_id: string; created_by: string }) => {
      const { item_ids, ...eventData } = input;
      const { data: event, error: eErr } = await supabase
        .from('sale_events')
        .insert(eventData)
        .select()
        .single();
      if (eErr) throw eErr;

      const junctionRows = item_ids.map((item_id) => ({ sale_event_id: event.id, item_id }));
      const { error: jErr } = await supabase.from('sale_event_items').insert(junctionRows);
      if (jErr) throw jErr;

      return event;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.marketplace.saleEvents() });
      queryClient.invalidateQueries({ queryKey: queryKeys.marketplace.all });
    },
  });
};

export const useCancelSaleEvent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase
        .from('sale_events')
        .update({ end_date: new Date().toISOString() })
        .eq('id', eventId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.marketplace.saleEvents() });
      queryClient.invalidateQueries({ queryKey: queryKeys.marketplace.all });
    },
  });
};
