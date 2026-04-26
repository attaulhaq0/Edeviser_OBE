import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';

interface PurchaseResponse {
  success: boolean;
  purchase_id: string;
  xp_cost: number;
  new_balance: number;
  item_category: string;
  item_sub_category: string;
  error_code?: string;
  detail?: Record<string, unknown>;
}

export const usePurchaseItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemId: string): Promise<PurchaseResponse> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-purchase`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ item_id: itemId }),
        },
      );

      const result = await response.json();
      if (!response.ok || !result.success) {
        const err = new Error(result.error_code ?? result.error ?? 'Purchase failed');
        (err as Error & { code?: string }).code = result.error_code;
        throw err;
      }
      return result as PurchaseResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.marketplace.all });
    },
  });
};
