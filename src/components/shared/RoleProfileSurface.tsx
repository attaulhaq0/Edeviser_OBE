import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Bell,
  KeyRound,
  Mail,
  Monitor,
  Moon,
  ShieldCheck,
  Sun,
  UserRound,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useTheme, type ThemePreference } from "@/providers/ThemeProvider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import AvatarUpload from "@/components/shared/AvatarUpload";
import EmailPreferencesSection from "@/components/shared/EmailPreferencesSection";
import { PCard, SectionHeader, Shimmer } from "@/design-system";
import { cn } from "@/lib/utils";

export interface RoleProfileStat {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  emoji?: string;
  tone?: "blue" | "green" | "amber" | "teal";
}

export interface RoleProfileRow {
  label: string;
  value: string | number;
}

export interface RoleProfileLink {
  label: string;
  to: string;
  icon: LucideIcon;
}

interface RoleProfileSurfaceProps {
  roleLabel: string;
  scopeLabel: string;
  stats: RoleProfileStat[];
  isLoading?: boolean;
  hasError?: boolean;
  overviewTitle: string;
  overviewDescription: string;
  overviewRows: RoleProfileRow[];
  links: RoleProfileLink[];
  primaryActionLabel?: string;
  primaryActionHref?: string;
  contactRows?: Array<{
    emoji: string;
    label: string;
    href?: string;
  }>;
  children?: ReactNode;
}

interface ProfileSectionCardProps {
  emoji: string;
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export const ProfileSectionCard = ({
  emoji,
  title,
  action,
  children,
  className,
}: ProfileSectionCardProps) => (
  <PCard className={cn("overflow-hidden p-0", className)}>
    <div className="flex min-h-14 items-center gap-2 border-b border-slate-100 px-4 py-3">
      <span
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-xl border border-slate-100 bg-slate-50 text-base shadow-sm"
        aria-hidden="true"
      >
        {emoji}
      </span>
      <h2 className="min-w-0 flex-1 text-sm font-black text-slate-950">
        {title}
      </h2>
      {action}
    </div>
    {children}
  </PCard>
);

interface ProfileSettingRowProps {
  title: string;
  description?: string;
  trailing: ReactNode;
  danger?: boolean;
}

export const ProfileSettingRow = ({
  title,
  description,
  trailing,
  danger = false,
}: ProfileSettingRowProps) => (
  <div className="flex min-h-14 items-center justify-between gap-4 border-b border-slate-100 px-4 py-3 last:border-b-0">
    <div className="min-w-0">
      <p
        className={cn(
          "text-sm font-semibold",
          danger ? "text-red-600" : "text-slate-800"
        )}
      >
        {title}
      </p>
      {description ? (
        <p className="mt-0.5 text-xs leading-4 text-slate-500">{description}</p>
      ) : null}
    </div>
    <div className="shrink-0">{trailing}</div>
  </div>
);

const toneClasses: Record<NonNullable<RoleProfileStat["tone"]>, string> = {
  blue: "bg-blue-50 text-blue-700",
  green: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-700",
  teal: "bg-teal-50 text-teal-700",
};

const RoleProfileSurface = ({
  roleLabel,
  scopeLabel,
  stats,
  isLoading = false,
  hasError = false,
  overviewTitle,
  overviewDescription,
  overviewRows,
  links,
  primaryActionLabel,
  primaryActionHref,
  contactRows,
  children,
}: RoleProfileSurfaceProps) => {
  const { t } = useTranslation("common");
  const { profile } = useAuth();
  const { theme, setTheme } = useTheme();

  const fullName = profile?.full_name || t("roleProfile.fallbackName");
  const initials = fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <div className="space-y-5">
      <PCard className="overflow-hidden p-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-4">
              <Avatar className="size-16 rounded-2xl">
                <AvatarImage
                  src={
                    profile?.avatar_url
                      ? `${profile.avatar_url}?width=128&height=128&resize=cover`
                      : undefined
                  }
                  alt={fullName}
                  className="object-cover"
                />
                <AvatarFallback className="rounded-2xl bg-slate-700 text-xl font-black text-white">
                  {initials || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <h1 className="truncate text-[22px] font-black tracking-tight text-slate-900">
                  {fullName}
                </h1>
                <p className="truncate text-sm font-semibold text-slate-600">
                  {roleLabel}
                  <span className="font-medium text-slate-500">
                    {" "}
                    · {scopeLabel}
                  </span>
                </p>
                <p className="mt-1 truncate text-xs text-slate-500">
                  {profile?.email || t("roleProfile.noEmail")}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-3">
              {isLoading
                ? stats.map((stat) => (
                    <Shimmer
                      key={stat.label}
                      className="h-[48px] w-[116px] rounded-xl"
                    />
                  ))
                : stats.map((stat) => {
                    const Icon = stat.icon;
                    return (
                      <div
                        key={stat.label}
                        className="flex min-w-[104px] items-center gap-2"
                      >
                        <span
                          className={cn(
                            "inline-flex size-8 shrink-0 items-center justify-center rounded-lg",
                            toneClasses[stat.tone ?? "blue"]
                          )}
                        >
                          {stat.emoji ? (
                            <span aria-hidden="true">{stat.emoji}</span>
                          ) : Icon ? (
                            <Icon className="size-4" aria-hidden="true" />
                          ) : null}
                        </span>
                        <span className="min-w-0">
                          <strong className="block truncate text-sm font-black text-slate-900">
                            {hasError
                              ? "Unavailable"
                              : typeof stat.value === "number"
                              ? stat.value.toLocaleString()
                              : stat.value}
                          </strong>
                          <span className="block truncate text-[10px] font-bold uppercase tracking-[0.06em] text-slate-500">
                            {stat.label}
                          </span>
                        </span>
                      </div>
                    );
                  })}
            </div>
          </div>

          <div className="grid shrink-0 grid-cols-2 gap-2 lg:w-[288px] lg:grid-cols-1">
            <Button asChild variant="outline" size="sm">
              <a href="#profile-photo">{t("roleProfile.editProfile")}</a>
            </Button>
            <Button asChild variant="tactile" size="sm">
              {primaryActionHref?.startsWith("/") ? (
                <Link to={primaryActionHref}>
                  <Mail className="size-4" aria-hidden="true" />
                  {primaryActionLabel ?? t("roleProfile.contact")}
                </Link>
              ) : (
                <a href={primaryActionHref ?? `mailto:${profile?.email ?? ""}`}>
                  <Mail className="size-4" aria-hidden="true" />
                  {primaryActionLabel ?? t("roleProfile.contact")}
                </a>
              )}
            </Button>
            <div className="col-span-2 space-y-2 pt-1 text-xs text-slate-500 lg:col-span-1">
              {(
                contactRows ?? [
                  {
                    emoji: "✉️",
                    label: profile?.email || t("roleProfile.noEmail"),
                    href: profile?.email
                      ? `mailto:${profile.email}`
                      : undefined,
                  },
                ]
              ).map((row) => (
                <div key={`${row.emoji}-${row.label}`} className="flex gap-2">
                  <span className="w-5 text-center" aria-hidden="true">
                    {row.emoji}
                  </span>
                  {row.href ? (
                    <a
                      href={row.href}
                      className="min-w-0 truncate text-blue-600 hover:underline"
                    >
                      {row.label}
                    </a>
                  ) : (
                    <span className="min-w-0 truncate">{row.label}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </PCard>

      {children ? (
        children
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.75fr)]">
          <div className="space-y-5">
            <PCard className="overflow-hidden p-0">
              <SectionHeader
                icon={ShieldCheck}
                title={overviewTitle}
                description={overviewDescription}
                className="border-b border-slate-100 px-5 py-4"
              />
              <dl className="divide-y divide-slate-100 px-5">
                {overviewRows.map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between gap-4 py-3"
                  >
                    <dt className="text-sm font-medium text-slate-500">
                      {row.label}
                    </dt>
                    <dd className="text-end text-sm font-bold text-slate-900">
                      {row.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </PCard>

            <PCard className="overflow-hidden p-0">
              <SectionHeader
                icon={UserRound}
                title={t("roleProfile.workspace")}
                description={t("roleProfile.workspaceDescription")}
                className="border-b border-slate-100 px-5 py-4"
              />
              <nav
                className="grid gap-2 p-4 sm:grid-cols-2"
                aria-label={t("roleProfile.workspace")}
              >
                {links.map((link) => {
                  const Icon = link.icon;
                  return (
                    <Button
                      key={link.to}
                      asChild
                      variant="outline"
                      className="h-auto justify-start gap-3 rounded-xl px-3 py-3"
                    >
                      <Link to={link.to}>
                        <span className="inline-flex size-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                          <Icon className="size-4" aria-hidden="true" />
                        </span>
                        <span className="truncate">{link.label}</span>
                      </Link>
                    </Button>
                  );
                })}
              </nav>
            </PCard>

            <EmailPreferencesSection />
          </div>

          <div className="space-y-5">
            <PCard className="overflow-hidden p-0">
              <SectionHeader
                icon={Sun}
                title={t("roleProfile.appearance")}
                description={t("roleProfile.appearanceDescription")}
                className="border-b border-slate-100 px-5 py-4"
              />
              <div
                className="grid grid-cols-3 gap-2 p-4"
                role="radiogroup"
                aria-label={t("roleProfile.appearance")}
              >
                {(
                  [
                    ["light", t("theme.light"), Sun],
                    ["dark", t("theme.dark"), Moon],
                    ["system", t("theme.system"), Monitor],
                  ] as const
                ).map(([value, label, Icon]) => (
                  <Button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={theme === value}
                    variant={theme === value ? "default" : "outline"}
                    className="h-auto flex-col gap-1.5 rounded-xl py-3"
                    onClick={() => setTheme(value as ThemePreference)}
                  >
                    <Icon className="size-4" aria-hidden="true" />
                    <span className="text-xs">{label}</span>
                  </Button>
                ))}
              </div>
            </PCard>

            <div id="profile-photo">
              {profile?.id ? (
                <AvatarUpload
                  userId={profile.id}
                  currentUrl={profile.avatar_url}
                />
              ) : null}
            </div>

            <PCard className="overflow-hidden p-0">
              <SectionHeader
                icon={KeyRound}
                title={t("roleProfile.security")}
                description={t("roleProfile.securityDescription")}
                className="border-b border-slate-100 px-5 py-4"
              />
              <div className="grid gap-2 p-4">
                <Button asChild variant="outline" className="justify-start">
                  <Link to="/update-password">
                    <KeyRound className="size-4" aria-hidden="true" />
                    {t("roleProfile.changePassword")}
                  </Link>
                </Button>
                <Button asChild variant="outline" className="justify-start">
                  <Link to={`/${profile?.role ?? "student"}/notifications`}>
                    <Bell className="size-4" aria-hidden="true" />
                    {t("roleProfile.notifications")}
                  </Link>
                </Button>
              </div>
            </PCard>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleProfileSurface;
