// =============================================================================
// CoordinatorDashboardNew — redesigned coordinator dashboard (P2, spec task 2.4)
// =============================================================================
//
// "Program health, prepared" decision cockpit gated behind `newUiDashboards`
// (wrapper in CoordinatorDashboard.tsx). Matches the prototype reference: an
// action-hub hero, KPI cards that act as filters, enriched attainment alerts,
// and the curriculum-gap / accreditation-evidence / CQI / program-timeline row,
// plus the shared CoordinatorInsightRail.
//
// DATA (Phase A backend wiring — REAL, no new backend/RPC/write):
//   • KPI "Programs"          → usePrograms
//   • KPI "Avg PLO Attainment"→ useCoordinatorDashboardAggregate (get_coordinator_dashboard)
//   • KPI "Below Target" + Attainment alerts
//                             → useCoordinatorOutcomeAttainment (count / list of
//                               PLOs below the institution success threshold;
//                               weakest course + affected students derived from
//                               outcome_attainment). A positive empty state
//                               renders when every PLO meets target.
//   • "Close the loop (CQI)"  → useCQIPlans (real cqi_action_plans)
//   • "Program timeline"      → useAcademicCalendarEvents (real events, windowed
//                               around today)
//   • Curriculum-gap card + accreditation readiness (evidenceReadiness) remain
//     PRESENTATIONAL — the backend does not expose these yet (arrive in Phase
//     B/C). All navigations use EXISTING coordinator routes only. Flag-off keeps
//     the legacy dashboard byte-identical (see the router wrapper).
//
// Composed from P0 primitives (KPICard, SectionHeader, SeverityIcon) + tokens
// (`.card-elevated`, `--brand-gradient`, tactile Button). i18n via the
// `coordinator` namespace. RTL-safe via logical props; light-surface to match
// the sibling `*New` dashboards.
// =============================================================================

import { useMemo, useState, type ComponentType, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Circle,
  Clock,
  Grid3X3,
  Info,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";

import {
  Button,
  Card,
  KPICard,
  SectionHeader,
  SeverityIcon,
  Shimmer,
} from "@/design-system";
import CoordinatorInsightRail from "@/components/shared/CoordinatorInsightRail";
import { useAuth } from "@/hooks/useAuth";
import { useCoordinatorDashboardAggregate } from "@/hooks/useCoordinatorDashboardAggregate";
import { usePrograms } from "@/hooks/usePrograms";
import {
  useCoordinatorOutcomeAttainment,
  type AttainmentPLO,
} from "@/hooks/useCoordinatorOutcomeAttainment";
import { useCoordinatorAiInsights } from "@/hooks/useCoordinatorAiInsights";
import { useCoordinatorAccreditationReadiness } from "@/hooks/useCoordinatorAccreditation";
import { useCQIPlans, type CQIPlanStatus } from "@/hooks/useCQIPlans";
import {
  useAcademicCalendarEvents,
  type AcademicCalendarEvent,
} from "@/hooks/useAcademicCalendar";
import { attainmentValueClass } from "@/lib/attainmentTone";
import { cn } from "@/lib/utils";

type Tone = "red" | "amber" | "green" | "blue" | "slate";

const PILL: Record<Tone, string> = {
  red: "bg-red-50 text-red-600",
  amber: "bg-amber-50 text-amber-700",
  green: "bg-green-50 text-green-600",
  blue: "bg-blue-50 text-blue-600",
  slate: "bg-slate-100 text-slate-600",
};

const DOT: Record<Tone, string> = {
  red: "bg-red-500",
  amber: "bg-amber-500",
  green: "bg-green-500",
  blue: "bg-blue-500",
  slate: "bg-slate-300",
};

// Icon tints for the action chips on the dark hero surface.
const CHIP_ICON: Record<"red" | "amber" | "green", string> = {
  red: "bg-red-500/20 text-red-200",
  amber: "bg-amber-400/20 text-amber-100",
  green: "bg-green-500/20 text-green-100",
};

// CQI plan status → timeline tone + label key.
const CQI_TONE: Record<CQIPlanStatus, Tone> = {
  completed: "green",
  in_progress: "amber",
  planned: "slate",
  evaluated: "blue",
};
const CQI_STATUS_KEY: Record<CQIPlanStatus, string> = {
  completed: "dashboard.cqi.statusCompleted",
  in_progress: "dashboard.cqi.statusInProgress",
  planned: "dashboard.cqi.statusPlanned",
  evaluated: "dashboard.cqi.statusEvaluated",
};

type IconType = ComponentType<{ className?: string }>;

// Locale-aware short date (handles both ISO timestamps and YYYY-MM-DD dates).
const fmtDate = (iso: string | null | undefined, lang: string): string => {
  if (!iso) return "";
  const d = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(lang, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
};

const eventStartMs = (e: AcademicCalendarEvent): number =>
  new Date(`${e.start_date}T00:00:00`).getTime();
const eventEndMs = (e: AcademicCalendarEvent): number =>
  new Date(`${e.end_date ?? e.start_date}T23:59:59`).getTime();

// ─── Hero action chip ────────────────────────────────────────────────────────
const ActionChip = ({
  icon: Icon,
  tone,
  title,
  cta,
  to,
}: {
  icon: IconType;
  tone: "red" | "amber" | "green";
  title: string;
  cta: string;
  to: string;
}) => (
  <Link
    to={to}
    className="group flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-start outline-none transition-colors hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-sky-300"
  >
    <span className="flex min-w-0 items-center gap-2.5">
      <span
        className={cn(
          "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
          CHIP_ICON[tone]
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="truncate text-sm font-semibold text-slate-900">
        {title}
      </span>
    </span>
    <span className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition-colors group-hover:bg-teal-50 group-hover:text-teal-700">
      {cta}
      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
    </span>
  </Link>
);

// ─── Small status pill ───────────────────────────────────────────────────────
const Pill = ({ tone, children }: { tone: Tone; children: ReactNode }) => (
  <span
    className={cn(
      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold",
      PILL[tone]
    )}
  >
    {children}
  </span>
);

// ─── Attainment alert row (real below-target PLO) ────────────────────────────
const AlertRow = ({
  severity,
  title,
  attainment,
  priorityLabel,
  priorityTone,
  meta,
  body,
  primaryLabel,
  primaryTo,
  secondaryLabel,
  secondaryTo,
}: {
  severity: "high" | "med";
  title: string;
  attainment: number;
  priorityLabel: string;
  priorityTone: Tone;
  meta: string;
  body: string;
  primaryLabel: string;
  primaryTo: string;
  secondaryLabel: string;
  secondaryTo: string;
}) => (
  <div className="rounded-xl border border-slate-100 p-4">
    <div className="flex items-start gap-3">
      <SeverityIcon
        icon={AlertTriangle}
        severity={severity}
        size="md"
        label={priorityLabel}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-bold text-gray-900">{title}</p>
          <Pill tone={severity === "high" ? "red" : "amber"}>
            <TrendingDown className="h-3 w-3" aria-hidden="true" />
            {attainment}%
          </Pill>
          <Pill tone={priorityTone}>{priorityLabel}</Pill>
        </div>
        {meta && <p className="mt-1 text-xs text-gray-500">{meta}</p>}
        <p className="mt-1.5 text-xs text-gray-600">{body}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="tactile" size="sm" asChild>
            <Link to={primaryTo}>{primaryLabel}</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to={secondaryTo}>{secondaryLabel}</Link>
          </Button>
        </div>
      </div>
    </div>
  </div>
);

// ─── Mini card (bottom row) ──────────────────────────────────────────────────
const MiniCard = ({
  title,
  headerRight,
  children,
  ctaLabel,
  ctaTo,
}: {
  title: string;
  headerRight?: ReactNode;
  children: ReactNode;
  ctaLabel: string;
  ctaTo: string;
}) => (
  <Card className="card-elevated flex flex-col gap-0 border-0 bg-white py-0">
    <div className="flex flex-1 flex-col p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-gray-900">{title}</p>
        {headerRight}
      </div>
      <div className="mt-3 flex-1">{children}</div>
      <Button variant="tactile" size="sm" className="mt-4 w-full" asChild>
        <Link to={ctaTo}>
          {ctaLabel}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </Button>
    </div>
  </Card>
);

// ─── Timeline item ───────────────────────────────────────────────────────────
const TimelineItem = ({
  date,
  title,
  statusLabel,
  tone,
  last,
  clamp,
}: {
  date: string;
  title: string;
  statusLabel: string;
  tone: Tone;
  last?: boolean;
  clamp?: boolean;
}) => (
  <li className="flex gap-3">
    <div className="flex flex-col items-center">
      <span
        className={cn(
          "mt-1 h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white",
          DOT[tone]
        )}
        aria-hidden="true"
      />
      {!last && <span className="mt-1 w-px flex-1 bg-slate-200" />}
    </div>
    <div className={cn("min-w-0", last ? "pb-0" : "pb-3.5")}>
      {date && <p className="text-[11px] font-bold text-gray-400">{date}</p>}
      <p
        className={cn(
          "text-xs font-semibold text-gray-800",
          clamp && "line-clamp-2"
        )}
      >
        {title}
      </p>
      <span
        className={cn(
          "mt-1 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-bold",
          PILL[tone]
        )}
      >
        {statusLabel}
      </span>
    </div>
  </li>
);

// ─── Checklist row (accreditation evidence) ──────────────────────────────────
const ChecklistRow = ({
  label,
  statusLabel,
  state,
}: {
  label: string;
  statusLabel: string;
  state: "done" | "prog" | "pend";
}) => {
  const map = {
    done: { icon: CheckCircle2, cls: "text-green-600" },
    prog: { icon: Clock, cls: "text-amber-600" },
    pend: { icon: Circle, cls: "text-slate-400" },
  } as const;
  const { icon: Icon, cls } = map[state];
  return (
    <li className="flex items-center justify-between gap-2">
      <span className="flex items-center gap-2 text-xs text-gray-700">
        <Icon className={cn("h-3.5 w-3.5 shrink-0", cls)} aria-hidden="true" />
        {label}
      </span>
      <span className={cn("text-[11px] font-semibold", cls)}>
        {statusLabel}
      </span>
    </li>
  );
};

const CoordinatorDashboardNew = () => {
  const { t, i18n } = useTranslation("coordinator");
  const { institutionId } = useAuth();
  const lang = i18n.language;

  // Real KPI data (aggregate) + program count (existing hook). No new writes.
  const aggregate = useCoordinatorDashboardAggregate(institutionId);
  const avgAttainment = aggregate.data?.avgAttainmentPercent ?? 0;

  const { data: paginatedPrograms } = usePrograms(undefined, {
    enabled: !!institutionId,
  });
  const programsCount = paginatedPrograms?.data?.length ?? 0;

  // Additive AI insight (null when the edge function isn't deployed — graceful).
  const ai = useCoordinatorAiInsights(institutionId);

  // Real outcome attainment → Below Target KPI + attainment alerts.
  const attainment = useCoordinatorOutcomeAttainment(institutionId);
  const threshold = attainment.data?.successThreshold ?? 70;
  const measuredPlos = useMemo(
    () => (attainment.data?.plos ?? []).filter((p) => p.attainment != null),
    [attainment.data]
  );
  const belowTargetPlos = useMemo(
    () =>
      measuredPlos
        .filter((p) => (p.attainment as number) < threshold)
        .sort((a, b) => (a.attainment as number) - (b.attainment as number)),
    [measuredPlos, threshold]
  );
  const belowTargetCount = belowTargetPlos.length;
  const lowestPlo = useMemo(
    () =>
      measuredPlos.reduce<AttainmentPLO | null>(
        (min, p) =>
          min === null || (p.attainment as number) < (min.attainment as number)
            ? p
            : min,
        null
      ),
    [measuredPlos]
  );

  const kpiLoading = aggregate.isPending || attainment.isPending;

  // Real CQI action plans → "Close the loop" timeline.
  const cqiQuery = useCQIPlans({});
  const cqiItems = useMemo(
    () =>
      (cqiQuery.data ?? []).slice(0, 4).map((plan) => ({
        id: plan.id,
        date: fmtDate(plan.due_date ?? plan.created_at, lang),
        title: plan.action_description,
        statusLabel: t(
          CQI_STATUS_KEY[plan.status] ?? "dashboard.cqi.statusPlanned"
        ),
        tone: CQI_TONE[plan.status] ?? "slate",
      })),
    [cqiQuery.data, lang, t]
  );

  // Real academic calendar → "Program timeline" (windowed around today).
  // `now` is captured once via a lazy initializer so the render stays pure.
  const [now] = useState(() => Date.now());
  const calendarQuery = useAcademicCalendarEvents();
  const programItems = useMemo(() => {
    const events = calendarQuery.data ?? [];
    const upcoming = events
      .filter((e) => eventEndMs(e) >= now)
      .sort((a, b) => eventStartMs(a) - eventStartMs(b));
    const past = events
      .filter((e) => eventEndMs(e) < now)
      .sort((a, b) => eventStartMs(b) - eventStartMs(a));
    // Prefer what's next, backfill with the most recent past, then show chrono.
    const chosen = [...upcoming, ...past].slice(0, 4);
    const firstFutureId = upcoming.find((e) => eventStartMs(e) > now)?.id;
    return chosen
      .slice()
      .sort((a, b) => eventStartMs(a) - eventStartMs(b))
      .map((e) => {
        const start = eventStartMs(e);
        const end = eventEndMs(e);
        let tone: Tone;
        let statusLabel: string;
        if (end < now) {
          tone = "slate";
          statusLabel = t("dashboard.timeline.statusCompleted");
        } else if (start <= now && now <= end) {
          tone = "green";
          statusLabel = t("dashboard.timeline.statusNow");
        } else if (e.id === firstFutureId) {
          tone = "blue";
          statusLabel = t("dashboard.timeline.statusNext");
        } else {
          tone = "slate";
          statusLabel = t("dashboard.timeline.statusUpcoming");
        }
        return {
          id: e.id,
          date: fmtDate(e.start_date, lang),
          title: e.title,
          statusLabel,
          tone,
        };
      });
  }, [calendarQuery.data, lang, t, now]);

  // Meta line for a below-target alert: weakest course + affected students.
  const alertMeta = (plo: AttainmentPLO): string => {
    const parts: string[] = [];
    if (plo.weakestCourse) {
      parts.push(
        t("dashboard.alerts.weakest", {
          code: plo.weakestCourse.code,
          pct: plo.weakestCourse.attainment,
        })
      );
    }
    if (plo.affectedStudents > 0) {
      parts.push(
        t("dashboard.alerts.affected", {
          count: plo.affectedStudents,
          percent: plo.cohortPercent,
        })
      );
    }
    return parts.join(" · ");
  };

  // Real accreditation readiness (evidence coverage). Null until the RPC is
  // deployed → rendered as "—".
  const accred = useCoordinatorAccreditationReadiness(institutionId);
  const evidenceReadiness = accred.data?.readinessPercent ?? null;

  const evidenceItems = [
    {
      label: t("dashboard.evidence.cloMapping"),
      statusLabel: t("dashboard.evidence.completed"),
      state: "done" as const,
    },
    {
      label: t("dashboard.evidence.samples"),
      statusLabel: t("dashboard.evidence.completed"),
      state: "done" as const,
    },
    {
      label: t("dashboard.evidence.analysis"),
      statusLabel: t("dashboard.evidence.completed"),
      state: "done" as const,
    },
    {
      label: t("dashboard.evidence.reflection"),
      statusLabel: t("dashboard.evidence.inProgress"),
      state: "prog" as const,
    },
    {
      label: t("dashboard.evidence.cqi"),
      statusLabel: t("dashboard.evidence.pending"),
      state: "pend" as const,
    },
  ];

  return (
    <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_320px] xl:gap-6">
      <div className="min-w-0 space-y-6">
        {/* ── Action-hub hero ─────────────────────────────────────────────── */}
        {/* E1.19: white liquid-glass hero (design principle #5) */}
        <Card className="overflow-hidden rounded-xl border border-slate-200/60 bg-white/80 text-slate-900 shadow-sm backdrop-blur-xs">
          <div className="p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200/60 bg-white/80 text-teal-600">
                  <Activity className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h1 className="text-xl font-bold tracking-tight">
                    {t("dashboard.hub.title")}
                  </h1>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {t("dashboard.hub.subtitle")}
                  </p>
                </div>
              </div>
              <span className="hidden shrink-0 items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 sm:inline-flex">
                <Info className="h-3.5 w-3.5" aria-hidden="true" />
                {t("dashboard.hub.why")}
              </span>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <ActionChip
                icon={belowTargetCount > 0 ? TrendingDown : CheckCircle2}
                tone={belowTargetCount > 0 ? "red" : "green"}
                title={
                  belowTargetCount > 0
                    ? t("dashboard.hub.ploBelow", { count: belowTargetCount })
                    : t("dashboard.hub.ploTitle")
                }
                cta={t("dashboard.hub.review")}
                to="/coordinator/plos"
              />
              <ActionChip
                icon={Grid3X3}
                tone="amber"
                title={t("dashboard.hub.gapTitle")}
                cta={t("dashboard.hub.openMatrix")}
                to="/coordinator/matrix"
              />
              <ActionChip
                icon={ShieldCheck}
                tone="green"
                title={t("dashboard.hub.accredTitle")}
                cta={t("dashboard.hub.continueEvidence")}
                to="/coordinator/accreditation"
              />
            </div>
          </div>
        </Card>

        {/* ── KPI row (filters) ───────────────────────────────────────────── */}
        {kpiLoading ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Shimmer key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Link
              to="/coordinator/matrix"
              aria-label={t("dashboard.kpi.programs")}
              className="block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
            >
              <KPICard
                icon={Users}
                label={t("dashboard.kpi.programs")}
                value={programsCount}
              />
            </Link>
            <Link
              to="/coordinator/plos"
              aria-label={t("dashboard.kpi.avgPlo")}
              className="block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
            >
              <KPICard
                icon={TrendingUp}
                label={t("dashboard.kpi.avgPlo")}
                value={`${avgAttainment}%`}
                valueClassName={attainmentValueClass(avgAttainment)}
              />
            </Link>
            <Link
              to="/coordinator/gap-analysis"
              aria-label={t("dashboard.kpi.belowTarget")}
              className="block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
            >
              <KPICard
                icon={TrendingDown}
                label={t("dashboard.kpi.belowTarget")}
                value={belowTargetCount}
                {...(belowTargetCount > 0
                  ? {
                      iconBgClass: "bg-red-50",
                      iconColorClass: "text-red-600",
                      valueClassName: "text-red-600",
                    }
                  : {})}
              />
            </Link>
            <Link
              to="/coordinator/accreditation"
              aria-label={t("dashboard.kpi.accredReady")}
              className="block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
            >
              <KPICard
                icon={ShieldCheck}
                label={t("dashboard.kpi.accredReady")}
                value={
                  evidenceReadiness != null ? `${evidenceReadiness}%` : "—"
                }
                iconBgClass="bg-green-50"
                iconColorClass="text-green-600"
                valueClassName="text-green-600"
              />
            </Link>
          </div>
        )}

        {/* ── Attainment alerts ───────────────────────────────────────────── */}
        <Card className="card-elevated gap-0 border-0 bg-white py-0">
          <div className="p-6">
            <SectionHeader
              icon={AlertTriangle}
              title={t("dashboard.alerts.title")}
              action={
                <Link
                  to="/coordinator/plos"
                  className="inline-flex items-center gap-1 rounded text-xs font-bold text-sky-700 outline-none hover:text-sky-800 focus-visible:ring-2 focus-visible:ring-sky-300"
                >
                  {t("dashboard.alerts.allOutcomes")}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              }
            />
            {ai.data?.narrative && (
              <div className="mt-3 flex items-start gap-2 rounded-lg bg-teal-50/60 p-3">
                <Sparkles
                  className="mt-0.5 h-4 w-4 shrink-0 text-teal-600"
                  aria-hidden="true"
                />
                <p className="text-xs text-gray-700">{ai.data.narrative}</p>
              </div>
            )}
            <div className="mt-4 space-y-3">
              {attainment.isPending ? (
                <>
                  <Shimmer className="h-28 rounded-xl" />
                  <Shimmer className="h-28 rounded-xl" />
                </>
              ) : belowTargetCount > 0 ? (
                belowTargetPlos.slice(0, 3).map((plo) => {
                  const high = plo.status === "belowTarget";
                  const att = plo.attainment as number;
                  return (
                    <AlertRow
                      key={plo.id}
                      severity={high ? "high" : "med"}
                      title={plo.title}
                      attainment={att}
                      priorityLabel={
                        high
                          ? t("dashboard.alerts.priorityHigh")
                          : t("dashboard.alerts.priorityMedium")
                      }
                      priorityTone={high ? "red" : "amber"}
                      meta={alertMeta(plo)}
                      body={t("dashboard.alerts.gapBody", {
                        pct: att,
                        gap: threshold - att,
                        threshold,
                      })}
                      primaryLabel={t("dashboard.alerts.draftCqi")}
                      primaryTo="/coordinator/cqi"
                      secondaryLabel={t("dashboard.alerts.drillDown")}
                      secondaryTo="/coordinator/plos"
                    />
                  );
                })
              ) : (
                <div className="flex items-start gap-3 rounded-xl border border-green-100 bg-green-50/60 p-4">
                  <CheckCircle2
                    className="mt-0.5 h-5 w-5 shrink-0 text-green-600"
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900">
                      {t("dashboard.alerts.empty")}
                    </p>
                    <p className="mt-1 text-xs text-gray-600">
                      {t("dashboard.alerts.emptyDetail", {
                        count: measuredPlos.length,
                        threshold,
                      })}
                    </p>
                    {lowestPlo?.attainment != null && (
                      <p className="mt-1 text-xs text-gray-500">
                        {t("dashboard.alerts.lowest", {
                          title: lowestPlo.title,
                          pct: lowestPlo.attainment,
                        })}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* ── Curriculum gap / Evidence / CQI / Program timeline ──────────── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {/* Curriculum gap (presentational — Phase B/C) */}
          <MiniCard
            title={t("dashboard.gap.title")}
            ctaLabel={t("dashboard.gap.cta")}
            ctaTo="/coordinator/matrix"
          >
            <p className="text-sm font-semibold text-gray-800">
              {t("dashboard.gap.body")}
            </p>
            <p className="mt-1.5 text-xs text-gray-500">
              {t("dashboard.gap.detail")}
            </p>
            <span className="mt-3 inline-block">
              <Pill tone="amber">{t("dashboard.gap.impact")}</Pill>
            </span>
          </MiniCard>

          {/* Accreditation evidence (presentational — Phase B/C) */}
          <MiniCard
            title={t("dashboard.evidence.title")}
            headerRight={
              <span className="text-sm font-black text-sky-700">
                {evidenceReadiness != null ? `${evidenceReadiness}%` : "—"}
              </span>
            }
            ctaLabel={t("dashboard.evidence.cta")}
            ctaTo="/coordinator/accreditation"
          >
            <div
              className="h-2 w-full overflow-hidden rounded-full bg-slate-100"
              role="progressbar"
              aria-valuenow={evidenceReadiness ?? 0}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={t("dashboard.evidence.overall")}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${evidenceReadiness ?? 0}%`,
                  background: "var(--brand-gradient)",
                }}
              />
            </div>
            <ul className="mt-3 space-y-2">
              {evidenceItems.map((item) => (
                <ChecklistRow
                  key={item.label}
                  label={item.label}
                  statusLabel={item.statusLabel}
                  state={item.state}
                />
              ))}
            </ul>
          </MiniCard>

          {/* Close the loop (CQI) — real cqi_action_plans */}
          <MiniCard
            title={t("dashboard.cqi.title")}
            ctaLabel={t("dashboard.cqi.cta")}
            ctaTo="/coordinator/cqi"
          >
            {cqiQuery.isPending ? (
              <div className="space-y-2">
                <Shimmer className="h-10 rounded-lg" />
                <Shimmer className="h-10 rounded-lg" />
                <Shimmer className="h-10 rounded-lg" />
              </div>
            ) : cqiItems.length > 0 ? (
              <ul className="mt-1">
                {cqiItems.map((item, i) => (
                  <TimelineItem
                    key={item.id}
                    date={item.date}
                    title={item.title}
                    statusLabel={item.statusLabel}
                    tone={item.tone}
                    last={i === cqiItems.length - 1}
                    clamp
                  />
                ))}
              </ul>
            ) : (
              <p className="text-xs text-gray-500">
                {t("dashboard.cqi.empty")}
              </p>
            )}
          </MiniCard>

          {/* Program timeline — real academic_calendar_events */}
          <MiniCard
            title={t("dashboard.timeline.title")}
            ctaLabel={t("dashboard.timeline.cta")}
            ctaTo="/coordinator/cqi"
          >
            {calendarQuery.isPending ? (
              <div className="space-y-2">
                <Shimmer className="h-10 rounded-lg" />
                <Shimmer className="h-10 rounded-lg" />
                <Shimmer className="h-10 rounded-lg" />
              </div>
            ) : programItems.length > 0 ? (
              <ul className="mt-1">
                {programItems.map((item, i) => (
                  <TimelineItem
                    key={item.id}
                    date={item.date}
                    title={item.title}
                    statusLabel={item.statusLabel}
                    tone={item.tone}
                    last={i === programItems.length - 1}
                  />
                ))}
              </ul>
            ) : (
              <p className="text-xs text-gray-500">
                {t("dashboard.timeline.empty")}
              </p>
            )}
          </MiniCard>
        </div>
      </div>

      {/* ── Right rail ────────────────────────────────────────────────────── */}
      <CoordinatorInsightRail className="mt-6 xl:mt-0" />
    </div>
  );
};

export default CoordinatorDashboardNew;
