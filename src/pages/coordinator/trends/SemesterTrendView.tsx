import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useCoordinatorAttainmentTrends } from "@/hooks/useCoordinatorAttainmentTrends";
import { useCoordinatorOutcomeAttainment } from "@/hooks/useCoordinatorOutcomeAttainment";
import { TrendingUp } from "lucide-react";

const SemesterTrendView = () => {
  const { institutionId } = useAuth();
  const trendsQuery = useCoordinatorAttainmentTrends(institutionId);
  const outcomesQuery = useCoordinatorOutcomeAttainment(institutionId);
  const outcomes = [
    ...(outcomesQuery.data?.ilos ?? []),
    ...(outcomesQuery.data?.plos ?? []),
  ];
  const series = outcomes.flatMap((outcome) => {
    const points = trendsQuery.data?.[outcome.id] ?? [];
    return points.length > 0 ? [{ outcome, points }] : [];
  });
  const pointCount = series.reduce(
    (total, item) => total + item.points.length,
    0
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Semester Trends</h1>
        <Badge variant="outline" className="text-xs">
          Live Supabase data
        </Badge>
      </div>

      <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden gap-0 py-0">
        <div
          className="px-6 py-4 flex items-center gap-2"
          style={{
            backgroundColor: "#0f172a",
          }}
        >
          <TrendingUp className="h-5 w-5 text-white" />
          <h2 className="text-lg font-bold tracking-tight text-white">
            Attainment Over Time
          </h2>
        </div>
        <div className="p-6">
          {trendsQuery.isLoading || outcomesQuery.isLoading ? (
            <p className="py-12 text-center text-sm text-slate-500">
              Loading live attainment snapshots…
            </p>
          ) : trendsQuery.isError || outcomesQuery.isError ? (
            <p className="py-12 text-center text-sm text-rose-600">
              We couldn’t load the live trend data.
            </p>
          ) : series.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <TrendingUp className="mb-3 h-12 w-12 text-slate-300" />
              <h3 className="text-lg font-semibold tracking-tight text-gray-900">
                No attainment snapshots yet
              </h3>
              <p className="mt-1.5 max-w-sm text-sm text-slate-500">
                This institution has no captured semester-level attainment
                history yet. New snapshots will appear here after the next
                capture.
              </p>
            </div>
          ) : (
            <>
              <p className="mb-4 text-sm text-slate-500">
                {pointCount} live snapshot points across {series.length}{" "}
                outcomes. A single point is shown as a baseline until another
                semester is captured.
              </p>
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Outcome</th>
                      <th className="px-4 py-3 font-semibold">
                        Latest semester
                      </th>
                      <th className="px-4 py-3 text-right font-semibold">
                        Attainment
                      </th>
                      <th className="px-4 py-3 text-right font-semibold">
                        History
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {series.map(({ outcome, points }) => {
                      const latest = points[points.length - 1];
                      if (!latest) return null;
                      return (
                        <tr key={outcome.id}>
                          <td className="px-4 py-3 font-medium text-slate-900">
                            {outcome.title}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {latest.semesterName}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-slate-900">
                            {latest.attainment}%
                          </td>
                          <td className="px-4 py-3 text-right text-slate-500">
                            {points.length} semester
                            {points.length === 1 ? "" : "s"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
};

export default SemesterTrendView;
