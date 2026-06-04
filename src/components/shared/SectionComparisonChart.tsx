// =============================================================================
// SectionComparisonChart — Compare sections on attainment metrics
// -----------------------------------------------------------------------------
// Feature: qa-partner-review-remediation — Req 10.3, 10.4, 10.5
//
// • Bars are clickable when `onSectionClick` is provided → opens a drill-down.
// • A section with no attainment evidence (`sampleCount === 0`) renders an
//   inline empty state instead of a misleading 0% bar (Req 10.4).
// • Bar color is driven by the platform attainment thresholds via
//   getAttainmentColor (Req 10.5).
// =============================================================================

import { cn } from "@/lib/utils";
import { getAttainmentColor } from "@/lib/attainmentClassifier";

interface SectionData {
  /** Stable section identifier (used for drill-down + React keys). */
  sectionId?: string;
  sectionCode: string;
  attainmentPercent: number;
  studentCount: number;
  /**
   * Number of attainment records backing this section. When 0, the section has
   * no evidence yet and an inline empty state is shown instead of a 0% bar.
   * Defaults to a truthy value so existing callers keep rendering a bar.
   */
  sampleCount?: number;
}

interface SectionComparisonChartProps {
  sections: SectionData[];
  className?: string;
  /** When provided, each section row becomes a clickable button. */
  onSectionClick?: (section: SectionData) => void;
}

const SectionComparisonChart = ({
  sections,
  className,
  onSectionClick,
}: SectionComparisonChartProps) => {
  const hasEvidence = (section: SectionData): boolean =>
    (section.sampleCount ?? 1) > 0;

  return (
    <div className={cn("space-y-3", className)}>
      {sections.map((section) => {
        const showBar = hasEvidence(section);
        const clickable = !!onSectionClick;

        const RowContent = (
          <>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Section {section.sectionCode}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">
                  {section.studentCount} students
                </span>
                {showBar ? (
                  <span
                    className="font-bold tabular-nums"
                    style={{
                      color: getAttainmentColor(section.attainmentPercent),
                    }}
                  >
                    {Math.round(section.attainmentPercent)}%
                  </span>
                ) : (
                  <span className="text-xs italic text-gray-400">
                    No evidence yet
                  </span>
                )}
              </div>
            </div>
            {showBar ? (
              <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(
                      Math.max(section.attainmentPercent, 0),
                      100
                    )}%`,
                    backgroundColor: getAttainmentColor(
                      section.attainmentPercent
                    ),
                  }}
                />
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs text-gray-500">
                No attainment evidence recorded for this section yet.
              </div>
            )}
          </>
        );

        return clickable ? (
          <button
            key={section.sectionId ?? section.sectionCode}
            type="button"
            onClick={() => onSectionClick(section)}
            className="w-full space-y-1 rounded-lg p-1.5 text-left transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label={`View details for section ${section.sectionCode}`}
          >
            {RowContent}
          </button>
        ) : (
          <div
            key={section.sectionId ?? section.sectionCode}
            className="space-y-1 p-1.5"
          >
            {RowContent}
          </div>
        );
      })}
    </div>
  );
};

export default SectionComparisonChart;
export type { SectionComparisonChartProps, SectionData };
