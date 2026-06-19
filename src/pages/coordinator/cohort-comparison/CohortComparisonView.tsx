// Coordinator analytics — Cohort Comparison (planned feature).
// Intentionally not wired to data yet: it requires cohort aggregation that
// doesn't exist. Labelled "Coming soon" (Req 15.4) and removed from the
// coordinator nav so it doesn't read as a broken/empty page.

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Users } from "lucide-react";

const CohortComparisonView = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Cohort Comparison</h1>
        <Badge variant="outline" className="text-xs">
          Coming soon
        </Badge>
      </div>

      <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden gap-0 py-0">
        <div
          className="px-6 py-4 flex items-center gap-2"
          style={{
            background: "var(--brand-gradient)",
          }}
        >
          <BarChart3 className="h-5 w-5 text-white" />
          <h2 className="text-lg font-bold tracking-tight text-white">
            Compare Cohorts
          </h2>
        </div>
        <div className="p-6">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="h-12 w-12 text-slate-300 mb-3" />
            <h3 className="text-lg font-semibold tracking-tight text-gray-900">
              Coming soon
            </h3>
            <p className="mt-1.5 text-sm text-slate-500 max-w-sm">
              Compare attainment across cohorts (by semester, section, or
              enrollment year) here once cohort aggregation is available.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default CohortComparisonView;
