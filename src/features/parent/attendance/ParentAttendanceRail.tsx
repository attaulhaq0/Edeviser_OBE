// =============================================================================
// ParentAttendanceRail — Dedicated Right Rail for Parent Attendance page
// =============================================================================
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Calendar,
  Phone,
  AlertTriangle,
  ChevronRight,
  HelpCircle,
} from "lucide-react";
import { ParentButton } from "@/components/shared/ParentButton";
import { ParentSectionIcon } from "@/components/shared/ParentSectionIcon";
import type { ParentAttendanceOverview } from "@/hooks/useAttendance";

interface ParentAttendanceRailProps {
  overview?: ParentAttendanceOverview;
}

export const ParentAttendanceRail = ({
  overview,
}: ParentAttendanceRailProps) => {
  const { t } = useTranslation("common");

  const totals = overview?.totals;
  const period = overview?.period;
  const attention = overview?.attention;
  const coursesCount = overview?.courses.length ?? 4;

  const totalSessions = totals?.totalSessions ?? 120;
  const attended = totals?.attended ?? 116;
  const missed = totals?.absent ?? 4;
  const late = totals?.late ?? 1;
  const periodLabel = period?.label ?? "Apr 7 – May 18, 2026";

  return (
    <aside className="space-y-4 w-full">
      {/* ── This Term Summary Card ── */}
      <div className="rounded-[20px] border border-[#eef2f6] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_10px_26px_rgba(16,24,40,0.05)] dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-3 flex items-center gap-2">
          <ParentSectionIcon emoji="📅" />
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100">
            {t("parentAttendance.rail.thisTerm", "This term")}
          </h2>
        </div>

        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-400">
              Total sessions
            </span>
            <span className="font-extrabold text-slate-900 dark:text-slate-100">
              {attended} / {totalSessions} attended
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-400">
              Missed sessions
            </span>
            <span className="font-extrabold text-red-600 dark:text-red-400">
              {missed} missed
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-400">
              Late arrivals
            </span>
            <span className="font-extrabold text-amber-600 dark:text-amber-400">
              {late} late
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-400">
              Enrolled courses
            </span>
            <span className="font-extrabold text-slate-900 dark:text-slate-100">
              {coursesCount} courses
            </span>
          </div>

          <div className="mt-3 flex items-center gap-1.5 border-t border-slate-100 pt-2.5 text-[11px] font-bold text-slate-400 dark:border-slate-800">
            <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{periodLabel}</span>
          </div>
        </div>
      </div>

      {/* ── Needs Attention Card (Only rendered when absence concentration exists) ── */}
      {attention && (
        <div className="rounded-[20px] border border-amber-200 bg-amber-50/70 p-5 shadow-xs dark:border-amber-900/50 dark:bg-amber-950/30">
          <div className="mb-2 flex items-center gap-2 text-amber-800 dark:text-amber-300">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <h2 className="text-xs font-extrabold uppercase tracking-wider">
              {t("parentAttendance.rail.needsAttention", "Needs attention")}
            </h2>
          </div>
          <p className="text-xs font-medium leading-relaxed text-amber-900 dark:text-amber-200">
            {attention.message}
          </p>
          <button
            type="button"
            onClick={() =>
              toast.info(
                t(
                  "parentAttendance.rail.filteringMath",
                  "Filtering attendance history for {{course}}",
                  { course: attention.courseName }
                )
              )
            }
            className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-amber-900 hover:underline dark:text-amber-300"
          >
            Review {attention.courseName} attendance{" "}
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* ── Need Help Card ── */}
      <div className="rounded-[20px] border border-[#eef2f6] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_10px_26px_rgba(16,24,40,0.05)] dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-2 flex items-center gap-2">
          <ParentSectionIcon emoji="💬" />
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100">
            {t("parentAttendance.rail.needHelp", "Need help?")}
          </h2>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed mb-3">
          Questions about an absence or attendance record?
        </p>

        <div className="space-y-2">
          <ParentButton
            variant="ghost"
            size="sm"
            onClick={() =>
              toast.info("Gulf Academy Attendance Office: +974 4000 1234")
            }
            className="w-full justify-start text-xs font-bold"
          >
            <Phone className="h-3.5 w-3.5 text-sky-600" aria-hidden="true" />
            Contact attendance office
          </ParentButton>

          <ParentButton
            variant="ghost"
            size="sm"
            onClick={() =>
              toast.info("Opening Gulf Academy Student Attendance Policy...")
            }
            className="w-full justify-start text-xs font-bold"
          >
            <HelpCircle
              className="h-3.5 w-3.5 text-slate-500"
              aria-hidden="true"
            />
            View attendance policy
          </ParentButton>
        </div>
      </div>
    </aside>
  );
};

export default ParentAttendanceRail;
