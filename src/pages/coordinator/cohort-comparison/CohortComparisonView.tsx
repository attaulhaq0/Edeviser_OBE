// Task 124.5: Cohort Comparison View page

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Users } from "lucide-react";

const CohortComparisonView = () => {
  // Placeholder — requires cohort data aggregation
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Cohort Comparison</h1>

      <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
        <div
          className="px-6 py-4 flex items-center gap-2"
          style={{
            background:
              "linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)",
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
            <p className="text-sm text-slate-500">
              Define cohorts by semester, section, or enrollment year to compare
              attainment across groups.
            </p>
            <Badge variant="outline" className="mt-2 text-xs">
              Select cohorts to begin comparison
            </Badge>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default CohortComparisonView;
