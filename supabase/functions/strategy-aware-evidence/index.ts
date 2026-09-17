// strategy-aware-evidence — Phase 16: Strategy-resolved evidence creation
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { authenticateRequest } from "../_shared/auth.ts";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };

interface Input { courseId: string; studentId: string; assessmentModel: string; nativeInput: Record<string, unknown>; assignmentId?: string; submissionId?: string; gradeId?: string; }

function classifyAttainment(pct: number): string {
  if (pct >= 85) return "Excellent";
  if (pct >= 70) return "Satisfactory";
  if (pct >= 50) return "Developing";
  return "Not_Yet";
}
function normalize(input: Record<string, unknown>, model: string) {
  if (model === "percent") {
    const s = Number(input.score ?? 0); const m = Number(input.maxScore ?? 1);
    const p = m > 0 ? Math.round((s / m) * 10000) / 100 : 0;
    return { pct: p, native: { kind: "percent", score: s, maxScore: m }, outcomes: [{ id: "_overall", pct: p }] };
  }
  if (model === "criterion") {
    const c = (input.criteria as Array<Record<string, unknown>>) ?? [];
    const t = c.reduce((s, x) => s + (Number(x.level ?? 0) / Math.max(1, Number(x.maxLevel ?? 8))) * 100, 0);
    const p = c.length > 0 ? Math.round((t / c.length) * 100) / 100 : 0;
    return { pct: p, native: { kind: "criterion", criteria: c }, outcomes: c.map((x) => ({ id: String(x.criterionId ?? ""), pct: Math.round((Number(x.level ?? 0) / Math.max(1, Number(x.maxLevel ?? 8))) * 10000) / 100 })) };
  }
  if (model === "band_grade") {
    const r = Number(input.rawMark ?? 0); const m = Number(input.maxMark ?? 1);
    const w = Number(input.weightingPercent ?? 100) / 100;
    const rp = m > 0 ? Math.round((r / m) * 10000) / 100 : 0;
    const p = Math.round(rp * w * 100) / 100;
    return { pct: p, native: { kind: "band_grade", rawMark: r, maxMark: m, componentCode: input.componentCode, weightingPercent: input.weightingPercent }, outcomes: [{ id: "_overall", pct: p }] };
  }
  if (model === "component") {
    const c = (input.components as Array<Record<string, unknown>>) ?? [];
    const tw = c.reduce((s, x) => s + Number(x.weightPercent ?? 0), 0);
    const ws = c.reduce((s, x) => s + (Number(x.score ?? 0) / Math.max(1, Number(x.maxScore ?? 100))) * 100 * (Number(x.weightPercent ?? 0) / Math.max(1, tw)), 0);
    const p = Math.round(ws * 100) / 100;
    return { pct: p, native: { kind: "component", components: c }, outcomes: c.map((x) => ({ id: String(x.componentId ?? ""), pct: Math.round((Number(x.score ?? 0) / Math.max(1, Number(x.maxScore ?? 100))) * 10000) / 100 })) };
  }
  throw new Error(`Unknown model: ${model}`);
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { supabase: admin } = await authenticateRequest(req);
    const body: Input = await req.json();
    if (!body.courseId || !body.studentId || !body.assessmentModel || !body.nativeInput) {
      return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }
    const evidence = normalize(body.nativeInput, body.assessmentModel);
    const { data: clos } = await admin.from("learning_outcomes").select("id").eq("course_id", body.courseId).eq("type", "CLO");
    const rows = (clos ?? []).map((c) => ({
      student_id: body.studentId, clo_id: c.id, plo_id: null, ilo_id: null,
      submission_id: body.submissionId ?? null, grade_id: body.gradeId ?? null,
      score_percent: evidence.pct, attainment_level: classifyAttainment(evidence.pct),
      raw_score: { strategy: body.assessmentModel, native: evidence.native, normalized: { overallPercent: evidence.pct } },
    }));
    const { error } = await admin.from("evidence").insert(rows);
    if (error) throw error;
    return new Response(JSON.stringify({ success: true, evidence, cloCount: rows.length }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});