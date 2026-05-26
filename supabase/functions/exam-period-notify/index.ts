import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ─── pg_cron schedule: 0 9 * * * (daily 9 AM) ──────────────────────────────
// Checks for exam_period events starting in 5 days.
// Creates in-app notifications for enrolled students.

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

  try {
    // ── Auth: cron secret or service role only ──────────────────────
    const cronSecret = req.headers.get("x-cron-secret");
    const expectedSecret = Deno.env.get("CRON_SECRET");
    const authHeader = req.headers.get("Authorization") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
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
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find exam_period events starting in exactly 5 days
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 5);
    const targetDateStr = targetDate.toISOString().slice(0, 10);

    const { data: examEvents, error: evtErr } = await supabase
      .from("academic_calendar_events")
      .select("id, title, institution_id, start_date")
      .eq("event_type", "exam_period")
      .eq("start_date", targetDateStr);

    if (evtErr) throw new Error(evtErr.message);

    if (!examEvents || examEvents.length === 0) {
      return new Response(JSON.stringify({ success: true, notified: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let totalNotified = 0;

    for (const event of examEvents) {
      // Get all students in this institution
      const { data: students } = await supabase
        .from("profiles")
        .select("id")
        .eq("role", "student")
        .eq("institution_id", event.institution_id);

      if (!students || students.length === 0) continue;

      // Create in-app notifications
      const notifications = students.map((s: { id: string }) => ({
        user_id: s.id,
        title: "Exam Period Approaching",
        message: `${event.title} starts in 5 days (${event.start_date}). Good luck with your preparation!`,
        type: "exam_period_reminder",
        is_read: false,
      }));

      const { error: insertErr } = await supabase
        .from("notifications")
        .insert(notifications);

      if (insertErr) {
        console.error(
          `Failed to insert notifications for event ${event.id}:`,
          insertErr.message
        );
      } else {
        totalNotified += notifications.length;
      }
    }

    return new Response(
      JSON.stringify({ success: true, notified: totalNotified }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("exam-period-notify error:", (error as Error).message);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
