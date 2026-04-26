import { TrendingUp, TrendingDown, Activity, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import GradientCardHeader from '@/components/shared/GradientCardHeader';
import { useAuth } from '@/hooks/useAuth';
import { useEarnSpendRatio, useXPVelocity, useEarnSpendTimeSeries } from '@/hooks/useXPEconomist';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { InflationStatus } from '@/lib/earnSpendRatioCalculator';

const STATUS_CONFIG: Record<InflationStatus, { label: string; color: string; bg: string; icon: typeof CheckCircle }> = {
  healthy: { label: 'Healthy', color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle },
  inflationary: { label: 'Inflationary', color: 'text-amber-600', bg: 'bg-amber-50', icon: AlertTriangle },
  deflationary: { label: 'Deflationary', color: 'text-red-600', bg: 'bg-red-50', icon: TrendingDown },
};

const XPEconomistDashboard = () => {
  const { institutionId } = useAuth();
  const { data: ratioData, isLoading: ratioLoading } = useEarnSpendRatio(institutionId ?? undefined);
  const { data: velocityData, isLoading: velocityLoading } = useXPVelocity(institutionId ?? undefined);
  const { data: timeSeries, isLoading: tsLoading } = useEarnSpendTimeSeries(institutionId ?? undefined, 12);

  const statusCfg = ratioData ? STATUS_CONFIG[ratioData.status] : STATUS_CONFIG.healthy;
  const StatusIcon = statusCfg.icon;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Activity className="h-6 w-6 text-blue-600" />
        <h1 className="text-2xl font-bold tracking-tight">XP Economist</h1>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white border-0 shadow-md rounded-xl p-4 group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">Earn / Spend Ratio</p>
              <p className="text-2xl font-black mt-1">
                {ratioLoading ? '—' : `${ratioData?.ratio ?? 0}:1`}
              </p>
            </div>
            <div className="p-2 rounded-lg bg-blue-50 group-hover:scale-110 transition-transform">
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="bg-white border-0 shadow-md rounded-xl p-4 group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">XP Velocity</p>
              <p className="text-2xl font-black mt-1">
                {velocityLoading ? '—' : `${velocityData?.avgWeeklyEarning ?? 0}/wk`}
              </p>
            </div>
            <div className="p-2 rounded-lg bg-teal-50 group-hover:scale-110 transition-transform">
              <Activity className="h-5 w-5 text-teal-600" />
            </div>
          </div>
        </Card>

        <Card className="bg-white border-0 shadow-md rounded-xl p-4 group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">Net Flow / Week</p>
              <p className="text-2xl font-black mt-1">
                {velocityLoading ? '—' : (
                  <span className={velocityData && velocityData.netWeeklyFlow >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {velocityData && velocityData.netWeeklyFlow >= 0 ? '+' : ''}{velocityData?.netWeeklyFlow ?? 0}
                  </span>
                )}
              </p>
            </div>
            <div className="p-2 rounded-lg bg-amber-50 group-hover:scale-110 transition-transform">
              <TrendingDown className="h-5 w-5 text-amber-600" />
            </div>
          </div>
        </Card>

        <Card className="bg-white border-0 shadow-md rounded-xl p-4 group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">Inflation Status</p>
              <p className={`text-lg font-black mt-1 ${statusCfg.color}`}>
                {ratioLoading ? '—' : statusCfg.label}
              </p>
            </div>
            <div className={`p-2 rounded-lg ${statusCfg.bg} group-hover:scale-110 transition-transform`}>
              <StatusIcon className={`h-5 w-5 ${statusCfg.color}`} />
            </div>
          </div>
        </Card>
      </div>

      {/* Time-Series Chart */}
      <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
        <GradientCardHeader icon={TrendingUp} title="Earn vs Spend Over Time" />
        <div className="p-6">
          {tsLoading ? (
            <div className="h-72 rounded-xl animate-shimmer" />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={(timeSeries ?? []) as Array<Record<string, unknown>>}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="week" tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="earned" stroke="#14b8a6" strokeWidth={2} name="Earned" dot={false} />
                <Line type="monotone" dataKey="spent" stroke="#3b82f6" strokeWidth={2} name="Spent" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>
    </div>
  );
};

export default XPEconomistDashboard;
