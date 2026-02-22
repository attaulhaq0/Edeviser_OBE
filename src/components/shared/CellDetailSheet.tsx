import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import Shimmer from '@/components/shared/Shimmer';
import { useCellDetail } from '@/hooks/useCurriculumMatrix';
import { BookOpen, Layers } from 'lucide-react';
import type { BloomsLevel } from '@/types/app';

// ─── Bloom's badge color map (from design-system steering) ──────────────────

const bloomsStyles: Record<BloomsLevel, string> = {
  Remembering: 'bg-purple-500 text-white',
  Understanding: 'bg-blue-500 text-white',
  Applying: 'bg-green-500 text-white',
  Analyzing: 'bg-yellow-500 text-gray-900',
  Evaluating: 'bg-orange-500 text-white',
  Creating: 'bg-red-500 text-white',
};

// ─── Props ──────────────────────────────────────────────────────────────────

interface CellDetailSheetProps {
  ploId: string | undefined;
  courseId: string | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

const CellDetailSheet = ({ ploId, courseId, open, onOpenChange }: CellDetailSheetProps) => {
  const { data, isLoading } = useCellDetail(
    open ? ploId : undefined,
    open ? courseId : undefined,
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="overflow-y-auto">
        <SheetHeader>
          {isLoading ? (
            <>
              <Shimmer className="h-5 w-48" />
              <Shimmer className="h-4 w-32" />
            </>
          ) : data ? (
            <>
              <SheetTitle className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-blue-600" />
                {data.plo.title}
              </SheetTitle>
              <SheetDescription className="flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5" />
                {data.course.code} — {data.course.name}
              </SheetDescription>
            </>
          ) : null}
        </SheetHeader>

        <div className="px-4 pb-4 space-y-3">
          {isLoading ? (
            <div className="space-y-3">
              <Shimmer className="h-16 w-full rounded-lg" />
              <Shimmer className="h-16 w-full rounded-lg" />
            </div>
          ) : data && data.clos.length > 0 ? (
            <>
              <p className="text-xs font-bold tracking-widest uppercase text-gray-500">
                Mapped CLOs ({data.clos.length})
              </p>
              <ul className="space-y-2">
                {data.clos.map((clo) => (
                  <li
                    key={clo.id}
                    className="rounded-lg border border-slate-200 bg-white p-3 space-y-1.5"
                  >
                    <p className="text-sm font-medium text-gray-800">{clo.title}</p>
                    <div className="flex items-center gap-2">
                      {clo.blooms_level && (
                        <Badge
                          className={bloomsStyles[clo.blooms_level]}
                        >
                          {clo.blooms_level}
                        </Badge>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </>
          ) : data ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-gray-500">
              No CLOs mapped to this PLO in this course.
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default CellDetailSheet;
