// =============================================================================
// AdminSecurityPage — security console (net-new screen, P3.6)
// =============================================================================
// Built from the prototype design system (`@/design-system`): PageHeader +
// KPICard + SectionCard + StatusDot + StatePanel. Surfaces the login
// rate-limiter's data (blocked IPs, lockouts, rate-limit events) via
// `useAdminSecurity`. Status encoded with semantic dots (PARITY.md §B.4).
// =============================================================================

import { useTranslation } from "react-i18next";
import { Activity, Ban, Lock, ShieldAlert } from "lucide-react";

import {
  KPICard,
  PageHeader,
  SectionCard,
  StatePanel,
  StatusDot,
  type DotTone,
} from "@/design-system";
import { useAdminSecurity } from "@/hooks/useAdminSecurity";
import {
  isBlockActive,
  loginLockStatus,
  rateLimitSeverity,
  type LockStatus,
  type RateLimitSeverity,
} from "./security";

const fmt = (iso: string) => new Date(iso).toLocaleString();

const LOCK_TONE: Record<LockStatus, DotTone> = {
  locked: "danger",
  "at-risk": "warning",
  ok: "success",
};

const SEVERITY_TONE: Record<RateLimitSeverity, DotTone> = {
  critical: "danger",
  attention: "warning",
  monitor: "info",
};

const AdminSecurityPage = () => {
  const { t } = useTranslation("common");
  const { data, isLoading, isError } = useAdminSecurity();

  const header = <PageHeader title={t("security.title", "Security")} />;

  if (isLoading) {
    return (
      <div className="space-y-6">
        {header}
        <StatePanel variant="loading" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="space-y-6">
        {header}
        <StatePanel
          variant="error"
          message={t(
            "security.error",
            "Could not load security data. Please try again."
          )}
        />
      </div>
    );
  }

  const { blockedIps, lockedAccounts, rateLimitEvents } = data;
  const activeBlocks = blockedIps.filter((b) =>
    isBlockActive(b.blocked_until)
  ).length;
  const lockedCount = lockedAccounts.filter(
    (a) => loginLockStatus(a.locked_until, a.attempt_count) === "locked"
  ).length;

  return (
    <div className="space-y-6">
      {header}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <KPICard
          icon={Ban}
          label={t("security.activeBlocks", "Active IP blocks")}
          value={activeBlocks}
          iconBgClass="bg-red-50"
          iconColorClass="text-red-600"
          valueClassName={activeBlocks > 0 ? "text-red-600" : "text-sky-700"}
        />
        <KPICard
          icon={Lock}
          label={t("security.lockedAccounts", "Locked accounts")}
          value={lockedCount}
          iconBgClass="bg-amber-50"
          iconColorClass="text-amber-600"
          valueClassName={lockedCount > 0 ? "text-amber-600" : "text-sky-700"}
        />
        <KPICard
          icon={Activity}
          label={t("security.recentEvents", "Recent events")}
          value={rateLimitEvents.length}
        />
      </div>

      <SectionCard icon={Ban} title={t("security.blockedIps", "Blocked IPs")}>
        {blockedIps.length === 0 ? (
          <p className="py-3 text-sm text-gray-500">
            {t("security.noBlockedIps", "No blocked IPs.")}
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {blockedIps.map((b) => {
              const active = isBlockActive(b.blocked_until);
              return (
                <li key={b.ip_address} className="flex items-center gap-3 py-3">
                  <StatusDot tone={active ? "danger" : "neutral"} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-gray-900">
                      {b.ip_address}
                    </p>
                    <p className="truncate text-[11px] text-gray-500">
                      {b.reason}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-medium text-gray-500">
                    {active
                      ? t("security.blockedUntil", "Until {{when}}", {
                          when: fmt(b.blocked_until),
                        })
                      : t("security.expired", "Expired")}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>

      <SectionCard
        icon={Lock}
        title={t("security.lockedAccountsTitle", "Login lockouts")}
      >
        {lockedAccounts.length === 0 ? (
          <p className="py-3 text-sm text-gray-500">
            {t("security.noLockouts", "No login lockouts.")}
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {lockedAccounts.map((a) => {
              const status = loginLockStatus(a.locked_until, a.attempt_count);
              return (
                <li key={a.email} className="flex items-center gap-3 py-3">
                  <StatusDot tone={LOCK_TONE[status]} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-gray-900">
                      {a.email}
                    </p>
                    <p className="text-[11px] text-gray-500">
                      {t("security.failedAttempts", "{{count}} failed attempts", {
                        count: a.attempt_count,
                      })}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {status}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>

      <SectionCard
        icon={ShieldAlert}
        title={t("security.recentEventsTitle", "Recent rate-limit events")}
      >
        {rateLimitEvents.length === 0 ? (
          <p className="py-3 text-sm text-gray-500">
            {t("security.noEvents", "No recent events.")}
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {rateLimitEvents.map((e) => {
              const severity = rateLimitSeverity(e.event_type);
              return (
                <li key={e.id} className="flex items-center gap-3 py-3">
                  <StatusDot tone={SEVERITY_TONE[severity]} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-gray-900">
                      {e.event_type}
                    </p>
                    <p className="truncate text-[11px] text-gray-500">
                      {e.ip_address}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-medium text-gray-500">
                    {fmt(e.occurred_at)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>
    </div>
  );
};

export default AdminSecurityPage;
