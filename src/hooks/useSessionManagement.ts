// Task 95.2: Session management hook
// Queries active sessions and provides sign-out mutations

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";

export interface ActiveSession {
  id: string;
  device: string;
  ip: string;
  lastActive: string;
  isCurrent: boolean;
}

export const useActiveSessions = (userId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.sessions.list({ userId }),
    queryFn: async (): Promise<ActiveSession[]> => {
      if (!userId) return [];

      // Supabase Auth admin API is server-side only.
      // Return current session info as the only known session.
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return [];

      return [
        {
          id: session.access_token.slice(-8),
          device: navigator.userAgent.slice(0, 60),
          ip: "Current device",
          lastActive: new Date().toISOString(),
          isCurrent: true,
        },
      ];
    },
    enabled: !!userId,
  });
};

export const useSignOutOtherSessions = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<void> => {
      // Sign out globally then re-sign-in with current session's refresh token
      // This effectively invalidates all other sessions
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("No active session");

      const { error } = await supabase.auth.signOut({ scope: "others" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sessions.all });
    },
  });
};
