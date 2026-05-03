// =============================================================================
// useMarketplaceAdmin — Admin CRUD for marketplace items
// =============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { CreateMarketplaceItemInput, UpdateMarketplaceItemInput } from '@/lib/marketplaceSchemas';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AdminMarketplaceItem {
  id: string;
  name: string;
  description: string;
  category: string;
  sub_category: string;
  xp_price: number;
  level_requirement: number;
  stock_type: string;
  stock_quantity: number | null;
  icon_identifier: string;
  metadata: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  total_purchases: number;
}

// ─── useAdminMarketplaceItems — list all items (including inactive) ──────────

export const useAdminMarketplaceItems = () => {
  const { institutionId } = useAuth();

  return useQuery({
    queryKey: [...queryKeys.marketplace.all, 'admin', 'items'],
    queryFn: async (): Promise<AdminMarketplaceItem[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: items, error } = await (supabase as any)
        .from('marketplace_items')
        .select('id, name, description, category, sub_category, xp_price, level_requirement, stock_type, stock_quantity, icon_identifier, metadata, is_active, created_at, updated_at')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch purchase counts per item
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: purchaseCounts, error: countError } = await (supabase as any)
        .from('xp_purchases')
        .select('item_id');

      const countMap = new Map<string, number>();
      if (!countError && purchaseCounts) {
        for (const row of purchaseCounts as Array<{ item_id: string }>) {
          countMap.set(row.item_id, (countMap.get(row.item_id) ?? 0) + 1);
        }
      }

      return ((items ?? []) as Array<Record<string, unknown>>).map((item) => ({
        id: item.id as string,
        name: item.name as string,
        description: item.description as string,
        category: item.category as string,
        sub_category: item.sub_category as string,
        xp_price: item.xp_price as number,
        level_requirement: item.level_requirement as number,
        stock_type: item.stock_type as string,
        stock_quantity: item.stock_quantity as number | null,
        icon_identifier: item.icon_identifier as string,
        metadata: (item.metadata ?? {}) as Record<string, unknown>,
        is_active: item.is_active as boolean,
        created_at: item.created_at as string,
        updated_at: item.updated_at as string,
        total_purchases: countMap.get(item.id as string) ?? 0,
      }));
    },
    enabled: !!institutionId,
    staleTime: 30_000,
  });
};

// ─── useCreateMarketplaceItem ────────────────────────────────────────────────

export const useCreateMarketplaceItem = () => {
  const queryClient = useQueryClient();
  const { institutionId } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateMarketplaceItemInput): Promise<void> => {
      if (!institutionId) throw new Error('No institution context');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('marketplace_items')
        .insert({
          ...input,
          institution_id: institutionId,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.marketplace.all });
      toast.success('Marketplace item created');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create item');
    },
  });
};

// ─── useUpdateMarketplaceItem ────────────────────────────────────────────────

export const useUpdateMarketplaceItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: {
      itemId: string;
      data: UpdateMarketplaceItemInput;
    }): Promise<void> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('marketplace_items')
        .update({ ...variables.data, updated_at: new Date().toISOString() })
        .eq('id', variables.itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.marketplace.all });
      toast.success('Marketplace item updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update item');
    },
  });
};

// ─── useToggleMarketplaceItem — activate/deactivate ──────────────────────────

export const useToggleMarketplaceItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (variables: {
      itemId: string;
      isActive: boolean;
    }): Promise<void> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('marketplace_items')
        .update({ is_active: variables.isActive, updated_at: new Date().toISOString() })
        .eq('id', variables.itemId);

      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.marketplace.all });
      toast.success(variables.isActive ? 'Item activated' : 'Item deactivated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to toggle item status');
    },
  });
};
