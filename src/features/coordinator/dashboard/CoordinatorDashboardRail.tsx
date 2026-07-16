// =============================================================================
// CoordinatorDashboardRail — the coordinator dashboard's right rail (prototype
// `railHTML()` coordinator case in shared.js). Fixed, laptop-only (xl+):
//   Attainment alerts · Curriculum gap · Accreditation.
//
// Wired to the REAL hooks the coordinator dashboard already uses (cache hits; no
// faked data R17; no backend change G.1):
//   - useCoordinatorOutcomeAttainment    → below-target PLO alerts
//   - useCoordinatorDashboardAggregate    → CLO-coverage % (curriculum gap)
//   - useCoordinatorAccreditationReadiness → readiness %
//
// Faithful to the dashboard's "no invented gap" rule: the prototype's specific
// "Concurrency has no mapped assessment" line has no backend, so the curriculum
// card shows the REAL coverage % + a link to the matrix instead of naming a gap.
// =============================================================================

import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { RailCard, RailHead, RailRow, Shimmer } from "@/design-system";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useCoordinatorDashboardAggregate } from "@/hooks/useCoordinatorDashboardAggregate";
import { useCoordinatorOutcomeAttainment } from "@/hooks/useCoordinatorOutcomeAttainment";
import { useCoordinatorAccreditationReadiness } from "@/hooks/useCoordinatorAccreditation";

const RailLink = ({ to, label }: { to: string; label: string }) => {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(to)}
      className="mt-2 block text-xs font-extrabold text-blue-600 hover:underline"
    >
      {label}
    </button>
  );
};

const CoordinatorDashboardRail = () => {
  const { t } = useTranslation("coordinator");
  const { institutionId } = useAuth();

  const aggregate = useCoordinatorDashboardAggregate(institutionId);
  const attainment = useCoordinatorOutcomeAttainment(institutionId);
  const accred = useCoordinatorAccreditationReadiness(institutionId);

  const threshold = attainment.data?.successThreshold ?? 70;
  const belowTarget = useMemo(
    () =>
      (attainment.data?.plos ?? [])
        .filter(
          (p) => p.attainment != null && (p.attainment as number) < threshold
        )
        .sort((a, b) => (a.attainment as number) - (b.attainment as number))
        .slice(0, 3),
    [attainment.data, threshold]
  );

  const cloCoverage = aggregate.data?.cloCoveragePercent ?? 0;
  const readiness = accred.data?.readinessPercent ?? null;

  return (
    <aside
      aria-label={t("dashboard.rail.label", "Program alerts")}
      className="fixed bottom-0 end-0 top-14 z-30 hidden w-80 overflow-y-auto border-s border-border bg-white px-5 py-4 dark:bg-background xl:block"
    >
      {/* ── Attainment alerts (real below-target PLOs) ── */}
      <RailCard>
        <RailHead
          title={t("dashboard.rail.alerts", "📉 Attainment alerts")}
          right={
            belowTarget.length > 0 ? String(belowTarget.length) : undefined
          }
        />
        {attainment.isPending ? (
          <Shimmer className="h-16 rounded-lg" />
        ) : belowTarget.length > 0 ? (
          <div className="space-y-0.5">
            {belowTarget.map((p) => (
              <RailRow key={p.id}>
                <span
                  className={cn(
                    "h-2 w-2 shrink-0 rounded-full",
                    p.status === "belowTarget" ? "bg-red-500" : "bg-amber-500"
                  )}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 truncate">{p.title}</span>
                <b className="text-[12px] font-extrabold text-slate-900 dark:text-slate-100">
                  {p.attainment as number}%
                </b>
              </RailRow>
            ))}
            <RailLink
              to="/coordinator/plos"
              label={t("dashboard.rail.allOutcomes", "All outcomes →")}
            />
          </div>
        ) : (
          <p className="text-xs text-slate-500">
            {t("dashboard.rail.alertsEmpty", "Every PLO is meeting target.")}
          </p>
        )}
      </RailCard>

      {/* ── Curriculum gap (real CLO coverage %) ── */}
      <RailCard>
        <RailHead
          title={t("dashboard.rail.curriculumGap", "🗂️ Curriculum gap")}
        />
        {aggregate.isPending ? (
          <Shimmer className="h-12 rounded-lg" />
        ) : (
          <>
            <RailRow>
              <span className="min-w-0 flex-1">
                {t("dashboard.rail.coverage", "PLO coverage")}
              </span>
              <b
                className={cn(
                  "text-[12px] font-extrabold",
                  cloCoverage >= 70 ? "text-green-600" : "text-amber-700"
                )}
              >
                {cloCoverage}%
              </b>
            </RailRow>
            <RailLink
              to="/coordinator/matrix"
              label={t("dashboard.rail.openMatrix", "Open matrix →")}
            />
          </>
        )}
      </RailCard>

      {/* ── Accreditation (real readiness %) ── */}
      <RailCard>
        <RailHead
          title={t("dashboard.rail.accreditation", "📋 Accreditation")}
        />
        {accred.isPending ? (
          <Shimmer className="h-12 rounded-lg" />
        ) : (
          <>
            <RailRow>
              <span className="min-w-0 flex-1">
                {t("dashboard.rail.evidenceReadiness", "Evidence readiness")}
              </span>
              <b className="text-[12px] font-extrabold text-green-600">
                {readiness != null ? `${readiness}%` : "—"}
              </b>
            </RailRow>
            <RailLink
              to="/coordinator/course-file"
              label={t("dashboard.rail.reviewDraft", "Review draft →")}
            />
          </>
        )}
      </RailCard>
    </aside>
  );
};

export default CoordinatorDashboardRail;
