import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { queryKeys } from "@/lib/queryKeys";
import { supabase } from "@/lib/supabase";

const cqiPatternSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["open", "linked", "resolved", "reopened"]),
  pattern_identity: z.string(),
  occurrence_version: z.string(),
  outcome_id: z.string().uuid(),
  outcome_type: z.enum(["CLO", "PLO", "ILO"]),
  course_id: z.string().uuid().nullable(),
  baseline_attainment: z.number(),
  current_attainment: z.number(),
  target_threshold: z.number(),
  sample_count: z.number().int(),
  affected_population: z.number().int(),
  evidence_references: z.array(z.unknown()),
  last_measurement_state: z
    .enum([
      "PENDING",
      "IMPROVED",
      "NO_MATERIAL_CHANGE",
      "DECLINED",
      "INSUFFICIENT_EVIDENCE",
    ])
    .nullable(),
  updated_at: z.string(),
  cqi_action_plan_id: z.string().uuid().nullable(),
  evaluation_state: z
    .enum([
      "PENDING",
      "IMPROVED",
      "NO_MATERIAL_CHANGE",
      "DECLINED",
      "INSUFFICIENT_EVIDENCE",
    ])
    .nullable(),
  delta: z.number().nullable(),
  post_action_metric: z.number().nullable(),
});

const coordinatorPatternsSchema = z.array(cqiPatternSchema);

const adminEffectivenessSchema = z.object({
  openPatterns: z.number().int().nonnegative(),
  resolvedPatterns: z.number().int().nonnegative(),
  measurementStates: z.record(z.string(), z.number().int().nonnegative()),
});

export type CqiInstitutionalPattern = z.infer<typeof cqiPatternSchema>;
export type CqiAdminEffectiveness = z.infer<typeof adminEffectivenessSchema>;

/** Reads the coordinator's currently authorized program scope through the CQI RPC. */
export const useCoordinatorCqiPatterns = (programId?: string) =>
  useQuery({
    queryKey: queryKeys.cqiInstitutional.patterns(programId ?? ""),
    enabled: Boolean(programId),
    retry: false,
    queryFn: async (): Promise<CqiInstitutionalPattern[]> => {
      const { data, error } = await supabase.rpc(
        "get_coordinator_cqi_patterns_v1" as never,
        { p_program_id: programId } as never
      );
      if (error) throw error;
      return coordinatorPatternsSchema.parse(data);
    },
  });

/** Reads the admin's institution-only CQI aggregate through the CQI RPC. */
export const useAdminCqiEffectiveness = () =>
  useQuery({
    queryKey: queryKeys.cqiInstitutional.effectiveness(),
    retry: false,
    queryFn: async (): Promise<CqiAdminEffectiveness> => {
      const { data, error } = await supabase.rpc(
        "get_admin_cqi_effectiveness_v1" as never
      );
      if (error) throw error;
      return adminEffectivenessSchema.parse(data);
    },
  });
