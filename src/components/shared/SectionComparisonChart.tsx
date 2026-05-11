// =============================================================================
// SectionComparisonChart — Compare sections on attainment metrics
// =============================================================================

import { cn } from "@/lib/utils";

interface SectionData {
  sectionCode: string;
  attainmentPercent: number;
  studentCount: number;
}

interface SectionComparisonChartProps {
  sections: SectionData[];
  className?: string;
}

const SECTION_COLORS = [
  "bg-blue-500",
  "bg-teal-500",
  "bg-purple-500",
  "bg-amber-500",
  "bg-green-500",
];

const SectionComparisonChart = ({
  sections,
  className,
}: SectionComparisonChartProps) => {
  const maxPercent = Math.max(...sections.map((s) => s.attainmentPercent), 1);

  return (
    <div className={cn("space-y-3", className)}>
      {sections.map((section, idx) => (
        <div key={section.sectionCode} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Section {section.sectionCode}</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">
                {section.studentCount} students
              </span>
              <span className="font-bold tabular-nums">
                {Math.round(section.attainmentPercent)}%
              </span>
            </div>
          </div>
          <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                SECTION_COLORS[idx % SECTION_COLORS.length]
              )}
              style={{
                width: `${(section.attainmentPercent / maxPercent) * 100}%`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

export default SectionComparisonChart;
export type { SectionComparisonChartProps, SectionData };
