import { BarChart3, Building2, ShieldCheck, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useAdminDashboardAggregate } from "@/hooks/useAdminDashboardAggregate";
import { useRecentAuditLogs } from "@/hooks/useAdminDashboard";
import { useConnectedIntegrations } from "@/hooks/useConnectedIntegrations";
import { useInstitutionProfile } from "@/hooks/useInstitutionProfile";
import {
  AdminSectionHeader,
  AdminStatusPill,
  adminCardClass,
} from "@/components/shared/AdminPrototypePrimitives";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import RoleProfileSurface, {
  ProfileSectionCard,
  ProfileSettingRow,
} from "@/components/shared/RoleProfileSurface";
import RoleProfileAccountPanels from "@/components/shared/RoleProfileAccountPanels";
import EmailPreferencesSection from "@/components/shared/EmailPreferencesSection";

const integrationOptions = [
  [
    "🔑",
    "Single Sign-On (SAML)",
    "Staff & student login via your identity provider",
    "saml",
  ],
  ["🎓", "Student Information System", "Enrollment & roster sync", "sis"],
  ["📧", "Email provider", "Transactional email & digests", "resend"],
  ["📅", "Google Workspace", "Calendar & roster", "google_calendar"],
] as const;

const AdminProfilePage = () => {
  const { t } = useTranslation("common");
  const { profile, institutionId } = useAuth();
  const aggregate = useAdminDashboardAggregate(profile?.institution_id);
  const institutionQuery = useInstitutionProfile(institutionId);
  const integrationsQuery = useConnectedIntegrations(profile?.id);
  const recentActivityQuery = useRecentAuditLogs(4, {
    enabled: Boolean(profile?.id),
  });
  const kpis = aggregate.data;
  const learnerCount = kpis?.usersByRole.student ?? 0;
  const teacherCount = kpis?.usersByRole.teacher ?? 0;
  const hasAggregateError = aggregate.isError;
  const integrationStatus = integrationsQuery.data ?? {};
  const institution = institutionQuery.data;

  return (
    <RoleProfileSurface
      roleLabel={t("roleProfile.admin.role")}
      scopeLabel={t("roleProfile.admin.scope")}
      isLoading={aggregate.isPending}
      hasError={hasAggregateError}
      primaryActionLabel={t("roleProfile.admin.institutionPage")}
      primaryActionHref="/admin/settings/institution"
      contactRows={[
        {
          emoji: "✉️",
          label: profile?.email || t("roleProfile.noEmail"),
          href: profile?.email ? `mailto:${profile.email}` : undefined,
        },
        {
          emoji: "🏛️",
          label: profile?.institution_id
            ? t("roleProfile.admin.institutionConnected")
            : t("roleProfile.notSet"),
        },
        {
          emoji: "🛡️",
          label: t("roleProfile.admin.fullAccess"),
        },
      ]}
      stats={[
        {
          emoji: "👥",
          value: learnerCount,
          label: t("roleProfile.admin.learners"),
          tone: "green",
        },
        {
          emoji: "🧑‍🏫",
          value: teacherCount,
          label: t("roleProfile.admin.teachers"),
          tone: "amber",
        },
        {
          emoji: "📚",
          value: kpis?.totalPrograms ?? 0,
          label: t("roleProfile.admin.programs"),
          tone: "teal",
        },
        {
          emoji: "🎓",
          value: kpis?.totalCourses ?? 0,
          label: t("roleProfile.admin.courses"),
          tone: "blue",
        },
      ]}
      overviewTitle={t("roleProfile.admin.overview")}
      overviewDescription={t("roleProfile.admin.overviewDescription")}
      overviewRows={[]}
      links={[]}
    >
      <div className="grid gap-5 lg:grid-cols-2">
        <ProfileSectionCard
          emoji="🌐"
          title={t("roleProfile.admin.institutionSettings")}
        >
          <ProfileSettingRow
            title={t("roleProfile.admin.bilingual")}
            description={t("roleProfile.admin.bilingualDescription")}
            trailing={
              <AdminStatusPill tone="green">
                {profile?.language_preference === "ar" ? "عربي" : "EN"}
              </AdminStatusPill>
            }
          />
          <ProfileSettingRow
            title={t("roleProfile.admin.thresholds")}
            description={t("roleProfile.admin.thresholdDescription")}
            trailing={
              <Button asChild variant="outline" size="sm">
                <Link to="/admin/settings/configuration">
                  {t("roleProfile.admin.configure")}
                </Link>
              </Button>
            }
          />
          <ProfileSettingRow
            title={t("roleProfile.admin.parentReports")}
            description={t("roleProfile.admin.parentReportsDescription")}
            trailing={
              <AdminStatusPill tone="slate">Not configured</AdminStatusPill>
            }
          />
          <ProfileSettingRow
            title={t("roleProfile.admin.accountStatus")}
            trailing={
              <Badge variant="secondary">
                {profile?.is_active
                  ? t("roleProfile.statusActive")
                  : t("roleProfile.statusInactive")}
              </Badge>
            }
          />
          <ProfileSettingRow
            title="Streak Sabbatical"
            description="Pause streak decay during scheduled breaks and holidays"
            trailing={
              <AdminStatusPill tone="slate">Not configured</AdminStatusPill>
            }
          />
        </ProfileSectionCard>

        <RoleProfileAccountPanels
          appearanceTitle={t("roleProfile.admin.platformPreferences")}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <EmailPreferencesSection
          title={t("roleProfile.admin.notificationPreferences")}
          description={t("roleProfile.admin.notificationDescription")}
          items={[
            {
              key: "new_assignment",
              label: t("roleProfile.admin.newRegistrations"),
              description: t("roleProfile.admin.newRegistrationsDescription"),
            },
            {
              key: "streak_risk",
              label: t("roleProfile.admin.securityAlerts"),
              description: t("roleProfile.admin.securityAlertsDescription"),
            },
            {
              key: "weekly_summary",
              label: t("roleProfile.admin.weeklySummary"),
              description: t("roleProfile.admin.weeklySummaryDescription"),
            },
            {
              key: "notification_digest",
              label: t("roleProfile.admin.quotaWarnings"),
              description: t("roleProfile.admin.quotaWarningsDescription"),
            },
          ]}
        />

        <ProfileSectionCard
          emoji="🔑"
          title={t("roleProfile.admin.permissions")}
        >
          {[
            t("roleProfile.admin.manageUsers"),
            t("roleProfile.admin.configureInstitution"),
            t("roleProfile.admin.setAiPolicy"),
            t("roleProfile.admin.viewAuditLogs"),
            t("roleProfile.admin.manageBilling"),
          ].map((permission) => (
            <div
              key={permission}
              className="flex min-h-12 items-center gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0"
            >
              <span className="inline-flex size-5 items-center justify-center rounded-md bg-emerald-50 text-xs font-black text-emerald-700">
                ✓
              </span>
              <span className="text-sm font-medium text-slate-700">
                {permission}
              </span>
            </div>
          ))}
        </ProfileSectionCard>
      </div>

      <div className={`${adminCardClass} p-4`}>
        <AdminSectionHeader emoji="🔌" title="Connected integrations" />
        <div className="mt-3 divide-y divide-slate-100">
          {integrationOptions.map(([emoji, label, description, key]) => {
            const isConnected = integrationStatus[key] === "connected";
            return (
              <div key={key} className="flex items-center gap-3 py-3">
                <span className="text-lg" aria-hidden="true">
                  {emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800">
                    {label}
                  </p>
                  <p className="text-[11px] text-slate-500">{description}</p>
                </div>
                <AdminStatusPill
                  tone={
                    integrationsQuery.isError
                      ? "amber"
                      : isConnected
                      ? "green"
                      : "slate"
                  }
                >
                  {integrationsQuery.isError
                    ? "Unavailable"
                    : isConnected
                    ? "Connected"
                    : "Not connected"}
                </AdminStatusPill>
              </div>
            );
          })}
        </div>
      </div>

      <div className={`${adminCardClass} p-4`}>
        <AdminSectionHeader
          emoji="🧾"
          title="Recent admin activity"
          action={
            <Button
              asChild
              type="button"
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs font-bold"
            >
              <Link to="/admin/audit-log">View audit log</Link>
            </Button>
          }
        />
        <div className="mt-3 divide-y divide-slate-100">
          {recentActivityQuery.isPending ? (
            <p className="py-6 text-sm text-slate-500">
              Loading live activity…
            </p>
          ) : recentActivityQuery.isError ? (
            <p className="py-6 text-sm text-amber-700">
              Activity is temporarily unavailable.
            </p>
          ) : recentActivityQuery.data &&
            recentActivityQuery.data.length > 0 ? (
            recentActivityQuery.data.map((entry) => (
              <div key={entry.id} className="flex items-center gap-3 py-3">
                <span
                  className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-sm"
                  aria-hidden="true"
                >
                  🧾
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800">
                    {entry.action} {entry.entity_type}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {new Date(entry.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="py-6 text-sm text-slate-500">
              No institution activity has been recorded yet.
            </p>
          )}
        </div>
      </div>

      <div className={`${adminCardClass} p-4`}>
        <AdminSectionHeader emoji="🏛️" title="Institution information" />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {[
            [
              "Institution ID",
              institutionQuery.isError
                ? "Unavailable"
                : institution?.id ?? institutionId ?? "—",
            ],
            [
              "Institution",
              institutionQuery.isError
                ? "Unavailable"
                : institution?.name ?? "Not available",
            ],
            [
              "Accreditation body",
              institutionQuery.isError
                ? "Unavailable"
                : institution?.accreditation_body ?? "Not configured",
            ],
            [
              "Created",
              institutionQuery.isError
                ? "Unavailable"
                : institution?.created_at
                ? new Date(institution.created_at).toLocaleDateString()
                : "Not available",
            ],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                {label}
              </p>
              <p className="mt-0.5 text-sm font-bold text-slate-900">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <ProfileSectionCard
          emoji="🛡️"
          title={t("roleProfile.admin.governanceShortcuts")}
        >
          {[
            {
              emoji: "🎚️",
              label: t("roleProfile.admin.aiPolicy"),
              badge: "A2",
              to: "/admin/security",
            },
            {
              emoji: "🧾",
              label: t("roleProfile.admin.auditLog"),
              badge: t("roleProfile.admin.audited"),
              to: "/admin/security",
            },
            {
              emoji: "🧠",
              label: t("roleProfile.admin.memoryPrivacy"),
              badge: "",
              to: "/admin/security",
            },
            {
              emoji: "👁️",
              label: t("roleProfile.admin.viewAsUser"),
              badge: t("roleProfile.admin.audited"),
              to: "/admin/users",
            },
          ].map((item) => (
            <Link
              key={`${item.to}-${item.label}`}
              to={item.to}
              className="flex min-h-14 items-center gap-3 border-b border-slate-100 px-4 py-3 transition-colors last:border-b-0 hover:bg-slate-50"
            >
              <span aria-hidden="true">{item.emoji}</span>
              <span className="min-w-0 flex-1 text-sm font-semibold text-slate-800">
                {item.label}
              </span>
              {item.badge ? (
                <Badge variant="secondary">{item.badge}</Badge>
              ) : (
                <span className="text-slate-300" aria-hidden="true">
                  →
                </span>
              )}
            </Link>
          ))}
        </ProfileSectionCard>

        <ProfileSectionCard emoji="📊" title={t("roleProfile.workspace")}>
          {[
            {
              icon: Users,
              label: t("nav.users"),
              to: "/admin/users",
            },
            {
              icon: BarChart3,
              label: t("nav.reports"),
              to: "/admin/reports",
            },
            {
              icon: ShieldCheck,
              label: t("nav.security"),
              to: "/admin/security",
            },
            {
              icon: Building2,
              label: t("nav.departments"),
              to: "/admin/departments",
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

export default AdminProfilePage;
