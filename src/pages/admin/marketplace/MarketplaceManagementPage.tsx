import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  AdminSectionHeader,
  AdminStatCard,
  AdminStatusPill,
  adminCardClass,
  adminPageClass,
  adminTableClass,
} from "@/design-system";
import { useAdminKnowledgeQuests } from "@/hooks/useKnowledgeQuestAdmin";
import {
  useAdminMarketplaceItems,
  useToggleMarketplaceItem,
  type AdminMarketplaceItem,
} from "@/hooks/useMarketplaceAdmin";
import { useMarketplaceAnalytics } from "@/hooks/useMarketplaceAnalytics";
import { useSaleEvents } from "@/hooks/useSaleEvents";
import { useBonusEvents } from "@/hooks/useBonusEvents";
import { useEarnSpendRatio, useXPVelocity } from "@/hooks/useXPEconomist";
import { useDynamicPrices } from "@/hooks/useDynamicPricing";
import ItemForm from "@/pages/admin/marketplace/ItemForm";

type MarketplaceTab = "items" | "sales" | "bonus" | "quests" | "economy";

const categoryLabels: Record<string, string> = {
  cosmetic: "Cosmetic",
  educational_perk: "Educational Perk",
  power_up: "Power-up",
};

const statusTone = (status: string) => {
  if (status === "active") return "green" as const;
  if (status === "scheduled") return "blue" as const;
  return "slate" as const;
};

const MarketplaceManagementPage = () => {
  const navigate = useNavigate();
  const itemsQuery = useAdminMarketplaceItems();
  const analyticsQuery = useMarketplaceAnalytics();
  const salesQuery = useSaleEvents();
  const bonusQuery = useBonusEvents();
  const questsQuery = useAdminKnowledgeQuests();
  const ratioQuery = useEarnSpendRatio();
  const velocityQuery = useXPVelocity(undefined, 8);
  const dynamicPricesQuery = useDynamicPrices();
  const toggleItem = useToggleMarketplaceItem();
  const [tab, setTab] = useState<MarketplaceTab>("items");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<AdminMarketplaceItem | null>(
    null
  );

  const items = useMemo(() => itemsQuery.data ?? [], [itemsQuery.data]);
  const activeItems = items.filter((item) => item.is_active);
  const topItem = useMemo(
    () => [...items].sort((a, b) => b.total_purchases - a.total_purchases)[0],
    [items]
  );
  const visibleItems = useMemo(
    () =>
      items.filter((item) =>
        item.name.toLowerCase().includes(search.toLowerCase())
      ),
    [items, search]
  );

  if (showForm) {
    return (
      <ItemForm
        item={editingItem}
        onClose={() => {
          setShowForm(false);
          setEditingItem(null);
        }}
      />
    );
  }

  const tabs: Array<{ id: MarketplaceTab; label: string; emoji: string }> = [
    { id: "items", label: "Items", emoji: "🛍️" },
    { id: "sales", label: "Sale events", emoji: "🏷️" },
    { id: "bonus", label: "Bonus XP", emoji: "⚡" },
    { id: "quests", label: "Quests", emoji: "⚔️" },
    { id: "economy", label: "Economy health", emoji: "📊" },
  ];

  return (
    <div className={adminPageClass}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-900">
            Marketplace Items
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Manage the shop, sales, bonus XP events and quests — and keep the XP
            economy healthy.
          </p>
        </div>
        <Button
          type="button"
          variant="tactile"
          size="sm"
          onClick={() => {
            setEditingItem(null);
            setShowForm(true);
          }}
        >
          <Plus className="size-4" /> Add Item
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <AdminStatCard
          label="XP in circulation"
          value={ratioQuery.data?.totalEarned?.toLocaleString() ?? "—"}
        />
        <AdminStatCard
          label="Items sold"
          value={analyticsQuery.data?.totalPurchases.toLocaleString() ?? "—"}
        />
        <AdminStatCard
          label="XP sink rate"
          value={
            ratioQuery.data && ratioQuery.data.totalEarned > 0
              ? `${Math.round(
                  (ratioQuery.data.totalSpent / ratioQuery.data.totalEarned) *
                    100
                )}%`
              : "—"
          }
          tone="teal"
        />
        <AdminStatCard
          label="Top item"
          value={topItem ? `${topItem.name} · ${topItem.total_purchases}` : "—"}
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((item) => (
          <Button
            key={item.id}
            type="button"
            variant={tab === item.id ? "tactile" : "outline"}
            size="sm"
            className="shrink-0 rounded-xl"
            onClick={() => setTab(item.id)}
          >
            {item.emoji} {item.label}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search items..."
          className="max-w-sm bg-white"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => navigate("/admin/marketplace/sales")}
        >
          Sale Events
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => navigate("/admin/marketplace/analytics")}
        >
          Analytics
        </Button>
      </div>

      {tab === "items" ? (
        <div className={`${adminCardClass} overflow-hidden p-4`}>
          <div className="overflow-x-auto">
            <table className={adminTableClass}>
              <thead>
                <tr className="border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <th className="px-2 py-2 text-start">Item</th>
                  <th className="px-2 py-2 text-start">Category</th>
                  <th className="px-2 py-2 text-start">Price</th>
                  <th className="px-2 py-2 text-start">Level</th>
                  <th className="px-2 py-2 text-start">Stock</th>
                  <th className="px-2 py-2 text-start">Sold</th>
                  <th className="px-2 py-2 text-start">State</th>
                  <th className="px-2 py-2 text-end"> </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70">
                    <td className="px-2 py-3 font-bold text-slate-900">
                      <span className="me-1.5">
                        {item.icon_identifier || "💎"}
                      </span>
                      {item.name}
                    </td>
                    <td className="px-2 py-3 text-slate-500">
                      <AdminStatusPill tone="blue">
                        {categoryLabels[item.category] ?? item.category}
                      </AdminStatusPill>
                      <span className="ms-1.5">{item.sub_category}</span>
                    </td>
                    <td className="px-2 py-3 font-bold text-sky-700">
                      💎 {item.xp_price.toLocaleString()}
                    </td>
                    <td className="px-2 py-3 text-slate-500">
                      {item.level_requirement}
                    </td>
                    <td className="px-2 py-3 text-slate-500">
                      {item.stock_type === "limited"
                        ? item.stock_quantity ?? 0
                        : "Unlimited"}
                    </td>
                    <td className="px-2 py-3 text-slate-500">
                      {item.total_purchases}
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex items-center gap-2">
                        <AdminStatusPill
                          tone={item.is_active ? "green" : "slate"}
                        >
                          {item.is_active ? "Active" : "Inactive"}
                        </AdminStatusPill>
                        <Switch
                          checked={item.is_active}
                          onCheckedChange={(checked) =>
                            toggleItem.mutate({
                              itemId: item.id,
                              isActive: checked,
                            })
                          }
                          aria-label={`Toggle ${item.name}`}
                        />
                      </div>
                    </td>
                    <td className="px-2 py-3 text-end">
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-xs font-bold text-blue-600"
                        onClick={() => {
                          setEditingItem(item);
                          setShowForm(true);
                        }}
                      >
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!itemsQuery.isLoading && visibleItems.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-500">
                No marketplace items yet.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {tab === "sales" ? (
        <div className={`${adminCardClass} p-4`}>
          <AdminSectionHeader
            emoji="🏷️"
            title="Sale events"
            action={
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs font-bold"
                onClick={() => navigate("/admin/marketplace/sales")}
              >
                Manage sales →
              </Button>
            }
          />
          <div className="mt-3 divide-y divide-slate-100">
            {(salesQuery.data ?? []).map((event) => (
              <div key={event.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-900">
                    {event.name} · −{event.discount_percentage}%
                  </p>
                  <p className="text-xs text-slate-500">
                    {event.item_ids.length} items ·{" "}
                    {event.start_date.slice(0, 10)} –{" "}
                    {event.end_date.slice(0, 10)}
                  </p>
                </div>
                <AdminStatusPill tone={statusTone(event.status)}>
                  {event.status}
                </AdminStatusPill>
              </div>
            ))}
            {!salesQuery.isLoading && (salesQuery.data ?? []).length === 0 ? (
              <p className="py-8 text-sm text-slate-500">No sale events yet.</p>
            ) : null}
          </div>
        </div>
      ) : null}

      {tab === "bonus" ? (
        <div className={`${adminCardClass} p-4`}>
          <AdminSectionHeader
            emoji="⚡"
            title="Bonus XP events"
            action={
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs font-bold"
                onClick={() => navigate("/admin/bonus-events")}
              >
                Manage events →
              </Button>
            }
          />
          <div className="mt-3 divide-y divide-slate-100">
            {(bonusQuery.data ?? []).map((event) => (
              <div key={event.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-900">
                    {event.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    ×{event.xp_multiplier} multiplier · {event.bonus_xp} bonus
                    XP
                  </p>
                </div>
                <AdminStatusPill tone={event.is_active ? "green" : "slate"}>
                  {event.is_active ? "Active" : "Inactive"}
                </AdminStatusPill>
              </div>
            ))}
            {!bonusQuery.isLoading && (bonusQuery.data ?? []).length === 0 ? (
              <p className="py-8 text-sm text-slate-500">
                No bonus events yet.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {tab === "quests" ? (
        <div className={`${adminCardClass} p-4`}>
          <AdminSectionHeader
            emoji="⚔️"
            title="Knowledge quests"
            action={
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs font-bold"
                onClick={() => navigate("/admin/marketplace/quests")}
              >
                Manage quests →
              </Button>
            }
          />
          <div className="mt-3 divide-y divide-slate-100">
            {(questsQuery.data ?? []).map((quest) => (
              <div key={quest.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-900">
                    {quest.title}
                  </p>
                  <p className="text-xs text-slate-500">
                    {quest.quest_type} · reward {quest.reward_xp_amount ?? 0} XP
                  </p>
                </div>
                <AdminStatusPill
                  tone={
                    new Date(quest.end_date) > new Date() ? "green" : "slate"
                  }
                >
                  {new Date(quest.end_date) > new Date() ? "Active" : "Ended"}
                </AdminStatusPill>
              </div>
            ))}
            {!questsQuery.isLoading && (questsQuery.data ?? []).length === 0 ? (
              <p className="py-8 text-sm text-slate-500">
                No knowledge quests yet.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {tab === "economy" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className={`${adminCardClass} p-4`}>
            <AdminSectionHeader emoji="📊" title="Earned vs. spent · 8 weeks" />
            <div className="mt-4 flex h-28 items-end gap-2 border-b border-slate-100">
              {velocityQuery.data?.map((point) => {
                const max = Math.max(
                  ...(velocityQuery.data ?? []).map((entry) => entry.earned),
                  1
                );
                return (
                  <div
                    key={point.week}
                    className="flex flex-1 flex-col items-center gap-1"
                  >
                    <div
                      className="w-full rounded-t bg-emerald-400"
                      style={{
                        height: `${Math.max(
                          8,
                          Math.round((point.earned / max) * 100)
                        )}%`,
                      }}
                    />
                    <span className="text-[9px] text-slate-400">
                      {point.week.slice(5)}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="mt-2 text-[11px] text-slate-400">
              Live XP transaction velocity. Earn/spend ratio{" "}
              {ratioQuery.data?.ratio ?? "—"}.
            </p>
          </div>
          <div className={`${adminCardClass} p-4`}>
            <AdminSectionHeader emoji="🩺" title="Economy signals" />
            <div className="mt-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-700">Inflation risk</span>
                <AdminStatusPill
                  tone={
                    ratioQuery.data?.status === "healthy" ? "green" : "amber"
                  }
                >
                  {ratioQuery.data?.status ?? "Loading"}
                </AdminStatusPill>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-700">
                  Active item catalog
                </span>
                <span className="text-sm font-bold text-slate-900">
                  {activeItems.length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-700">
                  Dynamic price entries
                </span>
                <span className="text-sm font-bold text-slate-900">
                  {dynamicPricesQuery.data?.length ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-700">Top item</span>
                <span className="text-sm font-bold text-slate-900">
                  {topItem?.name ?? "—"}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default MarketplaceManagementPage;
