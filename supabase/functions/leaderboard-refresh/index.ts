import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // This function is called by the Vercel cron (api/cron/leaderboard-refresh.ts)
    // which passes the service role key as the Authorization bearer token.
    // Verify the caller is using the service role key.
    const authHeader = req.headers.get("Authorization");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!authHeader || authHeader !== `Bearer ${serviceRoleKey}`) {
      return new Response(
        JSON.stringify({ error: "Unauthorized — service role key required" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      serviceRoleKey
    );

    // The leaderboard_weekly materialized view is already refreshed every 5 min
    // by pg_cron (see migration 20260222124808_add_cron_jobs.sql).
    // This Edge Function serves as a manual trigger / Vercel cron fallback.
    //
    // NOTE: A dedicated DB function `refresh_leaderboard_weekly()` should be
    // created via migration to safely wrap the REFRESH command. Until then,
    // we query the view to confirm it's accessible and report its state.
    const { data, error } = await supabase
      .from("leaderboard_weekly")
      .select("student_id", { count: "exact", head: true });

    if (error) {
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message:
          "Leaderboard view is accessible. Primary refresh is handled by pg_cron every 5 minutes.",
        checked_at: new Date().toISOString(),
      }),
      {
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
