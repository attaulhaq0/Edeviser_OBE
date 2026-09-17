// compute-habit-signals — Phase 17: Structured habit signal persistence
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

function computeSignal(signal: string, logs: Array<{ habit_type: string; date: string }>, windowDays: number): { value: number; confidence: number } {
  if (signal === "consistency") { const days = new Set(logs.map((l) => l.date)); const v = windowDays > 0 ? days.size / windowDays : 0; return { value: Math.min(1, v), confidence: windowDays >= 7 ? 0.9 : 0.6 }; }
  if (signal === "completion_rate") { const c = logs.filter((l) => l.habit_type === "submit").length; const t = logs.length || 1; return { value: Math.min(1, c / t), confidence: t >= 3 ? 0.9 : 0.5 }; }
  if (signal === "engagement_frequency") { const d = new Set(logs.map((l) => l.date)).size; return { value: Math.min(1, d / 7), confidence: 0.85 }; }
  if (signal === "delay_pattern") { const dates = [...new Set(logs.map((l) => l.date))].sort(); if (dates.length < 2) return { value: 0, confidence: 0.3 }; let g = 0; for (let i = 1; i < dates.length; i++) g += (new Date(dates[i]).getTime() - new Date(dates[i - 1]).getTime()) / 86_400_000; const avg = g / (dates.length - 1); return { value: Math.max(0, 1 - avg / 7), confidence: dates.length >= 3 ? 0.8 : 0.5 }; }
  return { value: 0, confidence: 0 };
serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const auth = req.headers.get("authorization") ?? "";
    const cronSecret = req.headers.get("x-cron-secret") ?? "";
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const isCron = cronSecret && cronSecret === Deno.env.get("CRON_SECRET");
    if (!isCron && !auth.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });
    }
    const adminClient = createClient(Deno.env.get("SUPABASE_URL") ?? "", isCron ? key : auth.replace("Bearer ", ""), isCron ? {} : undefined);
    const body = await req.json().catch(() => ({}));
    const studentId = body.student_id as string | undefined;
    const institutionId = body.institution_id as string | undefined;
    let query = adminClient.from("student_learning_states").select("student_id, institution_id");
    if (studentId) query = query.eq("student_id", studentId);
    if (institutionId) query = query.eq("institution_id", institutionId);
    const { data: states, error: se } = await query;
    if (se) throw se;
    if (!states?.length) return new Response(JSON.stringify({ message: "No students", count: 0 }), { headers: { ...cors, "Content-Type": "application/json" } });

    const we = new Date().toISOString().split("T")[0];
    const ws = new Date(Date.now() - 7 * 86_400_000).toISOString().split("T")[0];
    const signals: Array<{ sid: string; behavior: string; name: string; dim: string; val: number; src: string; conf: number; refs: string[] }> = [];

    for (const state of states) {
      const sid = state.student_id as string;
      const { data: logs } = await adminClient.from("habit_logs").select("habit_type, date").eq("student_id", sid).gte("date", ws).lte("date", we);
      const entries = (logs ?? []) as Array<{ habit_type: string; date: string }>;
      for (const b of ["daily_login", "complete_assessment", "journal_reflection", "read_material"]) {
        for (const sn of ["consistency", "completion_rate", "engagement_frequency"]) {
          const r = computeSignal(sn, entries, 7);
          if (r.confidence > 0) {
            signals.push({ sid, behavior: b, name: sn, dim: sn === "consistency" ? "consistency" : sn === "completion_rate" ? "completion_rate" : "engagement_frequency", val: r.value, src: "observed", conf: r.confidence, refs: entries.filter((e) => e.habit_type !== "login" || b === "daily_login").slice(0, 10).map((_, i) => `habit_log:${sid}:${i}`) });
          }
        }
      }
    }

    if (signals.length > 0) {
      const { error: ie } = await adminClient.from("student_learning_states").upsert(
        states.map((s) => ({
          student_id: s.student_id, institution_id: s.institution_id,
          habits: { windowDays: 7, signals: signals.filter((sig) => sig.sid === s.student_id).map((sig) => ({ behaviorId: sig.behavior, signalName: sig.name, value: sig.val, source: sig.src, confidence: sig.conf, window: { start: ws, end: we }, generatedAt: new Date().toISOString(), evidenceReferences: sig.refs })) },
          updated_at: new Date().toISOString(),
        })), { onConflict: "student_id" }
      );
      if (ie) throw ie;
    }
    return new Response(JSON.stringify({ message: "Signals computed", studentCount: states.length, signalCount: signals.length }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
}