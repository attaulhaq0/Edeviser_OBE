import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface ExtraAttemptUsage {
  studentId: string;
  studentName: string;
  purchaseDate: string;
  attemptNumber: number;
  score: number | null;
}

export const useExtraAttemptUsage = (quizId: string) => {
  return useQuery({
    queryKey: ["marketplace", "extraAttemptUsage", quizId],
    queryFn: async (): Promise<ExtraAttemptUsage[]> => {
      // Fetch quiz to get max_attempts
      const { data: quiz, error: quizError } = await supabase
        .from("quizzes")
        .select("max_attempts")
        .eq("id", quizId)
        .maybeSingle();

      if (quizError) throw quizError;
      if (!quiz) return [];

      const maxAttempts = (quiz as Record<string, unknown>)
        .max_attempts as number;

      // Fetch attempts that exceed max_attempts (these used extra tokens)
      const { data: attempts, error: attemptsError } = await supabase
        .from("quiz_attempts")
        .select("student_id, attempt_number, score, submitted_at")
        .eq("quiz_id", quizId)
        .gt("attempt_number", maxAttempts)
        .order("submitted_at", { ascending: false });

      if (attemptsError) throw attemptsError;
      if (!attempts) return [];

      const studentIds = [
        ...new Set(
          (attempts as Array<Record<string, unknown>>).map(
            (a) => a.student_id as string
          )
        ),
      ];
      if (studentIds.length === 0) return [];

      // Fetch student names
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", studentIds);

      if (profilesError) throw profilesError;

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
};
