// =============================================================================
// TransactionHistoryPage — Unified history with filter tabs and pagination
// =============================================================================

import {
  History,
  ArrowUpRight,
  ArrowDownRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { parseAsString, parseAsInteger, useQueryState } from "nuqs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Shimmer from "@/components/shared/Shimmer";
import XPBalanceBadge from "@/components/shared/XPBalanceBadge";
import { useAuth } from "@/hooks/useAuth";
import {
  useTransactionHistory,
  type TransactionFilter,
  type TransactionEntry,
} from "@/hooks/useTransactionHistory";
import { cn } from "@/lib/utils";

// ─── Filter tabs ─────────────────────────────────────────────────────────────

const FILTERS: Array<{ value: TransactionFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "earnings", label: "Earnings" },
  { value: "spending", label: "Spending" },
];

// ─── Transaction Row ─────────────────────────────────────────────────────────

const TransactionRow = ({ entry }: { entry: TransactionEntry }) => {
  const isEarning = entry.type === "earning";

  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-slate-100 last:border-0">
      <div
        className={cn(
          "p-2 rounded-lg shrink-0",
          isEarning ? "bg-green-50" : "bg-red-50"
        )}
      >
        {isEarning ? (
          <ArrowUpRight className="h-4 w-4 text-green-600" />
        ) : (
          <ArrowDownRight className="h-4 w-4 text-red-500" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {entry.label}
        </p>
        <p className="text-xs text-gray-500">
          {new Date(entry.date).toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>

      <span
        className={cn(
          "text-sm font-bold shrink-0",
          isEarning ? "text-green-600" : "text-red-500"
        )}
      >
        {isEarning ? "+" : "−"}
        {entry.amount.toLocaleString()} XP
      </span>
    </div>
  );
};

// ─── Component ───────────────────────────────────────────────────────────────

const TransactionHistoryPage = () => {
  const { user } = useAuth();
  const userId = user?.id ?? "";

  const [filter, setFilter] = useQueryState(
    "type",
    parseAsString.withDefault("all")
  );
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(0));

  const typedFilter: TransactionFilter =
    filter === "earnings" || filter === "spending" ? filter : "all";

  const { data, isLoading } = useTransactionHistory(userId, typedFilter, page);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <History className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold tracking-tight">
            Transaction History
          </h1>
        </div>
        <XPBalanceBadge size="lg" />
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => {
              setFilter(f.value);
              setPage(0);
            }}
            className={cn(
              "px-4 py-1.5 rounded-xl text-sm font-semibold transition-colors",
              typedFilter === f.value
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-slate-50"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Transaction List */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Shimmer key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : !data || data.entries.length === 0 ? (
        <div className="text-center py-12">
          <History className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No transactions found.</p>
        </div>
      ) : (
        <>
          <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
            {data.entries.map((entry) => (
              <TransactionRow key={entry.id} entry={entry} />
            ))}
          </Card>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Showing {page * 20 + 1}–
              {Math.min((page + 1) * 20, data.totalCount)} of {data.totalCount}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage(Math.max(0, page - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!data.hasMore}
                onClick={() => setPage(page + 1)}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default TransactionHistoryPage;
