import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ─── Types ──────────────────────────────────────────────────────────────────

interface AutoGradePayload {
  attempt_id: string;
}

interface QuizQuestion {
  id: string;
  question_type: string;
  correct_answer: string | string[];
  points: number;
}

// ─── Grading Logic ──────────────────────────────────────────────────────────

function gradeQuestion(
  question: QuizQuestion,
  studentAnswer: string | string[] | undefined
): { score: number; autoGradable: boolean } {
  if (!studentAnswer) return { score: 0, autoGradable: true };

  const { question_type, correct_answer, points } = question;

  switch (question_type) {
    case "mcq_single":
    case "true_false": {
      const correct =
        typeof correct_answer === "string"
          ? correct_answer
          : correct_answer[0] ?? "";
      const answer =
        typeof studentAnswer === "string"
          ? studentAnswer
          : studentAnswer[0] ?? "";
      return {
        score:
          answer.trim().toLowerCase() === correct.trim().toLowerCase()
            ? points
            : 0,
        autoGradable: true,
      };
    }

    case "mcq_multi": {
      const correctSet = new Set(
        (Array.isArray(correct_answer) ? correct_answer : [correct_answer]).map(
          (a) => a.trim().toLowerCase()
        )
      );
      const answerSet = new Set(
        (Array.isArray(studentAnswer) ? studentAnswer : [studentAnswer]).map(
          (a) => a.trim().toLowerCase()
        )
      );
      // Full marks only if exact match
      const isExact =
        correctSet.size === answerSet.size &&
        [...correctSet].every((v) => answerSet.has(v));
      return { score: isExact ? points : 0, autoGradable: true };
    }

    case "fill_blank": {
      const correct =
        typeof correct_answer === "string"
          ? correct_answer
          : correct_answer[0] ?? "";
      const answer =
        typeof studentAnswer === "string"
          ? studentAnswer
          : studentAnswer[0] ?? "";
      return {
        score:
          answer.trim().toLowerCase() === correct.trim().toLowerCase()
            ? points
            : 0,
        autoGradable: true,
      };
    }

    case "short_answer":
      // Short answer requires manual teacher grading
      return { score: 0, autoGradable: false };

    default:
      return { score: 0, autoGradable: true };
  }
}

// ─── Main Handler ───────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const payload: AutoGradePayload = await req.json();
    const { attempt_id } = payload;

    if (!attempt_id) {
      return new Response(JSON.stringify({ error: "attempt_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the attempt
    const { data: attempt, error: attemptErr } = await supabase
      .from("quiz_attempts")
      .select("*")
      .eq("id", attempt_id)
      .maybeSingle();

    if (attemptErr || !attempt) {
      return new Response(
        JSON.stringify({
          error: "Attempt not found",
          detail: attemptErr?.message,
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch questions for this quiz
    const { data: questions, error: questionsErr } = await supabase
      .from("quiz_questions")
      .select("id, question_type, correct_answer, points")
      .eq("quiz_id", attempt.quiz_id);

    if (questionsErr || !questions) {
      return new Response(
        JSON.stringify({
          error: "Failed to fetch questions",
          detail: questionsErr?.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const answers = (attempt.answers ?? {}) as Record<
      string,
      string | string[]
    >;
    let autoScore = 0;
    let totalAutoGradablePoints = 0;
    let hasManualQuestions = false;

    for (const q of questions as QuizQuestion[]) {
      const result = gradeQuestion(q, answers[q.id]);
      if (result.autoGradable) {
        autoScore += result.score;
        totalAutoGradablePoints += q.points;
      } else {
        hasManualQuestions = true;
      }
    }

    const totalPoints = questions.reduce(
      (sum: number, q: QuizQuestion) => sum + q.points,
      0
    );
    const gradingStatus = hasManualQuestions
      ? "pending_manual"
      : "fully_graded";
    const finalScore = hasManualQuestions ? null : autoScore;
    const scorePercent =
      totalPoints > 0 && !hasManualQuestions
        ? Math.round((autoScore / totalPoints) * 10000) / 100
        : null;

    // Update the attempt with grading results
    const { error: updateErr } = await supabase
      .from("quiz_attempts")
      .update({
        auto_score: autoScore,
        score: finalScore,
        grading_status: gradingStatus,
      })
      .eq("id", attempt_id);

    if (updateErr) {
      return new Response(
        JSON.stringify({
          error: "Failed to update attempt",
          detail: updateErr.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        auto_score: autoScore,
        total_auto_gradable_points: totalAutoGradablePoints,
        total_points: totalPoints,
        score: finalScore,
        score_percent: scorePercent,
        grading_status: gradingStatus,
        has_manual_questions: hasManualQuestions,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
