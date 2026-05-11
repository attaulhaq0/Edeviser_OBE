// Task 132.5: Team streak risk cron — notifies team members when streak is at risk

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

    const today = new Date().toISOString().slice(0, 10);

    // Fetch all teams with active streaks
    const { data: activeTeams, error: teamsErr } = await supabase
      .from("team_gamification")
      .select("team_id, streak_current")
      .gt("streak_current", 0);

    if (teamsErr) throw teamsErr;
    if (!activeTeams || activeTeams.length === 0) {
      return new Response(JSON.stringify({ success: true, teams_checked: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let notificationsSent = 0;

    for (const team of activeTeams) {
      // Get team members
      const { data: members } = await supabase
        .from("team_members")
        .select("student_id")
        .eq("team_id", team.team_id);

      if (!members || members.length === 0) continue;

      const memberIds = members.map(
        (m: { student_id: string }) => m.student_id
      );

      // Check which members have NOT logged in today
      const { data: todayLogins } = await supabase
        .from("student_activity_log")
        .select("student_id")
        .in("student_id", memberIds)
        .eq("event_type", "login")
        .gte("created_at", `${today}T00:00:00Z`);

      const loggedInIds = new Set(
        (todayLogins ?? []).map((l: { student_id: string }) => l.student_id)
      );

      const missingMembers = memberIds.filter(
        (id: string) => !loggedInIds.has(id)
      );

      if (missingMembers.length === 0) continue;

      // Get names of missing members
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", missingMembers);

      const missingNames = (profiles ?? [])
        .map((p: { full_name: string }) => p.full_name || "A teammate")
        .join(", ");

      // Send notification to all team members
      const notifications = memberIds.map((memberId: string) => ({
        user_id: memberId,
        type: "team_streak_risk",
        title: "Team Streak at Risk",
        message: `Your team streak is at risk — ${missingNames} hasn't logged in today.`,
        is_read: false,
        metadata: { team_id: team.team_id, missing_members: missingMembers },
      }));

      const { error: notifErr } = await supabase
        .from("notifications")
        .insert(notifications);
      if (!notifErr) notificationsSent += notifications.length;
    }

    return new Response(
      JSON.stringify({
        success: true,
        teams_checked: activeTeams.length,
        notifications_sent: notificationsSent,
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
