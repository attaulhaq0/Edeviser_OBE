// =============================================================================
// usePurchase — TanStack Query mutation for marketplace purchases
// =============================================================================

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PurchaseResponse {
  success: boolean;
  purchase_id: string;
  xp_cost: number;
  new_balance: number;
  item_category: string;
  item_sub_category: string;
  error?: string;
  error_code?: string;
}

// ─── Error messages ──────────────────────────────────────────────────────────

const ERROR_MESSAGES: Record<string, string> = {
  INSUFFICIENT_BALANCE: 'Not enough XP to purchase this item.',
  LEVEL_REQUIREMENT: 'You need a higher level to purchase this item.',
  OUT_OF_STOCK: 'This item is out of stock.',
  ALREADY_OWNED: 'You already own this item.',
  ITEM_INACTIVE: 'This item is no longer available.',
  SALE_EXPIRED: 'The sale has ended. Please review the updated price.',
  MAX_INVENTORY: 'You have reached the maximum inventory for this item.',
};

// ─── usePurchaseItem — POST to process-purchase Edge Function ────────────────

export const usePurchaseItem = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (itemId: string): Promise<PurchaseResponse> => {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (!accessToken) throw new Error('Not authenticated');

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? 'http://localhost:54321';
      const response = await fetch(`${supabaseUrl}/functions/v1/process-purchase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ item_id: itemId }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        const errorCode = result.error_code ?? 'UNKNOWN';
        const errorMessage = ERROR_MESSAGES[errorCode] ?? result.error ?? 'Purchase failed. Please try again.';
        throw new Error(errorMessage);
      }

      return result as PurchaseResponse;
    },
    onSuccess: () => {
      // Invalidate balance, inventory, and items queries
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.marketplace.balance(user.id) });
        queryClient.invalidateQueries({ queryKey: queryKeys.marketplace.inventory(user.id) });
        queryClient.invalidateQueries({ queryKey: queryKeys.marketplace.boosts(user.id) });
        queryClient.invalidateQueries({ queryKey: queryKeys.marketplace.equipped(user.id) });
      }
      queryClient.invalidateQueries({ queryKey: ['marketplace', 'items'] });
      queryClient.invalidateQueries({ queryKey: ['marketplace', 'transactions'] });
      toast.success('Purchase successful!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
};
