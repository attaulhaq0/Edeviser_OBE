// =============================================================================
// AttainmentInfo — Accessible explanation of attainment mastery and the four
// threshold bands with their colors.
//
// Satisfies Requirement 8:
//  - 8.1 accessible explanation that attainment reflects mastery of CLOs
//  - 8.2 describes Excellent (≥85%), Satisfactory (70–84%), Developing (50–69%),
//        Not Yet (<50%); 50% → Developing, <50% → Not Yet
//  - 8.3 each band's color is derived from `attainmentClassifier`, so the legend
//        color always corresponds to the classification band
//  - 8.4 available in English and Arabic (i18next, en + ar keys)
// =============================================================================

import { useId } from "react";
import { useTranslation } from "react-i18next";
import { Info } from "lucide-react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  classifyAttainment,
  getAttainmentColor,
} from "@/lib/attainmentClassifier";
import {
  DEFAULT_ATTAINMENT_THRESHOLDS,
  type AttainmentLevel,
  type AttainmentThresholdsConfig,
} from "@/types/app";

interface AttainmentInfoProps {
  /**
   * Optional attainment percentage. When provided (and valid), the band the
   * value falls into is highlighted in the legend. A negative value or omission
   * is treated as "no data" and highlights nothing.
   */
  percent?: number;
  /**
   * Institution-configurable thresholds. Defaults to the platform defaults
   * (85 / 70 / 50) so the explanation always matches the active classification.
   */
  thresholds?: AttainmentThresholdsConfig;
  /** Side the popover opens toward. */
  side?: "top" | "right" | "bottom" | "left";
  /** Extra classes for the trigger button. */
  className?: string;
}

interface BandRow {
  level: AttainmentLevel;
  name: string;
  range: string;
  /** Hex color sourced from `attainmentClassifier` for this band. */
  color: string;
  active: boolean;
}

const AttainmentInfo = ({
  percent,
  thresholds = DEFAULT_ATTAINMENT_THRESHOLDS,
  side = "bottom",
  className,
}: AttainmentInfoProps) => {
  const { t } = useTranslation("common");
  const titleId = useId();
  const descId = useId();

  // Only highlight a band when we have a real, non-negative percentage.
  const activeLevel: AttainmentLevel | null =
    typeof percent === "number" && Number.isFinite(percent) && percent >= 0
      ? classifyAttainment(percent, thresholds)
      : null;

  // Each band's color is derived by classifying a value known to fall inside
  // that band, guaranteeing the legend swatch matches the classifier (R8.3).
  const bands: BandRow[] = [
    {
      level: "Excellent",
      name: t("attainment.excellent"),
      range: t("attainmentInfo.ranges.excellent", {
        min: thresholds.excellent,
      }),
      color: getAttainmentColor(thresholds.excellent, thresholds),
      active: activeLevel === "Excellent",
    },
    {
      level: "Satisfactory",
      name: t("attainment.satisfactory"),
      range: t("attainmentInfo.ranges.satisfactory", {
        min: thresholds.satisfactory,
        max: thresholds.excellent - 1,
      }),
      color: getAttainmentColor(thresholds.satisfactory, thresholds),
      active: activeLevel === "Satisfactory",
    },
    {
      level: "Developing",
      name: t("attainment.developing"),
      range: t("attainmentInfo.ranges.developing", {
        min: thresholds.developing,
        max: thresholds.satisfactory - 1,
      }),
      color: getAttainmentColor(thresholds.developing, thresholds),
      active: activeLevel === "Developing",
    },
    {
      level: "Not_Yet",
      name: t("attainment.notYet"),
      range: t("attainmentInfo.ranges.notYet", {
        threshold: thresholds.developing,
      }),
      // Any value below `developing` classifies as Not_Yet.
      color: getAttainmentColor(thresholds.developing - 1, thresholds),
      active: activeLevel === "Not_Yet",
    },
  ];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          aria-label={t("attainmentInfo.triggerLabel")}
          data-testid="attainment-info-trigger"
          className={cn(
            // 44px touch target while keeping a compact icon.
            "inline-flex h-11 w-11 items-center justify-center rounded-full p-0 text-muted-foreground hover:text-foreground",
            className
          )}
        >
          <Info className="h-4 w-4" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side={side}
        align="start"
        role="dialog"
        aria-labelledby={titleId}
        aria-describedby={descId}
        data-testid="attainment-info-content"
      >
        <div className="space-y-3">
          <div>
            <h3
              id={titleId}
              className="text-sm font-bold tracking-tight text-foreground"
            >
              {t("attainmentInfo.title")}
            </h3>
            <p id={descId} className="mt-1 text-xs text-muted-foreground">
              {t("attainmentInfo.description")}
            </p>
          </div>

          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              {t("attainmentInfo.bandsHeading")}
            </p>
            <ul className="mt-2 space-y-1.5">
              {bands.map((band) => (
                <li
                  key={band.level}
                  data-testid={`attainment-band-${band.level}`}
                  data-active={band.active ? "true" : undefined}
                  className="flex items-center gap-2"
                >
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: band.color }}
                    aria-hidden="true"
                  />
                  <span
                    className={cn(
                      "text-sm text-foreground",
                      band.active ? "font-bold" : "font-medium"
                    )}
                  >
                    {band.name}
                  </span>
                  <span className="ms-auto text-xs tabular-nums text-muted-foreground">
                    {band.range}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default AttainmentInfo;
export type { AttainmentInfoProps };
