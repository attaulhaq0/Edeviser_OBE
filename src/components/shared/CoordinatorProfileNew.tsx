// =============================================================================
// CoordinatorProfileNew — redesigned coordinator "Me" page (P3, spec task 3.6)
// =============================================================================
//
// Repositions the coordinator profile from an analytics view into a
// professional profile + workspace-configuration page, matching the prototype
// reference: profile header, AI Assistance Preferences, Role & Permissions,
// Programs I Manage, Connected Faculty, Notification Preferences, Security &
// Access, Connected Integrations, and Profile & Academic Information.
//
// Gated behind `newUiModules` for the COORDINATOR role only (wrapper in
// pages/shared/ProfilePage.tsx); the flag-off path keeps the shared
// ProfilePage (avatar upload, appearance/theme, email preferences) intact and
// reversible.
//
// DATA: name / email / avatar come from `useAuth` (REAL). The header count
// tiles (programs / courses / students / faculty), the "Programs I Manage"
// list, and the Connected Faculty active/inactive split are REAL, aggregated
// by `useCoordinatorProfileStats` (coordinator-scoped reads of programs /
// courses / student_courses / profiles — no writes). The remaining sections
// (designation, contact details, AI scope, permissions, notification toggles,
// security, integrations, academic info) are PRESENTATIONAL sample content
// pending Phase B/C. Notification toggles are local-only (preview). Composed
// from tokens + primitives; RTL-safe via logical props.
// =============================================================================

import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { ComponentType } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowRight,
  Award,
  Bot,
  Building2,
  Calendar,
  Check,
  ChevronRight,
  Clock,
  FileCheck2,
  GraduationCap,
  Grid3X3,
  KeyRound,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
  Monitor,
  Phone,
  ShieldCheck,
  Smartphone,
  User,
  UserCog,
  Users,
  X,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
import { Input } from "@/components/ui/input";
import { Shimmer } from "@/design-system";
import { useAuth } from "@/hooks/useAuth";
import { useCoordinatorProfileStats } from "@/hooks/useCoordinatorProfileStats";
import {
  useCoordinatorAcademicProfile,
  useUpdateCoordinatorAcademicProfile,
  useUpdateCoordinatorAlertPrefs,
  readCoordinatorAlertPrefs,
  type CoordinatorAlertPrefs,
} from "@/hooks/useCoordinatorProfileSettings";
import { useConnectedIntegrations } from "@/hooks/useConnectedIntegrations";
import {
  coordinatorAcademicSchema,
  type CoordinatorAcademicFormValues,
} from "@/lib/schemas/coordinatorAcademic";
import { getDisplayFirstName } from "@/lib/displayName";
import { cn } from "@/lib/utils";

type IconType = ComponentType<{ className?: string }>;

// ── Section card (white surface + inline header) ─────────────────────────────
const SectionCard = ({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: { label: string; onClick?: () => void };
  children: React.ReactNode;
}) => (
  <Card className="card-elevated gap-0 border-0 bg-white py-0">
    <div className="flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-bold tracking-tight text-gray-900">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="mt-4 flex-1">{children}</div>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-4 inline-flex items-center gap-1 self-start rounded text-xs font-bold text-sky-700 outline-none hover:text-sky-800 focus-visible:ring-2 focus-visible:ring-sky-300"
        >
          {action.label}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      )}
    </div>
  </Card>
);

// ── Capability row (allowed / restricted) ────────────────────────────────────
const CapabilityRow = ({
  label,
  allowed,
}: {
  label: string;
  allowed: boolean;
}) => (
  <li className="flex items-center gap-2 text-sm text-gray-700">
    {allowed ? (
      <Check className="h-4 w-4 shrink-0 text-green-600" aria-hidden="true" />
    ) : (
      <X className="h-4 w-4 shrink-0 text-red-500" aria-hidden="true" />
    )}
    <span className={cn(!allowed && "text-slate-400")}>{label}</span>
  </li>
);

// ── Contact chip ─────────────────────────────────────────────────────────────
const ContactChip = ({
  icon: Icon,
  text,
}: {
  icon: IconType;
  text: string;
}) => (
  <span className="inline-flex items-center gap-2 text-sm text-slate-600">
    <Icon className="h-4 w-4 shrink-0 text-slate-400" />
    {text}
  </span>
);

// ── Header stat tile ─────────────────────────────────────────────────────────
const StatTile = ({
  icon: Icon,
  value,
  label,
}: {
  icon: IconType;
  value: number;
  label: string;
}) => (
  <div className="flex items-center gap-2.5">
    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
      <Icon className="h-4 w-4" />
    </span>
    <div className="min-w-0">
      <p className="text-lg font-black leading-none text-sky-700">{value}</p>
      <p className="mt-0.5 text-[11px] text-slate-500">{label}</p>
    </div>
  </div>
);

// ── Notification toggle row (local-only preview state) ───────────────────────
const ToggleRow = ({
  icon: Icon,
  label,
  on,
  onToggle,
}: {
  icon: IconType;
  label: string;
  on: boolean;
  onToggle: () => void;
}) => (
  <div className="flex items-center justify-between gap-3">
    <span className="flex items-center gap-2 text-sm text-gray-700">
      <Icon className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
      {label}
    </span>
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onToggle}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full outline-none transition-colors focus-visible:ring-2 focus-visible:ring-sky-300",
        on ? "bg-green-500" : "bg-slate-300"
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 rounded-full bg-white transition-transform",
          on
            ? "translate-x-4 rtl:-translate-x-4"
            : "translate-x-0.5 rtl:-translate-x-0.5"
        )}
      />
    </button>
  </div>
);

// ── Settings link row (security) ─────────────────────────────────────────────
const LinkRow = ({
  icon: Icon,
  label,
  trailing,
}: {
  icon: IconType;
  label: string;
  trailing?: React.ReactNode;
}) => (
  <button
    type="button"
    className="flex w-full items-center gap-3 rounded-lg py-2 text-start outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
  >
    <Icon className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
    <span className="flex-1 text-sm text-gray-700">{label}</span>
    {trailing ?? (
      <ChevronRight className="h-4 w-4 text-slate-300" aria-hidden="true" />
    )}
  </button>
);

// ── Academic info item ───────────────────────────────────────────────────────
const InfoItem = ({
  icon: Icon,
  label,
  value,
}: {
  icon: IconType;
  label: string;
  value: string;
}) => (
  <div className="flex items-start gap-2.5">
    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
      <Icon className="h-4 w-4" />
    </span>
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="truncate text-sm font-semibold text-gray-800">{value}</p>
    </div>
  </div>
);

const CoordinatorProfileNew = () => {
  const { t } = useTranslation("coordinator");
  const { profile } = useAuth();
  const userId = profile?.id;

  const fullName = profile?.full_name ?? "Coordinator";
  const initial = (getDisplayFirstName(fullName) ?? fullName).charAt(0);

  // Real workspace counts + Programs I Manage (coordinator-scoped, no writes).
  const stats = useCoordinatorProfileStats(userId);
  const totals = stats.data?.totals;
  const managedPrograms = stats.data?.programs ?? [];

  // Real integration connection state (empty → all "Connect"). Actually
  // connecting needs provider OAuth (external), so the connect button is a stub.
  const integrations = useConnectedIntegrations(userId);
  const integrationStatus = integrations.data ?? {};

  // Real academic profile (migration 20260823000001; graceful "not set").
  const academicQuery = useCoordinatorAcademicProfile(userId);
  const academic = academicQuery.data;
  const academicMutation = useUpdateCoordinatorAcademicProfile();
  const [editOpen, setEditOpen] = useState(false);

  // Coordinator alert notification prefs — persisted in
  // profiles.notification_preferences with optimistic local state.
  const alertMutation = useUpdateCoordinatorAlertPrefs();
  const [notifs, setNotifs] = useState<CoordinatorAlertPrefs>(() =>
    readCoordinatorAlertPrefs(profile?.notification_preferences)
  );
  const toggle = (key: keyof CoordinatorAlertPrefs) => {
    if (!userId) return;
    const next = { ...notifs, [key]: !notifs[key] };
    setNotifs(next); // optimistic
    alertMutation.mutate(
      { userId, prefs: next },
      {
        onError: () => {
          setNotifs((cur) => ({ ...cur, [key]: !cur[key] })); // revert
          toast.error(t("me.notifSaveError"));
        },
      }
    );
  };

  // Academic edit form.
  const form = useForm<CoordinatorAcademicFormValues>({
    resolver: zodResolver(coordinatorAcademicSchema),
    defaultValues: {
      department: "",
      designation: "",
      academic_rank: "",
      highest_degree: "",
      years_experience: "",
    },
  });

  const openEdit = () => {
    form.reset({
      department: academic?.department ?? "",
      designation: academic?.designation ?? "",
      academic_rank: academic?.academic_rank ?? "",
      highest_degree: academic?.highest_degree ?? "",
      years_experience:
        academic?.years_experience != null
          ? String(academic.years_experience)
          : "",
    });
    setEditOpen(true);
  };

  const onSubmitAcademic = (values: CoordinatorAcademicFormValues) => {
    if (!userId) return;
    academicMutation.mutate(
      {
        userId,
        values: {
          department: values.department.trim() || null,
          designation: values.designation.trim() || null,
          academic_rank: values.academic_rank.trim() || null,
          highest_degree: values.highest_degree.trim() || null,
          years_experience:
            values.years_experience.trim() === ""
              ? null
              : Number(values.years_experience),
        },
      },
      {
        onSuccess: () => {
          toast.success(t("me.academicSaved"));
          setEditOpen(false);
        },
        onError: () => toast.error(t("me.academicSaveError")),
      }
    );
  };

  const aiAllowed = [
    t("me.aiAllow1"),
    t("me.aiAllow2"),
    t("me.aiAllow3"),
    t("me.aiAllow4"),
  ];
  const aiRestricted = [t("me.aiDeny1"), t("me.aiDeny2")];
  const permissions = [
    t("me.perm1"),
    t("me.perm2"),
    t("me.perm3"),
    t("me.perm4"),
    t("me.perm5"),
  ];

  return (
    <div className="space-y-6">
      {/* ── Profile header ──────────────────────────────────────────────── */}
      <Card className="card-elevated gap-0 border-0 bg-white py-0">
        <div className="flex flex-col gap-5 p-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={fullName}
                loading="lazy"
                decoding="async"
                className="h-16 w-16 rounded-2xl object-cover"
              />
            ) : (
              <span
                className="inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-2xl font-black text-white"
                style={{ background: "var(--brand-gradient)" }}
                aria-hidden="true"
              >
                {initial}
              </span>
            )}
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight text-gray-900">
                {fullName}
              </h1>
              <p className="text-sm text-slate-500">
                {t("me.roleTitle")}
                {academic?.department ? ` · ${academic.department}` : ""}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {stats.isPending ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <Shimmer key={i} className="h-10 rounded-lg" />
                  ))
                ) : (
                  <>
                    <StatTile
                      icon={Grid3X3}
                      value={totals?.programs ?? 0}
                      label={t("me.statPrograms")}
                    />
                    <StatTile
                      icon={GraduationCap}
                      value={totals?.courses ?? 0}
                      label={t("me.statCourses")}
                    />
                    <StatTile
                      icon={Users}
                      value={totals?.students ?? 0}
                      label={t("me.statStudents")}
                    />
                    <StatTile
                      icon={UserCog}
                      value={totals?.faculty ?? 0}
                      label={t("me.statFaculty")}
                    />
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-3 lg:items-end">
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                {t("me.editProfile")}
              </Button>
              <Button variant="tactile" size="sm">
                {t("me.viewPublicProfile")}
              </Button>
            </div>
            <div className="flex flex-col gap-1.5">
              <ContactChip icon={Mail} text={profile?.email ?? "—"} />
              <ContactChip icon={Phone} text={t("me.phone")} />
              <ContactChip icon={MapPin} text={t("me.office")} />
              <ContactChip icon={Clock} text={t("me.officeHours")} />
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Left / main column ──────────────────────────────────────────── */}
        <div className="space-y-6 lg:col-span-2">
          <div className="grid gap-6 md:grid-cols-2">
            {/* AI Assistance Preferences */}
            <SectionCard
              title={t("me.aiTitle")}
              subtitle={t("me.aiSubtitle")}
              action={{ label: t("me.aiManage") }}
            >
              <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                  <Bot className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    {t("me.aiAutonomyLabel")}
                  </p>
                  <p className="text-sm font-bold text-gray-900">
                    {t("me.aiAutonomyValue")}
                  </p>
                </div>
              </div>
              <ul className="mt-3 space-y-1.5">
                {aiAllowed.map((label) => (
                  <CapabilityRow key={label} label={label} allowed />
                ))}
                {aiRestricted.map((label) => (
                  <CapabilityRow key={label} label={label} allowed={false} />
                ))}
              </ul>
            </SectionCard>

            {/* Role & Permissions */}
            <SectionCard
              title={t("me.roleSectionTitle")}
              subtitle={t("me.roleSectionSubtitle")}
              action={{ label: t("me.roleViewAll") }}
            >
              <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-3">
                <ShieldCheck className="h-5 w-5 text-blue-600" />
                <p className="text-sm font-bold text-gray-900">
                  {t("me.roleName")}
                </p>
              </div>
              <ul className="mt-3 space-y-1.5">
                {permissions.map((label) => (
                  <CapabilityRow key={label} label={label} allowed />
                ))}
              </ul>
            </SectionCard>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Programs I Manage */}
            <SectionCard
              title={t("me.programsTitle")}
              subtitle={t("me.programsSubtitle")}
              action={{ label: t("me.programsViewAll") }}
            >
              {stats.isPending ? (
                <div className="space-y-2">
                  <Shimmer className="h-16 rounded-xl" />
                  <Shimmer className="h-16 rounded-xl" />
                </div>
              ) : managedPrograms.length > 0 ? (
                <ul className="space-y-2">
                  {managedPrograms.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        className="flex w-full items-center gap-3 rounded-xl border border-slate-100 p-3 text-start outline-none hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-sky-300"
                      >
                        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                          <GraduationCap
                            className="h-4 w-4"
                            aria-hidden="true"
                          />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-gray-900">
                            {p.name}
                          </span>
                          <span className="block text-[11px] text-slate-400">
                            {p.courseCount} {t("me.courses")} · {p.studentCount}{" "}
                            {t("me.students")}
                          </span>
                        </span>
                        <ChevronRight
                          className="h-4 w-4 shrink-0 text-slate-300"
                          aria-hidden="true"
                        />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">
                  {t("me.programsEmpty")}
                </p>
              )}
            </SectionCard>

            {/* Connected Faculty */}
            <SectionCard
              title={t("me.facultyTitle")}
              subtitle={t("me.facultySubtitle")}
              action={{ label: t("me.facultyManage") }}
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Users className="h-6 w-6" />
                </span>
                <div>
                  <p className="text-2xl font-black leading-none text-sky-700">
                    {totals?.faculty ?? 0}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {t("me.facultyMembers")}
                  </p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-100 p-3">
                  <p className="text-lg font-black text-green-600">
                    {totals?.facultyActive ?? 0}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {t("me.facultyActive")}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-100 p-3">
                  <p className="text-lg font-black text-slate-500">
                    {totals?.facultyInactive ?? 0}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {t("me.facultyInactive")}
                  </p>
                </div>
              </div>
            </SectionCard>
          </div>

          {/* Profile & Academic Information */}
          <SectionCard
            title={t("me.academicTitle")}
            action={{ label: t("me.academicEdit"), onClick: openEdit }}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <InfoItem
                icon={Building2}
                label={t("me.academicDepartment")}
                value={academic?.department ?? t("me.notSet")}
              />
              <InfoItem
                icon={User}
                label={t("me.academicDesignation")}
                value={academic?.designation ?? t("me.notSet")}
              />
              <InfoItem
                icon={Award}
                label={t("me.academicRank")}
                value={academic?.academic_rank ?? t("me.notSet")}
              />
              <InfoItem
                icon={GraduationCap}
                label={t("me.academicDegree")}
                value={academic?.highest_degree ?? t("me.notSet")}
              />
              <InfoItem
                icon={Clock}
                label={t("me.academicExperience")}
                value={
                  academic?.years_experience != null
                    ? t("me.experienceYears", {
                        count: academic.years_experience,
                      })
                    : t("me.notSet")
                }
              />
            </div>
          </SectionCard>
        </div>

        {/* ── Right rail ──────────────────────────────────────────────────── */}
        <div className="space-y-6">
          {/* Notification Preferences */}
          <SectionCard
            title={t("me.notifTitle")}
            subtitle={t("me.notifSubtitle")}
            action={{ label: t("me.notifManage") }}
          >
            <div className="space-y-3">
              <ToggleRow
                icon={AlertTriangle}
                label={t("me.notif1")}
                on={notifs.ploDrop}
                onToggle={() => toggle("ploDrop")}
              />
              <ToggleRow
                icon={Grid3X3}
                label={t("me.notif2")}
                on={notifs.curriculumGap}
                onToggle={() => toggle("curriculumGap")}
              />
              <ToggleRow
                icon={FileCheck2}
                label={t("me.notif3")}
                on={notifs.evidenceReady}
                onToggle={() => toggle("evidenceReady")}
              />
              <ToggleRow
                icon={User}
                label={t("me.notif4")}
                on={notifs.teacherInactivity}
                onToggle={() => toggle("teacherInactivity")}
              />
              <ToggleRow
                icon={Clock}
                label={t("me.notif5")}
                on={notifs.cqiDeadline}
                onToggle={() => toggle("cqiDeadline")}
              />
            </div>
          </SectionCard>

          {/* Security & Access */}
          <SectionCard
            title={t("me.securityTitle")}
            action={{ label: t("me.securitySettings") }}
          >
            <div className="space-y-0.5">
              <LinkRow icon={KeyRound} label={t("me.changePassword")} />
              <LinkRow
                icon={ShieldCheck}
                label={t("me.twoFactor")}
                trailing={
                  <span className="rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-bold text-green-600">
                    {t("me.on")}
                  </span>
                }
              />
              <LinkRow icon={Monitor} label={t("me.activeSessions")} />
              <LinkRow icon={Smartphone} label={t("me.authorizedDevices")} />
            </div>
          </SectionCard>

          {/* Connected Integrations */}
          <SectionCard
            title={t("me.integrationsTitle")}
            action={{ label: t("me.integrationsManage") }}
          >
            <div className="space-y-2">
              <IntegrationRow
                icon={Calendar}
                label={t("me.googleCalendar")}
                connected={integrationStatus["google_calendar"] === "connected"}
                connectedLabel={t("me.connected")}
                connectLabel={t("me.connect")}
                onConnect={() => toast.info(t("me.integrationComingSoon"))}
              />
              <IntegrationRow
                icon={Mail}
                label={t("me.outlook")}
                connected={integrationStatus["outlook"] === "connected"}
                connectedLabel={t("me.connected")}
                connectLabel={t("me.connect")}
                onConnect={() => toast.info(t("me.integrationComingSoon"))}
              />
              <IntegrationRow
                icon={MessageSquare}
                label={t("me.slack")}
                connected={integrationStatus["slack"] === "connected"}
                connectedLabel={t("me.connected")}
                connectLabel={t("me.connect")}
                onConnect={() => toast.info(t("me.integrationComingSoon"))}
              />
            </div>
          </SectionCard>
        </div>
      </div>

      {/* Academic edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("me.academicEdit")}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmitAcademic)}
              className="space-y-4"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("me.academicDepartment")}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="designation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("me.academicDesignation")}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="academic_rank"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("me.academicRank")}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="highest_degree"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("me.academicDegree")}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="years_experience"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("me.academicExperience")}</FormLabel>
                      <FormControl>
                        <Input inputMode="numeric" {...field} />
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
                  {t("me.cancel")}
                </Button>
                <Button
                  type="submit"
                  variant="tactile"
                  disabled={academicMutation.isPending}
                >
                  {academicMutation.isPending && (
                    <Loader2
                      className="h-4 w-4 animate-spin"
                      aria-hidden="true"
                    />
                  )}
                  {t("me.save")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ── Integration row ──────────────────────────────────────────────────────────
const IntegrationRow = ({
  icon: Icon,
  label,
  connected,
  connectedLabel,
  connectLabel,
  onConnect,
}: {
  icon: IconType;
  label: string;
  connected: boolean;
  connectedLabel: string;
  connectLabel: string;
  onConnect?: () => void;
}) => (
  <div className="flex items-center justify-between gap-3">
    <span className="flex items-center gap-2 text-sm text-gray-700">
      <Icon className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
      {label}
    </span>
    {connected ? (
      <span className="rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-bold text-green-600">
        {connectedLabel}
      </span>
    ) : (
      <button
        type="button"
        onClick={onConnect}
        className="rounded text-[11px] font-bold text-sky-700 outline-none hover:text-sky-800 focus-visible:ring-2 focus-visible:ring-sky-300"
      >
        {connectLabel}
      </button>
    )}
  </div>
);

export default CoordinatorProfileNew;
