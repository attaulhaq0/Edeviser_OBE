// Feature: AI query tenant-scoping (Wave D review hardening — task 3.6).
// Identity context for AI-surface queries.
//
// WHY THIS EXISTS: the global TanStack Query client retains cached queries for
// 30 minutes (gcTime, src/lib/queryClient.ts) and AuthProvider.signOut clears
// the profile state but NOT the cache. Actor-less cache keys (e.g.
// ["agent", "governance-summary"]) could therefore serve one user's protected
// data to a different user or institution that signs in within the retention
// window. Every protected AI query must (a) embed the actor + institution
// (+ role where the scope is institution-level) in its cache key and
// (b) stay disabled until identity is resolved — fail-closed: no identity,
// no fetch, no cached render.
import { useAuth } from "@/hooks/useAuth";
import type { UserRole } from "@/types/app";

export interface AiQueryIdentity {
  readonly userId: string | null;
  readonly institutionId: string | null;
  readonly role: UserRole | null;
  /** True only once the authenticated actor AND institution are resolved. */
  readonly ready: boolean;
}

export const useAiIdentity = (): AiQueryIdentity => {
  const { user, institutionId, role, isLoading } = useAuth();
  return {
    userId: user?.id ?? null,
    institutionId,
    role,
    ready: !isLoading && user !== null && institutionId !== null,
  };
};
