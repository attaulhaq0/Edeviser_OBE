import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ─── pg_cron schedule: 0 6 * * * (daily 6 AM) ──────────────────────────────
// Checks fee_payments with status='pending' where due_date has passed.
// Updates status to 'overdue'.

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

    const today = new Date().toISOString().slice(0, 10);

    // Find all pending fee_payments where the associated fee_structure's due_date has passed
    const { data: pendingPayments, error: fetchErr } = await supabase
      .from("fee_payments")
      .select("id, fee_structure_id")
      .eq("status", "pending");

    if (fetchErr) throw new Error(fetchErr.message);

    if (!pendingPayments || pendingPayments.length === 0) {
      return new Response(JSON.stringify({ success: true, updated: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get fee structures to check due dates
    const structureIds = [
      ...new Set(
        pendingPayments.map(
          (p: { fee_structure_id: string }) => p.fee_structure_id
        )
      ),
    ];
    const { data: structures } = await supabase
      .from("fee_structures")
      .select("id, due_date")
      .in("id", structureIds);

    const overdueStructureIds = new Set(
      (structures ?? [])
        .filter((s: { due_date: string }) => s.due_date < today)
        .map((s: { id: string }) => s.id)
    );

    const overduePaymentIds = pendingPayments
      .filter((p: { fee_structure_id: string }) =>
        overdueStructureIds.has(p.fee_structure_id)
      )
      .map((p: { id: string }) => p.id);

    if (overduePaymentIds.length === 0) {
      return new Response(JSON.stringify({ success: true, updated: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: updateErr } = await supabase
      .from("fee_payments")
      .update({ status: "overdue" })
      .in("id", overduePaymentIds);

    if (updateErr) throw new Error(updateErr.message);

    return new Response(
      JSON.stringify({ success: true, updated: overduePaymentIds.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("fee-overdue-check error:", (error as Error).message);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
