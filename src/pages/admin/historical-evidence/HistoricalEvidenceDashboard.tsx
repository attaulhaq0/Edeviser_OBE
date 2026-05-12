// Task 125.4: Historical Evidence Dashboard page

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Database, BarChart3 } from "lucide-react";

const HistoricalEvidenceDashboard = () => {
  // Placeholder — requires mv_historical_evidence materialized view
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Historical Evidence</h1>

      <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden gap-0 py-0">
        <div
          className="px-6 py-4 flex items-center gap-2"
          style={{
            background: "var(--brand-gradient)",
          }}
        >
          <Database className="h-5 w-5 text-white" />
          <h2 className="text-lg font-bold tracking-tight text-white">
            Evidence Analytics
          </h2>
        </div>
        <div className="p-6">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <BarChart3 className="h-12 w-12 text-slate-300 mb-3" />
            <p className="text-sm text-slate-500">
              Historical evidence analytics will appear here once the
              materialized view is populated.
            </p>
            <Badge variant="outline" className="mt-2 text-xs">
              Requires mv_historical_evidence view
            </Badge>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default HistoricalEvidenceDashboard;
