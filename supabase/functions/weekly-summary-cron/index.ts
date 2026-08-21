import { getManagedServerKey } from "../_shared/serverSecret.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ─── pg_cron schedule: 0 8 * * 1 (Monday 8 AM) ─────────────────────────────
// Aggregates weekly XP, badges, streak, and submission counts per student.
// Sends a weekly_summary email via send-email-notification.

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── Auth: cron secret or service role only ──────────────────────
    const cronSecret = req.headers.get("x-cron-secret");
    const expectedSecret = Deno.env.get("CRON_SECRET");
    const authHeader = req.headers.get("Authorization") ?? "";
    const serviceRoleKey = getManagedServerKey();
    const isServiceRole =
      serviceRoleKey && authHeader.replace("Bearer ", "") === serviceRoleKey;
    const isCron = expectedSecret && cronSecret === expectedSecret;

    if (!isServiceRole && !isCron) {
      return new Response(
        JSON.stringify({
          error: "Unauthorized: cron secret or service role required",
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      getManagedServerKey()
    );

    // Calculate the date range for the past week (Monday to Sunday)
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoISO = weekAgo.toISOString();

    // Fetch all active students
    const { data: students, error: studentsErr } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .eq("role", "student")
      .eq("is_active", true);

    if (studentsErr) {
      console.error("Failed to fetch students:", studentsErr.message);
      return new Response(
        JSON.stringify({
          error: "Failed to fetch students",
          detail: studentsErr.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!students || students.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          sent: 0,
          message: "No active students found",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const appUrl = (Deno.env.get("APP_URL") ?? "https://app.edeviser.com")
      .trim()
      .replace(/\/+$/, "");
    const dashboardUrl = `${appUrl}/student/dashboard`;
    const results: Array<
      | { student_id: string; sent: true }
      | { student_id: string; sent: false; error: string }
    > = [];

    // Bound concurrency so the weekly job finishes within its caller timeout
    // without creating an unbounded burst for larger institutions.
    for (let offset = 0; offset < students.length; offset += 10) {
      const batch = students.slice(offset, offset + 10);
      results.push(
        ...(await Promise.all(
          batch.map(async (student) => {
            try {
              // Aggregate XP earned this week
              const [
                xpResult,
                badgesResult,
                gamificationResult,
                submissionsResult,
              ] = await Promise.all([
                supabase
                  .from("xp_transactions")
                  .select("xp_amount")
                  .eq("student_id", student.id)
                  .gte("created_at", weekAgoISO),
                supabase
                  .from("student_badges")
                  .select("id", { count: "exact", head: true })
                  .eq("student_id", student.id)
                  .gte("awarded_at", weekAgoISO),
                supabase
                  .from("student_gamification")
                  .select("streak_current")
                  .eq("student_id", student.id)
                  .maybeSingle(),
                supabase
                  .from("submissions")
                  .select("id", { count: "exact", head: true })
                  .eq("student_id", student.id)
                  .gte("created_at", weekAgoISO),
              ]);

              const xpEarned = (xpResult.data ?? []).reduce(
                (sum: number, row: { xp_amount: number }) =>
                  sum + row.xp_amount,
                0
              );

              const { error: emailError } = await supabase.functions.invoke(
                "send-email-notification",
                {
                  body: {
                    to: student.email,
                    template: "weekly_summary",
                    data: {
                      student_name: student.full_name,
                      xp_earned: xpEarned,
                      badges_earned: badgesResult.count ?? 0,
                      streak_count:
                        gamificationResult.data?.streak_current ?? 0,
                      submissions_count: submissionsResult.count ?? 0,
                      dashboard_url: dashboardUrl,
                    },
                  },
                }
              );
              if (emailError) throw emailError;
              return { student_id: student.id, sent: true } as const;
            } catch (err) {
              return {
                student_id: student.id,
                sent: false,
                error: err instanceof Error ? err.message : String(err),
              } as const;
            }
          })
        ))
      );
    }

    const sent = results.filter((result) => result.sent).length;
    const errors = results
      .filter((result) => !result.sent)
      .map(({ student_id, error }) => ({ student_id, error }));

    return new Response(
      JSON.stringify({
        success: true,
        sent,
        total_students: students.length,
        errors,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("weekly-summary-cron error:", (error as Error).message);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
