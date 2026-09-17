// ai-cost-track — Phase 18: Server-side AI cost/usage tracking
// Called by agent-orchestrator after each LLM invocation
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface TrackInput {
  run_id: string;
  capability: string;
  provider: string;
  model: string;
  tokens_used: number;
  latency_ms: number;
  success: boolean;
  error_type?: string;
  institution_id?: string;
  student_id?: string;
  workflow: string;
  estimated_cost: number;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const auth = req.headers.get("authorization") ?? "";
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      auth.startsWith("Bearer ") ? auth.replace("Bearer ", "") : key
    );

    const body: TrackInput = await req.json();
    if (!body.run_id)
      return new Response(JSON.stringify({ error: "run_id required" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });

    // Update agent_runs with cost data
    const { error } = await admin
      .from("agent_runs")
      .update({
        model: body.model,
        latency_ms: body.latency_ms,
        error_classification: body.error_type ?? null,
      })
      .eq("id", body.run_id);

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown" }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }
});
