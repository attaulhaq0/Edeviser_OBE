// Feature: qa-partner-review-remediation — Req 4 (B4)
// Filter schema for the Admin Historical Evidence dashboard. Validates the
// optional outcome-type / Bloom's-level / semester filters that drive both the
// `useHistoricalEvidence` query and the dashboard's nuqs URL state.
//
// The enum members mirror the `outcome_type` and `blooms_level` Postgres enums
// in `src/types/database.ts`, so a filter value is always a valid column value
// for `mv_historical_evidence`.

import { z } from "zod";

export const historicalEvidenceFilterSchema = z.object({
  outcomeType: z.enum(["ILO", "PLO", "CLO", "SUB_CLO"]).optional(),
  bloomsLevel: z
    .enum([
      "remembering",
      "understanding",
      "applying",
      "analyzing",
      "evaluating",
      "creating",
    ])
    .optional(),
  semesterId: z.string().uuid().optional(),
});

export type HistoricalEvidenceFilter = z.infer<
  typeof historicalEvidenceFilterSchema
>;
