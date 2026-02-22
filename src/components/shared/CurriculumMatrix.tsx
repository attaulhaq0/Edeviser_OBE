import { cn } from '@/lib/utils';
import { useCurriculumMatrix } from '@/hooks/useCurriculumMatrix';
import type { CellData } from '@/hooks/useCurriculumMatrix';
import Shimmer from '@/components/shared/Shimmer';

// ─── Types ──────────────────────────────────────────────────────────────────

interface CurriculumMatrixProps {
  programId: string;
  onCellClick?: (ploId: string, courseId: string) => void;
}

// ─── Status color map ───────────────────────────────────────────────────────

const statusStyles: Record<CellData['status'], string> = {
  green: 'bg-green-100 text-green-700',
  yellow: 'bg-yellow-100 text-yellow-700',
  red: 'bg-red-100 text-red-700',
  gray: 'bg-gray-100 text-gray-400',
};

// ─── Component ──────────────────────────────────────────────────────────────

const CurriculumMatrix = ({ programId, onCellClick }: CurriculumMatrixProps) => {
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
        No PLOs or courses found for this program. Add PLOs and courses to see the curriculum matrix.
      </div>
    );
  }

  const { plos, courses, matrix } = data;

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-md">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-slate-50 border-b border-r border-slate-200 px-4 py-3 text-left text-xs font-bold tracking-widest uppercase text-gray-500 min-w-[200px]">
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
          </tr>
        </thead>
        <tbody>
          {plos.map((plo) => (
            <tr key={plo.id} className="border-b border-slate-100 last:border-b-0">
              <td className="sticky left-0 z-10 bg-white border-r border-slate-200 px-4 py-3 font-medium text-gray-700 max-w-[200px] truncate" title={plo.title}>
                {plo.title}
              </td>
              {courses.map((course) => {
                const cell = matrix[plo.id]?.[course.id];
                if (!cell) return <td key={course.id} className="px-3 py-3" />;

                return (
                  <td key={course.id} className="px-3 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => onCellClick?.(plo.id, course.id)}
                      className={cn(
                        'inline-flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold transition-transform hover:scale-110',
                        statusStyles[cell.status],
                        onCellClick && 'cursor-pointer',
                        !onCellClick && 'cursor-default',
                      )}
                      title={`${cell.cloCount} CLO(s) mapped`}
                    >
                      {cell.cloCount}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CurriculumMatrix;
