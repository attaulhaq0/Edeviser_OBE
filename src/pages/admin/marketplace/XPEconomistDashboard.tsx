// =============================================================================
// XPEconomistDashboard — Earn/spend ratio, velocity, inflation indicator
// Task 22.1
// =============================================================================

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEarnSpendRatio, useXPVelocity } from "@/hooks/useXPEconomist";

const STATUS_COLORS = {
  healthy: "bg-green-50 text-green-700 border-green-200",
  inflationary: "bg-red-50 text-red-700 border-red-200",
  deflationary: "bg-blue-50 text-blue-700 border-blue-200",
  no_spending: "bg-gray-50 text-gray-700 border-gray-200",
} as const;

const XPEconomistDashboard = () => {
  const { profile } = useAuth();
  const institutionId = profile?.institution_id;
  const { data: ratioData, isLoading: ratioLoading } =
    useEarnSpendRatio(institutionId);
  const { data: velocityData, isLoading: velocityLoading } = useXPVelocity(
    institutionId,
    8
  );

  const isLoading = ratioLoading || velocityLoading;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">
        XP Economist Dashboard
      </h1>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
        </div>
      ) : (
        <>
          {/* KPI Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-white border-0 shadow-md rounded-xl p-4 group">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">
                    Earn/Spend Ratio
                  </p>
                  <p className="text-2xl font-black mt-1">
                    {ratioData?.ratio !== null
                      ? `${ratioData?.ratio}:1`
                      : "N/A"}
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-blue-50 group-hover:scale-110 transition-transform">
                  <Activity className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </Card>

            <Card className="bg-white border-0 shadow-md rounded-xl p-4 group">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">
                    Status
                  </p>
                  <Badge
                    className={`mt-1 ${
                      STATUS_COLORS[ratioData?.status ?? "no_spending"]
                    }`}
                  >
                    {ratioData?.statusLabel ?? "No data"}
                  </Badge>
                </div>
                <div className="p-2 rounded-lg bg-green-50 group-hover:scale-110 transition-transform">
                  {ratioData?.status === "inflationary" ? (
                    <TrendingUp className="h-5 w-5 text-red-600" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-green-600" />
                  )}
                </div>
              </div>
            </Card>

            <Card className="bg-white border-0 shadow-md rounded-xl p-4 group">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">
                    Total Earned
                  </p>
                  <p className="text-2xl font-black mt-1">
                    {(ratioData?.totalEarned ?? 0).toLocaleString()}
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-amber-50 group-hover:scale-110 transition-transform">
                  <TrendingUp className="h-5 w-5 text-amber-600" />
                </div>
              </div>
            </Card>

            <Card className="bg-white border-0 shadow-md rounded-xl p-4 group">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">
                    Total Spent
                  </p>
                  <p className="text-2xl font-black mt-1">
                    {(ratioData?.totalSpent ?? 0).toLocaleString()}
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-purple-50 group-hover:scale-110 transition-transform">
                  <DollarSign className="h-5 w-5 text-purple-600" />
                </div>
              </div>
            </Card>
          </div>

          {/* XP Velocity Chart */}
          <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden gap-0 py-0">
            <div
              className="px-6 py-4 flex items-center gap-2"
              style={{
                background: "var(--brand-gradient)",
              }}
            >
              <Activity className="h-5 w-5 text-white" />
              <h2 className="text-lg font-bold tracking-tight text-white">
                XP Velocity
              </h2>
            </div>
            <div className="p-6">
              <div className="space-y-2">
                {(velocityData ?? []).map((point) => (
                  <div
                    key={point.week}
                    className="flex items-center gap-4 text-sm"
                  >
                    <span className="w-24 text-xs text-gray-500">
                      {point.week}
                    </span>
                    <div className="flex-1 flex items-center gap-2">
                      <div
                        className="h-4 rounded bg-green-400"
                        style={{
                          width: `${Math.min(
                            100,
                            (point.earned /
                              Math.max(
                                1,
                                ...(velocityData ?? []).map((v) => v.earned)
                              )) *
                              100
                          )}%`,
                        }}
                      />
                      <span className="text-xs text-green-600">
                        +{point.earned}
                      </span>
                    </div>
                    <div className="flex-1 flex items-center gap-2">
                      <div
                        className="h-4 rounded bg-red-400"
                        style={{
                          width: `${Math.min(
                            100,
                            (point.spent /
                              Math.max(
                                1,
                                ...(velocityData ?? []).map((v) => v.spent)
                              )) *
                              100
                          )}%`,
                        }}
                      />
                      <span className="text-xs text-red-600">
                        -{point.spent}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

export default XPEconomistDashboard;
