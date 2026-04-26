import { BarChart3, Users, Coins, ShoppingCart, TrendingUp, Download } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useMarketplaceAnalytics } from '@/hooks/useMarketplaceAnalytics';

const KPICard = ({ icon: Icon, label, value }: { icon: typeof Coins; label: string; value: string | number }) => (
  <Card className="bg-white border-0 shadow-md rounded-xl p-4 group">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">{label}</p>
        <p className="text-2xl font-black mt-1">{value}</p>
      </div>
      <div className="p-2 rounded-lg bg-blue-50 group-hover:scale-110 transition-transform">
        <Icon className="h-5 w-5 text-blue-600" />
      </div>
    </div>
  </Card>
);

const MarketplaceAnalyticsPage = () => {
  const { data: analytics, isLoading } = useMarketplaceAnalytics();

  const handleExport = () => {
    if (!analytics) return;
    const rows = [
      ['Metric', 'Value'],
      ['Total XP Spent', String(analytics.totalXPSpent)],
      ['Total Purchases', String(analytics.totalPurchases)],
      ['Unique Buyers', String(analytics.uniqueBuyers)],
      ['Avg XP per Student', String(analytics.avgXPPerStudent)],
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'marketplace-analytics.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 rounded-lg animate-shimmer" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Card key={i} className="h-24 rounded-xl animate-shimmer" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold tracking-tight">Marketplace Analytics</h1>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="h-4 w-4 me-1" /> Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard icon={Coins} label="Total XP Spent" value={(analytics?.totalXPSpent ?? 0).toLocaleString()} />
        <KPICard icon={ShoppingCart} label="Total Purchases" value={analytics?.totalPurchases ?? 0} />
        <KPICard icon={Users} label="Unique Buyers" value={analytics?.uniqueBuyers ?? 0} />
        <KPICard icon={TrendingUp} label="Avg XP / Student" value={analytics?.avgXPPerStudent ?? 0} />
      </div>

      {/* Popular Items */}
      <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
        <div className="px-6 py-4 flex items-center gap-2" style={{ background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)' }}>
          <TrendingUp className="h-5 w-5 text-white" />
          <h2 className="text-lg font-bold tracking-tight text-white">Most Popular Items</h2>
        </div>
        <div className="p-6">
          {(analytics?.popularItems ?? []).length === 0 ? (
            <p className="text-sm text-gray-500">No purchase data yet.</p>
          ) : (
            <div className="space-y-3">
              {(analytics?.popularItems ?? []).map((item, i) => (
                <div key={item.item_id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-400 w-6">{i + 1}.</span>
                    <span className="text-sm font-medium">{item.name}</span>
                  </div>
                  <span className="text-sm font-bold text-blue-600">{item.count} purchases</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Category Breakdown */}
      <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
        <div className="px-6 py-4 flex items-center gap-2" style={{ background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)' }}>
          <BarChart3 className="h-5 w-5 text-white" />
          <h2 className="text-lg font-bold tracking-tight text-white">Category Breakdown</h2>
        </div>
        <div className="p-6">
          {(analytics?.categoryBreakdown ?? []).length === 0 ? (
            <p className="text-sm text-gray-500">No data yet.</p>
          ) : (
            <div className="space-y-3">
              {(analytics?.categoryBreakdown ?? []).map((cat) => (
                <div key={cat.category} className="flex items-center justify-between">
                  <span className="text-sm font-medium capitalize">{cat.category.replace('_', ' ')}</span>
                  <div className="text-sm text-gray-500">
                    {cat.purchases} purchases · {cat.xp_spent.toLocaleString()} XP
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default MarketplaceAnalyticsPage;
