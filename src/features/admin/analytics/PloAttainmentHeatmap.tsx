// Actual admin PLO heatmap. Display categories use the existing 85/70/50
// visualization cutoffs; official grade scales/native attainment remain distinct.
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PCard,
  StatePanel,
  AdminSectionHeader,
} from "@/design-system/patterns";
import type { PLOHeatmapCard } from "@/hooks/useAdminAnalytics";
import {
  PLO_BAND_LIMITS,
  safePloBand,
  type PloBand,
} from "@/lib/ploAttainmentBand";
import { cn } from "@/lib/utils";

export interface PloAttainmentRow
  extends Pick<
    PLOHeatmapCard,
    "ploId" | "ploCodeTitle" | "meanAttainment" | "statusBand"
  > {
  derivation?: "program" | "clo_rollup" | "none";
  contributingCount?: number;
}
export interface PloAttainmentHeatmapProps {
  rows: readonly PloAttainmentRow[];
  programs: readonly { id: string; name: string }[];
  selectedProgram: string;
  onProgramChange: (programId: string) => void;
  filterState: "ready" | "loading" | "error";
  onRetry?: () => void;
}

// The SAME named ink owns the marker and its tinted cell text, including HC.
// This is an academic PLO category map, not a generic success/error action API.
const PAINT: Record<PloBand, { surface: string; ink: string; marker: string }> =
  {
    excellent: {
      surface: "bg-[var(--plo-excellent-surface)]",
      ink: "text-[var(--plo-excellent-ink)]",
      marker: "bg-[var(--plo-excellent-ink)]",
    },
    satisfactory: {
      surface: "bg-[var(--plo-satisfactory-surface)]",
      ink: "text-[var(--plo-satisfactory-ink)]",
      marker: "bg-[var(--plo-satisfactory-ink)]",
    },
    developing: {
      surface: "bg-[var(--plo-developing-surface)]",
      ink: "text-[var(--plo-developing-ink)]",
      marker: "bg-[var(--plo-developing-ink)]",
    },
    notYet: {
      surface: "bg-[var(--plo-not-yet-surface)]",
      ink: "text-[var(--plo-not-yet-ink)]",
      marker: "bg-[var(--plo-not-yet-ink)]",
    },
    unmeasured: {
      surface: "bg-[var(--plo-unmeasured-surface)]",
      ink: "text-[var(--plo-unmeasured-ink)]",
      marker: "bg-[var(--plo-unmeasured-ink)]",
    },
  };
const BANDS: readonly PloBand[] = [
  "excellent",
  "satisfactory",
  "developing",
  "notYet",
  "unmeasured",
];

const PloAttainmentHeatmap = ({
  rows,
  programs,
  selectedProgram,
  onProgramChange,
  filterState,
  onRetry,
}: PloAttainmentHeatmapProps) => {
  const { t, i18n } = useTranslation("common");
  const locale = i18n.language.startsWith("ar") ? "ar-QA" : "en";
  const percent = new Intl.NumberFormat(locale, {
    style: "percent",
    maximumFractionDigits: 2,
  });
  const integer = new Intl.NumberFormat(locale);
  const format = (value: number) => percent.format(value / 100);
  const label = (band: PloBand) =>
    band === "unmeasured"
      ? t("adminPloHeatmap.unmeasured")
      : t(`attainment.${band}`);
  const range = (band: PloBand) => {
    if (band === "excellent")
      return t("adminPloHeatmap.rangeAtLeast", {
        min: format(PLO_BAND_LIMITS.excellent),
      });
    if (band === "satisfactory")
      return t("adminPloHeatmap.rangeBetween", {
        min: format(PLO_BAND_LIMITS.satisfactory),
        max: format(PLO_BAND_LIMITS.excellent),
      });
    if (band === "developing")
      return t("adminPloHeatmap.rangeBetween", {
        min: format(PLO_BAND_LIMITS.developing),
        max: format(PLO_BAND_LIMITS.satisfactory),
      });
    if (band === "notYet")
      return t("adminPloHeatmap.rangeBelow", {
        threshold: format(PLO_BAND_LIMITS.developing),
      });
    return "";
  };
  const source = (row: PloAttainmentRow) =>
    row.derivation === "program" &&
    Number.isSafeInteger(row.contributingCount) &&
    (row.contributingCount ?? 0) > 0
      ? t("adminPloHeatmap.sourceProgram", {
          formattedCount: integer.format(row.contributingCount!),
        })
      : row.derivation === "clo_rollup" &&
        Number.isSafeInteger(row.contributingCount) &&
        (row.contributingCount ?? 0) > 0
      ? t("adminPloHeatmap.sourceClo", {
          formattedCount: integer.format(row.contributingCount!),
        })
      : t("adminPloHeatmap.sourceRecorded");

  return (
    <PCard className="p-4">
      <div className="mb-4 flex min-w-0 flex-wrap items-center justify-between gap-3">
        <AdminSectionHeader emoji="🗺️" title={t("adminPloHeatmap.title")} />
        <Select
          value={selectedProgram}
          onValueChange={onProgramChange}
          dir={i18n.dir()}
        >
          <SelectTrigger
            size="sm"
            className="min-h-11 min-w-0 max-w-full bg-card text-card-foreground dark:bg-card dark:text-card-foreground text-xs font-bold"
            aria-label={t("adminPloHeatmap.programFilter")}
          >
            <SelectValue placeholder={t("adminPloHeatmap.programFilter")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {t("adminPloHeatmap.allPrograms")}
            </SelectItem>
            {programs.map((program) => (
              <SelectItem key={program.id} value={program.id}>
                {program.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filterState === "loading" ? (
        <StatePanel variant="loading" message={t("adminPloHeatmap.loading")} />
      ) : filterState === "error" ? (
        <StatePanel
          variant="error"
          className="border-0 bg-transparent p-0 shadow-none"
          message={t("adminPloHeatmap.error")}
          action={
            onRetry && (
              <Button type="button" onClick={onRetry}>
                {t("adminPloHeatmap.retry")}
              </Button>
            )
          }
        />
      ) : rows.length === 0 ? (
        <StatePanel
          variant="empty"
          className="border-0 bg-transparent p-0 shadow-none"
          message={t("adminPloHeatmap.empty")}
        />
      ) : (
        <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-4">
          {rows.map((row) => {
            const band = safePloBand(row.meanAttainment, row.statusBand);
            const paint = PAINT[band];
            return (
              <li
                key={row.ploId}
                data-plo-band={band}
                className={cn(
                  "min-w-0 rounded-xl border border-border p-3",
                  paint.surface,
                  paint.ink
                )}
              >
                <p className="break-words text-xs font-bold">
                  {row.ploCodeTitle}
                </p>
                <p className="mt-1 text-xl font-bold tabular-nums">
                  {band === "unmeasured" ? "—" : format(row.meanAttainment)}
                </p>
                <p className="text-xs font-semibold">{label(band)}</p>
                {band !== "unmeasured" && (
                  <p className="mt-1 break-words text-xs">{source(row)}</p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {filterState === "ready" && rows.length > 0 && (
        <>
          <ul
            className="mt-4 flex flex-wrap gap-3 text-xs text-card-foreground"
            aria-label={t("adminPloHeatmap.legend")}
          >
            {BANDS.map((band) => (
              <li
                key={band}
                data-plo-legend={band}
                className="inline-flex min-w-0 items-center gap-1.5"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "inline-block h-3 w-3 shrink-0 rounded-sm",
                    PAINT[band].marker
                  )}
                />
                <span className="break-words">
                  {label(band)}
                  {band !== "unmeasured" ? `: ${range(band)}` : ""}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground [overflow-wrap:anywhere]">
            {t("adminPloHeatmap.disclaimer", {
              excellent: format(PLO_BAND_LIMITS.excellent),
              satisfactory: format(PLO_BAND_LIMITS.satisfactory),
              developing: format(PLO_BAND_LIMITS.developing),
            })}
          </p>
        </>
      )}
    </PCard>
  );
};
export default PloAttainmentHeatmap;
