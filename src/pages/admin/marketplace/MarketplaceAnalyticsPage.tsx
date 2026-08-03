// =============================================================================
// MarketplaceAnalyticsPage — KPI cards, popular items, XP circulation, category breakdown
// =============================================================================

import { useNavigate } from "react-router-dom";
import { useMarketplaceAnalytics } from "@/hooks/useMarketplaceAnalytics";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  KPICard,
  PageHeader,
  SectionCard,
  Shimmer,
  StatePanel,
} from "@/design-system";
import { InlineNoData } from "@/components/shared/EmptyState";
import {
  ArrowLeft,
  Coins,
  ShoppingCart,
  Users,
  TrendingUp,
  BarChart3,
  Download,
} from "lucide-react";
import { exportPurchaseHistoryCSV } from "@/pages/admin/marketplace/csvExport";

// ─── Category Colors ─────────────────────────────────────────────────────────

const categoryColors: Record<string, string> = {
  cosmetic: "bg-purple-50 text-purple-700 border-purple-200",
  educational_perk: "bg-green-50 text-green-700 border-green-200",
  power_up: "bg-amber-50 text-amber-700 border-amber-200",
};

const categoryLabels: Record<string, string> = {
  cosmetic: "Cosmetic",
  educational_perk: "Educational Perk",
  power_up: "Power-up",
};

// ─── Main Component ──────────────────────────────────────────────────────────

const MarketplaceAnalyticsPage = () => {
  const navigate = useNavigate();
  const { data: analytics, isLoading, isError } = useMarketplaceAnalytics();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Shimmer key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Shimmer className="h-64 rounded-xl" />
      </div>
    );
  }

  if (isError || !analytics) {
    return (
      <div className="space-y-4">
        <PageHeader title="Marketplace Analytics" />
        <StatePanel
          variant="error"
          message="Could not load marketplace analytics."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/admin/marketplace")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <BarChart3 className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold tracking-tight">
            Marketplace Analytics
          </h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => exportPurchaseHistoryCSV()}
        >
          <Download className="h-4 w-4 me-1" /> Export CSV
        </Button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          icon={Coins}
          label="Total XP Spent"
          value={analytics.totalXPSpent.toLocaleString()}
        />
        <KPICard
          icon={ShoppingCart}
          label="Total Purchases"
          value={analytics.totalPurchases.toLocaleString()}
        />
        <KPICard
          icon={Users}
          label="Unique Buyers"
          value={analytics.uniqueBuyers.toLocaleString()}
        />
        <KPICard
          icon={TrendingUp}
          label="Avg XP / Student"
          value={analytics.avgXPPerStudent.toLocaleString()}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Popular Items */}
        <SectionCard icon={ShoppingCart} title="Most Popular Items">
          {analytics.popularItems.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              No purchases yet.
            </p>
          ) : (
            <div className="space-y-3">
              {analytics.popularItems.map((item, idx) => (
                <div
                  key={item.item_id}
                  className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-400 w-6">
                      #{idx + 1}
                    </span>
                    <span className="text-sm font-medium">
                      {item.item_name}
                    </span>
                  </div>
                  <Badge className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                    {item.purchase_count} purchases
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Category Breakdown */}
        <SectionCard icon={BarChart3} title="Category Breakdown">
          {analytics.categoryBreakdown.length === 0 ? (
            <InlineNoData />
          ) : (
            <div className="space-y-4">
              {analytics.categoryBreakdown.map((cat) => {
                const maxPurchases = Math.max(
                  ...analytics.categoryBreakdown.map((c) => c.total_purchases),
                  1
                );
                const widthPercent = Math.round(
                  (cat.total_purchases / maxPurchases) * 100
                );

                return (
                  <div key={cat.category} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Badge
                        className={`text-xs ${
                          categoryColors[cat.category] ?? ""
                        }`}
                      >
                        {categoryLabels[cat.category] ?? cat.category}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {cat.total_purchases} purchases ·{" "}
                        {cat.total_xp_spent.toLocaleString()} XP
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-500 transition-all duration-300"
                        style={{ width: `${widthPercent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
};

export default MarketplaceAnalyticsPage;
