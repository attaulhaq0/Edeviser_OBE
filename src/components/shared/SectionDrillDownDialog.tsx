// =============================================================================
// SectionDrillDownDialog — Coordinator section drill-down (Req 10.3)
// -----------------------------------------------------------------------------
// Feature: qa-partner-review-remediation — Req 10.3, 10.5
//
// Opened from a clickable bar in SectionComparisonChart. Shows the section's
// teacher plus per-CLO attainment (with evidence sample counts), color-coded
// via getAttainmentColor.
// =============================================================================

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import Shimmer from "@/components/shared/Shimmer";
import { useSectionDrillDown } from "@/hooks/useSectionAttainment";
import { getAttainmentColor } from "@/lib/attainmentClassifier";
import { GraduationCap, Users, Target } from "lucide-react";
import type { BloomsLevel } from "@/types/app";

// ─── Bloom's badge color map (from design-system steering) ──────────────────

const bloomsStyles: Record<BloomsLevel, string> = {
  remembering: "bg-purple-500 text-white",
  understanding: "bg-blue-500 text-white",
  applying: "bg-green-500 text-white",
  analyzing: "bg-yellow-500 text-gray-900",
  evaluating: "bg-orange-500 text-white",
  creating: "bg-red-500 text-white",
};

interface SectionDrillDownDialogProps {
  courseId: string | undefined;
  sectionId: string | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SectionDrillDownDialog = ({
  courseId,
  sectionId,
  open,
  onOpenChange,
}: SectionDrillDownDialogProps) => {
  const { data, isLoading } = useSectionDrillDown(
    open ? courseId : undefined,
    open ? sectionId : undefined
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          {isLoading ? (
            <>
              <Shimmer className="h-5 w-48" />
              <Shimmer className="h-4 w-32" />
            </>
          ) : data ? (
            <>
              <DialogTitle className="flex items-center gap-2">
                <Target className="h-4 w-4 text-blue-600" />
                Section {data.section_code}
              </DialogTitle>
              <DialogDescription className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="inline-flex items-center gap-1.5">
                  <GraduationCap className="h-3.5 w-3.5" />
                  {data.teacher_name ?? "Unassigned teacher"}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  {data.student_count} students
                </span>
              </DialogDescription>
            </>
          ) : (
            <DialogTitle>Section detail</DialogTitle>
          )}
        </DialogHeader>

        <div className="space-y-3">
          {isLoading ? (
            <div className="space-y-2">
              <Shimmer className="h-14 w-full rounded-lg" />
              <Shimmer className="h-14 w-full rounded-lg" />
            </div>
          ) : data && data.clos.length > 0 ? (
            <>
              <p className="text-xs font-bold tracking-widest uppercase text-gray-500">
                CLO Attainment ({data.clos.length})
              </p>
              <ul className="space-y-2">
                {data.clos.map((clo) => (
                  <li
                    key={clo.clo_id}
                    className="rounded-lg border border-slate-200 bg-white p-3 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-medium text-gray-800">
                        {clo.clo_title}
                      </p>
                      {clo.sample_count > 0 ? (
                        <span
                          className="text-sm font-bold tabular-nums shrink-0"
                          style={{
                            color: getAttainmentColor(clo.attainment_percent),
                          }}
                        >
                          {clo.attainment_percent}%
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 shrink-0">
                          No evidence
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      {clo.blooms_level ? (
                        <Badge className={bloomsStyles[clo.blooms_level]}>
                          {clo.blooms_level}
                        </Badge>
                      ) : (
                        <span />
                      )}
                      {clo.sample_count > 0 && (
                        <div className="h-2 flex-1 max-w-[140px] rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${clo.attainment_percent}%`,
                              backgroundColor: getAttainmentColor(
                                clo.attainment_percent
                              ),
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-gray-500">
              No course learning outcomes defined for this section yet.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SectionDrillDownDialog;
export type { SectionDrillDownDialogProps };
