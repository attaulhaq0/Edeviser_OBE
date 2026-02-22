import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { RubricWithCriteria } from '@/hooks/useRubrics';

interface RubricPreviewProps {
  rubric: RubricWithCriteria;
  selectedCells?: Record<string, number>; // criterion_id → level_index
  onCellClick?: (criterionId: string, levelIndex: number) => void;
}

const RubricPreview = ({ rubric, selectedCells, onCellClick }: RubricPreviewProps) => {
  const sortedCriteria = useMemo(
    () => [...rubric.criteria].sort((a, b) => a.sort_order - b.sort_order),
    [rubric.criteria],
  );

  const totalMaxScore = useMemo(
    () => sortedCriteria.reduce((sum, c) => sum + c.max_points, 0),
    [sortedCriteria],
  );

  const levelLabels = useMemo(() => {
    const first = sortedCriteria[0];
    if (!first) return [];
    return first.levels.map((l) => l.label);
  }, [sortedCriteria]);

  if (sortedCriteria.length === 0) {
    return (
      <Card className="bg-white border-0 shadow-md rounded-xl p-6">
        <p className="text-sm text-gray-500">No criteria defined for this rubric.</p>
      </Card>
    );
  }

  if (levelLabels.length === 0) {
    return (
      <Card className="bg-white border-0 shadow-md rounded-xl p-6">
        <p className="text-sm text-gray-500">No performance levels defined.</p>
      </Card>
    );
  }

  const isInteractive = !!onCellClick;

  return (
    <Card className="bg-white border-0 shadow-md rounded-xl p-6 space-y-4">
      <h3 className="text-lg font-bold tracking-tight">{rubric.title}</h3>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="p-3 text-left text-xs font-bold uppercase tracking-wider text-gray-500 border border-slate-200 bg-slate-50 w-48 min-w-[12rem]">
                Criterion
              </th>
              {levelLabels.map((label, idx) => (
                <th
                  key={idx}
                  className="p-3 text-center text-xs font-bold uppercase tracking-wider text-gray-500 border border-slate-200 bg-slate-50 min-w-[10rem]"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedCriteria.map((criterion) => (
              <tr key={criterion.id}>
                <td className="p-3 border border-slate-200 align-top">
                  <span className="font-medium text-gray-700 text-sm">
                    {criterion.criterion_name}
                  </span>
                </td>
                {criterion.levels.map((level, levelIdx) => {
                  const isSelected = selectedCells?.[criterion.id] === levelIdx;

                  return (
                    <td
                      key={levelIdx}
                      className={cn(
                        'p-3 border align-top transition-colors',
                        isSelected
                          ? 'bg-blue-100 border-blue-500 border-2'
                          : 'bg-white border-slate-200',
                        isInteractive && 'cursor-pointer hover:bg-blue-50',
                      )}
                      onClick={
                        isInteractive
                          ? () => onCellClick(criterion.id, levelIdx)
                          : undefined
                      }
                      role={isInteractive ? 'button' : undefined}
                      tabIndex={isInteractive ? 0 : undefined}
                      onKeyDown={
                        isInteractive
                          ? (e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                onCellClick(criterion.id, levelIdx);
                              }
                            }
                          : undefined
                      }
                    >
                      <div className="space-y-2">
                        <p className="text-xs text-gray-600">
                          {level.description || '—'}
                        </p>
                        <Badge variant="secondary" className="text-xs">
                          {level.points} pt{level.points !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-300">
              <td
                className="p-3 text-right text-sm font-bold text-gray-700"
                colSpan={levelLabels.length + 1}
              >
                Total Score:{' '}
                <span className="text-lg font-black text-blue-600">
                  {totalMaxScore}
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  );
};

export default RubricPreview;
