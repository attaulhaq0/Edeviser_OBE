import { CalendarDays, HeartHandshake, TrendingUp, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useParentDashboardAggregate } from "@/hooks/useParentDashboardAggregate";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import RoleProfileSurface, {
  ProfileSectionCard,
  ProfileSettingRow,
} from "@/components/shared/RoleProfileSurface";
import RoleProfileAccountPanels from "@/components/shared/RoleProfileAccountPanels";
import EmailPreferencesSection from "@/components/shared/EmailPreferencesSection";
import { Shimmer } from "@/design-system";

const ParentProfilePage = () => {
  const { t } = useTranslation("common");
  const { profile, user } = useAuth();
  const aggregate = useParentDashboardAggregate(user?.id);
  const kpis = aggregate.data?.kpis;
  const children = aggregate.data?.children ?? [];
  const childNames =
    children.map((child) => child.student_name).join(", ") ||
    t("roleProfile.parent.noChildren");

  return (
    <RoleProfileSurface
      roleLabel={t("roleProfile.parent.role")}
      scopeLabel={t("roleProfile.parent.scope", { names: childNames })}
      isLoading={aggregate.isPending}
      primaryActionLabel={t("roleProfile.parent.contactSchool")}
      contactRows={[
        {
          emoji: "✉️",
          label: profile?.email || t("roleProfile.noEmail"),
          href: profile?.email ? `mailto:${profile.email}` : undefined,
        },
        {
          emoji: "🔗",
          label: t("roleProfile.parent.verifiedAccess"),
        },
      ]}
      stats={[
        {
          emoji: "👨‍👩‍👧",
          value: kpis?.linkedChildren ?? 0,
          label: t("roleProfile.parent.children"),
          tone: "teal",
        },
        {
          emoji: "🎓",
          value: kpis?.totalCourses ?? 0,
          label: t("roleProfile.parent.courses"),
          tone: "blue",
        },
        {
          emoji: "📈",
          value: `${Math.round(kpis?.avgAttainment ?? 0)}%`,
          label: t("roleProfile.parent.attainment"),
          tone: "green",
        },
        {
          emoji: "🔔",
          value: kpis?.upcomingDeadlines ?? 0,
          label: t("roleProfile.parent.alerts"),
          tone: "amber",
        },
      ]}
      overviewTitle={t("roleProfile.parent.overview")}
      overviewDescription={t("roleProfile.parent.overviewDescription")}
      overviewRows={[]}
      links={[]}
    >
      <ProfileSectionCard
        emoji="👨‍👩‍👧"
        title={t("roleProfile.parent.linkedLearners")}
        action={
          <Badge variant="secondary">
            {t("roleProfile.parent.linkedCount", { count: children.length })}
          </Badge>
        }
      >
        {aggregate.isPending ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 2 }, (_, index) => (
              <Shimmer key={index} className="h-14 rounded-xl" />
            ))}
          </div>
        ) : children.length ? (
          <div className="divide-y divide-slate-100">
            {children.map((child, index) => (
              <div
                key={child.student_id}
                className="flex items-center gap-3 px-4 py-3"
              >
                <span
                  className={`inline-flex size-11 shrink-0 items-center justify-center rounded-full font-black ${
                    index % 2 === 0
                      ? "bg-teal-100 text-teal-700"
                      : "bg-indigo-100 text-indigo-700"
                  }`}
                >
                  {child.student_name.slice(0, 1).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-sm text-slate-900">
                    {child.student_name}
                  </strong>
                  <span className="block truncate text-xs text-slate-500">
                    {t("roleProfile.parent.learnerSummary", {
                      courses: child.enrolled_courses,
                      attainment: Math.round(child.avg_attainment),
                    })}
                  </span>
                </span>
                <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                  {t("roleProfile.statusActive")}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <p className="p-5 text-sm text-slate-500">
            {t("roleProfile.parent.noChildren")}
          </p>
        )}
        <div className="border-t border-slate-100 p-3">
          <Button asChild variant="outline" size="sm" className="w-full">
            <Link to="/parent/support">
              {t("roleProfile.parent.linkAnotherChild")}
            </Link>
          </Button>
        </div>
      </ProfileSectionCard>

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <Link
          to="/parent/fees"
          className="flex items-center justify-between px-4 py-3.5 transition-colors hover:bg-slate-50"
        >
          <span className="flex items-center gap-3 text-sm font-semibold text-slate-800">
            <span aria-hidden="true">💳</span>
            {t("roleProfile.parent.feesPayments")}
          </span>
          <span className="text-slate-300" aria-hidden="true">
            →
          </span>
        </Link>
        <Link
          to="/parent/notifications"
          className="flex items-center justify-between border-t border-slate-100 px-4 py-3.5 transition-colors hover:bg-slate-50"
        >
          <span className="flex items-center gap-3 text-sm font-semibold text-slate-800">
            <span aria-hidden="true">📣</span>
            {t("roleProfile.parent.announcements")}
          </span>
          <span className="text-slate-300" aria-hidden="true">
            →
          </span>
        </Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <ProfileSectionCard
          emoji="🔒"
          title={t("roleProfile.parent.privacy")}
          action={
            <Badge variant="outline">{t("roleProfile.parent.details")}</Badge>
          }
        >
          <ProfileSettingRow
            title={t("roleProfile.parent.growthShared")}
            trailing={
              <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                {t("roleProfile.parent.shared")}
              </Badge>
            }
          />
          <ProfileSettingRow
            title={t("roleProfile.parent.rawScores")}
            trailing={
              <Badge variant="secondary">
                {t("roleProfile.parent.notShared")}
              </Badge>
            }
          />
          <ProfileSettingRow
            title={t("roleProfile.parent.privateJournal")}
            trailing={
              <Badge variant="secondary">
                {t("roleProfile.parent.private")}
              </Badge>
            }
          />
        </ProfileSectionCard>

        <EmailPreferencesSection
          title={t("roleProfile.parent.notificationPreferences")}
          description={t("roleProfile.parent.notificationDescription")}
          items={[
            {
              key: "weekly_summary",
              label: t("roleProfile.parent.weeklyGrowth"),
              description: t("roleProfile.parent.weeklyGrowthDescription"),
            },
            {
              key: "streak_risk",
              label: t("roleProfile.parent.wellbeingAlerts"),
              description: t("roleProfile.parent.wellbeingAlertsDescription"),
            },
            {
              key: "grade_released",
              label: t("roleProfile.parent.celebrate"),
              description: t("roleProfile.parent.celebrateDescription"),
            },
          ]}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <RoleProfileAccountPanels />
        <ProfileSectionCard emoji="🧭" title={t("roleProfile.workspace")}>
          {[
            {
              icon: TrendingUp,
              label: t("nav.progress"),
              to: "/parent/progress",
            },
            {
              icon: HeartHandshake,
              label: t("nav.support"),
              to: "/parent/support",
            },
            {
              icon: Wallet,
              label: t("nav.fees"),
              to: "/parent/fees",
            },
            {
              icon: CalendarDays,
              label: t("nav.attendance"),
              to: "/parent/attendance",
            },
          ].map(({ icon: Icon, label, to }) => (
            <Link
              key={to}
              to={to}
              className="flex min-h-14 items-center gap-3 border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-800 transition-colors last:border-b-0 hover:bg-slate-50"
            >
              <Icon className="size-4 text-blue-600" aria-hidden="true" />
              {label}
              <span className="ms-auto text-slate-300" aria-hidden="true">
                →
              </span>
            </Link>
          ))}
        </ProfileSectionCard>
      </div>
    </RoleProfileSurface>
  );
};

export default ParentProfilePage;
