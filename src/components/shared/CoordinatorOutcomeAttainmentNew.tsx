// =============================================================================
// CoordinatorOutcomeAttainmentNew — Outcome Attainment (real data, Phase A)
// =============================================================================
//
// The ILO → PLO → CLO attainment rollup, now driven by REAL data via
// `useCoordinatorOutcomeAttainment` (learning_outcomes + outcome_attainment +
// outcome_mappings). Each PLO expands to its real contributing CLOs with real
// attainment, a computed insight (weakest contributing outcome), a Draft-CQI
// action, and evidence links. Weakest course + affected-students are derived
// from real attainment.
//
// Per-term trend sparklines and AI-authored narrative insights are deferred to
// Phase C (semester snapshots + AI edge function) — they are omitted here rather
// than faked. Composed from the new-UI design tokens/primitives; RTL-safe.
// =============================================================================

import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  ChevronDown,
  ClipboardCheck,
  FileText,
  Lightbulb,
  MessageSquare,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Workflow,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import SectionHeader from "@/components/shared/SectionHeader";
import CoordinatorInsightRail from "@/components/shared/CoordinatorInsightRail";
import Shimmer from "@/components/shared/Shimmer";
import EmptyState from "@/components/shared/EmptyState";
import { useAuth } from "@/hooks/useAuth";
import {
  useCoordinatorOutcomeAttainment,
  type AttainmentStatus,
  type AttainmentPLO,
} from "@/hooks/useCoordinatorOutcomeAttainment";
import { useCoordinatorAiInsights } from "@/hooks/useCoordinatorAiInsights";
import { useCoordinatorAttainmentTrends } from "@/hooks/useCoordinatorAttainmentTrends";
import { cn } from "@/lib/utils";

/** Bar fill color by OBE attainment band (mirrors MasteryRing thresholds). */
const barColor = (pct: number): string => {
  if (pct >= 85) return "#22c55e";
  if (pct >= 70) return "#3b82f6";
  if (pct >= 50) return "#f59e0b";
  return "#ef4444";
};

const STATUS_PILL: Record<AttainmentStatus, string> = {
  onTrack: "bg-green-50 text-green-600",
  watch: "bg-amber-50 text-amber-700",
  belowTarget: "bg-red-50 text-red-600",
  none: "bg-slate-100 text-slate-500",
};

const Bar = ({ pct, label }: { pct: number; label: string }) => (
  <div
    className="h-2 w-full overflow-hidden rounded-full bg-slate-100"
    role="progressbar"
    aria-valuenow={pct}
    aria-valuemin={0}
    aria-valuemax={100}
    aria-label={label}
  >
    <div
      className="h-full rounded-full"
      style={{ width: `${pct}%`, background: barColor(pct) }}
    />
  </div>
);

const CoordinatorOutcomeAttainmentNew = () => {
  const { t } = useTranslation("coordinator");
  const { institutionId } = useAuth();
  const { data, isPending, isError } =
    useCoordinatorOutcomeAttainment(institutionId);
  // Additive AI insight (null when the edge function isn't deployed — graceful).
  const ai = useCoordinatorAiInsights(institutionId);
  // Per-outcome trend history (empty until ≥2 terms are snapshotted — graceful).
  const trends = useCoordinatorAttainmentTrends(institutionId);

  // "vs last term" delta for an outcome; null until ≥2 snapshots exist.
  const trendDelta = (outcomeId: string): number | null => {
    const series = trends.data?.[outcomeId];
    if (!series || series.length < 2) return null;
    const last = series[series.length - 1];
    const prev = series[series.length - 2];
    if (!last || !prev) return null;
    return last.attainment - prev.attainment;
  };

  const ilos = data?.ilos ?? [];
  const plos = data?.plos ?? [];
  const target = data?.successThreshold ?? 70;

  // Single-open accordion; the first PLO is open by default (openOverride=null).
  const [openOverride, setOpenOverride] = useState<string | null>(null);
  const firstId = plos[0]?.id;
  const currentOpen =
    openOverride === null
      ? firstId
      : openOverride === "__none__"
      ? undefined
      : openOverride;
  const toggle = (id: string) =>
    setOpenOverride(currentOpen === id ? "__none__" : id);

  const statusLabel = (s: AttainmentStatus) =>
    s === "onTrack"
      ? t("attainment.onTrack")
      : s === "watch"
      ? t("attainment.watch")
      : s === "belowTarget"
      ? t("attainment.belowTarget")
      : "—";

  const weakestClo = (plo: AttainmentPLO) => {
    let weak: { title: string; attainment: number } | null = null;
    for (const c of plo.contributingClos) {
      if (c.attainment == null) continue;
      if (!weak || c.attainment < weak.attainment) {
        weak = { title: c.title, attainment: c.attainment };
      }
    }
    return weak;
  };

  return (
    <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_320px] xl:gap-6">
      <div className="min-w-0 space-y-6">
        {/* Header */}
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">
            {t("attainment.title")}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {t("attainment.subtitle")}
          </p>
        </div>

        {/* ── AI insight (additive; hidden when unavailable) ──────────────── */}
        {ai.data && (
          <Card className="card-elevated gap-0 border-0 bg-white py-0">
            <div className="p-5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <h2 className="text-sm font-bold text-gray-900">
                    {t("attainment.aiInsight")}
                  </h2>
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                  {ai.data.source === "ai"
                    ? t("attainment.sourceAi")
                    : t("attainment.sourceComputed")}
                </span>
              </div>
              <p className="mt-2 text-sm text-gray-700">{ai.data.narrative}</p>
              {ai.data.recommendations.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {ai.data.recommendations.map((rec, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-xs text-gray-600"
                    >
                      <ArrowRight
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-600"
                        aria-hidden="true"
                      />
                      {rec}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        )}

        {/* ── ILO cards ───────────────────────────────────────────────────── */}
        <Card className="card-elevated gap-0 border-0 bg-white py-0">
          <div className="p-6">
            <SectionHeader
              icon={Workflow}
              title={t("attainment.iloSection")}
              action={
                <Link
                  to="/coordinator/outcome-chain?view=chain"
                  className="inline-flex items-center gap-1 rounded text-xs font-bold text-sky-700 outline-none hover:text-sky-800 focus-visible:ring-2 focus-visible:ring-sky-300"
                >
                  {t("attainment.viewIloDetails")}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              }
            />
            {isPending ? (
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Shimmer key={i} className="h-24 rounded-xl" />
                ))}
              </div>
            ) : ilos.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">
                {t("attainment.empty")}
              </p>
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {ilos.map((ilo, i) => (
                  <div
                    key={ilo.id}
                    className="rounded-xl border border-slate-100 p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-bold text-gray-900">
                        <span className="text-slate-400">ILO{i + 1}</span>{" "}
                        {ilo.title}
                      </p>
                      <span
                        className="text-sm font-black"
                        style={{
                          color:
                            ilo.attainment == null
                              ? "#94a3b8"
                              : barColor(ilo.attainment),
                        }}
                      >
                        {ilo.attainment == null ? "—" : `${ilo.attainment}%`}
                      </span>
                    </div>
                    <div className="mt-2">
                      <Bar pct={ilo.attainment ?? 0} label={ilo.title} />
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">
                        {t("attainment.target")} {target}%
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                          STATUS_PILL[ilo.status]
                        )}
                      >
                        {statusLabel(ilo.status)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* ── PLO rows ────────────────────────────────────────────────────── */}
        <Card className="card-elevated gap-0 border-0 bg-white py-0">
          <div className="p-6">
            <SectionHeader
              icon={ClipboardCheck}
              title={t("attainment.ploSection")}
            />

            {isPending ? (
              <div className="mt-4 space-y-2.5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Shimmer key={i} className="h-16 rounded-xl" />
                ))}
              </div>
            ) : isError ? (
              <p className="mt-4 text-sm text-red-600">
                {t("attainment.empty")}
              </p>
            ) : plos.length === 0 ? (
              <EmptyState
                icon={<ClipboardCheck className="h-8 w-8 text-gray-400" />}
                title={t("attainment.empty")}
              />
            ) : (
              <div className="mt-4 space-y-2.5">
                {plos.map((plo) => {
                  const open = currentOpen === plo.id;
                  const weak = weakestClo(plo);
                  return (
                    <div
                      key={plo.id}
                      className={cn(
                        "rounded-xl border transition-colors",
                        open
                          ? "border-slate-200 bg-slate-50/60"
                          : "border-slate-100"
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => toggle(plo.id)}
                        aria-expanded={open}
                        className="flex w-full items-center gap-3 p-4 text-start outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-gray-900">
                            {plo.title}
                          </p>
                          {plo.description && (
                            <p className="mt-0.5 truncate text-xs text-slate-500">
                              {plo.description}
                            </p>
                          )}
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <span className="text-[11px] font-semibold text-sky-700">
                              {t("attainment.contributingClos", {
                                count: plo.contributingClos.length,
                              })}
                            </span>
                            {(() => {
                              const delta = trendDelta(plo.id);
                              if (delta === null) return null;
                              const up = delta >= 0;
                              return (
                                <span
                                  className={cn(
                                    "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                                    up
                                      ? "bg-green-50 text-green-600"
                                      : "bg-red-50 text-red-600"
                                  )}
                                >
                                  {up ? (
                                    <TrendingUp
                                      className="h-3 w-3"
                                      aria-hidden="true"
                                    />
                                  ) : (
                                    <TrendingDown
                                      className="h-3 w-3"
                                      aria-hidden="true"
                                    />
                                  )}
                                  {up ? "+" : ""}
                                  {delta} {t("attainment.vsLastTerm")}
                                </span>
                              );
                            })()}
                          </div>
                        </div>

                        {/* Attainment */}
                        <div className="hidden w-20 shrink-0 text-center sm:block">
                          <p
                            className="text-lg font-black"
                            style={{
                              color:
                                plo.attainment == null
                                  ? "#94a3b8"
                                  : barColor(plo.attainment),
                            }}
                          >
                            {plo.attainment == null
                              ? "—"
                              : `${plo.attainment}%`}
                          </p>
                          <span
                            className={cn(
                              "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                              STATUS_PILL[plo.status]
                            )}
                          >
                            {statusLabel(plo.status)}
                          </span>
                        </div>

                        {/* Weakest course */}
                        <div className="hidden w-32 shrink-0 lg:block">
                          {plo.weakestCourse ? (
                            <>
                              <p className="truncate text-xs font-semibold text-gray-700">
                                {plo.weakestCourse.code}
                              </p>
                              <p
                                className="text-[11px] font-bold"
                                style={{
                                  color: barColor(plo.weakestCourse.attainment),
                                }}
                              >
                                {plo.weakestCourse.attainment}%
                              </p>
                            </>
                          ) : (
                            <p className="text-[11px] text-slate-400">—</p>
                          )}
                        </div>

                        {/* Affected students */}
                        <div className="hidden w-20 shrink-0 text-center md:block">
                          <p className="text-sm font-bold text-gray-800">
                            {plo.affectedStudents}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {t("attainment.ofCohort", {
                              pct: plo.cohortPercent,
                            })}
                          </p>
                        </div>

                        <ChevronDown
                          className={cn(
                            "h-4 w-4 shrink-0 text-slate-400 transition-transform",
                            open && "rotate-180"
                          )}
                          aria-hidden="true"
                        />
                      </button>

                      {open && (
                        <div className="grid gap-4 border-t border-slate-200 p-4 lg:grid-cols-3">
                          {/* CLO breakdown (real) */}
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                              {t("attainment.cloBreakdown")}
                            </p>
                            <div className="mt-2 space-y-2.5">
                              {plo.contributingClos.length === 0 ? (
                                <p className="text-xs text-slate-400">—</p>
                              ) : (
                                plo.contributingClos.map((clo) => (
                                  <div key={clo.id}>
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="truncate text-xs text-gray-700">
                                        {clo.title}
                                      </span>
                                      <span
                                        className="text-xs font-bold"
                                        style={{
                                          color:
                                            clo.attainment == null
                                              ? "#94a3b8"
                                              : barColor(clo.attainment),
                                        }}
                                      >
                                        {clo.attainment == null
                                          ? "—"
                                          : `${clo.attainment}%`}
                                      </span>
                                    </div>
                                    <div className="mt-1">
                                      <Bar
                                        pct={clo.attainment ?? 0}
                                        label={clo.title}
                                      />
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>

                          {/* Computed insight (real) + recommended action */}
                          <div className="rounded-xl bg-teal-50/70 p-3 ring-1 ring-teal-100">
                            <p className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-teal-700">
                              <Lightbulb
                                className="h-3.5 w-3.5"
                                aria-hidden="true"
                              />
                              {t("attainment.insight")}
                            </p>
                            <p className="mt-1.5 text-xs text-gray-700">
                              {weak
                                ? t("attainment.insightText", {
                                    clo: weak.title,
                                    pct: weak.attainment,
                                  })
                                : t("attainment.insightNone")}
                            </p>
                            <Button
                              variant="tactile"
                              size="sm"
                              className="mt-3 w-full"
                              asChild
                            >
                              <Link to="/coordinator/cqi">
                                {t("attainment.draftCqiPlan")}
                              </Link>
                            </Button>
                          </div>

                          {/* Evidence links */}
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                              {t("attainment.evidenceLinks")}
                            </p>
                            <div className="mt-2 space-y-1.5">
                              <Link
                                to="/coordinator/matrix"
                                className="flex items-center gap-2 rounded text-xs font-semibold text-sky-700 outline-none hover:text-sky-800 focus-visible:ring-2 focus-visible:ring-sky-300"
                              >
                                <FileText
                                  className="h-3.5 w-3.5"
                                  aria-hidden="true"
                                />
                                {t("attainment.evAssessment")}
                              </Link>
                              <Link
                                to="/coordinator/course-file"
                                className="flex items-center gap-2 rounded text-xs font-semibold text-sky-700 outline-none hover:text-sky-800 focus-visible:ring-2 focus-visible:ring-sky-300"
                              >
                                <MessageSquare
                                  className="h-3.5 w-3.5"
                                  aria-hidden="true"
                                />
                                {t("attainment.evFeedback")}
                              </Link>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      </div>

      <CoordinatorInsightRail className="mt-6 xl:mt-0" />
    </div>
  );
};

export default CoordinatorOutcomeAttainmentNew;
