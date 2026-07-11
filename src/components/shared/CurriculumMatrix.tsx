import { cn } from "@/lib/utils";
import { useCurriculumMatrix } from "@/hooks/useCurriculumMatrix";
import {
  CELL_ATTAINMENT_UNMEASURED,
  type CellData,
} from "@/hooks/useCurriculumMatrix";
import Shimmer from "@/components/shared/Shimmer";

// ─── Types ──────────────────────────────────────────────────────────────────

interface CurriculumMatrixProps {
  programId: string;
  onCellClick?: (ploId: string, courseId: string) => void;
  /**
   * When provided, renders a rightmost per-PLO coverage-summary column with the
   * given header label (the label is passed in so this shared component stays
   * i18n-agnostic). Coverage is derived from real cell statuses. Default: off,
   * so existing callers (e.g. the legacy dashboard) are unaffected.
   */
  coverageLabel?: string;
}

// ─── Status color map ───────────────────────────────────────────────────────

const statusStyles: Record<CellData["status"], string> = {
  green: "bg-green-100 text-green-700",
  yellow: "bg-yellow-100 text-yellow-700",
  red: "bg-red-100 text-red-700",
  gray: "bg-gray-100 text-gray-400",
};

// Coverage summary color band (computed from real cell statuses):
// assessed (green) counts 1.0, introduced (yellow) 0.5, else 0.
const coverageColor = (v: number): string =>
  v >= 70 ? "#16a34a" : v >= 40 ? "#d97706" : "#dc2626";

// ─── Cell label ─────────────────────────────────────────────────────────────

/**
 * The visible cell label. Shows the real attainment percentage when measured,
 * an em-dash when CLOs are mapped but no attainment evidence exists yet, and an
 * empty cell when no CLOs are mapped (C-2).
 */
function formatCellLabel(cell: CellData): string {
  if (cell.cloCount === 0) return "";
  if (cell.attainmentPercent === CELL_ATTAINMENT_UNMEASURED) return "—";
  return `${cell.attainmentPercent}%`;
}

// ─── Component ──────────────────────────────────────────────────────────────

const CurriculumMatrix = ({
  programId,
  onCellClick,
  coverageLabel,
}: CurriculumMatrixProps) => {
  const { data, isLoading } = useCurriculumMatrix(programId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Shimmer className="h-8 w-full" />
        <Shimmer className="h-48 w-full" />
      </div>
    );
  }

  if (!data || data.plos.length === 0 || data.courses.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-gray-500">
        No PLOs or courses found for this program. Add PLOs and courses to see
        the curriculum matrix.
      </div>
    );
  }

  const { plos, courses, matrix } = data;

  // Per-PLO coverage %, derived from real cell statuses.
  const coverageFor = (ploId: string): number => {
    if (courses.length === 0) return 0;
    let sum = 0;
    for (const c of courses) {
      const status = matrix[ploId]?.[c.id]?.status;
      if (status === "green") sum += 1;
      else if (status === "yellow") sum += 0.5;
    }
    return Math.round((sum / courses.length) * 100);
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-md">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="sticky start-0 z-10 bg-slate-50 border-b border-e border-slate-200 px-4 py-3 text-start text-xs font-bold tracking-widest uppercase text-gray-500 min-w-[200px]">
              PLO
            </th>
            {courses.map((course) => (
              <th
                key={course.id}
                className="border-b border-slate-200 px-3 py-3 text-center text-xs font-bold tracking-wide uppercase text-gray-500 min-w-[100px]"
              >
                {course.code}
              </th>
            ))}
            {coverageLabel && (
              <th className="border-b border-s border-slate-200 bg-slate-50 px-4 py-3 text-end text-xs font-bold tracking-widest uppercase text-gray-500 min-w-[140px]">
                {coverageLabel}
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {plos.map((plo) => {
            const cov = coverageLabel ? coverageFor(plo.id) : 0;
            return (
              <tr
                key={plo.id}
                className="border-b border-slate-100 last:border-b-0"
              >
                <td
                  className="sticky start-0 z-10 bg-white border-e border-slate-200 px-4 py-3 font-medium text-gray-700 max-w-[200px] truncate"
                  title={plo.title}
                >
                  {plo.title}
                </td>
                {courses.map((course) => {
                  const cell = matrix[plo.id]?.[course.id];
                  if (!cell)
                    return <td key={course.id} className="px-3 py-3" />;

                  const label = formatCellLabel(cell);
                  const title =
                    cell.cloCount === 0
                      ? "No CLOs mapped"
                      : cell.attainmentPercent === CELL_ATTAINMENT_UNMEASURED
                      ? `${cell.cloCount} CLO(s) mapped — attainment not yet measured`
                      : `${cell.attainmentPercent}% attainment across ${cell.cloCount} CLO(s)`;

                  return (
                    <td key={course.id} className="px-3 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => onCellClick?.(plo.id, course.id)}
                        className={cn(
                          "inline-flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold transition-transform hover:scale-110",
                          statusStyles[cell.status],
                          onCellClick && "cursor-pointer",
                          !onCellClick && "cursor-default"
                        )}
                        title={title}
                      >
                        {label}
                      </button>
                    </td>
                  );
                })}
                {coverageLabel && (
                  <td className="border-s border-slate-100 px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${cov}%`,
                            background: coverageColor(cov),
                          }}
                        />
                      </div>
                      <span
                        className="text-xs font-bold"
                        style={{ color: coverageColor(cov) }}
                      >
                        {cov}%
                      </span>
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default CurriculumMatrix;
