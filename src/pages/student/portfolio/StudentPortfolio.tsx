import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import {
  usePortfolio,
  usePortfolioSharingPermission,
  useTogglePortfolioPublic,
  type PortfolioCLO,
} from "@/hooks/usePortfolio";
import { useApproachableWording } from "@/hooks/useApproachableWording";
import GradientCardHeader from "@/components/shared/GradientCardHeader";
import BloomsPill from "@/components/shared/BloomsPill";
import {
  InlineNoAttainmentData,
  InlineNoBadges,
  InlineNoXPData,
  InlineNoSemesters,
} from "@/components/shared/EmptyState";
import {
  Award,
  BookOpen,
  PenLine,
  TrendingUp,
  BarChart3,
  Copy,
  Check,
  Lock,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { AttainmentLevel } from "@/types/app";

const ATTAINMENT_STYLES: Record<AttainmentLevel, string> = {
  Excellent: "text-green-600 bg-green-50",
  Satisfactory: "text-blue-600 bg-blue-50",
  Developing: "text-yellow-600 bg-yellow-50",
  Not_Yet: "text-red-600 bg-red-50",
};

interface KPICardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
}

const KPICard = ({ icon: Icon, label, value }: KPICardProps) => (
  <Card className="bg-white border-0 shadow-md rounded-xl p-4 group">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">
          {label}
        </p>
        <p className="text-2xl font-black mt-1">{value}</p>
      </div>
      <div className="p-2 rounded-lg bg-blue-50 group-hover:scale-110 transition-transform">
        <Icon className="h-5 w-5 text-blue-600" />
      </div>
    </div>
  </Card>
);

interface CloRowProps {
  clo: PortfolioCLO;
}

const CloRow = ({ clo }: CloRowProps) => {
  const { t } = useTranslation("student");
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 p-3">
      <div className="flex items-center gap-2 min-w-0">
        <BloomsPill level={clo.blooms_level} />
        <span className="text-sm font-medium text-gray-800 truncate">
          {clo.clo_title}
        </span>
      </div>
      <span
        className={cn(
          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold shrink-0",
          ATTAINMENT_STYLES[clo.attainment_level]
        )}
      >
        {t(`portfolio.attainmentLevels.${clo.attainment_level}`)} (
        {clo.attainment_percent}%)
      </span>
    </div>
  );
};

export default function StudentPortfolio() {
  const { t } = useTranslation("student");
  const tw = useApproachableWording("student");
  const { user, profile } = useAuth();
  const studentId = user?.id;
  const { data, isLoading } = usePortfolio(studentId);
  const { data: sharingPermitted = false } =
    usePortfolioSharingPermission(studentId);
  const toggleMutation = useTogglePortfolioPublic();
  const [copied, setCopied] = useState(false);
  const isPublic = profile?.portfolio_public ?? false;

  const handleTogglePublic = () => {
    if (!studentId) return;
    const nextPublic = !isPublic;

    // R24.1/R24.2: enabling public sharing requires admin-granted permission.
    // Without it, keep the portfolio private and explain that school permission
    // is required rather than attempting (and silently failing) the toggle.
    if (nextPublic && !sharingPermitted) {
      toast.error(t("portfolio.toast.permissionDenied"));
      return;
    }

    toggleMutation.mutate(
      { userId: studentId, isPublic: nextPublic },
      {
        onSuccess: (result) =>
          toast.success(
            result.isPublic
              ? t("portfolio.toast.madePublic")
              : t("portfolio.toast.madePrivate")
          ),
        onError: (err) => toast.error(err.message),
      }
    );
  };

  const handleCopyLink = () => {
    if (!studentId) return;
    const url = `${window.location.origin}/portfolio/${studentId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success(t("portfolio.toast.linkCopied"));
    setTimeout(() => setCopied(false), 2000);
  };

  const cloList = useMemo(() => data?.clos ?? [], [data?.clos]);
  const closByCourse = useMemo(() => {
    const map = new Map<string, typeof cloList>();
    for (const clo of cloList) {
      const existing = map.get(clo.course_name) ?? [];
      existing.push(clo);
      map.set(clo.course_name, existing);
    }
    return Array.from(map.entries());
  }, [cloList]);

  // Younger-student grouping (R22.2): "Strengths" are outcomes the student is
  // meeting (Excellent/Satisfactory); "Areas improving" are the rest.
  const splitByFriendlyGroup = (clos: typeof cloList) => {
    const strengths = clos.filter(
      (c) =>
        c.attainment_level === "Excellent" ||
        c.attainment_level === "Satisfactory"
    );
    const areasImproving = clos.filter(
      (c) =>
        c.attainment_level === "Developing" || c.attainment_level === "Not_Yet"
    );
    return { strengths, areasImproving };
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 rounded-lg animate-shimmer" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl animate-shimmer" />
          ))}
        </div>
        <div className="h-64 rounded-xl animate-shimmer" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold tracking-tight">
          {t("portfolio.title")}
        </h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="portfolio-public"
              checked={isPublic}
              onCheckedChange={handleTogglePublic}
              disabled={toggleMutation.isPending}
              aria-label={t("portfolio.togglePublicAria")}
            />
            <Label
              htmlFor="portfolio-public"
              className="text-sm font-medium text-gray-600"
            >
              {t("portfolio.publicProfile")}
            </Label>
          </div>
          {isPublic && (
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
              aria-label={t("portfolio.copyLinkAria")}
            >
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {copied ? t("portfolio.copied") : t("portfolio.copyLink")}
            </button>
          )}
        </div>
      </div>

      {!isPublic && !sharingPermitted && (
        <div
          role="note"
          className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-800"
        >
          <Lock className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
          <span>{t("portfolio.permissionRequired")}</span>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          icon={TrendingUp}
          label={t("portfolio.kpi.totalXP")}
          value={(data?.totalXP ?? 0).toLocaleString()}
        />
        <KPICard
          icon={Award}
          label={t("portfolio.kpi.level")}
          value={data?.level ?? 1}
        />
        <KPICard
          icon={BookOpen}
          label={t("portfolio.kpi.closMastered")}
          value={data?.clos.length ?? 0}
        />
        <KPICard
          icon={Award}
          label={t("portfolio.kpi.badgesEarned")}
          value={data?.badges.length ?? 0}
        />
      </div>

      <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden gap-0 py-0">
        <GradientCardHeader
          icon={BookOpen}
          title={tw("portfolio.friendly.skillsTitle")}
        />
        <div className="p-6 space-y-6">
          {closByCourse.length === 0 && <InlineNoAttainmentData />}
          {closByCourse.map(([courseName, clos]) => {
            const { strengths, areasImproving } = splitByFriendlyGroup(clos);
            return (
              <div key={courseName}>
                <h3 className="text-sm font-bold text-gray-700 mb-3">
                  {courseName}
                </h3>
                <div className="space-y-4">
                  {strengths.length > 0 && (
                    <div>
                      <p className="text-xs font-bold tracking-wide uppercase text-green-700">
                        {tw("portfolio.friendly.strengths")}
                      </p>
                      <p className="text-xs text-gray-500 mb-2">
                        {tw("portfolio.friendly.strengthsHint")}
                      </p>
                      <div className="space-y-2">
                        {strengths.map((clo) => (
                          <CloRow key={clo.clo_id} clo={clo} />
                        ))}
                      </div>
                    </div>
                  )}
                  {areasImproving.length > 0 && (
                    <div>
                      <p className="text-xs font-bold tracking-wide uppercase text-yellow-700">
                        {tw("portfolio.friendly.areasImproving")}
                      </p>
                      <p className="text-xs text-gray-500 mb-2">
                        {tw("portfolio.friendly.areasImprovingHint")}
                      </p>
                      <div className="space-y-2">
                        {areasImproving.map((clo) => (
                          <CloRow key={clo.clo_id} clo={clo} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden gap-0 py-0">
        <GradientCardHeader
          icon={Award}
          title={t("portfolio.sections.badgeCollection")}
        />
        <div className="p-6">
          {(data?.badges ?? []).length === 0 ? (
            <InlineNoBadges />
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
              {data?.badges.map((b) => (
                <Card
                  key={b.badge_key}
                  className="bg-white border-0 shadow-md rounded-xl p-4 flex flex-col items-center text-center gap-2 border-s-4 border-s-amber-400"
                >
                  <span className="text-3xl" aria-hidden="true">
                    {b.emoji}
                  </span>
                  <span className="text-xs font-bold tracking-wide">
                    {b.badge_name}
                  </span>
                  <span className="text-[10px] text-gray-500">
                    {format(new Date(b.awarded_at), "MMM d, yyyy")}
                  </span>
                </Card>
              ))}
            </div>
          )}
        </div>
      </Card>

      <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden gap-0 py-0">
        <GradientCardHeader
          icon={PenLine}
          title={t("portfolio.sections.journalEntries")}
        />
        <div className="p-6">
          {(data?.journals ?? []).length === 0 ? (
            <p className="text-sm text-gray-400">{t("portfolio.noJournals")}</p>
          ) : (
            <div className="space-y-3">
              {data?.journals.map((j) => (
                <div
                  key={j.id}
                  className="flex items-center justify-between rounded-lg border border-slate-100 p-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {j.content_preview}
                    </p>
                    <p className="text-xs text-gray-500">
                      {j.course_name ?? t("portfolio.general")}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400 shrink-0">
                    {format(new Date(j.created_at), "MMM d, yyyy")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden gap-0 py-0">
        <GradientCardHeader
          icon={TrendingUp}
          title={t("portfolio.sections.xpTimeline")}
        />
        <div className="p-6">
          {(data?.xpTimeline ?? []).length === 0 ? (
            <InlineNoXPData />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={data?.xpTimeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  tickFormatter={(v) => format(new Date(v as string), "MMM d")}
                />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
                <Tooltip
                  labelFormatter={(v) =>
                    format(new Date(v as string), "MMM d, yyyy")
                  }
                  formatter={(value) => [
                    t("portfolio.chart.xpValue", {
                      value: Number(value).toLocaleString(),
                    }),
                    t("portfolio.chart.cumulativeXP"),
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="cumulative_xp"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden gap-0 py-0">
        <GradientCardHeader
          icon={BarChart3}
          title={t("portfolio.sections.attainmentGrowth")}
        />
        <div className="p-6">
          {(data?.semesterAttainments ?? []).length === 0 ? (
            <InlineNoSemesters />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data?.semesterAttainments}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="semester_name"
                  tick={{ fontSize: 11, fill: "#64748b" }}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  formatter={(value) => [
                    `${value}%`,
                    t("portfolio.chart.avgAttainment"),
                  ]}
                />
                <Bar
                  dataKey="average_attainment"
                  fill="#14b8a6"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>
    </div>
  );
}
