import { useCallback, useContext, useEffect, useMemo, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

import { patchCachedProfilePreference, type ProfilePreferencePatch } from "@/lib/profileCache";
import type { PreferenceOwnership } from "@/lib/profilePreferenceSync";
import { ProfilePreferenceSyncContext } from "@/providers/ProfilePreferenceSyncContext";

interface Ownership {
  readonly ownerId: string | undefined;
  readonly authOwnership: PreferenceOwnership | null;
}

interface PreferenceWrite {
  ownerId: string;
  patch: ProfilePreferencePatch;
  ownership: Ownership;
  authOwnership: PreferenceOwnership | null;
}

/**
 * Keep preference writes owned by the session that scheduled them. The explicit
 * owner in mutation variables must not be replaced by a later render's user.
 * Cleanup cancels unsent writes; it cannot roll back an already-dispatched write.
 */
export const useDebouncedProfilePreference = (ownerId: string | undefined) => {
  const preferenceContext = useContext(ProfilePreferenceSyncContext);
  const preferenceSync = preferenceContext?.sync ?? null;
  // Bind to the render that created the setter, not the session at invocation.
  const authOwnership = preferenceContext?.ownership && preferenceContext.ownership.ownerId === ownerId ? preferenceContext.ownership : null;
  // Reference identity distinguishes A → logout/B → A from the original A,
  // including auth transitions batched without an intermediate user-id render.
  const ownership = useMemo<Ownership>(() => ({ ownerId, authOwnership }), [ownerId, authOwnership]);
  const activeOwner = useRef<Ownership | null>(ownership);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { mutateAsync } = useMutation({
    // Serialize preference patches for an account, including across providers.
    scope: { id: `profile-preferences:${ownerId ?? "anonymous"}` },
    retry: false,
    mutationFn: async ({ ownerId: writeOwner, patch, ownership: writeOwnership, authOwnership }: PreferenceWrite) => {
      // A queued mutation can start after the account changed or we unmounted.
      if (activeOwner.current !== writeOwnership || writeOwnership.ownerId !== writeOwner) return;
      if (preferenceSync && !preferenceSync.isCurrent(authOwnership)) return;
      const { error } = await supabase
        .from("profiles")
        .update(patch)
        .eq("id", writeOwner);
      if (error) throw error;
      // Only actual, still-owned successes may update local profile evidence.
      // Skipped mutations resolve too, so this must not live in onSuccess.
      if (activeOwner.current !== writeOwnership || writeOwnership.ownerId !== writeOwner) return;
      if (preferenceSync) preferenceSync.confirm(authOwnership, patch);
      else patchCachedProfilePreference(writeOwner, patch);
    },
  });

  useEffect(() => {
    activeOwner.current = ownership;
    return () => {
      activeOwner.current = null;
      if (timer.current !== null) {
        clearTimeout(timer.current);
        timer.current = null;
      }
    };
  }, [ownership]);

  return useCallback(
    (patch: ProfilePreferencePatch, applyLocal: () => void) => {
      // Also reject callbacks retained by a previous account or unmounted UI.
      if (activeOwner.current !== ownership) return;
      if (ownerId && preferenceSync && !preferenceSync.isCurrent(authOwnership)) return;
      applyLocal();
      if (!ownerId) return;
      if (timer.current !== null) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        timer.current = null;
        if (activeOwner.current !== ownership || (preferenceSync && !preferenceSync.isCurrent(authOwnership))) return;
        void mutateAsync({ ownerId, patch, ownership, authOwnership }).catch((error: unknown) => {
          if (activeOwner.current === ownership && (!preferenceSync || preferenceSync.isCurrent(authOwnership))) {
            console.error(
              "[ProfilePreferences] Failed to save preference:",
              error instanceof Error ? error.message : "Preference update failed"
            );
          }
        });
      }, 800);
    },
    [ownerId, ownership, mutateAsync, preferenceSync, authOwnership]
  );
};
