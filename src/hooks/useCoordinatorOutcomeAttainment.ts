// =============================================================================
// useCoordinatorOutcomeAttainment — real ILO→PLO→CLO attainment rollup
// =============================================================================
//
// Aggregate read hook (UI prototype migration, Phase A backend wiring) that
// powers the redesigned coordinator Outcome Attainment screen with REAL data.
// It reads the existing tables only (no new backend):
//   • learning_outcomes  — the ILO / PLO / CLO records (RLS-scoped to the
//                           caller's institution)
//   • outcome_attainment  — mean attainment per outcome (each outcome_id is
//                           stored at exactly one scope: ILO=program,
//                           PLO=course, CLO=student_course), plus per-student
//                           rows used to derive "affected students"
//   • outcome_mappings    — parent→child edges (source=parent, target=child),
//                           so a PLO's contributing CLOs = mappings where
//                           source_outcome_id = plo.id
//   • courses             — code lookup for the weakest-course signal
//   • institution_settings — success_threshold (defaults to 70)
//
// All aggregation is done client-side over small, column-projected payloads.
// No writes. Trends (per-term) and AI insights are intentionally NOT here —
// they arrive in Phase C (semester snapshots + AI edge function).
// =============================================================================

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";

const DEFAULT_SUCCESS_THRESHOLD = 70;
const DEVELOPING_THRESHOLD = 50;

export type AttainmentStatus = "onTrack" | "watch" | "belowTarget" | "none";

export interface AttainmentCLO {
  id: string;
  title: string;
  attainment: number | null;
}

export interface AttainmentPLO {
  id: string;
  title: string;
  description: string | null;
  attainment: number | null;
  status: AttainmentStatus;
  contributingClos: AttainmentCLO[];
  /** Weakest contributing course (code + attainment), if derivable. */
  weakestCourse: { code: string; attainment: number } | null;
  /** Students whose mean attainment for this PLO is below the success threshold. */
  affectedStudents: number;
  /** affectedStudents as a % of the students measured for this PLO. */
  cohortPercent: number;
}

export interface AttainmentILO {
  id: string;
  title: string;
  attainment: number | null;
  status: AttainmentStatus;
}

export interface CoordinatorOutcomeAttainment {
  ilos: AttainmentILO[];
  plos: AttainmentPLO[];
  successThreshold: number;
}

const statusFor = (att: number | null, threshold: number): AttainmentStatus => {
  if (att === null) return "none";
  if (att >= threshold) return "onTrack";
  if (att >= DEVELOPING_THRESHOLD) return "watch";
  return "belowTarget";
};

interface OutcomeRow {
  id: string;
  type: string;
  title: string;
  description: string | null;
  course_id: string | null;
  sort_order: number | null;
}
interface AttRow {
  outcome_id: string;
  attainment_percent: number | null;
  student_id: string | null;
  course_id: string | null;
}
interface MapRow {
  source_outcome_id: string;
  target_outcome_id: string;
}

export const useCoordinatorOutcomeAttainment = (
  institutionId?: string | null
) => {
  return useQuery({
    queryKey: queryKeys.outcomeMappings.list({
      view: "coordinatorOutcomeAttainment",
      institutionId: institutionId ?? null,
    }),
    enabled: !!institutionId,
    queryFn: async (): Promise<CoordinatorOutcomeAttainment> => {
      const [outcomesRes, attRes, mapRes, coursesRes, settingsRes] =
        await Promise.all([
          supabase
            .from("learning_outcomes")
            .select("id, type, title, description, course_id, sort_order")
            .eq("institution_id", institutionId ?? "")
            .order("sort_order", { ascending: true }),
          supabase
            .from("outcome_attainment")
            .select("outcome_id, attainment_percent, student_id, course_id"),
          supabase
            .from("outcome_mappings")
            .select("source_outcome_id, target_outcome_id"),
          supabase.from("courses").select("id, code"),
          supabase
            .from("institution_settings")
            .select("success_threshold")
            .eq("institution_id", institutionId ?? "")
            .limit(1)
            .maybeSingle(),
        ]);

      if (outcomesRes.error) throw outcomesRes.error;
      if (attRes.error) throw attRes.error;
      if (mapRes.error) throw mapRes.error;
      if (coursesRes.error) throw coursesRes.error;
      // institution_settings is best-effort — fall back to the default threshold.

      const outcomes = (outcomesRes.data ?? []) as OutcomeRow[];
      const att = (attRes.data ?? []) as AttRow[];
      const mappings = (mapRes.data ?? []) as MapRow[];
      const threshold =
        settingsRes.data?.success_threshold ?? DEFAULT_SUCCESS_THRESHOLD;

      const courseCode = new Map<string, string>(
        (coursesRes.data ?? []).map((c) => [c.id, c.code as string])
      );

      // Mean attainment per outcome + per-student means (for "affected students").
      const totals = new Map<string, { sum: number; n: number }>();
      const perStudent = new Map<
        string,
        Map<string, { sum: number; n: number }>
      >();
      for (const r of att) {
        if (r.attainment_percent == null) continue;
        const t = totals.get(r.outcome_id) ?? { sum: 0, n: 0 };
        t.sum += r.attainment_percent;
        t.n += 1;
        totals.set(r.outcome_id, t);
        if (r.student_id) {
          const byStudent = perStudent.get(r.outcome_id) ?? new Map();
          const s = byStudent.get(r.student_id) ?? { sum: 0, n: 0 };
          s.sum += r.attainment_percent;
          s.n += 1;
          byStudent.set(r.student_id, s);
          perStudent.set(r.outcome_id, byStudent);
        }
      }
      const meanOf = (id: string): number | null => {
        const t = totals.get(id);
        return t && t.n > 0 ? Math.round(t.sum / t.n) : null;
      };

      // outcome id → its record (for CLO title / course lookups).
      const byId = new Map<string, OutcomeRow>(outcomes.map((o) => [o.id, o]));
      // Undirected adjacency between outcomes. outcome_mappings in this data are
      // stored child→parent for some pairs (CLO→PLO, PLO→ILO) and parent→child
      // for others (ILO→PLO), so we treat edges as undirected and resolve a
      // PLO's contributing CLOs by outcome TYPE rather than by edge direction.
      const relatedOf = new Map<string, Set<string>>();
      const addEdge = (a: string, b: string) => {
        const set = relatedOf.get(a) ?? new Set<string>();
        set.add(b);
        relatedOf.set(a, set);
      };
      for (const m of mappings) {
        addEdge(m.source_outcome_id, m.target_outcome_id);
        addEdge(m.target_outcome_id, m.source_outcome_id);
      }

      const ilos: AttainmentILO[] = outcomes
        .filter((o) => o.type === "ILO")
        .map((o) => {
          const attainment = meanOf(o.id);
          return {
            id: o.id,
            title: o.title,
            attainment,
            status: statusFor(attainment, threshold),
          };
        });

      const plos: AttainmentPLO[] = outcomes
        .filter((o) => o.type === "PLO")
        .map((o) => {
          const attainment = meanOf(o.id);

          const cloIds = Array.from(relatedOf.get(o.id) ?? []).filter((id) => {
            const related = byId.get(id);
            return related?.type === "CLO";
          });
          const contributingClos: AttainmentCLO[] = cloIds.map((id) => {
            const clo = byId.get(id);
            return {
              id,
              title: clo?.title ?? id,
              attainment: meanOf(id),
            };
          });

          // Weakest contributing course = the contributing CLO with the lowest
          // measured attainment, resolved to its course code.
          let weakestCourse: AttainmentPLO["weakestCourse"] = null;
          for (const clo of contributingClos) {
            if (clo.attainment == null) continue;
            const cid = byId.get(clo.id)?.course_id ?? null;
            const code = cid ? courseCode.get(cid) : undefined;
            if (!code) continue;
            if (!weakestCourse || clo.attainment < weakestCourse.attainment) {
              weakestCourse = { code, attainment: clo.attainment };
            }
          }

          // Affected students = students whose mean attainment for this PLO is
          // below the success threshold.
          const byStudent = perStudent.get(o.id);
          let affectedStudents = 0;
          let cohort = 0;
          if (byStudent) {
            cohort = byStudent.size;
            for (const s of byStudent.values()) {
              if (s.n > 0 && s.sum / s.n < threshold) affectedStudents += 1;
            }
          }
          const cohortPercent =
            cohort > 0 ? Math.round((affectedStudents / cohort) * 100) : 0;

          return {
            id: o.id,
            title: o.title,
            description: o.description,
            attainment,
            status: statusFor(attainment, threshold),
            contributingClos,
            weakestCourse,
            affectedStudents,
            cohortPercent,
          };
        });

      return { ilos, plos, successThreshold: threshold };
    },
  });
};
