import { getManagedServerKey } from "../_shared/serverSecret.ts";
// Task 139.1: Improvement Bonus Check Edge Function
// HARDENED 2026-09-05 (continuous-verification Phase 6.9):
//  - Idempotency: XP reference_id is now derived from the *evidence row id*
//    (deterministic per improvement event), not Date.now(), so retries can never
//    double-award. award-xp also dedupes on its unique reference_id column.
//  - Trust boundary: current_score_percent is no longer taken from the request
//    body. It is re-read server-side from the latest evidence row for the
//    (student_id, clo_id) pair, so a caller cannot forge scores to farm XP.
//  - Auth: this is a server-to-server worker. It must be invoked with the
//    managed server key (or CRON_SECRET); the function verifies the key before
//    doing any work so it cannot be triggered anonymously (P1 hardening).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";

const PayloadSchema = z.object({
  student_id: z.string().min(1),
  clo_id: z.string().min(1),
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const IMPROVEMENT_THRESHOLD_PP = 15;
const IMPROVEMENT_BONUS_XP = 50;

/** Server-to-server guard: require the managed server key or CRON_SECRET. */
function assertServerCaller(req: Request): void {
  const auth = req.headers.get("authorization") ?? "";
  const bearer = auth.replace(/^Bearer\s+/i, "").trim();
  const cron = Deno.env.get("CRON_SECRET");
  if (bearer && bearer === cron) return;
  if (bearer && bearer === getManagedServerKey()) return;
  throw new Error("Unauthorized: managed server key or cron secret required");
}

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });
  try {
    assertServerCaller(req);
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      getManagedServerKey()
    );
    const body = await req.json();
    const parsed = PayloadSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { student_id, clo_id } = parsed.data;

    // Find most recent evidence rows for the same CLO and student.
    const { data: prevEvidence, error: prevErr } = await supabase
      .from("evidence")
      .select("id, score_percent")
      .eq("student_id", student_id)
      .eq("clo_id", clo_id)
      .order("created_at", { ascending: false })
      .limit(2);
    if (prevErr) throw prevErr;
    // Need at least 2 records (current + previous).
    if (!prevEvidence || prevEvidence.length < 2) {
      return new Response(
        JSON.stringify({
          success: true,
          bonus_awarded: false,
          reason: "No previous evidence",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // current is server-derived (row 0), NOT from the request body.
    const currentEvidence = prevEvidence[0] as {
      id: string;
      score_percent: number;
    };
    const previousPercent = (prevEvidence[1] as { score_percent: number })
      .score_percent;
    const currentPercent = currentEvidence.score_percent;
    const improvement = currentPercent - previousPercent;
    if (improvement < IMPROVEMENT_THRESHOLD_PP) {
      return new Response(
        JSON.stringify({
          success: true,
          bonus_awarded: false,
          improvement,
          reason: "Improvement below 15pp threshold",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Award 50 XP with source = improvement_bonus (Req 123.5).
    // Idempotent: reference derived from the evidence row id, so retries are
    // deduped by award-xp's unique reference_id.
    const noteData = {
      action_type: "improvement_bonus",
      clo_id,
      evidence_id: currentEvidence.id,
      previous_percent: previousPercent,
      current_percent: currentPercent,
      improvement_pp: improvement,
    };
    await supabase.functions.invoke("award-xp", {
      body: {
        student_id,
        xp_amount: IMPROVEMENT_BONUS_XP,
        source: "improvement_bonus",
        reference_id: "improvement:" + currentEvidence.id,
        note: JSON.stringify(noteData),
      },
    });
    return new Response(
      JSON.stringify({
        success: true,
        bonus_awarded: true,
        improvement,
        xp_awarded: IMPROVEMENT_BONUS_XP,
        evidence_id: currentEvidence.id,
        previous_percent: previousPercent,
        current_percent: currentPercent,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const status =
      error instanceof Error && error.message.startsWith("Unauthorized")
        ? 401
        : 500;
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
