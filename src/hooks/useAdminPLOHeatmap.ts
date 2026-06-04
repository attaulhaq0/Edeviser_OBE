// =============================================================================
// useAdminPLOHeatmap — Admin PLO attainment heatmap data hook
// Feature: qa-partner-review-remediation — Req 7 (P3)
// -----------------------------------------------------------------------------
// DERIVATION METHOD (Req 7.7 — documented):
//
//   For each Program Learning Outcome (PLO) in the admin's institution
//   (`learning_outcomes.type = 'PLO'`), the displayed attainment percentage is
//   derived from `outcome_attainment` as follows:
//
//     1. PRIMARY — course-scope PLO:
//        If one or more `outcome_attainment` rows exist for the PLO with
//        `scope = 'course'` (the attainment rollup trigger writes PLO attainment
//        at course scope — one row per PLO per assessing course), the headline
//        value is the arithmetic MEAN of those rows' `attainment_percent`, and
//        `contributing_count` is the number of course-scope rows averaged.
//        (`derivation = "program"`)
//
//     2. FALLBACK — CLO roll-up:
//        If NO course-scope PLO row exists for the PLO, the value is rolled up
//        from the contributing CLOs.  Contributing CLOs are found via
//        `outcome_mappings` where `target_outcome_id = PLO.id`
//        (`source_outcome_id` is the CLO).  The headline value is the MEAN of the
//        `scope = 'student_course'` `attainment_percent` rows for those CLOs (the
//        scope at which CLO attainment is written), and `contributing_count` is
//        the number of CLO rows averaged. (`derivation = "clo_rollup"`)
//
//     3. NONE — no measurable data:
//        If neither a course-scope PLO row nor any CLO student_course-scope row
//        exists, the PLO is returned with `attainment_percent = -1` (sentinel for
//        "unmeasured") and `contributing_count = 0`.  (`derivation = "none"`)
//        Callers treat `-1` as a neutral/grey cell, distinct from a real 0%.
//
//   The `contributors` array ALWAYS carries the CLO-level breakdown (every mapped
//   CLO that has a course-scope attainment row, with its course name) so the
//   drill-down view is meaningful regardless of which derivation produced the
//   headline number.
//
//   All resolution is performed with a fixed, small number of batched queries
//   (no per-PLO / per-CLO round trips → no N+1), institution-scoped throughout.
// =============================================================================

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { useAuth } from "@/hooks/useAuth";

/** Sentinel returned in `attainment_percent` when a PLO has no measurable data. */
export const PLO_ATTAINMENT_UNMEASURED = -1;

/** How a PLO's headline attainment value was derived (Req 7.7). */
export type PLODerivation = "program" | "clo_rollup" | "none";

/** A single contributing CLO/course row shown in the drill-down (Req 7.3). */
export interface PLOContributor {
  clo_id: string;
  clo_title: string;
  course_id: string | null;
  course_name: string | null;
  attainment_percent: number;
}

/** One PLO cell in the heatmap. */
export interface AdminPLOHeatmapRow {
  plo_id: string;
  plo_title: string;
  program_id: string | null;
  attainment_percent: number;
  contributing_count: number;
  derivation: PLODerivation;
  contributors: PLOContributor[];
}

const mean = (values: number[]): number =>
  values.length === 0
    ? 0
    : values.reduce((sum, v) => sum + v, 0) / values.length;

const uniq = (values: string[]): string[] => Array.from(new Set(values));

/**
 * Derives PLO attainment for the admin's institution from `outcome_attainment`
 * joined (logically) to `learning_outcomes` where `type = 'PLO'`.
 *
 * @param programId Optional program filter; when provided only PLOs belonging to
 *                  that program are returned.
 */
export const useAdminPLOHeatmap = (programId?: string) => {
  const { institutionId } = useAuth();

  return useQuery({
    queryKey: queryKeys.adminPLOHeatmap.list({ institutionId, programId }),
    enabled: !!institutionId,
    queryFn: async (): Promise<AdminPLOHeatmapRow[]> => {
      // 1. PLOs in this institution (explicit column select — no `*`, no TS2589).
      let ploQuery = supabase
        .from("learning_outcomes")
        .select("id, title, program_id, sort_order")
        .eq("institution_id", institutionId!)
        .eq("type", "PLO")
        .order("sort_order", { ascending: true })
        .order("title", { ascending: true });
      if (programId) ploQuery = ploQuery.eq("program_id", programId);

      const { data: plos, error: ploError } = await ploQuery;
      if (ploError) throw ploError;
      if (!plos || plos.length === 0) return [];

      const ploIds = plos.map((p) => p.id);

      // 2. PLO attainment for these PLOs (one batched query).
      //    The attainment rollup trigger writes PLO rows at scope='course'
      //    (one row per PLO per course that assesses it), so that is the scope
      //    we read and average here. (Verified against live data 2026-06:
      //    PLO rows exist only at scope='course', not 'program'.)
      const { data: programRows, error: programError } = await supabase
        .from("outcome_attainment")
        .select("outcome_id, attainment_percent, course_id")
        .eq("scope", "course")
        .in("outcome_id", ploIds);
      if (programError) throw programError;

      const programByPlo = new Map<string, number[]>();
      for (const row of programRows ?? []) {
        const list = programByPlo.get(row.outcome_id) ?? [];
        list.push(row.attainment_percent);
        programByPlo.set(row.outcome_id, list);
      }

      // 3. CLO → PLO mappings for ALL PLOs (one batched query). Used both for the
      //    roll-up fallback and to build the drill-down contributor breakdown.
      const { data: mappings, error: mapError } = await supabase
        .from("outcome_mappings")
        .select("source_outcome_id, target_outcome_id")
        .in("target_outcome_id", ploIds);
      if (mapError) throw mapError;

      const cloIdsByPlo = new Map<string, string[]>();
      for (const m of mappings ?? []) {
        const list = cloIdsByPlo.get(m.target_outcome_id) ?? [];
        list.push(m.source_outcome_id);
        cloIdsByPlo.set(m.target_outcome_id, list);
      }
      const allCloIds = uniq((mappings ?? []).map((m) => m.source_outcome_id));

      // 4. CLO titles + their course (one batched query), 5. course-scope CLO
      //    attainment (one batched query). Skipped entirely if no mapped CLOs.
      const cloTitleById = new Map<string, string>();
      const cloCourseById = new Map<string, string | null>();
      const cloAttainmentById = new Map<string, number>();
      let courseIds: string[] = [];

      if (allCloIds.length > 0) {
        const { data: cloOutcomes, error: cloError } = await supabase
          .from("learning_outcomes")
          .select("id, title, course_id")
          .in("id", allCloIds);
        if (cloError) throw cloError;
        for (const clo of cloOutcomes ?? []) {
          cloTitleById.set(clo.id, clo.title);
          cloCourseById.set(clo.id, clo.course_id);
        }

        const { data: cloAttRows, error: cloAttError } = await supabase
          .from("outcome_attainment")
          .select("outcome_id, attainment_percent")
          .eq("scope", "student_course")
          .in("outcome_id", allCloIds);
        if (cloAttError) throw cloAttError;
        // If a CLO has multiple course-scope rows, average them per CLO.
        const cloAttLists = new Map<string, number[]>();
        for (const row of cloAttRows ?? []) {
          const list = cloAttLists.get(row.outcome_id) ?? [];
          list.push(row.attainment_percent);
          cloAttLists.set(row.outcome_id, list);
        }
        for (const [cloId, list] of cloAttLists) {
          cloAttainmentById.set(cloId, mean(list));
        }

        courseIds = uniq(
          (cloOutcomes ?? [])
            .map((c) => c.course_id)
            .filter((id): id is string => !!id)
        );
      }

      // 6. Course names for the drill-down (one batched query).
      const courseNameById = new Map<string, string>();
      if (courseIds.length > 0) {
        const { data: courses, error: courseError } = await supabase
          .from("courses")
          .select("id, name")
          .in("id", courseIds);
        if (courseError) throw courseError;
        for (const c of courses ?? []) courseNameById.set(c.id, c.name);
      }

      // 7. Assemble one row per PLO using the documented derivation.
      return plos.map((plo): AdminPLOHeatmapRow => {
        const mappedCloIds = cloIdsByPlo.get(plo.id) ?? [];

        // Contributor breakdown — every mapped CLO that has a course-scope value.
        const contributors: PLOContributor[] = mappedCloIds
          .filter((cloId) => cloAttainmentById.has(cloId))
          .map((cloId) => {
            const courseId = cloCourseById.get(cloId) ?? null;
            return {
              clo_id: cloId,
              clo_title: cloTitleById.get(cloId) ?? cloId,
              course_id: courseId,
              course_name: courseId
                ? courseNameById.get(courseId) ?? null
                : null,
              attainment_percent: cloAttainmentById.get(cloId) ?? 0,
            };
          });

        const programValues = programByPlo.get(plo.id) ?? [];
        if (programValues.length > 0) {
          return {
            plo_id: plo.id,
            plo_title: plo.title,
            program_id: plo.program_id,
            attainment_percent: mean(programValues),
            contributing_count: programValues.length,
            derivation: "program",
            contributors,
          };
        }

        if (contributors.length > 0) {
          return {
            plo_id: plo.id,
            plo_title: plo.title,
            program_id: plo.program_id,
            attainment_percent: mean(
              contributors.map((c) => c.attainment_percent)
            ),
            contributing_count: contributors.length,
            derivation: "clo_rollup",
            contributors,
          };
        }

        return {
          plo_id: plo.id,
          plo_title: plo.title,
          program_id: plo.program_id,
          attainment_percent: PLO_ATTAINMENT_UNMEASURED,
          contributing_count: 0,
          derivation: "none",
          contributors,
        };
      });
    },
  });
};
