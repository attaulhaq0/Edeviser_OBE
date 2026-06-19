// Task 120.2: Coverage Heatmap View page

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { parseAsString, useQueryState } from "nuqs";
import { useCoverageHeatmap } from "@/hooks/useVisualizationData";
import { usePrograms } from "@/hooks/usePrograms";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getEvidenceCountColor,
  getAttainmentColor,
} from "@/lib/coverageHeatmap";
import { NoData, InlineLoadError } from "@/components/shared/EmptyState";
import Shimmer from "@/components/shared/Shimmer";
import { Grid3X3 } from "lucide-react";

type ColorMode = "evidence" | "attainment";

const CoverageHeatmapView = () => {
  const [programId, setProgramId] = useQueryState(
    "program",
    parseAsString.withDefault("")
  );
  const { data: programsData } = usePrograms();
  const programs = programsData?.data ?? [];
  const {
    data: matrix,
    isLoading,
    isError,
  } = useCoverageHeatmap(programId || undefined);
  const [colorMode, setColorMode] = useState<ColorMode>("evidence");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Coverage Heatmap</h1>
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            <Button
              size="sm"
              variant={colorMode === "evidence" ? "default" : "outline"}
              onClick={() => setColorMode("evidence")}
              className="text-xs"
            >
              Evidence Count
            </Button>
            <Button
              size="sm"
              variant={colorMode === "attainment" ? "default" : "outline"}
              onClick={() => setColorMode("attainment")}
              className="text-xs"
            >
              Attainment %
            </Button>
          </div>
          <Select value={programId} onValueChange={setProgramId}>
            <SelectTrigger className="w-64 bg-white">
              <SelectValue placeholder="Select program" />
            </SelectTrigger>
            <SelectContent>
              {(programs ?? []).map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden gap-0 py-0">
        <div
          className="px-6 py-4 flex items-center gap-2"
          style={{
            background: "var(--brand-gradient)",
          }}
        >
          <Grid3X3 className="h-5 w-5 text-white" />
          <h2 className="text-lg font-bold tracking-tight text-white">
            CLO × Course Matrix
          </h2>
        </div>
        <div className="p-4 overflow-x-auto">
          {!programId ? (
            <p className="text-sm text-slate-400 text-center py-12">
              Select a program to view coverage.
            </p>
          ) : isLoading ? (
            <Shimmer className="h-64 rounded-lg" />
          ) : isError ? (
            <InlineLoadError className="py-12" />
          ) : !matrix || matrix.clo_ids.length === 0 ? (
            <NoData className="py-12" />
          ) : (
            <table className="w-full text-xs border-collapse min-w-[600px]">
              <thead>
                <tr>
                  <th className="p-2 border border-slate-200 bg-slate-50 text-slate-500 font-bold text-start">
                    CLO
                  </th>
                  {matrix.course_ids.map((cid) => (
                    <th
                      key={cid}
                      className="p-2 border border-slate-200 bg-slate-50 text-slate-500 font-bold truncate max-w-[120px]"
                    >
                      {matrix.course_labels[cid]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrix.clo_ids.map((cloId) => (
                  <tr key={cloId}>
                    <td className="p-2 border border-slate-200 text-slate-700 font-medium truncate max-w-[200px]">
                      {matrix.clo_labels[cloId]}
                    </td>
                    {matrix.course_ids.map((courseId) => {
                      const cell = matrix.cells.get(`${cloId}:${courseId}`);
                      const bgColor = cell
                        ? colorMode === "evidence"
                          ? getEvidenceCountColor(cell.evidence_count)
                          : getAttainmentColor(cell.avg_attainment)
                        : "#ffffff";
                      return (
                        <td
                          key={courseId}
                          className="p-2 border border-slate-200 text-center"
                          style={{ backgroundColor: bgColor }}
                        >
                          {cell ? (
                            colorMode === "evidence" ? (
                              cell.evidence_count
                            ) : (
                              `${Math.round(cell.avg_attainment)}%`
                            )
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
};

export default CoverageHeatmapView;
