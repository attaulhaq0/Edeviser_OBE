// =============================================================================
// TransactionHistoryPage — Unified history with filter tabs and pagination
//
// Pages through all entries via `useTransactionHistory` (source-level
// pagination). On query failure the view surfaces a Sonner toast and an error
// panel, and refuses to render any transactions rather than showing a
// truncated/partial list (Requirements 33.1a, 33.2, 33.3).
// =============================================================================

import { useEffect } from "react";
import {
  History,
  ArrowUpRight,
  ArrowDownRight,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { parseAsString, parseAsInteger, useQueryState } from "nuqs";
import { toast } from "sonner";
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
import { formatLocalDate } from "@/lib/formatDate";
import { cn } from "@/lib/utils";

// ─── Constants ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;
const FILTER_VALUES: TransactionFilter[] = ["all", "earnings", "spending"];

// ─── Transaction Row ─────────────────────────────────────────────────────────

const TransactionRow = ({ entry }: { entry: TransactionEntry }) => {
  const { t } = useTranslation("gamification");
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
          {formatLocalDate(entry.date, "PPp")}
        </p>
      </div>

      <span
        className={cn(
          "text-sm font-bold shrink-0",
          isEarning ? "text-green-600" : "text-red-500"
        )}
      >
        {isEarning ? "+" : "−"}
        {entry.amount.toLocaleString()} {t("transactions.unit")}
      </span>
    </div>
  );
};

// ─── Component ───────────────────────────────────────────────────────────────

const TransactionHistoryPage = () => {
  const { t } = useTranslation("gamification");
  const { user } = useAuth();
  const userId = user?.id ?? "";

  const [filter, setFilter] = useQueryState(
    "type",
    parseAsString.withDefault("all")
  );
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(0));

  const typedFilter: TransactionFilter =
    filter === "earnings" || filter === "spending" ? filter : "all";

  const { data, isLoading, isError } = useTransactionHistory(
    userId,
    typedFilter,
    page
  );

  // Surface the failure once per error transition. The view refuses to show any
  // transactions in this state (no truncated/partial list) — R33.1a.
  useEffect(() => {
    if (isError) {
      toast.error(t("transactions.error.toast"));
    }
  }, [isError, t]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <History className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold tracking-tight">
            {t("transactions.title")}
          </h1>
        </div>
        <XPBalanceBadge size="lg" />
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {FILTER_VALUES.map((value) => (
          <button
            key={value}
            onClick={() => {
              setFilter(value);
              setPage(0);
            }}
            className={cn(
              "px-4 py-1.5 rounded-xl text-sm font-semibold transition-colors",
              typedFilter === value
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-slate-50"
            )}
          >
            {t(`transactions.filters.${value}`)}
          </button>
        ))}
      </div>

      {/* Transaction List */}
      {isError ? (
        // Failure: refuse to display transactions, show an error panel (R33.1a).
        <div
          role="alert"
          className="flex flex-col items-center justify-center py-12 text-center"
        >
          <AlertTriangle className="h-12 w-12 text-red-400 mb-3" />
          <p className="text-sm font-semibold text-gray-900">
            {t("transactions.error.title")}
          </p>
          <p className="text-sm text-gray-500 mt-1 max-w-sm">
            {t("transactions.error.body")}
          </p>
        </div>
      ) : isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Shimmer key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : !data || data.entries.length === 0 ? (
        <div className="text-center py-12">
          <History className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">{t("transactions.empty")}</p>
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
              {t("transactions.showing", {
                from: page * PAGE_SIZE + 1,
                to: Math.min((page + 1) * PAGE_SIZE, data.totalCount),
                total: data.totalCount,
              })}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage(Math.max(0, page - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
                {t("transactions.previous")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!data.hasMore}
                onClick={() => setPage(page + 1)}
              >
                {t("transactions.next")}
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
