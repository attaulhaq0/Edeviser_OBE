// =============================================================================
// XPHistoryNew — redesigned XP transaction history (P3, spec task 3.1)
// =============================================================================
//
// Analytics/list-archetype view gated behind `newUiModules` (see the wrapper in
// XPHistory.tsx). REUSES the existing `useXPHistory` + `useXPCategorySummary`
// hooks (read-only over append-only xp_transactions, no new queries/writes) and
// the exact nuqs `period` filter + back-navigation. Recomposed from the P0
// primitives (KPICard, SectionHeader, `.card-elevated`) with a total/tx KPI row.
//
// Strings are preserved verbatim from the legacy page (which is English-only /
// not i18n-wired) — this is a presentation-only re-skin, so it neither adds nor
// regresses i18n coverage. Flag-off keeps the legacy page byte-identical.
// =============================================================================

import { parseAsStringLiteral, useQueryState } from "nuqs";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { ArrowLeft, Coins, Layers, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";

import {
  Badge,
  Button,
  KPICard,
  PCard,
  SectionHeader,
  Shimmer,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/design-system";
import { useAuth } from "@/hooks/useAuth";
import {
  useXPHistory,
  useXPCategorySummary,
  type XPFilterPeriod,
  type XPTransactionDisplay,
  type XPCategorySummary,
} from "@/hooks/useXPHistory";

const PERIOD_OPTIONS: { value: XPFilterPeriod; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "this_week", label: "This Week" },
  { value: "this_month", label: "This Month" },
  { value: "all_time", label: "All Time" },
];

const PERIOD_VALUES = PERIOD_OPTIONS.map((o) => o.value) as [
  XPFilterPeriod,
  ...XPFilterPeriod[]
];

const TransactionRow = ({
  tx,
  index,
}: {
  tx: XPTransactionDisplay;
  index: number;
}) => {
  const isPositive = tx.xp_amount >= 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.03 }}
      className="flex items-center justify-between border-b border-slate-100 py-3 last:border-0"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900">
          {tx.source_label}
        </p>
        {tx.reference_description && (
          <p className="truncate text-xs text-gray-500">
            {tx.reference_description}
          </p>
        )}
        <p className="mt-0.5 text-xs text-gray-400">
          {format(new Date(tx.created_at), "MMM d, yyyy · h:mm a")}
        </p>
      </div>
      <span
        className={`ms-4 shrink-0 text-sm font-bold tabular-nums ${
          isPositive ? "text-amber-600" : "text-red-500"
        }`}
      >
        {isPositive ? "+" : ""}
        {tx.xp_amount} XP
      </span>
    </motion.div>
  );
};

const CategoryBars = ({
  categories,
  runningTotal,
}: {
  categories: XPCategorySummary[];
  runningTotal: number;
}) => {
  if (categories.length === 0) {
    return (
      <p className="py-2 text-center text-sm text-gray-400">
        No transactions in this period.
      </p>
    );
  }
  return (
    <div className="space-y-3">
      {categories.map((cat) => {
        const pct =
          runningTotal > 0
            ? Math.round((cat.total_xp / runningTotal) * 100)
            : 0;
        return (
          <div key={cat.source} className="min-w-0">
            <div className="mb-1 flex items-center justify-between">
              <span className="truncate text-sm font-medium text-gray-700">
                {cat.source_label}
              </span>
              <span className="ms-2 shrink-0 text-xs text-gray-500">
                {cat.total_xp.toLocaleString()} XP · {cat.count}×
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-amber-500 transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

const XPHistoryNew = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const studentId = user?.id;

  const [period, setPeriod] = useQueryState(
    "period",
    parseAsStringLiteral(PERIOD_VALUES).withDefault("all_time")
  );

  const { data: transactions, isLoading: txLoading } = useXPHistory(
    studentId,
    period
  );
  const { data: summary, isLoading: summaryLoading } = useXPCategorySummary(
    studentId,
    period
  );

  const isLoading = txLoading || summaryLoading;
  const runningTotal = summary?.runningTotal ?? 0;
  const categories = summary?.categories ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/student/dashboard")}
          className="shrink-0"
        >
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
        </Button>
        <div className="flex items-center gap-2">
          <Coins className="h-6 w-6 text-amber-500" />
          <h1 className="text-2xl font-bold tracking-tight">XP History</h1>
        </div>
      </div>

      {/* Period filter */}
      <Tabs
        value={period}
        onValueChange={(v) => setPeriod(v as XPFilterPeriod)}
      >
        <TabsList className="gap-2 rounded-xl">
          {PERIOD_OPTIONS.map((opt) => (
            <TabsTrigger
              key={opt.value}
              value={opt.value}
              className="rounded-xl text-sm"
            >
              {opt.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Shimmer key={i} className="h-24 rounded-xl" />
            ))}
          </div>
          <Shimmer className="h-64 rounded-xl" />
        </div>
      ) : (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <KPICard
              icon={Coins}
              label="Total XP"
              value={runningTotal.toLocaleString()}
              iconBgClass="bg-amber-50"
              iconColorClass="text-amber-500"
              valueClassName="text-amber-600"
            />
            <KPICard
              icon={TrendingUp}
              label="Transactions"
              value={transactions?.length ?? 0}
            />
            <KPICard icon={Layers} label="Sources" value={categories.length} />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Summary sidebar */}
            <div className="order-1 lg:order-2 lg:col-span-1">
              <PCard className="overflow-hidden">
                <div className="p-6">
                  <SectionHeader icon={TrendingUp} title="Summary" />
                  <div className="mt-4">
                    <CategoryBars
                      categories={categories}
                      runningTotal={runningTotal}
                    />
                  </div>
                </div>
              </PCard>
            </div>

            {/* Transactions list */}
            <div className="order-2 lg:order-1 lg:col-span-2">
              <PCard className="overflow-hidden">
                <div className="p-6">
                  <SectionHeader
                    icon={Coins}
                    title="Transactions"
                    action={
                      transactions ? (
                        <Badge variant="secondary" className="text-xs">
                          {transactions.length}
                        </Badge>
                      ) : undefined
                    }
                  />
                  <div className="mt-4">
                    {!transactions || transactions.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="mb-3 rounded-full bg-amber-50 p-3">
                          <Coins className="h-8 w-8 text-amber-500" />
                        </div>
                        <p className="text-sm text-gray-500">
                          No XP transactions for this period. Keep learning to
                          earn XP!
                        </p>
                      </div>
                    ) : (
                      <div>
                        {transactions.map((tx, i) => (
                          <TransactionRow key={tx.id} tx={tx} index={i} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </PCard>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default XPHistoryNew;
