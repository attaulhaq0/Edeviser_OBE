// Two coverage observations, neither academic attainment nor accreditation approval.
// Percentages are supplied by owned hooks; this view never recalculates them.
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  Clock,
  LayoutGrid,
  ShieldCheck,
} from "lucide-react";
import { PCard, SectionHeader } from "@/design-system/patterns";
import type { AccreditationPackItem } from "@/hooks/useCoordinatorAccreditation";
import {
  measuredCloMappingCoverage,
  type CloMappingCoverage,
} from "@/lib/coordinatorCoverageView";
import { cn } from "@/lib/utils";

interface CoordinatorCoveragePanelsProps {
  coverage: CloMappingCoverage | null | undefined;
  /** Null means no measured eligible course denominator or unavailable RPC. */
  readiness: number | null;
  evidencePack: readonly AccreditationPackItem[];
}

const LABEL_KEYS = ["cloMapping", "samples", "analysis", "cqi"] as const;
const STATE = {
  done: { icon: CheckCircle2, className: "text-[var(--success-foreground)]" },
  prog: { icon: Clock, className: "text-[var(--warning-foreground)]" },
  pending: { icon: Circle, className: "text-muted-foreground" },
  unknown: { icon: Circle, className: "text-muted-foreground" },
} as const;

const CoordinatorCoveragePanels = ({
  coverage,
  readiness,
  evidencePack,
}: CoordinatorCoveragePanelsProps) => {
  const { t, i18n } = useTranslation("coordinator");
  const mapping = measuredCloMappingCoverage(coverage);
  const locale = i18n.language.startsWith("ar") ? "ar-QA" : "en";
  const percent = new Intl.NumberFormat(locale, {
    style: "percent",
    maximumFractionDigits: 0,
  });
  const count = new Intl.NumberFormat(locale);
  const display = (value: number | null) =>
    value === null ? "—" : percent.format(value / 100);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Link
        to="/coordinator/matrix"
        className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <PCard className="h-full p-4">
          <SectionHeader
            icon={LayoutGrid}
            title={t(
              mapping === 100
                ? "dashboard.gap.completeTitle"
                : mapping === null
                ? "dashboard.gap.unknownTitle"
                : "dashboard.gap.title"
            )}
            className="mb-3"
          />
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <span className="text-2xl font-bold text-foreground tabular-nums">
              {display(mapping)}
            </span>
            {mapping !== null && (
              <p className="min-w-0 flex-1 text-xs text-muted-foreground [overflow-wrap:anywhere]">
                {t(
                  mapping === 100
                    ? "dashboard.gap.completeBody"
                    : "dashboard.gap.body"
                )}
              </p>
            )}
          </div>
          {mapping === null ? (
            <p role="status" className="mt-3 text-xs text-muted-foreground">
              {t("dashboard.gap.unknownBody")}
            </p>
          ) : (
            <>
              {coverage && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {t("dashboard.gap.count", {
                    mapped: count.format(coverage.mappedClos),
                    total: count.format(coverage.totalClos),
                  })}
                </p>
              )}
              <div
                className="mt-3 h-2 overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-label={t("dashboard.gap.progressLabel")}
                aria-valuenow={mapping}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <span
                  aria-hidden="true"
                  className="block h-full rounded-full bg-primary"
                  style={{ width: `${mapping}%` }}
                />
              </div>
            </>
          )}
          <span className="mt-3 inline-flex items-center gap-1 rounded-lg bg-[var(--action-primary)] px-3 py-1.5 text-xs font-bold text-[var(--action-primary-text)]">
            {t("dashboard.gap.cta")}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        </PCard>
      </Link>

      <PCard
        className="h-full p-4"
        role="region"
        aria-label={t("dashboard.evidence.title")}
      >
        <SectionHeader
          icon={ShieldCheck}
          title={t("dashboard.evidence.title")}
          action={
            <Link
              to="/coordinator/accreditation"
              className="text-xs font-bold text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring"
            >
              {t("dashboard.evidence.open")}
            </Link>
          }
          className="mb-3"
        />
        <p className="mb-2 text-xs text-muted-foreground">
          {t("dashboard.evidence.documentedCoverage")}
        </p>
        <div className="mb-2 flex min-w-0 items-center gap-3">
          {readiness === null ? (
            <p
              role="status"
              className="min-w-0 flex-1 text-xs text-muted-foreground"
            >
              {t("dashboard.evidence.coverageUnavailable")}
            </p>
          ) : (
            <div
              className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-label={t("dashboard.evidence.documentedCoverage")}
              aria-valuenow={readiness}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <span
                aria-hidden="true"
                className="block h-full rounded-full bg-primary"
                style={{ width: `${readiness}%` }}
              />
            </div>
          )}
          <span className="shrink-0 text-sm font-bold text-foreground tabular-nums">
            {display(readiness)}
          </span>
        </div>
        <p className="mb-3 text-xs text-muted-foreground">
          {t("dashboard.evidence.scope")}
        </p>
        {evidencePack.length > 0 ? (
          <ul className="space-y-1.5">
            {evidencePack.map((item) => {
              const key =
                LABEL_KEYS.find((value) => value === item.key) ?? "unknown";
              const stateKey = Object.prototype.hasOwnProperty.call(
                STATE,
                item.state
              )
                ? item.state
                : "unknown";
              const state = STATE[stateKey];
              const Icon = state.icon;
              return (
                <li
                  key={item.key}
                  className="flex min-w-0 flex-wrap items-center justify-between gap-2"
                >
                  <span className="flex min-w-0 items-center gap-2 text-xs text-card-foreground [overflow-wrap:anywhere]">
                    <Icon
                      className={cn("h-3.5 w-3.5 shrink-0", state.className)}
                      aria-hidden="true"
                    />
                    {t(`dashboard.evidence.item.${key}`)}
                  </span>
                  <span
                    className={cn("text-xs font-semibold", state.className)}
                  >
                    {t(`dashboard.evidence.state.${stateKey}`)}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="py-2 text-center text-xs text-muted-foreground">
            {t("dashboard.evidence.emptyPack")}
          </p>
        )}
      </PCard>
    </div>
  );
};
export default CoordinatorCoveragePanels;
