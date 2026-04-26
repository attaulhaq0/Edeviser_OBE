import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';

export type TransactionFilter = 'all' | 'earnings' | 'spending';

export interface TransactionEntry {
  id: string;
  date: string;
  amount: number;
  type: 'earning' | 'spending';
  source: string;
  category?: string;
}

const PAGE_SIZE = 20;

export const useTransactionHistory = (studentId: string, filter: TransactionFilter = 'all', page: number = 0) => {
  return useQuery({
    queryKey: queryKeys.marketplace.transactions(filter, page),
    queryFn: async () => {
      const entries: TransactionEntry[] = [];

      if (filter === 'all' || filter === 'earnings') {
        const { data: earnings, error: eErr } = await supabase
          .from('xp_transactions')
          .select('id, xp_amount, source, created_at')
          .eq('student_id', studentId)
          .order('created_at', { ascending: false })
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
        if (eErr) throw eErr;
        for (const e of earnings ?? []) {
          entries.push({
            id: e.id,
            date: e.created_at,
            amount: e.xp_amount,
            type: 'earning',
            source: e.source,
          });
        }
      }

      if (filter === 'all' || filter === 'spending') {
        const { data: spending, error: sErr } = await supabase
          .from('xp_purchases')
          .select('id, xp_cost, purchased_at, marketplace_items(name, category)')
          .eq('student_id', studentId)
          .neq('status', 'refunded')
          .order('purchased_at', { ascending: false })
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
        if (sErr) throw sErr;
        for (const s of spending ?? []) {
          const item = s.marketplace_items as unknown as { name: string; category: string } | null;
          entries.push({
            id: s.id,
            date: s.purchased_at,
            amount: -s.xp_cost,
            type: 'spending',
            source: item?.name ?? 'Purchase',
            category: item?.category,
          });
        }
      }

      entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return entries.slice(0, PAGE_SIZE);
    },
    enabled: !!studentId,
  });
};
