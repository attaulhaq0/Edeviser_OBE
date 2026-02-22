import { useState } from 'react';
import { usePrograms } from '@/hooks/usePrograms';
import CurriculumMatrix from '@/components/shared/CurriculumMatrix';
import CellDetailSheet from '@/components/shared/CellDetailSheet';
import Shimmer from '@/components/shared/Shimmer';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface SelectedCell {
  ploId: string;
  courseId: string;
}

const CurriculumMatrixPage = () => {
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null);
  const { data: programs, isLoading: programsLoading } = usePrograms();

  const handleCellClick = (ploId: string, courseId: string) => {
    setSelectedCell({ ploId, courseId });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Curriculum Matrix</h1>

      {/* Program selector */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700">Program</label>
        {programsLoading ? (
          <Shimmer className="h-9 w-64" />
        ) : (
          <Select value={selectedProgramId} onValueChange={setSelectedProgramId}>
            <SelectTrigger className="w-64 bg-white">
              <SelectValue placeholder="Select a program" />
            </SelectTrigger>
            <SelectContent>
              {programs?.map((program) => (
                <SelectItem key={program.id} value={program.id}>
                  {program.code} — {program.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Matrix */}
      {selectedProgramId ? (
        <CurriculumMatrix programId={selectedProgramId} onCellClick={handleCellClick} />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-gray-500">
          Select a program to view the curriculum matrix.
        </div>
      )}

      {/* Cell Detail Sheet */}
      <CellDetailSheet
        ploId={selectedCell?.ploId}
        courseId={selectedCell?.courseId}
        open={selectedCell !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedCell(null);
        }}
      />
    </div>
  );
};

export default CurriculumMatrixPage;
