// =============================================================================
// CoordinatorDashboardScreen — prototype rebuild (prototype-frontend-rebuild P2.4)
// =============================================================================
//
// Rebuilds `prototype/coordinator-dashboard.html` on `@/design-system` + tokens
// as a SINGLE-COLUMN "program health" feed (the prototype has no insight rail —
// the previous CoordinatorDashboardNew added one; that divergence is removed).
// Wired to the REAL existing hooks only (no faked data R17, no backend G.1):
//   - useCoordinatorDashboardAggregate → avg PLO attainment (+ CLO coverage)
//   - usePrograms                       → Programs KPI
//   - useCoordinatorOutcomeAttainment   → Below-target KPI + attainment alerts
//                                         (trend/affected/root-cause from real
//                                          weakestCourse + affectedStudents)
//   - useCoordinatorAiInsights          → optional AI narrative (null-safe)
//   - useCoordinatorAccreditationReadiness → readiness % + REAL evidence `pack`
//   - useCQIPlans                       → "Close the loop (CQI)" timeline
//   - useAcademicCalendarEvents         → "Program timeline"
//
// DEFERRED / FLAGGED GAPS (prototype shows them; no backend source — not faked):
//   - Hero momentum/PLO-drop/accreditation carousel slides → single primary
//     slide (greeting + real action chips) like the other rebuilt dashboards.
//   - "Recovery pathways" is a PROTOTYPE-ONLY concept (the prototype itself tags
//     it "Concept"; no coordinator recovery backend exists — useMasteryRecovery
//     is student-scoped). Omitted rather than fabricated (R17).
//   - Curriculum-gap names a specific missing outcome in the mock; here it shows
//     the REAL CLO-coverage % + links to the matrix (no invented gap).
//   - Accreditation evidence checklist renders the REAL `pack` when the readiness
//     RPC is deployed; otherwise a neutral "—" (no hardcoded ticks).
// =============================================================================

import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  Clock,
  Compass,
  Grid3X3,
  LayoutGrid,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TrendingDown,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Button, SectionHeader, Shimmer } from "@/design-system";
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

const BRAND_GRADIENT = "var(--brand-gradient)";
const HERO_GRADIENT = "var(--hero-gradient)";

/** Prototype `.pcard` surface (20px radius, hairline, two-layer depth). */
const CARD =
  "rounded-[20px] border border-[#eef2f6] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04),0_10px_26px_rgba(16,24,40,0.05)]";

type Tone = "red" | "amber" | "green" | "blue" | "slate";

const DOT: Record<Tone, string> = {
  red: "bg-red-500",
  amber: "bg-amber-500",
  green: "bg-green-500",
  blue: "bg-blue-500",
  slate: "bg-slate-300",
};
const PILL: Record<Tone, string> = {
  red: "bg-red-50 text-red-700 border-red-100",
  amber: "bg-amber-50 text-amber-700 border-amber-100",
  green: "bg-green-50 text-green-700 border-green-100",
  blue: "bg-blue-50 text-blue-700 border-blue-100",
  slate: "bg-slate-100 text-slate-600 border-slate-200",
};

const CQI_TONE: Record<CQIPlanStatus, Tone> = {
  completed: "green",
  in_progress: "amber",
  planned: "slate",
  evaluated: "blue",
};

/** Locale-aware short date (ISO timestamp or YYYY-MM-DD). */
const fmtDate = (iso: string | null | undefined, lang: string): string => {
  if (!iso) return "";
  const d = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(lang, {
    month: "short",
    day: "numeric",
  }).format(d);
};

const eventStartMs = (e: AcademicCalendarEvent): number =>
  new Date(`${e.start_date}T00:00:00`).getTime();
const eventEndMs = (e: AcademicCalendarEvent): number =>
  new Date(`${e.end_date ?? e.start_date}T23:59:59`).getTime();

interface TimelineEntry {
  id: string;
  title: string;
  subtitle: string;
  when: string;
  tone: Tone;
}

/** Prototype `.tl` vertical timeline (line + status dots). */
const Timeline = ({ items }: { items: TimelineEntry[] }) => (
  <ol className="relative ms-2 space-y-4 border-s-2 border-slate-200 ps-5">
    {items.map((it) => (
      <li key={it.id} className="relative">
        <span
          className={cn(
            "absolute -start-[27px] top-0.5 h-4 w-4 rounded-full ring-4 ring-white",
            DOT[it.tone]
          )}
          aria-hidden="true"
        />
        <p className="text-[13px] font-bold leading-tight text-slate-900">
          {it.title}
          {it.when && (
            <span className="ms-1 text-[10px] font-bold text-slate-400">
              · {it.when}
            </span>
          )}
        </p>
        {it.subtitle && (
          <p className="mt-0.5 text-[11px] text-slate-500">{it.subtitle}</p>
        )}
      </li>
    ))}
  </ol>
);

/** Hero action chip (real navigation targets only). */
const ActionChip = ({
  icon: Icon,
  label,
  to,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  to?: string;
  onClick?: () => void;
}) => {
  const cls =
    "inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/15 px-3 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-white/25";
  const inner = (
    <>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
      <ArrowRight className="h-3 w-3 opacity-75" aria-hidden="true" />
    </>
  );
  return to ? (
    <Link to={to} className={cls}>
      {inner}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  );
};

/** KPI-as-filter card (prototype `.kpi-filter`). */
const KpiFilter = ({
  label,
  value,
  valueClass,
  filterLabel,
  to,
}: {
  label: string;
  value: string | number;
  valueClass?: string;
  filterLabel: string;
  to: string;
}) => (
  <Link
    to={to}
    className={cn(
      CARD,
      "block p-3.5 outline-none transition-transform focus-visible:ring-2 focus-visible:ring-sky-300 active:scale-[.99]"
    )}
  >
    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
      {label}
    </p>
    <p className={cn("mt-0.5 text-2xl font-black text-gray-900", valueClass)}>
      {value}
    </p>
    <span className="mt-1 flex items-center gap-1 text-[10px] font-bold text-sky-700">
      {filterLabel}
      <ArrowRight className="h-3 w-3" aria-hidden="true" />
    </span>
  </Link>
);

const CoordinatorDashboardScreen = () => {
  const { t, i18n } = useTranslation("coordinator");
  const { institutionId } = useAuth();
  const lang = i18n.language;

  const aggregate = useCoordinatorDashboardAggregate(institutionId);
  const avgAttainment = aggregate.data?.avgAttainmentPercent ?? 0;
  const cloCoverage = aggregate.data?.cloCoveragePercent ?? 0;

  const { data: paginatedPrograms } = usePrograms(undefined, {
    enabled: !!institutionId,
  });
  const programsCount = paginatedPrograms?.data?.length ?? 0;

  const ai = useCoordinatorAiInsights(institutionId);

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

  const accred = useCoordinatorAccreditationReadiness(institutionId);
  const readiness = accred.data?.readinessPercent ?? null;
  const evidencePack = accred.data?.pack ?? [];

  const cqiQuery = useCQIPlans({});
  const cqiItems = useMemo<TimelineEntry[]>(
    () =>
      (cqiQuery.data ?? []).slice(0, 4).map((plan) => ({
        id: plan.id,
        title: plan.action_description,
        subtitle: "",
        when: fmtDate(plan.due_date ?? plan.created_at, lang),
        tone: CQI_TONE[plan.status] ?? "slate",
      })),
    [cqiQuery.data, lang]
  );

  const [now] = useState(() => Date.now());
  const calendarQuery = useAcademicCalendarEvents();
  const programItems = useMemo<TimelineEntry[]>(() => {
    const events = calendarQuery.data ?? [];
    const upcoming = events
      .filter((e) => eventEndMs(e) >= now)
      .sort((a, b) => eventStartMs(a) - eventStartMs(b));
    const past = events
      .filter((e) => eventEndMs(e) < now)
      .sort((a, b) => eventStartMs(b) - eventStartMs(a));
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
          statusLabel = t("dashboard.timeline.statusCompleted", "Completed");
        } else if (start <= now && now <= end) {
          tone = "green";
          statusLabel = t("dashboard.timeline.statusNow", "Now");
        } else if (e.id === firstFutureId) {
          tone = "blue";
          statusLabel = t("dashboard.timeline.statusNext", "Next");
        } else {
          tone = "slate";
          statusLabel = t("dashboard.timeline.statusUpcoming", "Upcoming");
        }
        return {
          id: e.id,
          title: e.title,
          subtitle: statusLabel,
          when: fmtDate(e.start_date, lang),
          tone,
        };
      });
  }, [calendarQuery.data, lang, t, now]);

  const alertMeta = (plo: AttainmentPLO): ReactNode => {
    const chips: ReactNode[] = [];
    if (plo.weakestCourse) {
      chips.push(
        <span key="wk" className="text-red-600">
          {t("dashboard.alerts.weakest", {
            defaultValue: "Weakest: {{code}} ({{pct}}%)",
            code: plo.weakestCourse.code,
            pct: plo.weakestCourse.attainment,
          })}
        </span>
      );
    }
    if (plo.affectedStudents > 0) {
      chips.push(
        <span key="af">
          {t("dashboard.alerts.affected", {
            defaultValue: "{{count}} affected ({{percent}}%)",
            count: plo.affectedStudents,
            percent: plo.cohortPercent,
          })}
        </span>
      );
    }
    if (chips.length === 0) return null;
    return (
      <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-semibold text-gray-500">
        {chips}
      </p>
    );
  };

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      {/* ── Program-health hero (greeting + real action chips) ── */}
      <section
        className="relative overflow-hidden rounded-2xl p-5 text-white shadow-lg"
        style={{ background: HERO_GRADIENT }}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/15">
            <Compass className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold tracking-tight">
              {t("dashboard.hub.title", "Program health, prepared")}
            </h1>
            <p className="text-[12px] text-white/75">
              {t(
                "dashboard.hub.subtitle",
                "Outcome attainment across your programs — nothing changes without your review."
              )}
            </p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {belowTargetCount > 0 ? (
            <ActionChip
              icon={TrendingDown}
              label={t("dashboard.hub.ploBelow", {
                defaultValue: "Review {{count}} below-target PLO",
                count: belowTargetCount,
              })}
              onClick={() =>
                document
                  .getElementById("alerts-sec")
                  ?.scrollIntoView({ behavior: "smooth", block: "start" })
              }
            />
          ) : (
            <ActionChip
              icon={CheckCircle2}
              label={t("dashboard.hub.ploTitle", "PLOs on track")}
              to="/coordinator/plos"
            />
          )}
          <ActionChip
            icon={Grid3X3}
            label={t("dashboard.hub.openMatrix", "Open curriculum matrix")}
            to="/coordinator/matrix"
          />
          {readiness != null && (
            <ActionChip
              icon={ShieldCheck}
              label={t("dashboard.hub.accred", {
                defaultValue: "Accreditation · {{pct}}%",
                pct: readiness,
              })}
              to="/coordinator/course-file"
            />
          )}
        </div>
      </section>

      {/* ── KPI row (each card filters into its view) ── */}
      {aggregate.isPending || attainment.isPending ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Shimmer key={i} className="h-[92px] rounded-[20px]" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <KpiFilter
            label={t("dashboard.kpi.programs", "Programs")}
            value={programsCount}
            filterLabel={t("dashboard.kpi.manage", "Manage")}
            to="/coordinator/matrix"
          />
          <KpiFilter
            label={t("dashboard.kpi.avgPlo", "Avg PLO")}
            value={`${avgAttainment}%`}
            valueClass={attainmentValueClass(avgAttainment)}
            filterLabel={t("dashboard.kpi.allOutcomes", "All outcomes")}
            to="/coordinator/plos"
          />
          <KpiFilter
            label={t("dashboard.kpi.belowTarget", "Below target")}
            value={belowTargetCount}
            valueClass={belowTargetCount > 0 ? "text-amber-600" : undefined}
            filterLabel={t("dashboard.kpi.filterBelow", "Filter below-target")}
            to="/coordinator/gap-analysis"
          />
          <KpiFilter
            label={t("dashboard.kpi.accredReady", "Accred. ready")}
            value={readiness != null ? `${readiness}%` : "—"}
            valueClass="text-green-600"
            filterLabel={t("dashboard.kpi.openPack", "Open pack")}
            to="/coordinator/course-file"
          />
        </div>
      )}

      {/* ── Attainment alerts (decision context, real below-target PLOs) ── */}
      <section id="alerts-sec">
        <SectionHeader
          icon={TrendingDown}
          title={t("dashboard.alerts.title", "Attainment alerts")}
          action={
            <Link
              to="/coordinator/plos"
              className="text-xs font-bold text-sky-700 hover:underline"
            >
              {t("dashboard.alerts.allOutcomes", "All outcomes →")}
            </Link>
          }
          className="mb-3"
        />
        {ai.data?.narrative && (
          <div className="mb-3 flex items-start gap-2 rounded-[20px] border border-teal-100 bg-teal-50/70 p-3">
            <Sparkles
              className="mt-0.5 h-4 w-4 shrink-0 text-teal-600"
              aria-hidden="true"
            />
            <p className="text-xs text-gray-700">{ai.data.narrative}</p>
          </div>
        )}
        {attainment.isPending ? (
          <div className="space-y-3">
            <Shimmer className="h-28 rounded-[20px]" />
            <Shimmer className="h-28 rounded-[20px]" />
          </div>
        ) : attainment.isError ? (
          <div className="rounded-[20px] border border-red-100 bg-red-50 p-4 text-sm text-red-700">
            {t("dashboard.alerts.error", "Couldn't load outcome attainment.")}
          </div>
        ) : belowTargetCount > 0 ? (
          <div className="space-y-3">
            {belowTargetPlos.slice(0, 3).map((plo) => {
              const att = plo.attainment as number;
              const high = plo.status === "belowTarget";
              const tone: Tone = high ? "red" : "amber";
              return (
                <div key={plo.id} className={cn(CARD, "p-4")}>
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                        high
                          ? "bg-red-50 text-red-600"
                          : "bg-amber-50 text-amber-600"
                      )}
                    >
                      <TrendingDown className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold text-gray-900">
                          {plo.title}
                        </p>
                        <span
                          className={cn(
                            "rounded-full border px-2 py-0.5 text-[11px] font-bold",
                            PILL[tone]
                          )}
                        >
                          {att}%
                        </span>
                        <span
                          className={cn(
                            "rounded-full border px-2 py-0.5 text-[11px] font-bold",
                            PILL[tone]
                          )}
                        >
                          {high
                            ? t(
                                "dashboard.alerts.priorityHigh",
                                "High priority"
                              )
                            : t(
                                "dashboard.alerts.priorityMedium",
                                "Needs attention"
                              )}
                        </span>
                      </div>
                      {alertMeta(plo)}
                      <p className="mt-2 text-xs text-gray-600">
                        {t("dashboard.alerts.gapBody", {
                          defaultValue:
                            "{{gap}} pts below the {{threshold}}% success threshold.",
                          gap: threshold - att,
                          threshold,
                        })}
                      </p>
                      {plo.weakestCourse && (
                        <div className="mt-2 rounded-lg border-s-2 border-sky-500 bg-slate-50 px-3 py-2">
                          <p className="text-[11.5px] text-slate-600">
                            {t("dashboard.alerts.rootCause", {
                              defaultValue:
                                "Suspected driver: weak {{code}} ({{pct}}%) feeding this roll-up.",
                              code: plo.weakestCourse.code,
                              pct: plo.weakestCourse.attainment,
                            })}
                          </p>
                        </div>
                      )}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button variant="tactile" size="sm" asChild>
                          <Link to="/coordinator/cqi">
                            {t("dashboard.alerts.draftCqi", "Draft CQI plan")}
                          </Link>
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <Link to="/coordinator/plos">
                            {t("dashboard.alerts.drillDown", "Drill down")}
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-start gap-3 rounded-[20px] border border-green-100 bg-green-50/70 p-4">
            <CheckCircle2
              className="mt-0.5 h-5 w-5 shrink-0 text-green-600"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900">
                {t("dashboard.alerts.empty", "Every PLO is meeting target.")}
              </p>
              {lowestPlo?.attainment != null && (
                <p className="mt-1 text-xs text-gray-500">
                  {t("dashboard.alerts.lowest", {
                    defaultValue: "Lowest: {{title}} at {{pct}}%.",
                    title: lowestPlo.title,
                    pct: lowestPlo.attainment,
                  })}
                </p>
              )}
            </div>
          </div>
        )}
      </section>

      {/* ── Curriculum coverage + Accreditation evidence ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Curriculum coverage (real CLO-coverage %) */}
        <Link
          to="/coordinator/matrix"
          className={cn(
            CARD,
            "block p-4 transition-transform active:scale-[.99]"
          )}
        >
          <SectionHeader
            icon={LayoutGrid}
            title={t("dashboard.gap.title", "Curriculum coverage")}
            className="mb-3"
          />
          <div className="flex items-center gap-3">
            <span className="text-2xl font-black text-gray-900">
              {cloCoverage}%
            </span>
            <p className="min-w-0 flex-1 text-xs text-gray-500">
              {t("dashboard.gap.body", {
                defaultValue:
                  "of PLOs have at least one mapped assessment. Review the matrix for coverage holes.",
              })}
            </p>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-blue-500"
              style={{ width: `${cloCoverage}%` }}
            />
          </div>
          <span
            className="mt-3 inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold text-white"
            style={{ background: "#0382bd" }}
          >
            {t("dashboard.gap.cta", "Open matrix")}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        </Link>

        {/* Accreditation evidence (real readiness % + real pack checklist) */}
        <section className={cn(CARD, "p-4")}>
          <SectionHeader
            icon={ShieldCheck}
            title={t("dashboard.evidence.title", "Accreditation evidence")}
            action={
              <Link
                to="/coordinator/course-file"
                className="text-xs font-bold text-sky-700 hover:underline"
              >
                {t("dashboard.evidence.open", "Open →")}
              </Link>
            }
            className="mb-3"
          />
          <div className="mb-2 flex items-center gap-3">
            <div
              className="h-2.5 flex-1 overflow-hidden rounded-full bg-gray-100"
              role="progressbar"
              aria-valuenow={readiness ?? 0}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full rounded-full bg-blue-500"
                style={{ width: `${readiness ?? 0}%` }}
              />
            </div>
            <span className="text-sm font-black text-blue-600">
              {readiness != null ? `${readiness}%` : "—"}
            </span>
          </div>
          {evidencePack.length > 0 ? (
            <ul className="space-y-1.5">
              {evidencePack.map((item) => {
                const map = {
                  done: { icon: CheckCircle2, cls: "text-green-600" },
                  prog: { icon: Clock, cls: "text-amber-600" },
                  pending: { icon: Circle, cls: "text-slate-400" },
                } as const;
                const { icon: Icon, cls } = map[item.state] ?? map.pending;
                return (
                  <li
                    key={item.key}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="flex items-center gap-2 text-xs text-gray-700">
                      <Icon
                        className={cn("h-3.5 w-3.5 shrink-0", cls)}
                        aria-hidden="true"
                      />
                      {t(`dashboard.evidence.item.${item.key}`, item.key)}
                    </span>
                    <span className={cn("text-[11px] font-semibold", cls)}>
                      {t(`dashboard.evidence.state.${item.state}`, item.state)}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="py-2 text-center text-xs text-gray-500">
              {t(
                "dashboard.evidence.pending",
                "Evidence checklist appears once the accreditation pack is prepared."
              )}
            </p>
          )}
        </section>
      </div>

      {/* ── Close the loop (CQI) + Program timeline ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* CQI timeline (real cqi_action_plans) */}
        <section className={cn(CARD, "p-4")}>
          <SectionHeader
            icon={RefreshCw}
            title={t("dashboard.cqi.title", "Close the loop (CQI)")}
            action={
              <Link
                to="/coordinator/cqi"
                className="text-xs font-bold text-sky-700 hover:underline"
              >
                {t("dashboard.cqi.open", "Open →")}
              </Link>
            }
            className="mb-3"
          />
          {cqiQuery.isPending ? (
            <div className="space-y-2">
              <Shimmer className="h-10 rounded-lg" />
              <Shimmer className="h-10 rounded-lg" />
              <Shimmer className="h-10 rounded-lg" />
            </div>
          ) : cqiItems.length > 0 ? (
            <Timeline items={cqiItems} />
          ) : (
            <p className="py-4 text-center text-xs text-gray-500">
              {t("dashboard.cqi.empty", "No CQI action plans yet.")}
            </p>
          )}
        </section>

        {/* Program timeline (real academic_calendar_events) */}
        <section className={cn(CARD, "p-4")}>
          <SectionHeader
            icon={Clock}
            title={t("dashboard.timeline.title", "Program timeline")}
            action={
              <Link
                to="/coordinator/timetable"
                className="text-xs font-bold text-sky-700 hover:underline"
              >
                {t("dashboard.timeline.open", "Calendar →")}
              </Link>
            }
            className="mb-3"
          />
          {calendarQuery.isPending ? (
            <div className="space-y-2">
              <Shimmer className="h-10 rounded-lg" />
              <Shimmer className="h-10 rounded-lg" />
              <Shimmer className="h-10 rounded-lg" />
            </div>
          ) : programItems.length > 0 ? (
            <Timeline items={programItems} />
          ) : (
            <p className="py-4 text-center text-xs text-gray-500">
              {t("dashboard.timeline.empty", "No upcoming calendar events.")}
            </p>
          )}
        </section>
      </div>

      {/* ── Footer (autonomy / review framing) ── */}
      <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
        <p className="flex items-center gap-2 text-xs text-gray-600">
          <ShieldCheck
            className="h-4 w-4 shrink-0 text-sky-600"
            aria-hidden="true"
          />
          {t(
            "dashboard.footer.note",
            "Program briefings are prepared for your review — no curriculum changes without your approval."
          )}
        </p>
        <span
          className="hidden shrink-0 rounded-lg px-2 py-1 text-[10px] font-bold text-white sm:inline"
          style={{ background: BRAND_GRADIENT }}
        >
          {t("dashboard.footer.tag", "Review-first")}
        </span>
      </div>
    </div>
  );
};

export default CoordinatorDashboardScreen;
