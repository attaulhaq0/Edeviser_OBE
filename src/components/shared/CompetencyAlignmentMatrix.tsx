// Task 115.3: Competency Alignment Matrix shared component
// Matrix: Competency Indicators (rows) × Outcomes (columns)

import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle } from "lucide-react";
import type {
  CompetencyItem,
  CompetencyOutcomeMapping,
} from "@/hooks/useCompetencyFrameworks";

interface OutcomeInfo {
  id: string;
  title: string;
  code?: string;
  type: string;
  attainment?: number;
}

interface CompetencyAlignmentMatrixProps {
  indicators: CompetencyItem[];
  outcomes: OutcomeInfo[];
  mappings: CompetencyOutcomeMapping[];
}

const getAttainmentColor = (score: number | undefined) => {
  if (score === undefined) return "bg-slate-100 text-slate-400";
  if (score >= 85) return "bg-green-50 text-green-600";
  if (score >= 70) return "bg-blue-50 text-blue-600";
  if (score >= 50) return "bg-yellow-50 text-yellow-600";
  return "bg-red-50 text-red-600";
};

const CompetencyAlignmentMatrix = ({
  indicators,
  outcomes,
  mappings,
}: CompetencyAlignmentMatrixProps) => {
  const mappingSet = new Set(
    mappings.map((m) => `${m.competency_item_id}:${m.outcome_id}`)
  );

  const mappedIndicatorIds = new Set(mappings.map((m) => m.competency_item_id));

  if (indicators.length === 0 || outcomes.length === 0) {
    return (
      <p className="text-sm text-slate-400 text-center py-6">
        No data available for alignment matrix.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table
        className="min-w-full text-xs"
        role="grid"
        aria-label="Competency alignment matrix"
      >
        <thead>
          <tr>
            <th className="sticky start-0 bg-white z-10 px-3 py-2 text-start font-semibold text-slate-600 border-b border-e border-slate-200 min-w-[200px]">
              Indicator
            </th>
            {outcomes.map((o) => (
              <th
                key={o.id}
                className="px-2 py-2 text-center font-semibold text-slate-600 border-b border-slate-200 min-w-[80px]"
                title={o.title}
              >
                <span className="block truncate max-w-[80px]">
                  {o.code ?? o.title.slice(0, 10)}
                </span>
                <span className="block text-[9px] text-slate-400 font-normal">
                  {o.type}
                </span>
              </th>
            ))}
            <th className="px-2 py-2 text-center font-semibold text-slate-600 border-b border-slate-200">
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {indicators.map((ind) => {
            const isMapped = mappedIndicatorIds.has(ind.id);
            return (
              <tr key={ind.id} className="hover:bg-slate-50">
                <td className="sticky start-0 bg-white z-10 px-3 py-2 border-e border-slate-100">
                  <span className="font-mono text-slate-400 me-1">
                    {ind.code}
                  </span>
                  <span className="text-slate-700">{ind.title}</span>
                </td>
                {outcomes.map((o) => {
                  const key = `${ind.id}:${o.id}`;
                  const hasMapped = mappingSet.has(key);
                  return (
                    <td
                      key={o.id}
                      className={`px-2 py-2 text-center border-slate-100 ${
                        hasMapped
                          ? getAttainmentColor(o.attainment)
                          : "bg-white"
                      }`}
                    >
                      {hasMapped ? (
                        <CheckCircle className="h-3.5 w-3.5 mx-auto text-current" />
                      ) : (
                        <span className="text-slate-200">—</span>
                      )}
                    </td>
                  );
                })}
                <td className="px-2 py-2 text-center">
                  {isMapped ? (
                    <Badge className="text-[9px] bg-green-100 text-green-700">
                      Mapped
                    </Badge>
                  ) : (
                    <Badge className="text-[9px] bg-amber-100 text-amber-700">
                      <AlertTriangle className="h-2.5 w-2.5 me-0.5" />
                      Unmapped
                    </Badge>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default CompetencyAlignmentMatrix;
