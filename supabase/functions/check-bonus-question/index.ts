// =============================================================================
// Edge Function: check-bonus-question
// Bonus question trigger and validation
// Tasks 19.2.1–19.2.3
// =============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_BONUS_PROBABILITY = 15; // 15% default
const BONUS_XP_REWARD = 25;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { student_id, institution_id, course_id, action } = body;

    if (!student_id || !institution_id) {
      return new Response(
        JSON.stringify({ error: "student_id and institution_id are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ── Action: trigger — Check if a bonus question should appear ────────
    if (action === "trigger" || !action) {
      // Task 19.2.1: Probability check (configurable 5–30%)
      const { data: settings } = await supabase
        .from("institution_settings")
        .select("*")
        .eq("institution_id", institution_id)
        .maybeSingle();

      const rawSettings = settings as Record<string, unknown> | null;
      let probability = DEFAULT_BONUS_PROBABILITY;
      if (rawSettings?.bonus_question_probability) {
        const configured = rawSettings.bonus_question_probability as number;
        probability = Math.max(5, Math.min(30, configured));
      }

      // Roll the dice
      const roll = Math.random() * 100;
      if (roll >= probability) {
        return new Response(JSON.stringify({ triggered: false }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Task 19.2.2: CLO-relevant question selection
      // Find a CLO from the student's active courses to generate a relevant question
      let selectedCloId: string | null = null;
      let questionText =
        "What is the key concept you learned in your most recent study session?";
      let questionType = "open_ended";

      if (course_id) {
        const { data: clos } = await supabase
          .from("learning_outcomes")
          .select("id, title")
          .eq("course_id", course_id)
          .eq("type", "clo")
          .limit(10);

        if (clos && clos.length > 0) {
          const randomClo = clos[Math.floor(Math.random() * clos.length)];
          if (randomClo) {
            selectedCloId = randomClo.id;
            questionText = `Quick check: Can you explain the concept related to "${randomClo.title}"?`;
            questionType = "clo_related";
          }
        }
      }

      return new Response(
        JSON.stringify({
          triggered: true,
          question: {
            text: questionText,
            type: questionType,
            clo_id: selectedCloId,
            time_limit_seconds: 30,
            xp_reward: BONUS_XP_REWARD,
          },
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ── Action: answer — Validate answer and award surprise XP ───────────
    if (action === "answer") {
      const { answer, clo_id } = body;

      if (!answer || typeof answer !== "string" || answer.trim().length < 3) {
        return new Response(
          JSON.stringify({
            correct: false,
            xp_awarded: 0,
            feedback: "Answer too short. Try to provide more detail next time!",
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Task 19.2.3: Answer validation and surprise XP award
      // For open-ended questions, any substantive answer (>10 chars) earns XP
      const isSubstantive = answer.trim().length >= 10;

      if (isSubstantive) {
        // Award surprise XP via xp_transactions
        const referenceId = `bonus_question:${student_id}:${Date.now()}`;

        const { error: xpErr } = await supabase.from("xp_transactions").insert({
          student_id,
          xp_amount: BONUS_XP_REWARD,
          source: "bonus_event",
          reference_id: referenceId,
          note: "Bonus question reward",
          base_xp: BONUS_XP_REWARD,
          final_xp: BONUS_XP_REWARD,
          multipliers: { bonus_question: true },
        });

        if (xpErr) {
          console.error("Bonus question XP award failed:", xpErr.message);
        }

        // Update xp_total in student_gamification
        const { data: sumResult } = await supabase
          .from("xp_transactions")
          .select("xp_amount")
          .eq("student_id", student_id);

        const newTotal = (sumResult ?? []).reduce(
          (sum: number, row: { xp_amount: number }) => sum + row.xp_amount,
          0
        );

        await supabase
          .from("student_gamification")
          .upsert(
            { student_id, xp_total: newTotal },
            { onConflict: "student_id" }
          );

        return new Response(
          JSON.stringify({
            correct: true,
            xp_awarded: BONUS_XP_REWARD,
            feedback: "Great answer! You earned bonus XP!",
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({
          correct: false,
          xp_awarded: 0,
          feedback:
            "Good try! Provide a more detailed answer next time for bonus XP.",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use 'trigger' or 'answer'." }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
