import { useState } from 'react';
import { ChevronRight, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import CLOProgressBar from '@/components/shared/CLOProgressBar';
import type { LearningOutcome } from '@/types/app';

interface SubCLORowProps {
  subCLO: LearningOutcome & { weight?: number };
  attainment?: number;
  onDelete?: (id: string) => void;
  deleteDisabled?: boolean;
  deleteTooltip?: string;
}

const SubCLORow = ({
  subCLO,
  attainment,
  onDelete,
  deleteDisabled,
  deleteTooltip,
}: SubCLORowProps) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-s-2 border-slate-200 ms-6 ps-4 py-2">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="p-1 rounded hover:bg-slate-100 transition-colors"
          aria-expanded={expanded}
          aria-label={`Toggle details for ${subCLO.title}`}
        >
          <ChevronRight
            className={cn(
              'h-4 w-4 text-slate-400 transition-transform',
              expanded && 'rotate-90',
            )}
          />
        </button>

        <Badge variant="outline" className="text-xs font-mono">
          {'SC'}
        </Badge>

        <span className="text-sm font-medium flex-1 truncate">{subCLO.title}</span>

        {subCLO.weight !== undefined && (
          <span className="text-xs text-slate-500 tabular-nums">
            w: {(subCLO.weight * 100).toFixed(0)}%
          </span>
        )}

        {attainment !== undefined && (
          <div className="w-24">
            <CLOProgressBar
              title={subCLO.title}
              bloomsLevel={subCLO.blooms_level ?? 'remembering'}
              attainmentPercent={attainment}
              attainmentLevel={
                attainment >= 85 ? 'Excellent' :
                attainment >= 70 ? 'Satisfactory' :
                attainment >= 50 ? 'Developing' : 'Not_Yet'
              }
            />
          </div>
        )}

        {onDelete && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(subCLO.id)}
            disabled={deleteDisabled}
            title={deleteTooltip}
            className="h-7 w-7 p-0 text-slate-400 hover:text-red-500"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {expanded && subCLO.description && (
        <p className="text-xs text-slate-500 mt-1 ms-8">{subCLO.description}</p>
      )}
    </div>
  );
};

export default SubCLORow;
