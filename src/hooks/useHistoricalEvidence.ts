// Feature: qa-partner-review-remediation — Req 4 (B4);
//          production-bug-fixes — Req 10 (API hardening).
// Data layer for the Admin Historical Evidence dashboard. Reads the
// historical-evidence rollup via the admin-gated `get_historical_evidence` RPC.
// The backing `mv_historical_evidence` materialized view is no longer directly
// selectable from the API (its SELECT grant was revoked), so the RPC enforces
// the admin-only scope. Aggregate columns can be NULL for an empty group, so
// rows are normalized into the non-null `HistoricalEvidenceRow` shape the
// dashboard renders, coalescing missing numerics to 0.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import type { HistoricalEvidenceFilter } from "@/lib/schemas/historicalEvidence";

export interface HistoricalEvidenceRow {
  semester_id: string;
  semester_name: string;
  start_date: string;
  outcome_type: string;
  blooms_level: string | null;
  evidence_count: number;
  avg_score: number;
  excellent_count: number;
  satisfactory_count: number;
  developing_count: number;
  not_yet_count: number;
}

/**
 * Reads the historical-evidence rollup via the admin-gated
 * `get_historical_evidence` RPC, ordered by `start_date` ascending with the
 * optional outcome-type / Bloom's-level filters applied server-side. The
 * underlying `mv_historical_evidence` materialized view is no longer directly
 * selectable from the API (production-bug-fixes Req 10); the RPC enforces the
 * admin-only scope. Throws on error so the caller's query error state surfaces.
 *
 * `get_historical_evidence` is not in the generated `Database` types yet (it is
 * added by the post-merge type regen), so — per the repo precedent
 * (`useStudentDashboardAggregate`) — only the `rpc` surface is cast (no `any`,
 * no builder cast). Remove the shim once the RPC is in the generated types.
 */
interface HistoricalEvidenceRpcRow {
  semester_id: string | null;
  semester_name: string | null;
  start_date: string | null;
  outcome_type: string | null;
  blooms_level: string | null;
  evidence_count: number | null;
  avg_score: number | null;
  excellent_count: number | null;
  satisfactory_count: number | null;
  developing_count: number | null;
  not_yet_count: number | null;
}
type HistoricalEvidenceRpc = (
  fn: "get_historical_evidence",
  args: { p_outcome_type: string | null; p_blooms_level: string | null }
) => PromiseLike<{
  data: HistoricalEvidenceRpcRow[] | null;
  error: { message: string } | null;
}>;

export const useHistoricalEvidence = (filters: HistoricalEvidenceFilter) =>
  useQuery({
    queryKey: queryKeys.historicalEvidence.list(filters),
    queryFn: async (): Promise<HistoricalEvidenceRow[]> => {
      const rpc = (supabase as unknown as { rpc: HistoricalEvidenceRpc }).rpc;
      const { data, error } = await rpc("get_historical_evidence", {
        p_outcome_type: filters.outcomeType ?? null,
        p_blooms_level: filters.bloomsLevel ?? null,
      });
      if (error) throw error;

      return (data ?? []).map((row) => ({
        semester_id: row.semester_id ?? "",
        semester_name: row.semester_name ?? "",
        start_date: row.start_date ?? "",
        outcome_type: row.outcome_type ?? "",
        blooms_level: row.blooms_level ?? null,
        evidence_count: Number(row.evidence_count ?? 0),
        avg_score: Number(row.avg_score ?? 0),
        excellent_count: Number(row.excellent_count ?? 0),
        satisfactory_count: Number(row.satisfactory_count ?? 0),
        developing_count: Number(row.developing_count ?? 0),
        not_yet_count: Number(row.not_yet_count ?? 0),
      }));
    },
    staleTime: 5 * 60_000,
  });
