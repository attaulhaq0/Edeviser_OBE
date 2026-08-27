// =============================================================================
// useOutcomeParents — RLS-scoped PLO/ILO parent chain for a set of CLOs
// =============================================================================
// Feature: Alignment summary chain (frontend-plan.md; Wave D4 review round 3).
//
// Resolves the mapped PLOs (and their ILOs) for a student's focus CLOs using
// the canonical mapping direction (source = parent, target = child) over
// outcome_mappings + learning_outcomes.
//
// RLS basis (verified against the canonical migrations):
//   • outcome_mappings_institution_read (20260824000002) — SELECT to
//     authenticated, institution-scoped.
//   • learning_outcomes "outcomes_institution_read" — SELECT to authenticated,
//     institution-scoped.
// So a student's browser can read the chain directly with no agent/server
// round-trip, and no row outside their own institution is exposed.
//
// Column-explicit selects, all lookups batched with `.in(...)` — no N+1.
// The pure assembly lives in @/lib/outcomeFocus (buildOutcomeParentChains),
// keeping this file limited to data plumbing per repo layering rules.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import {
  buildOutcomeParentChains,
  type FocusAreaChainByClo,
  type OutcomeMappingLink,
  type OutcomeRefRow,
} from "@/lib/outcomeFocus";

const MAPPING_COLUMNS = "source_outcome_id, target_outcome_id";
const OUTCOME_COLUMNS = "id, title, type";

/**
 * Resolve the PLO + ILO parents mapped under each CLO id.
 * @param cloIds CLOs to resolve; the query is disabled for empty/undefined.
 */
export const useOutcomeParents = (cloIds?: readonly string[]) => {
  const stableIds = cloIds ? [...cloIds].sort() : [];

  return useQuery({
    queryKey: queryKeys.outcomeMappings.list({
      scope: "parent_chain",
      cloIds: stableIds,
    }),
    enabled: stableIds.length > 0,
    queryFn: async (): Promise<FocusAreaChainByClo> => {
      // 1. PLOs mapped under our CLOs (target = CLO, source = PLO).
      const { data: cloLinks, error: cloLinksError } = await supabase
        .from("outcome_mappings")
        .select(MAPPING_COLUMNS)
        .in("target_outcome_id", stableIds);
      if (cloLinksError) throw cloLinksError;
      const cloToPlos: OutcomeMappingLink[] = cloLinks ?? [];

      const ploIds = [
        ...new Set(cloToPlos.map((link) => link.source_outcome_id)),
      ];

      // 2. ILOs mapped under those PLOs (target = PLO, source = ILO).
      let ploToIlos: OutcomeMappingLink[] = [];
      if (ploIds.length > 0) {
        const { data: ploLinks, error: ploLinksError } = await supabase
          .from("outcome_mappings")
          .select(MAPPING_COLUMNS)
          .in("target_outcome_id", ploIds);
        if (ploLinksError) throw ploLinksError;
        ploToIlos = ploLinks ?? [];
      }

      // 3. Titles for every reached parent (PLOs + ILOs) in one batched call.
      const parentIds = [
        ...new Set([
          ...ploIds,
          ...ploToIlos.map((link) => link.source_outcome_id),
        ]),
      ];
      let outcomeRows: OutcomeRefRow[] = [];
      if (parentIds.length > 0) {
        const { data: rows, error: rowsError } = await supabase
          .from("learning_outcomes")
          .select(OUTCOME_COLUMNS)
          .in("id", parentIds);
        if (rowsError) throw rowsError;
        outcomeRows = rows ?? [];
      }

      return buildOutcomeParentChains(cloToPlos, ploToIlos, outcomeRows);
    },
    // Mappings change rarely and only on coordinator/teacher edits; reuse the
    // same 2-min staleness window as useCLOProgress to avoid refetch churn.
    staleTime: 120_000,
  });
};
