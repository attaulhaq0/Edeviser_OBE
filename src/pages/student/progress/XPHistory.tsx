// =============================================================================
// XPHistory — XP Transaction History page
// Requirements: 45.1, 45.2, 45.4
// =============================================================================

import { parseAsStringLiteral, useQueryState } from "nuqs";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { Coins, TrendingUp, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Shimmer from "@/components/shared/Shimmer";
import { useAuth } from "@/hooks/useAuth";
import {
  useXPHistory,
  useXPCategorySummary,
  type XPFilterPeriod,
  type XPTransactionDisplay,
  type XPCategorySummary,
} from "@/hooks/useXPHistory";

// ─── Constants ───────────────────────────────────────────────────────────────

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

// ─── Transaction Row ─────────────────────────────────────────────────────────

interface TransactionRowProps {
  tx: XPTransactionDisplay;
  index: number;
}

const TransactionRow = ({ tx, index }: TransactionRowProps) => {
  const isPositive = tx.xp_amount >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.03 }}
      className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0"
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{tx.source_label}</p>
        {tx.reference_description && (
          <p className="text-xs text-gray-500 truncate">
            {tx.reference_description}
          </p>
        )}
        <p className="text-xs text-gray-400 mt-0.5">
          {format(new Date(tx.created_at), "MMM d, yyyy · h:mm a")}
        </p>
      </div>
      <span
        className={`text-sm font-bold tabular-nums shrink-0 ms-4 ${
          isPositive ? "text-amber-600" : "text-red-500"
        }`}
      >
        {isPositive ? "+" : ""}
        {tx.xp_amount} XP
      </span>
    </motion.div>
  );
};

// ─── Category Summary Card ───────────────────────────────────────────────────

interface CategorySummaryProps {
  categories: XPCategorySummary[];
  runningTotal: number;
}

const CategorySummary = ({
  categories,
  runningTotal,
}: CategorySummaryProps) => (
  <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
    <div
      className="px-6 py-4 flex items-center justify-between"
      style={{
        background: "linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)",
      }}
    >
      <div className="flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-white" />
        <h2 className="text-lg font-bold tracking-tight text-white">Summary</h2>
      </div>
      <div className="text-end">
        <p className="text-2xl font-black text-white">
          {runningTotal.toLocaleString()} XP
        </p>
        <p className="text-[10px] font-black tracking-widest uppercase text-white/60">
          Total
        </p>
      </div>
    </div>
    <div className="p-6">
      {categories.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-2">
          No transactions in this period.
        </p>
      ) : (
        <div className="space-y-3">
          {categories.map((cat) => {
            const pct =
              runningTotal > 0
                ? Math.round((cat.total_xp / runningTotal) * 100)
                : 0;
            return (
              <div key={cat.source} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium truncate">
                      {cat.source_label}
                    </span>
                    <span className="text-xs text-gray-500 shrink-0 ms-2">
                      {cat.total_xp.toLocaleString()} XP · {cat.count}×
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  </Card>
);

// ─── Main Component ──────────────────────────────────────────────────────────

const XPHistory = () => {
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
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          <Coins className="h-6 w-6 text-amber-500" />
          <h1 className="text-2xl font-bold tracking-tight">XP History</h1>
        </div>
      </div>

      {/* Period Filter Tabs */}
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
          <Shimmer className="h-48 rounded-xl" />
          <Shimmer className="h-64 rounded-xl" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Category Summary — sidebar on large screens */}
          <div className="lg:col-span-1 order-1 lg:order-2">
            <CategorySummary
              categories={summary?.categories ?? []}
              runningTotal={summary?.runningTotal ?? 0}
            />
          </div>

          {/* Transaction List */}
          <div className="lg:col-span-2 order-2 lg:order-1">
            <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
              <div
                className="px-6 py-4 flex items-center gap-2"
                style={{
                  background:
                    "linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)",
                }}
              >
                <Coins className="h-5 w-5 text-white" />
                <h2 className="text-lg font-bold tracking-tight text-white">
                  Transactions
                </h2>
                {transactions && (
                  <Badge className="ml-auto bg-white/20 text-white border-0 text-xs">
                    {transactions.length}
                  </Badge>
                )}
              </div>
              <div className="p-6">
                {!transactions || transactions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="p-3 rounded-full bg-amber-50 mb-3">
                      <Coins className="h-8 w-8 text-amber-500" />
                    </div>
                    <p className="text-sm text-gray-500">
                      No XP transactions for this period. Keep learning to earn
                      XP!
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
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default XPHistory;
