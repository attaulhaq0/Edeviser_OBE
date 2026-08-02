import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import type { FeePayment } from "@/hooks/useFees";

export const useAdminFeePayments = () => {
  return useQuery({
    queryKey: queryKeys.feePayments.lists(),
    queryFn: async (): Promise<FeePayment[]> => {
      const { data, error } = await supabase
        .from("fee_payments")
        .select("*")
        .order("payment_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as FeePayment[];
    },
  });
};
