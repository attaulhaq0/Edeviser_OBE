import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// =============================================================================
// notification-digest — pg_cron triggered at 8 PM daily
// Aggregates undelivered notifications into a single daily summary
// for students with digest preference enabled.
// Validates: Requirements 65.4, 65.5
// =============================================================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

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

    // Step 1: Find all students with digest preference enabled
    const { data: digestProfiles, error: profilesErr } = await supabase
      .from("profiles")
      .select("id, email_preferences")
      .eq("role", "student")
      .eq("is_active", true);

    if (profilesErr) {
      console.error("Failed to fetch profiles:", profilesErr.message);
      return new Response(
        JSON.stringify({
          error: "Failed to fetch profiles",
          detail: profilesErr.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Filter to students who have notification_digest enabled
    const digestStudentIds = (digestProfiles ?? [])
      .filter((p: { email_preferences: Record<string, unknown> | null }) => {
        const prefs = p.email_preferences;
        return (
          prefs &&
          (prefs as Record<string, unknown>).notification_digest === true
        );
      })
      .map((p: { id: string }) => p.id);

    if (digestStudentIds.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          digests_created: 0,
          message: "No digest subscribers",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2: For each digest subscriber, aggregate unread notifications from today
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const todayStartISO = todayStart.toISOString();

    let digestsCreated = 0;

    for (const studentId of digestStudentIds) {
      // Fetch unread, non-digest notifications from today
      const { data: unreadNotifications, error: fetchErr } = await supabase
        .from("notifications")
        .select("id, type, title, body, created_at")
        .eq("user_id", studentId)
        .eq("is_read", false)
        .gte("created_at", todayStartISO)
        .order("created_at", { ascending: false });

      if (fetchErr) {
        console.error(
          `Failed to fetch notifications for ${studentId}:`,
          fetchErr.message
        );
        continue;
      }

      if (!unreadNotifications || unreadNotifications.length === 0) continue;

      // Filter out any existing digest notifications to avoid recursion
      const nonDigestNotifications = unreadNotifications.filter(
        (n: { type: string; title: string }) =>
          !(n.type === "digest" || n.title.startsWith("Daily Digest"))
      );

      if (nonDigestNotifications.length === 0) continue;

      // Build summary by type
      const typeCounts = new Map<string, number>();
      for (const n of nonDigestNotifications) {
        const t = n.type as string;
        typeCounts.set(t, (typeCounts.get(t) ?? 0) + 1);
      }

      const summaryParts: string[] = [];
      for (const [type, count] of typeCounts) {
        summaryParts.push(
          `${count} ${type.replace(/_/g, " ")}${count > 1 ? "s" : ""}`
        );
      }

      const summaryBody = `Today's summary: ${summaryParts.join(", ")}`;

      // Step 3: Create a single digest notification
      const { error: insertErr } = await supabase.from("notifications").insert({
        user_id: studentId,
        type: "digest",
        title: `Daily Digest — ${nonDigestNotifications.length} notifications`,
        body: summaryBody,
        is_read: false,
        metadata: {
          is_digest: true,
          notification_count: nonDigestNotifications.length,
          type_breakdown: Object.fromEntries(typeCounts),
          aggregated_ids: nonDigestNotifications.map(
            (n: { id: string }) => n.id
          ),
        },
      });

      if (insertErr) {
        console.error(
          `Failed to create digest for ${studentId}:`,
          insertErr.message
        );
        continue;
      }

      // Step 4: Mark the individual notifications as read (delivered via digest)
      const notificationIds = nonDigestNotifications.map(
        (n: { id: string }) => n.id
      );
      const { error: updateErr } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .in("id", notificationIds);

      if (updateErr) {
        console.error(
          `Failed to mark notifications as read for ${studentId}:`,
          updateErr.message
        );
      }

      digestsCreated++;
    }

    return new Response(
      JSON.stringify({
        success: true,
        digests_created: digestsCreated,
        total_subscribers: digestStudentIds.length,
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
