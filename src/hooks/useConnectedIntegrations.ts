// =============================================================================
// useConnectedIntegrations — per-user third-party integration state
// =============================================================================
//
// Reads connected_integrations (migration 20260823000006) for the current user
// and returns a provider → status map. An empty table is a legitimate
// disconnected state; query failures remain errors so the UI cannot mistake a
// backend outage or RLS regression for "Not connected".
// =============================================================================

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";

export type IntegrationStatus = "connected" | "disconnected";

/** provider (e.g. "google_calendar") → connection status. */
export type ConnectedIntegrationsMap = Record<string, IntegrationStatus>;

interface IntegrationRow {
  provider: string;
  status: IntegrationStatus;
}

export const useConnectedIntegrations = (userId?: string | null) => {
  return useQuery({
    queryKey: queryKeys.profiles.list({
      view: "integrations",
      userId: userId ?? null,
    }),
    enabled: !!userId,
    retry: false,
    queryFn: async (): Promise<ConnectedIntegrationsMap> => {
      // Table not in generated types yet (migration 20260823000006).
      const { data, error } = await supabase
        .from("connected_integrations" as never)
        .select("provider, status")
        .eq("user_id" as never, (userId ?? "") as never)
        .returns<IntegrationRow[]>();
      if (error) throw error;
      if (!data) throw new Error("Integration query returned no data");
      const map: ConnectedIntegrationsMap = {};
      for (const row of data) map[row.provider] = row.status;
      return map;
    },
  });
};
