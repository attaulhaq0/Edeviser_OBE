// cqi-review-reminder — pg_cron Edge Function (runs Mon 09:00 UTC)
// Emits cqi_plan_review_due notifications to coordinators 7 days before next_review_date
// Task 102 — UI Consistency Global Fixes

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    const targetDate = sevenDaysFromNow.toISOString().split("T")[0];

    // Find CQI plans due for review in 7 days
    const { data: plans, error } = await supabase
      .from("cqi_action_plans")
      .select("id, program_id, action_description, next_review_date")
      .eq("next_review_date", targetDate)
      .in("status", ["planned", "in_progress"]);

    if (error) throw error;

    let notified = 0;

    for (const plan of plans ?? []) {
      // Find coordinator for the program
      const { data: program } = await supabase
        .from("programs")
        .select("coordinator_id")
        .eq("id", plan.program_id)
        .maybeSingle();

      if (!program?.coordinator_id) continue;

      // Dedup: skip if already notified today
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", program.coordinator_id)
        .eq("type", "cqi_plan_review_due")
        .contains("metadata", { cqi_plan_id: plan.id })
        .gte("created_at", new Date().toISOString().split("T")[0]);

      if ((count ?? 0) > 0) continue;

      await supabase.from("notifications").insert({
        user_id: program.coordinator_id,
        type: "cqi_plan_review_due",
        title: "CQI plan review due in 7 days",
        body: `Review due: ${
          plan.action_description?.slice(0, 80) ?? "CQI action plan"
        }`,
        metadata: { cqi_plan_id: plan.id, review_date: plan.next_review_date },
        is_read: false,
      });

      notified++;
    }

    return new Response(JSON.stringify({ success: true, notified }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
