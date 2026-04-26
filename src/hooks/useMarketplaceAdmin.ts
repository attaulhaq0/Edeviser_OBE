import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import type { CreateMarketplaceItemInput, UpdateMarketplaceItemInput } from '@/lib/marketplaceSchemas';

export const useAdminMarketplaceItems = () => {
  return useQuery({
    queryKey: [...queryKeys.marketplace.all, 'admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketplace_items')
        .select('*')
        .order('category')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
};

export const useCreateMarketplaceItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateMarketplaceItemInput & { institution_id: string }) => {
      const { data, error } = await supabase
        .from('marketplace_items')
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.marketplace.all });
    },
  });
};

export const useUpdateMarketplaceItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateMarketplaceItemInput & { id: string }) => {
      const { data, error } = await supabase
        .from('marketplace_items')
        .update(input)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.marketplace.all });
    },
  });
};

export const useToggleMarketplaceItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('marketplace_items')
        .update({ is_active: isActive })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.marketplace.all });
    },
  });
};
