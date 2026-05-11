// =============================================================================
// ExtraAttemptUsageTable — Teacher view for extra attempt token usage in quiz analytics
// =============================================================================

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Ticket } from "lucide-react";
import Shimmer from "@/components/shared/Shimmer";
import { formatLocalDate } from "@/lib/formatDate";

interface ExtraAttemptUsage {
  studentId: string;
  studentName: string;
  purchaseDate: string;
  attemptNumber: number;
  score: number | null;
}

interface ExtraAttemptUsageTableProps {
  quizId: string;
}

const ExtraAttemptUsageTable = ({ quizId }: ExtraAttemptUsageTableProps) => {
  const { data, isLoading } = useQuery({
    queryKey: ["marketplace", "extraAttemptUsage", quizId],
    queryFn: async (): Promise<ExtraAttemptUsage[]> => {
      // Fetch quiz to get max_attempts
      const { data: quiz, error: quizError } = await supabase
        .from("quizzes")
        .select("max_attempts")
        .eq("id", quizId)
        .maybeSingle();

      if (quizError || !quiz) return [];

      const maxAttempts = (quiz as Record<string, unknown>)
        .max_attempts as number;

      // Fetch attempts that exceed max_attempts (these used extra tokens)
      const { data: attempts, error: attemptsError } = await supabase
        .from("quiz_attempts")
        .select("student_id, attempt_number, score, submitted_at")
        .eq("quiz_id", quizId)
        .gt("attempt_number", maxAttempts)
        .order("submitted_at", { ascending: false });

      if (attemptsError || !attempts) return [];

      const studentIds = [
        ...new Set(
          (attempts as Array<Record<string, unknown>>).map(
            (a) => a.student_id as string
          )
        ),
      ];
      if (studentIds.length === 0) return [];

      // Fetch student names
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", studentIds);

      const nameMap = new Map(
        ((profiles ?? []) as Array<Record<string, unknown>>).map((p) => [
          p.id as string,
          p.full_name as string,
        ])
      );

      return (attempts as Array<Record<string, unknown>>).map((a) => ({
        studentId: a.student_id as string,
        studentName: nameMap.get(a.student_id as string) ?? "Unknown",
        purchaseDate: a.submitted_at as string,
        attemptNumber: a.attempt_number as number,
        score: a.score as number | null,
      }));
    },
    enabled: !!quizId,
    staleTime: 30_000,
  });

  if (isLoading) return <Shimmer className="h-32 rounded-xl" />;
  if (!data || data.length === 0) return null;

  return (
    <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
      <div
        className="px-6 py-4 flex items-center gap-2"
        style={{
          background:
            "linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)",
        }}
      >
        <Ticket className="h-5 w-5 text-white" />
        <h2 className="text-lg font-bold tracking-tight text-white">
          Extra Attempt Token Usage
        </h2>
      </div>
      <div className="p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-start py-2 pe-4 font-semibold text-gray-600">
                  Student
                </th>
                <th className="text-start py-2 pe-4 font-semibold text-gray-600">
                  Attempt #
                </th>
                <th className="text-start py-2 pe-4 font-semibold text-gray-600">
                  Date
                </th>
                <th className="text-start py-2 font-semibold text-gray-600">
                  Score
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((usage, idx) => (
                <tr
                  key={`${usage.studentId}-${idx}`}
                  className="border-b border-slate-100 last:border-0"
                >
                  <td className="py-2 pe-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{usage.studentName}</span>
                      <Badge className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                        Token Used
                      </Badge>
                    </div>
                  </td>
                  <td className="py-2 pe-4 text-gray-600">
                    #{usage.attemptNumber}
                  </td>
                  <td className="py-2 pe-4 text-gray-600">
                    {formatLocalDate(usage.purchaseDate, "MMM d, yyyy")}
                  </td>
                  <td className="py-2">
                    {usage.score !== null ? (
                      <span className="font-semibold">{usage.score}%</span>
                    ) : (
                      <span className="text-gray-400">Pending</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
};

export default ExtraAttemptUsageTable;
