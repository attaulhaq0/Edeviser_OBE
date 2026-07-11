// =============================================================================
// CoordinatorInsightRail — persistent right-rail insights for coordinator screens
// =============================================================================
//
// Presentation-only rail (UI prototype migration, spec task 2.4 / 3.3) shared by
// the redesigned Coordinator Dashboard and Outcome Attainment screens so both
// carry the same "quick visibility of alerts + accreditation" column seen in the
// prototype reference. Rendered INSIDE each page's grid (never by editing the
// layout, which the spec preserves).
//
// The alert/gap copy is presentational sample content mirroring the prototype
// (the backend does not yet expose alert root-causes or an accreditation
// readiness score); `evidenceReadiness` is a prop so a caller can pass a real
// value once one exists. Navigations use EXISTING coordinator routes only.
//
// Composed from tokens + Lucide; light-surface to match the sibling `*New`
// dashboards. RTL-safe via logical props (`ms-*`, `text-start`, `end`).
// =============================================================================

import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertTriangle, ArrowRight, Grid3X3, ShieldCheck } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useCoordinatorAccreditationReadiness } from "@/hooks/useCoordinatorAccreditation";

export interface CoordinatorInsightRailProps {
  /** Accreditation evidence readiness (0–100) override. When omitted the rail
   *  fetches the real readiness itself; renders "—" until it's available. */
  evidenceReadiness?: number | null;
  className?: string;
}

const RailLabel = ({
  icon: Icon,
  children,
  count,
}: {
  icon: typeof AlertTriangle;
  children: ReactNode;
  count?: number;
}) => (
  <div className="flex items-center gap-2">
    <Icon className="h-3.5 w-3.5 text-gray-400" aria-hidden="true" />
    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
      {children}
    </span>
    {typeof count === "number" && (
      <span className="ms-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-100 px-1.5 text-[11px] font-bold text-red-600">
        {count}
      </span>
    )}
  </div>
);

const CoordinatorInsightRail = ({
  evidenceReadiness,
  className,
}: CoordinatorInsightRailProps) => {
  const { t } = useTranslation("coordinator");
  const { institutionId } = useAuth();
  const accred = useCoordinatorAccreditationReadiness(institutionId);
  // Prop override wins; otherwise use the real readiness; "—" until available.
  const readinessPct =
    evidenceReadiness ?? accred.data?.readinessPercent ?? null;

  return (
    <aside className={className}>
      <div className="space-y-4">
        {/* Attainment alerts */}
        <Card className="card-elevated gap-0 border-0 bg-white py-0">
          <div className="space-y-3 p-4">
            <RailLabel icon={AlertTriangle} count={2}>
              {t("rail.attainmentAlerts")}
            </RailLabel>
            <ul className="space-y-2.5">
              <li className="flex items-start gap-2">
                <span
                  className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-red-500"
                  aria-hidden="true"
                />
                <span className="text-xs font-medium text-gray-700">
                  {t("rail.alertPlo")}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span
                  className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-500"
                  aria-hidden="true"
                />
                <span className="text-xs font-medium text-gray-700">
                  {t("rail.alertClo")}
                </span>
              </li>
            </ul>
            <Link
              to="/coordinator/plos"
              className="inline-flex items-center gap-1 rounded text-xs font-bold text-sky-700 outline-none hover:text-sky-800 focus-visible:ring-2 focus-visible:ring-sky-300"
            >
              {t("rail.viewAllAlerts")}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </Card>

        {/* Curriculum gap */}
        <Card className="card-elevated gap-0 border-0 bg-amber-50/60 py-0 ring-1 ring-amber-100">
          <div className="space-y-2.5 p-4">
            <RailLabel icon={Grid3X3}>{t("rail.curriculumGap")}</RailLabel>
            <p className="text-xs text-gray-600">{t("rail.gapBody")}</p>
            <Button variant="tactile" size="sm" className="w-full" asChild>
              <Link to="/coordinator/matrix">
                {t("rail.openMatrix")}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </Card>

        {/* Accreditation */}
        <Card className="card-elevated gap-0 border-0 bg-white py-0">
          <div className="space-y-2.5 p-4">
            <RailLabel icon={ShieldCheck}>{t("rail.accreditation")}</RailLabel>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">
                {t("rail.evidenceReadiness")}
              </span>
              <span className="text-sm font-black text-sky-700">
                {readinessPct != null ? `${readinessPct}%` : "—"}
              </span>
            </div>
            <Button variant="tactile" size="sm" className="w-full" asChild>
              <Link to="/coordinator/course-file">
                {t("rail.reviewDraft")}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </Card>
      </div>
    </aside>
  );
};

export default CoordinatorInsightRail;
