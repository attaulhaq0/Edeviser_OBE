// Feature: Task 7.2 (edeviser-agentic-intelligence) — institution autonomy
// settings hook. LIVE-DB contract (MCP pg_policies, 2026-08-28): the
// institution_autonomy_settings row is readable by authenticated clients
// under RLS scoped to the caller's institution; unconfigured institutions
// return zero rows (null here) and the UI renders the fail-closed default
// posture. Server-side enforcement ALWAYS lives in the edge-function policy
// engine — this hook feeds DISPLAY ONLY and can never grant autonomy.

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface InstitutionAutonomySettings {
  readonly operational_autonomy_ceiling: string;
  readonly auto_execute_low_risk: boolean;
  readonly rollback_enabled: boolean;
  readonly evaluation_thresholds: unknown;
  readonly updated_at: string;
}

export const useInstitutionAutonomy = () =>
  useQuery<InstitutionAutonomySettings | null>({
    queryKey: ["ai", "institution-autonomy-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("institution_autonomy_settings")
        .select(
          "operational_autonomy_ceiling,auto_execute_low_risk,rollback_enabled,evaluation_thresholds,updated_at"
        )
        .maybeSingle();
      if (error) throw new Error("institution_autonomy_settings_unavailable");
      return (data as InstitutionAutonomySettings | null) ?? null;
    },
    staleTime: 60_000,
    retry: 1,
  });
