// Feature: qa-partner-review-remediation — Req 4 (B4)
// Data layer for the Admin Historical Evidence dashboard. Reads the
// `mv_historical_evidence` materialized view (created in migration
// <ts>_create_mv_historical_evidence.sql) through a TanStack Query hook.
//
// The view is now present in the generated Supabase types, so the query is
// fully typed — no `as never` casts. Aggregate columns are nullable in the
// generated Row type (an empty group yields NULL counts), so the rows are
// normalized into the non-null `HistoricalEvidenceRow` shape the dashboard
// renders, coalescing missing numerics to 0.

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
 * Reads `mv_historical_evidence`, ordered by `start_date` ascending, applying
 * the optional outcome-type / Bloom's-level filters. Throws on error so the
 * caller's error boundary / query error state can surface it.
 */
export const useHistoricalEvidence = (filters: HistoricalEvidenceFilter) =>
  useQuery({
    queryKey: queryKeys.historicalEvidence.list(filters),
    queryFn: async (): Promise<HistoricalEvidenceRow[]> => {
      // Select explicit columns (never `*`): the `select("*")` parser expands
      // against the full schema and trips TS2589 "excessively deep" on this
      // large database type — the same reason every other view query in the
      // codebase lists its columns.
      let query = supabase
        .from("mv_historical_evidence")
        .select(
          "semester_id, semester_name, start_date, outcome_type, blooms_level, evidence_count, avg_score, excellent_count, satisfactory_count, developing_count, not_yet_count"
        );
      if (filters.outcomeType) {
        query = query.eq("outcome_type", filters.outcomeType);
      }
      if (filters.bloomsLevel) {
        query = query.eq("blooms_level", filters.bloomsLevel);
      }

      const { data, error } = await query.order("start_date", {
        ascending: true,
      });
      if (error) throw error;

      return (data ?? []).map((row) => ({
        semester_id: row.semester_id ?? "",
        semester_name: row.semester_name ?? "",
        start_date: row.start_date ?? "",
        outcome_type: row.outcome_type ?? "",
        blooms_level: row.blooms_level ?? null,
        evidence_count: row.evidence_count ?? 0,
        avg_score: row.avg_score ?? 0,
        excellent_count: row.excellent_count ?? 0,
        satisfactory_count: row.satisfactory_count ?? 0,
        developing_count: row.developing_count ?? 0,
        not_yet_count: row.not_yet_count ?? 0,
      }));
    },
    staleTime: 5 * 60_000,
  });
