import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  BarChart3,
  Brain,
  Building2,
  CalendarDays,
  Eye,
  GraduationCap,
  KeyRound,
  Loader2,
  Mail,
  ReceiptText,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useAdminDashboardAggregate } from "@/hooks/useAdminDashboardAggregate";
import { useRecentAuditLogs } from "@/hooks/useAdminDashboard";
import { useConnectedIntegrations } from "@/hooks/useConnectedIntegrations";
import { useInstitutionProfile } from "@/hooks/useInstitutionProfile";
import { profileSupabase } from "@/lib/profileClient";
import {
  coordinatorAcademicSchema,
  type CoordinatorAcademicFormValues,
} from "@/lib/schemas/coordinatorAcademic";
import {
  AdminSectionHeader,
  AdminStatusPill,
  adminCardClass,
} from "@/design-system";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import RoleProfileSurface, {
  ProfileSectionCard,
  ProfileSettingRow,
} from "@/components/shared/RoleProfileSurface";
import RoleProfileAccountPanels from "@/components/shared/RoleProfileAccountPanels";
import EmailPreferencesSection from "@/components/shared/EmailPreferencesSection";

const integrationOptions: ReadonlyArray<
  readonly [LucideIcon, string, string, string]
> = [
  [
    KeyRound,
    "Single Sign-On (SAML)",
    "Staff & student login via your identity provider",
    "saml",
  ],
  [
    GraduationCap,
    "Student Information System",
    "Enrollment & roster sync",
    "sis",
  ],
  [Mail, "Email provider", "Transactional email & digests", "resend"],
  [CalendarDays, "Google Workspace", "Calendar & roster", "google_calendar"],
];

const AdminProfilePage = () => {
  const { t } = useTranslation("common");
  const { profile, institutionId, refetchProfile } = useAuth();
  const aggregate = useAdminDashboardAggregate(profile?.institution_id);
  const institutionQuery = useInstitutionProfile(institutionId);
  const integrationsQuery = useConnectedIntegrations(profile?.id);
  const [editOpen, setEditOpen] = useState(false);
  const [isSavingAcademic, setIsSavingAcademic] = useState(false);
  const recentActivityQuery = useRecentAuditLogs(4, {
    enabled: Boolean(profile?.id),
  });
  const kpis = aggregate.data;
  const learnerCount = kpis?.usersByRole.student ?? 0;
  const teacherCount = kpis?.usersByRole.teacher ?? 0;
  const hasAggregateError = aggregate.isError;
  const integrationStatus = integrationsQuery.data ?? {};
  const institution = institutionQuery.data;
  const academic = profile
    ? {
        department: profile.department ?? null,
        designation: profile.designation ?? null,
        academic_rank: profile.academic_rank ?? null,
        highest_degree: profile.highest_degree ?? null,
        years_experience: profile.years_experience ?? null,
        phone: profile.phone ?? null,
        office_location: profile.office_location ?? null,
        office_hours: profile.office_hours ?? null,
        bio: profile.bio ?? null,
      }
    : null;
  const academicForm = useForm<CoordinatorAcademicFormValues>({
    resolver: zodResolver(coordinatorAcademicSchema),
    defaultValues: {
      department: "",
      designation: "",
      academic_rank: "",
      highest_degree: "",
      years_experience: "",
      phone: "",
      office_location: "",
      office_hours: "",
      bio: "",
    },
  });

  const openAcademicEditor = () => {
    academicForm.reset({
      department: academic?.department ?? "",
      designation: academic?.designation ?? "",
      academic_rank: academic?.academic_rank ?? "",
      highest_degree: academic?.highest_degree ?? "",
      years_experience:
        academic?.years_experience == null
          ? ""
          : String(academic.years_experience),
      phone: academic?.phone ?? "",
      office_location: academic?.office_location ?? "",
      office_hours: academic?.office_hours ?? "",
      bio: academic?.bio ?? "",
    });
    setEditOpen(true);
  };

  const saveAcademicProfile = (values: CoordinatorAcademicFormValues) => {
    if (!profile?.id) return;
    setIsSavingAcademic(true);
    void (async () => {
      const { error } = await profileSupabase
        .from("profiles")
        .update({
          department: values.department.trim() || null,
          designation: values.designation.trim() || null,
          academic_rank: values.academic_rank.trim() || null,
          highest_degree: values.highest_degree.trim() || null,
          years_experience:
            values.years_experience.trim() === ""
              ? null
              : Number(values.years_experience),
          phone: values.phone.trim() || null,
          office_location: values.office_location.trim() || null,
          office_hours: values.office_hours.trim() || null,
          bio: values.bio.trim() || null,
        })
        .eq("id", profile.id);
      if (error) {
        toast.error("Unable to save professional profile");
      } else {
        await refetchProfile();
        toast.success("Professional profile saved");
        setEditOpen(false);
      }
      setIsSavingAcademic(false);
    })();
  };

  return (
    <RoleProfileSurface
      roleLabel={academic?.designation ?? t("roleProfile.admin.role")}
      scopeLabel={academic?.department ?? t("roleProfile.admin.scope")}
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
          emoji="👤"
          title="Professional profile"
          action={
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={openAcademicEditor}
            >
              Edit profile
            </Button>
          }
        >
          <div className="grid gap-3 p-4 sm:grid-cols-2">
            {[
              ["Department", academic?.department],
              ["Designation", academic?.designation],
              ["Academic rank", academic?.academic_rank],
              ["Highest qualification", academic?.highest_degree],
              [
                "Years of experience",
                academic?.years_experience == null
                  ? null
                  : `${academic.years_experience} years`,
              ],
              ["Office", academic?.office_location],
              ["Office hours", academic?.office_hours],
              ["Phone", academic?.phone],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  {label}
                </p>
                <p className="mt-0.5 text-sm font-bold text-slate-900">
                  {value ?? "Not set"}
                </p>
              </div>
            ))}
          </div>
          {academic?.bio ? (
            <p className="border-t border-slate-100 px-4 py-3 text-sm text-slate-600">
              {academic.bio}
            </p>
          ) : null}
        </ProfileSectionCard>

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
          {integrationOptions.map(([Icon, label, description, key]) => {
            const isConnected = integrationStatus[key] === "connected";
            return (
              <div key={key} className="flex items-center gap-3 py-3">
                <Icon className="size-4 text-slate-500" aria-hidden="true" />
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
                  className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-slate-200/60 bg-white/80"
                  aria-hidden="true"
                >
                  <ReceiptText className="size-4 text-slate-600" />
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
              icon: SlidersHorizontal,
              label: t("roleProfile.admin.aiPolicy"),
              badge: "A2",
              to: "/admin/security",
            },
            {
              icon: ReceiptText,
              label: t("roleProfile.admin.auditLog"),
              badge: t("roleProfile.admin.audited"),
              to: "/admin/security",
            },
            {
              icon: Brain,
              label: t("roleProfile.admin.memoryPrivacy"),
              badge: "",
              to: "/admin/security",
            },
            {
              icon: Eye,
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
              <item.icon className="size-4 text-slate-500" aria-hidden="true" />
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

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit professional profile</DialogTitle>
            <DialogDescription>
              These fields are saved to your authenticated profile and shared by
              the header and profile surfaces.
            </DialogDescription>
          </DialogHeader>
          <Form {...academicForm}>
            <form
              onSubmit={academicForm.handleSubmit(saveAcademicProfile)}
              className="space-y-4"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                {(
                  [
                    ["department", "Department"],
                    ["designation", "Designation"],
                    ["academic_rank", "Academic rank"],
                    ["highest_degree", "Highest qualification"],
                    ["years_experience", "Years of experience"],
                    ["phone", "Phone"],
                    ["office_location", "Office"],
                    ["office_hours", "Office hours"],
                  ] as const
                ).map(([name, label]) => (
                  <FormField
                    key={name}
                    control={academicForm.control}
                    name={name}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{label}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
                <FormField
                  control={academicForm.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Bio</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={3} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="tactile"
                  disabled={isSavingAcademic}
                >
                  {isSavingAcademic ? (
                    <Loader2
                      className="size-4 animate-spin"
                      aria-hidden="true"
                    />
                  ) : null}
                  Save profile
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </RoleProfileSurface>
  );
};

export default AdminProfilePage;
