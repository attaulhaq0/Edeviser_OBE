// =============================================================================
// AdminDashboardNew — redesigned admin dashboard (P2, spec task 2.5)
// =============================================================================
//
// Institution-overview cockpit gated behind `newUiDashboards` (see the wrapper
// in AdminDashboard.tsx). REUSES the existing `useAdminDashboardAggregate` (one
// round-trip, RLS-scoped `get_admin_dashboard`, no new writes) and is composed
// from the P0 primitives (WelcomeHero, KPICard, SectionHeader, SeverityIcon,
// tactile Button, `.card-elevated`). i18n reuses the existing `admin` namespace
// keys.
//
// This is an incremental, flag-off-by-default build presenting the core value
// (hero, KPIs, users-by-role breakdown, manage-users CTA). The richer
// below-the-fold widgets (recent activity, PLO heatmap, AI co-pilot metrics,
// OBE management quick-access) remain on the legacy dashboard until this reaches
// full parity (task 2.6). Flag-off keeps the current dashboard byte-identical.
// =============================================================================

import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  BookOpen,
  GraduationCap,
  Users,
  UserCheck,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import WelcomeHero from "@/components/shared/WelcomeHero";
import KPICard from "@/components/shared/KPICard";
import SectionHeader from "@/components/shared/SectionHeader";
import { SeverityIcon } from "@/components/shared/SeverityIcon";
import Shimmer from "@/components/shared/Shimmer";
import { useAuth } from "@/hooks/useAuth";
import { useAdminDashboardAggregate } from "@/hooks/useAdminDashboardAggregate";
import { formatNumber } from "@/lib/formatNumber";

// Role badge colors — mirrors the legacy AdminDashboard map (kept local: the
// page file exports a single component, so the constant can't be shared from
// there without tripping react-refresh/only-export-components).
const roleBadgeStyles: Record<string, string> = {
  admin: "bg-red-100 text-red-700 border-red-200",
  coordinator: "bg-blue-100 text-blue-700 border-blue-200",
  teacher: "bg-green-100 text-green-700 border-green-200",
  student: "bg-amber-100 text-amber-700 border-amber-200",
  parent: "bg-purple-100 text-purple-700 border-purple-200",
};

const AdminDashboardNew = () => {
  const { t } = useTranslation("admin");
  const navigate = useNavigate();
  const { institutionId, profile } = useAuth();

  // The aggregate returns the `AdminKPIData` shape directly.
  const aggregate = useAdminDashboardAggregate(institutionId);
  const kpis = aggregate.data;
  const loading = aggregate.isPending;

  const usersByRole = kpis?.usersByRole ?? {};
  const roleEntries = Object.entries(usersByRole);

  return (
    <div className="space-y-6">
      <WelcomeHero
        name={profile?.full_name ?? "Admin"}
        userRole="admin"
        subtitle={t("dashboard.welcome.subtitle")}
        stats={
          loading ? null : (
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-xs font-semibold text-white/70">
                  {t("dashboard.totalUsers")}
                </p>
                <p className="text-xl font-black text-white">
                  {formatNumber(kpis?.totalUsers ?? 0)}
                </p>
              </div>
              <div className="h-8 w-px bg-white/20" />
              <div className="text-right">
                <p className="text-xs font-semibold text-white/70">
                  {t("dashboard.courses")}
                </p>
                <p className="text-xl font-black text-white">
                  {formatNumber(kpis?.totalCourses ?? 0)}
                </p>
              </div>
            </div>
          )
        }
      />

      {/* KPI row */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Shimmer key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <KPICard
            icon={Users}
            label={t("dashboard.totalUsers")}
            value={formatNumber(kpis?.totalUsers ?? 0)}
          />
          <KPICard
            icon={UserCheck}
            label={t("dashboard.activeUsers")}
            value={formatNumber(kpis?.activeUsers ?? 0)}
            iconBgClass="bg-green-50"
            iconColorClass="text-green-600"
          />
          <KPICard
            icon={BookOpen}
            label={t("dashboard.programs")}
            value={formatNumber(kpis?.totalPrograms ?? 0)}
          />
          <KPICard
            icon={GraduationCap}
            label={t("dashboard.courses")}
            value={formatNumber(kpis?.totalCourses ?? 0)}
          />
        </div>
      )}

      {/* Users by role */}
      <Card className="card-elevated overflow-hidden border-0 bg-white">
        <div className="p-6">
          <SectionHeader icon={Users} title={t("dashboard.usersByRole")} />
          <div className="mt-4">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Shimmer key={i} className="h-8 rounded-lg" />
                ))}
              </div>
            ) : roleEntries.length > 0 ? (
              <div className="space-y-3">
                {roleEntries.map(([role, count]) => (
                  <div key={role} className="flex items-center justify-between">
                    <Badge
                      variant="outline"
                      className={roleBadgeStyles[role] ?? ""}
                    >
                      {role.charAt(0).toUpperCase() + role.slice(1)}
                    </Badge>
                    <span className="text-sm font-semibold text-gray-900">
                      {formatNumber(count)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-gray-500">
                {t("dashboard.noActiveUsers")}
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Primary CTA — manage users */}
      <Card className="card-elevated overflow-hidden border-0 bg-white">
        <div className="flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <SeverityIcon
              icon={Users}
              severity="brand"
              label={t("dashboard.usersByRole")}
            />
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {t("dashboard.usersByRole")}
              </p>
              <p className="text-xs text-gray-500">
                {t("dashboard.totalUsers")}:{" "}
                {formatNumber(kpis?.totalUsers ?? 0)}
              </p>
            </div>
          </div>
          <Button
            variant="tactile"
            className="shrink-0"
            onClick={() => navigate("/admin/users")}
          >
            {t("dashboard.manage")}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default AdminDashboardNew;
