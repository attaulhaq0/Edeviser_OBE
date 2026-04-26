import { useState } from 'react';
import { History, ArrowUpRight, ArrowDownRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useTransactionHistory, type TransactionFilter } from '@/hooks/useTransactionHistory';
import XPBalanceBadge from '@/components/shared/XPBalanceBadge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const FILTERS: { key: TransactionFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'earnings', label: 'Earnings' },
  { key: 'spending', label: 'Spending' },
];

const TransactionHistoryPage = () => {
  const { user } = useAuth();
  const studentId = user?.id ?? '';
  const [filter, setFilter] = useState<TransactionFilter>('all');
  const [page, setPage] = useState(0);

  const { data: entries, isLoading } = useTransactionHistory(studentId, filter, page);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <History className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold tracking-tight">Transaction History</h1>
        </div>
        <XPBalanceBadge studentId={studentId} />
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => { setFilter(key); setPage(0); }}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-xl border transition-all',
              filter === key
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Transaction List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="h-16 rounded-xl animate-shimmer" />
          ))}
        </div>
      ) : (entries ?? []).length === 0 ? (
        <Card className="bg-white border-0 shadow-md rounded-xl p-12 text-center">
          <History className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No transactions yet.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {(entries ?? []).map((entry) => (
            <Card key={entry.id} className="bg-white border-0 shadow-md rounded-xl px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {entry.type === 'earning' ? (
                    <div className="p-1.5 rounded-lg bg-green-50">
                      <ArrowUpRight className="h-4 w-4 text-green-600" />
                    </div>
                  ) : (
                    <div className="p-1.5 rounded-lg bg-red-50">
                      <ArrowDownRight className="h-4 w-4 text-red-500" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium">{entry.source}</p>
                    <p className="text-xs text-gray-400">{format(new Date(entry.date), 'MMM d, yyyy h:mm a')}</p>
                  </div>
                </div>
                <span className={cn(
                  'text-sm font-bold',
                  entry.type === 'earning' ? 'text-green-600' : 'text-red-500',
                )}>
                  {entry.type === 'earning' ? '+' : ''}{entry.amount} XP
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm text-gray-500">Page {page + 1}</span>
        <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={(entries ?? []).length < 20}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default TransactionHistoryPage;
