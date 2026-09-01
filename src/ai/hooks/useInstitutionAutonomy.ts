// Feature: Task 7.2 (edeviser-agentic-intelligence) — institution autonomy
// settings hook.
//
// LIVE-DB contract: institution_autonomy_settings is RLS deny-all to clients
// by design, so this hook reads ONLY through the orchestrator's bounded
// `get_institution_autonomy` channel (service-role server side). Unconfigured
// institutions fall back to schema defaults (A2, auto-exec OFF, rollback ON).
// Server-side enforcement ALWAYS lives in the edge-function policy engine —
// this hook feeds DISPLAY ONLY and can never grant autonomy.

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { useAiIdentity } from "@/ai/hooks/useAiIdentity";

export interface InstitutionAutonomySettings {
  readonly operational_autonomy_ceiling: string;
  readonly auto_execute_low_risk: boolean;
  readonly rollback_enabled: boolean;
  readonly evaluation_thresholds: unknown;
}

interface AutonomySettingsResponse {
  settings?: {
    institutionCeiling?: string;
    autoExecuteLowRisk?: boolean;
    rollbackEnabled?: boolean;
    configured?: boolean;
  };
}

const autonomyUpdateSchema = z.object({
  operational_autonomy_ceiling: z.enum(["A0", "A1", "A2", "A3"]),
  auto_execute_low_risk: z.boolean(),
  rollback_enabled: z.boolean(),
});

export type InstitutionAutonomyUpdate = z.infer<typeof autonomyUpdateSchema>;

/**
 * Admin-only mutation: writes the institution_autonomy_settings row DIRECTLY
 * under the `institution_autonomy_settings_admin_write` RLS policy (active
 * admin of the SAME institution — verified live 2026-09-01). The orchestrator
 * re-reads the row on every run, so changes take effect immediately without a
 * redeploy. Non-admin callers never reach the network (thrown client-side).
 */
export const useUpdateInstitutionAutonomy = () => {
  const identity = useAiIdentity();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: InstitutionAutonomyUpdate) => {
      if (
        !identity.ready ||
        identity.role !== "admin" ||
        !identity.institutionId
      ) {
        throw new Error("autonomy_update_admin_only");
      }
      const parsed = autonomyUpdateSchema.parse(input);
      const { data, error } = await supabase
        .from("institution_autonomy_settings")
        .upsert(
          { institution_id: identity.institutionId, ...parsed },
          { onConflict: "institution_id" }
        )
        .select()
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [
          "ai",
          "institution-autonomy-settings",
          identity.institutionId,
        ],
      });
    },
  });
};

const DEFAULT_SETTINGS: InstitutionAutonomySettings = {
  operational_autonomy_ceiling: "A2",
  auto_execute_low_risk: false,
  rollback_enabled: true,
  evaluation_thresholds: undefined,
};

export const useInstitutionAutonomy = () => {
  const identity = useAiIdentity();
  return useQuery<InstitutionAutonomySettings>({
    // Institution-scoped cache identity: settings are per-institution, so the
    // key embeds institution + role + actor (deny-all RLS means the data only
    // flows through the orchestrator, but the cache itself must still be
    // identity-scoped — the global client retains entries for 30 minutes).
    queryKey: [
      "ai",
      "institution-autonomy-settings",
      identity.institutionId,
      identity.role,
      identity.userId,
    ],
    queryFn: async () => {
      const { data, error } =
        await supabase.functions.invoke<AutonomySettingsResponse>(
          "agent-orchestrator",
          { body: { action: "get_institution_autonomy" } }
        );
      if (error || !data?.settings) return DEFAULT_SETTINGS;
      const s = data.settings;
      return {
        operational_autonomy_ceiling: s.institutionCeiling ?? "A2",
        auto_execute_low_risk: s.autoExecuteLowRisk ?? false,
        rollback_enabled: s.rollbackEnabled ?? true,
        evaluation_thresholds: undefined,
      };
    },
    enabled: identity.ready,
    staleTime: 60_000,
    retry: 1,
  });
};
