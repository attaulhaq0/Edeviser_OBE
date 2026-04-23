// Task 55: GDPR Student Data Export Edge Function
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedOrigin =
  Deno.env.get("ALLOWED_ORIGIN") ?? "https://edeviser.vercel.app";
const corsHeaders = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/** Convert an array of objects to CSV string */
function toCsv(rows: Record<string, unknown>[], section: string): string {
  if (rows.length === 0) return "";
  const keys = Object.keys(rows[0]!);
  const header = keys.join(",");
  const lines = rows.map((row) =>
    keys
      .map((k) => {
        const val = row[k];
        if (val === null || val === undefined) return "";
        const str = String(val);
        // Escape CSV values containing commas, quotes, or newlines
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      })
      .join(",")
  );
  return `--- ${section} ---\n${header}\n${lines.join("\n")}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

  try {
    // Auth: student can only export their own data
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const {
      data: { user },
      error: authErr,
    } = await userClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const studentId = user.id;
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { format: fmt = "json" } = await req
      .json()
      .catch(() => ({ format: "json" }));
    const exportFormat = fmt === "csv" ? "csv" : "json";

    // Gather all student-scoped data in parallel
    const submissionsResult = await supabase
      .from("submissions")
      .select("id")
      .eq("student_id", studentId);
    const submissionIds =
      submissionsResult.data?.map((s: { id: string }) => s.id) ?? [];

    const [profile, grades, attainment, xp, journals, badges, habits] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, email, role, created_at")
          .eq("id", studentId)
          .maybeSingle(),
        supabase
          .from("grades")
          .select("id, score_percent, overall_feedback, created_at")
          .in(
            "submission_id",
            submissionIds.length > 0 ? submissionIds : ["__none__"]
          ),
        supabase
          .from("outcome_attainment")
          .select("outcome_id, attainment_percent, scope, last_calculated_at")
          .eq("student_id", studentId),
        supabase
          .from("xp_transactions")
          .select("source, xp_amount, created_at")
          .eq("student_id", studentId),
        supabase
          .from("journal_entries")
          .select("id, title, word_count, created_at")
          .eq("student_id", studentId),
        supabase
          .from("student_badges")
          .select("badge_id, awarded_at")
          .eq("student_id", studentId),
        supabase
          .from("habit_logs")
          .select("date, habit_type")
          .eq("student_id", studentId),
      ]);

    const exportData = {
      exported_at: new Date().toISOString(),
      profile: profile.data,
      grades: grades.data ?? [],
      outcome_attainment: attainment.data ?? [],
      xp_transactions: xp.data ?? [],
      journal_entries: journals.data ?? [],
      badges: badges.data ?? [],
      habit_logs: habits.data ?? [],
    };

    let content: string;
    let contentType: string;
    let fileExtension: string;

    if (exportFormat === "csv") {
      const sections: string[] = [];
      if (exportData.profile) {
        sections.push(toCsv([exportData.profile], "Profile"));
      }
      if (exportData.grades.length > 0) {
        sections.push(toCsv(exportData.grades, "Grades"));
      }
      if (exportData.outcome_attainment.length > 0) {
        sections.push(
          toCsv(exportData.outcome_attainment, "Outcome Attainment")
        );
      }
      if (exportData.xp_transactions.length > 0) {
        sections.push(toCsv(exportData.xp_transactions, "XP Transactions"));
      }
      if (exportData.journal_entries.length > 0) {
        sections.push(toCsv(exportData.journal_entries, "Journal Entries"));
      }
      if (exportData.badges.length > 0) {
        sections.push(toCsv(exportData.badges, "Badges"));
      }
      if (exportData.habit_logs.length > 0) {
        sections.push(toCsv(exportData.habit_logs, "Habit Logs"));
      }
      content = `Exported at: ${exportData.exported_at}\n\n${sections.join(
        "\n\n"
      )}`;
      contentType = "text/csv";
      fileExtension = "csv";
    } else {
      content = JSON.stringify(exportData, null, 2);
      contentType = "application/json";
      fileExtension = "json";
    }

    const fileName = `exports/${studentId}_${Date.now()}.${fileExtension}`;

    // Guard against path traversal in the constructed storage path
    if (fileName.includes("..")) {
      return new Response(JSON.stringify({ error: "Invalid file path" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const encoded = new TextEncoder().encode(content);

    const { error: uploadErr } = await supabase.storage
      .from("reports")
      .upload(fileName, encoded, { contentType, upsert: false });

    if (uploadErr) {
      // Bucket may not exist yet — create and retry
      await supabase.storage
        .createBucket("reports", { public: false })
        .catch(() => {});
      const { error: retryErr } = await supabase.storage
        .from("reports")
        .upload(fileName, encoded, { contentType, upsert: false });
      if (retryErr) throw retryErr;
    }

    const { data: signedUrl } = await supabase.storage
      .from("reports")
      .createSignedUrl(fileName, 3600);

    return new Response(
      JSON.stringify({
        success: true,
        download_url: signedUrl?.signedUrl,
        file_size_bytes: encoded.byteLength,
        generated_at: exportData.exported_at,
        format: exportFormat,
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
