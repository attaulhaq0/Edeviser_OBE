import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useCoordinatorCohortComparison } from "@/hooks/useCoordinatorCohortComparison";
import { BarChart3, Users } from "lucide-react";

const CohortComparisonView = () => {
  const { institutionId } = useAuth();
  const cohortQuery = useCoordinatorCohortComparison(institutionId);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Cohort Comparison</h1>
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
          <BarChart3 className="h-5 w-5 text-white" />
          <h2 className="text-lg font-bold tracking-tight text-white">
            Compare Cohorts
          </h2>
        </div>
        <div className="p-6">
          {cohortQuery.isLoading ? (
            <p className="py-12 text-center text-sm text-slate-500">
              Loading live cohort evidence…
            </p>
          ) : cohortQuery.isError ? (
            <p className="py-12 text-center text-sm text-rose-600">
              We couldn’t load the live cohort data.
            </p>
          ) : cohortQuery.data?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="mb-3 h-12 w-12 text-slate-300" />
              <h3 className="text-lg font-semibold tracking-tight text-gray-900">
                No comparable cohorts yet
              </h3>
              <p className="mt-1.5 max-w-sm text-sm text-slate-500">
                Cohorts appear after active enrolments have student-scoped
                attainment evidence.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full min-w-[680px] text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Cohort</th>
                    <th className="px-4 py-3 font-semibold">Program</th>
                    <th className="px-4 py-3 text-right font-semibold">
                      Students
                    </th>
                    <th className="px-4 py-3 text-right font-semibold">
                      Evidence
                    </th>
                    <th className="px-4 py-3 text-right font-semibold">
                      Mean attainment
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cohortQuery.data?.map((cohort) => (
                    <tr key={cohort.id}>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {cohort.label}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {cohort.programName}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {cohort.studentCount}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {cohort.evidenceCount}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">
                        {cohort.meanAttainment}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default CohortComparisonView;
