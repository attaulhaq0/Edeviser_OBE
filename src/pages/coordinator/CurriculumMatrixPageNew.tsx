// =============================================================================
// CurriculumMatrixPageNew — redesigned Curriculum Matrix (P3, spec task 3.3)
// =============================================================================
//
// Matches the prototype reference: the real PLO×Course matrix gains a coverage
// legend, a per-PLO coverage-summary column, header term/export filters, and a
// bottom Coverage-Gap action panel with an AI recommendation.
//
// DATA: the matrix + coverage column + CSV export are REAL (via
// `useCurriculumMatrix` / `usePrograms` / `buildMatrixCsv`). The term filter and
// the gap-panel AI recommendation are PRESENTATIONAL (no backend field yet); no
// new backend/RPC/write is introduced. Gated behind `newUiModules` (wrapper in
// CurriculumMatrixPage.tsx); flag-off keeps the legacy page. RTL-safe via
// logical props.
// =============================================================================

import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  Download,
  Lightbulb,
  Sparkles,
  Grid3X3,
} from "lucide-react";

import { usePrograms } from "@/hooks/usePrograms";
import { useCurriculumMatrix } from "@/hooks/useCurriculumMatrix";
import CurriculumMatrix from "@/components/shared/CurriculumMatrix";
import CellDetailSheet from "@/components/shared/CellDetailSheet";
import Shimmer from "@/components/shared/Shimmer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { buildMatrixCsv, downloadCsv } from "@/lib/exportCurriculumMatrixCsv";

interface SelectedCell {
  ploId: string;
  courseId: string;
}

const LegendChip = ({ color, label }: { color: string; label: string }) => (
  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
    <span
      className="h-2.5 w-2.5 rounded-full"
      style={{ backgroundColor: color }}
      aria-hidden="true"
    />
    {label}
  </span>
);

const CurriculumMatrixPageNew = () => {
  const { t } = useTranslation("coordinator");
  const [selectedProgramId, setSelectedProgramId] = useState<string>("");
  const [term, setTerm] = useState<string>("all");
  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null);

  const { data: paginatedPrograms, isLoading: programsLoading } = usePrograms();
  const programs = paginatedPrograms?.data;
  const { data: matrixData } = useCurriculumMatrix(
    selectedProgramId || undefined
  );
  const selectedProgram = programs?.find((p) => p.id === selectedProgramId);

  const canExport =
    !!selectedProgramId &&
    !!matrixData &&
    matrixData.plos.length > 0 &&
    matrixData.courses.length > 0;

  const handleExportCsv = useCallback(() => {
    if (!matrixData || !selectedProgram) return;
    if (matrixData.plos.length === 0 || matrixData.courses.length === 0) return;
    downloadCsv(
      buildMatrixCsv(matrixData),
      `curriculum-matrix-${selectedProgram.code}.csv`
    );
  }, [matrixData, selectedProgram]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">
          {t("curriculumMatrix.title")}
        </h1>
        <div className="flex items-center gap-2">
          <Select value={term} onValueChange={setTerm}>
            <SelectTrigger className="h-9 w-36 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {t("curriculumMatrix.allTerms")}
              </SelectItem>
              <SelectItem value="current">
                {t("curriculumMatrix.currentTerm")}
              </SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            disabled={!canExport}
            onClick={handleExportCsv}
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            {t("curriculumMatrix.exportCsv")}
          </Button>
        </div>
      </div>

      {/* Program selector + legend */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            id="program-selector-label"
            className="text-sm font-medium text-gray-700"
          >
            {t("curriculumMatrix.program")}
          </span>
          {programsLoading ? (
            <Shimmer className="h-9 w-64" />
          ) : (
            <Select
              value={selectedProgramId}
              onValueChange={setSelectedProgramId}
            >
              <SelectTrigger
                className="w-64 bg-white"
                aria-labelledby="program-selector-label"
              >
                <SelectValue
                  placeholder={t("curriculumMatrix.selectProgram")}
                />
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

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <LegendChip
            color="#16a34a"
            label={t("curriculumMatrix.legendAssessed")}
          />
          <LegendChip
            color="#ca8a04"
            label={t("curriculumMatrix.legendIntroduced")}
          />
          <LegendChip
            color="#cbd5e1"
            label={t("curriculumMatrix.legendNotCovered")}
          />
          <LegendChip color="#dc2626" label={t("curriculumMatrix.legendGap")} />
        </div>
      </div>

      {/* Matrix (real data, with coverage-summary column) */}
      {selectedProgramId ? (
        <CurriculumMatrix
          programId={selectedProgramId}
          coverageLabel={t("curriculumMatrix.coverage")}
          onCellClick={(ploId, courseId) =>
            setSelectedCell({ ploId, courseId })
          }
        />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-gray-500">
          {t("curriculumMatrix.selectPrompt")}
        </div>
      )}

      {/* Coverage Gap action panel + AI recommendation */}
      {selectedProgramId && (
        <Card className="card-elevated gap-0 border-0 bg-white py-0">
          <div className="grid gap-0 md:grid-cols-2">
            {/* Gap */}
            <div className="border-b border-slate-100 p-5 md:border-b-0 md:border-e">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                  <Grid3X3 className="h-4 w-4" aria-hidden="true" />
                </span>
                <p className="text-sm font-bold text-gray-900">
                  {t("curriculumMatrix.gapTitle")}
                </p>
              </div>
              <p className="mt-2 text-xs text-gray-600">
                {t("curriculumMatrix.gapBody")}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="tactile" size="sm">
                  {t("curriculumMatrix.draftAssessment")}
                </Button>
                <Button variant="outline" size="sm">
                  {t("curriculumMatrix.notifyTeacher")}
                </Button>
              </div>
            </div>

            {/* AI recommendation */}
            <div className="bg-teal-50/50 p-5">
              <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-teal-700">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                {t("curriculumMatrix.aiRec")}
              </p>
              <dl className="mt-3 space-y-2.5">
                <div className="flex items-start gap-2">
                  <Lightbulb
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-600"
                    aria-hidden="true"
                  />
                  <div>
                    <dt className="text-[11px] font-semibold text-slate-500">
                      {t("curriculumMatrix.aiBestCourseLabel")}
                    </dt>
                    <dd className="text-xs font-semibold text-gray-800">
                      {t("curriculumMatrix.aiBestCourseValue")}
                    </dd>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Lightbulb
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-600"
                    aria-hidden="true"
                  />
                  <div>
                    <dt className="text-[11px] font-semibold text-slate-500">
                      {t("curriculumMatrix.aiAssessmentLabel")}
                    </dt>
                    <dd className="text-xs font-semibold text-gray-800">
                      {t("curriculumMatrix.aiAssessmentValue")}
                    </dd>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <ArrowRight
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-600"
                    aria-hidden="true"
                  />
                  <div>
                    <dt className="text-[11px] font-semibold text-slate-500">
                      {t("curriculumMatrix.aiActionLabel")}
                    </dt>
                    <dd className="text-xs text-gray-700">
                      {t("curriculumMatrix.aiActionValue")}
                    </dd>
                  </div>
                </div>
              </dl>
            </div>
          </div>
        </Card>
      )}

      {/* Cell Detail Sheet (real) */}
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

export default CurriculumMatrixPageNew;
