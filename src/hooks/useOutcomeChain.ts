// =============================================================================
// useOutcomeChain — walk the OBE graph and assemble the end-to-end chain
// Feature: qa-partner-review-remediation, Req 16 (16.1, 16.2, 16.3)
// =============================================================================
//
// Given a starting outcome (an ILO), this TanStack Query hook walks:
//   • graduate_attribute_mappings (GA ↔ ILO)        → the GA level (Req 16.3)
//   • outcome_mappings  (source = ILO → target PLO) → the PLO level
//   • outcome_mappings  (source = PLO → target CLO) → the CLO level
//   • assignments.clo_weights (clo_id)              → the Assessment level
//   • rubrics.clo_id / assignments.rubric_id        → the Rubric level
//   • outcome_attainment (outcome_id)               → Student + Attainment
//
// and assembles the nested structure ILO → GA → PLO → CLO → Assessment →
// Rubric → Student → Attainment via the pure `assembleOutcomeChain` helper.
//
// Mapping-direction convention (matches useILOs/usePLOs/useCLOs):
//   outcome_mappings.source_outcome_id = PARENT, target_outcome_id = CHILD.
//
// Queries are column-explicit (no `select("*")`) and batched with `.in(...)`
// over collected ids — there is no per-node N+1. No `as never` / `any` casts.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import {
  assembleOutcomeChain,
  type OutcomeChain,
  type RawChainOutcome,
  type RawChainAssignment,
  type RawCloWeight,
} from "@/lib/outcomeChain";

const OUTCOME_COLUMNS = "id, title, type, blooms_level, course_id";

/**
 * Coerce the `assignments.clo_weights` Json column into a typed array,
 * tolerating malformed/legacy rows (returns only well-formed entries).
 */
const parseCloWeights = (value: unknown): RawCloWeight[] => {
  if (!Array.isArray(value)) return [];
  const result: RawCloWeight[] = [];
  for (const entry of value) {
    if (
      entry &&
      typeof entry === "object" &&
      typeof (entry as { clo_id?: unknown }).clo_id === "string"
    ) {
      const raw = entry as { clo_id: string; weight?: unknown };
      result.push({
        clo_id: raw.clo_id,
        weight: typeof raw.weight === "number" ? raw.weight : 0,
      });
    }
  }
  return result;
};

/**
 * Walk the outcome graph from `startOutcomeId` and assemble the full chain.
 *
 * @param startOutcomeId - The starting outcome (typically an ILO id). When
 *   undefined the query is disabled.
 */
export const useOutcomeChain = (startOutcomeId?: string) => {
  return useQuery({
    queryKey: queryKeys.outcomeChain.detail(startOutcomeId ?? ""),
    enabled: !!startOutcomeId,
    queryFn: async (): Promise<OutcomeChain | null> => {
      const startId = startOutcomeId as string;

      // ── 1. Start outcome ────────────────────────────────────────────────
      const { data: startRow, error: startError } = await supabase
        .from("learning_outcomes")
        .select(`${OUTCOME_COLUMNS}, institution_id`)
        .eq("id", startId)
        .maybeSingle();
      if (startError) throw startError;
      if (!startRow) return null;

      const start: RawChainOutcome = {
        id: startRow.id,
        title: startRow.title,
        type: startRow.type,
        blooms_level: startRow.blooms_level,
        course_id: startRow.course_id,
      };

      // ── 2. Graduate Attributes mapped to the start ILO (GA level) ────────
      const { data: gaMapRows, error: gaMapError } = await supabase
        .from("graduate_attribute_mappings")
        .select("graduate_attribute_id, outcome_id, weight")
        .eq("outcome_id", startId);
      if (gaMapError) throw gaMapError;
      const gaMappings = gaMapRows ?? [];

      const gaIds = [
        ...new Set(gaMappings.map((m) => m.graduate_attribute_id)),
      ];
      let graduateAttributes: { id: string; name: string }[] = [];
      if (gaIds.length > 0) {
        // Scope GA lookup to the start outcome's institution (defensive;
        // RLS already enforces this).
        const { data: gaRows, error: gaError } = await supabase
          .from("graduate_attributes")
          .select("id, name")
          .eq("institution_id", startRow.institution_id)
          .in("id", gaIds);
        if (gaError) throw gaError;
        graduateAttributes = gaRows ?? [];
      }

      // ── 3. PLOs mapped under the start ILO (source = ILO) ────────────────
      const { data: ploMapRows, error: ploMapError } = await supabase
        .from("outcome_mappings")
        .select("source_outcome_id, target_outcome_id, weight")
        .eq("source_outcome_id", startId);
      if (ploMapError) throw ploMapError;
      const ploMappings = ploMapRows ?? [];

      const ploIds = [...new Set(ploMappings.map((m) => m.target_outcome_id))];
      let plos: RawChainOutcome[] = [];
      let cloMappings: {
        source_outcome_id: string;
        target_outcome_id: string;
        weight: number;
      }[] = [];
      let clos: RawChainOutcome[] = [];

      if (ploIds.length > 0) {
        const { data: ploRows, error: ploError } = await supabase
          .from("learning_outcomes")
          .select(OUTCOME_COLUMNS)
          .in("id", ploIds);
        if (ploError) throw ploError;
        plos = ploRows ?? [];

        // ── 4. CLOs mapped under those PLOs (source in ploIds) ─────────────
        const { data: cloMapRows, error: cloMapError } = await supabase
          .from("outcome_mappings")
          .select("source_outcome_id, target_outcome_id, weight")
          .in("source_outcome_id", ploIds);
        if (cloMapError) throw cloMapError;
        cloMappings = cloMapRows ?? [];

        const cloIds = [
          ...new Set(cloMappings.map((m) => m.target_outcome_id)),
        ];
        if (cloIds.length > 0) {
          const { data: cloRows, error: cloError } = await supabase
            .from("learning_outcomes")
            .select(OUTCOME_COLUMNS)
            .in("id", cloIds);
          if (cloError) throw cloError;
          clos = cloRows ?? [];
        }
      }

      const cloIds = clos.map((c) => c.id);
      const cloIdSet = new Set(cloIds);
      const courseIds = [
        ...new Set(
          clos.map((c) => c.course_id).filter((id): id is string => !!id)
        ),
      ];

      // ── 5. Rubrics attached to those CLOs (rubrics.clo_id) ───────────────
      let rubricRows: { id: string; title: string; clo_id: string | null }[] =
        [];
      if (cloIds.length > 0) {
        const { data, error } = await supabase
          .from("rubrics")
          .select("id, title, clo_id")
          .in("clo_id", cloIds);
        if (error) throw error;
        rubricRows = data ?? [];
      }

      // ── 6. Assessments linked to those CLOs (assignments.clo_weights) ────
      // Batched by the CLOs' course_ids (no N+1), then narrowed in-memory to
      // assignments whose clo_weights reference one of our CLOs.
      let assignments: RawChainAssignment[] = [];
      if (courseIds.length > 0) {
        const { data: assignmentRows, error: assignmentError } = await supabase
          .from("assignments")
          .select("id, title, course_id, rubric_id, clo_weights")
          .in("course_id", courseIds);
        if (assignmentError) throw assignmentError;

        assignments = (assignmentRows ?? [])
          .map((a) => ({
            id: a.id,
            title: a.title,
            course_id: a.course_id,
            rubric_id: a.rubric_id,
            clo_weights: parseCloWeights(a.clo_weights).filter((cw) =>
              cloIdSet.has(cw.clo_id)
            ),
          }))
          .filter((a) => a.clo_weights.length > 0);
      }

      // Pull in any rubric referenced by an assessment but not already loaded
      // via clo_id, so the Assessment → Rubric edge resolves.
      const loadedRubricIds = new Set(rubricRows.map((r) => r.id));
      const missingRubricIds = [
        ...new Set(
          assignments
            .map((a) => a.rubric_id)
            .filter((id): id is string => !!id && !loadedRubricIds.has(id))
        ),
      ];
      if (missingRubricIds.length > 0) {
        const { data, error } = await supabase
          .from("rubrics")
          .select("id, title, clo_id")
          .in("id", missingRubricIds);
        if (error) throw error;
        rubricRows = [...rubricRows, ...(data ?? [])];
      }

      // ── 7. Attainment for every outcome in the chain ─────────────────────
      const attainmentOutcomeIds = [
        ...new Set([startId, ...ploIds, ...cloIds]),
      ];
      const { data: attainmentRows, error: attainmentError } = await supabase
        .from("outcome_attainment")
        .select("outcome_id, attainment_percent, scope, student_id")
        .in("outcome_id", attainmentOutcomeIds);
      if (attainmentError) throw attainmentError;
      const attainment = attainmentRows ?? [];

      // ── 8. Student names for the per-student attainment leaves ───────────
      const studentIds = [
        ...new Set(
          attainment.map((a) => a.student_id).filter((id): id is string => !!id)
        ),
      ];
      let students: { id: string; full_name: string }[] = [];
      if (studentIds.length > 0) {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", studentIds);
        if (error) throw error;
        students = data ?? [];
      }

      return assembleOutcomeChain({
        start,
        gaMappings,
        graduateAttributes,
        ploMappings,
        plos,
        cloMappings,
        clos,
        rubrics: rubricRows,
        assignments,
        attainment,
        students,
      });
    },
  });
};
