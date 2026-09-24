import { useContext, useMemo, type ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useOwnedAccessibilityPreferences } from "@/hooks/useAccessibilityPreferences";
import { loadAccessibilityPreferences } from "@/lib/accessibilityPreferences";
import { allocateAccessibilityOwnerKey, createAccessibilityPreferenceOwner } from "@/lib/accessibilityPreferenceOwner";
import { AccessibilityPreferencesContext } from "@/providers/AccessibilityPreferencesContext";
import { ProfilePreferenceSyncContext } from "@/providers/ProfilePreferenceSyncContext";

interface Binding {
  ownerKey: string;
  actorId: string | null;
  ownsActor: () => boolean;
}
const OwnedPreferences = ({ binding, children }: { binding: Binding; children: ReactNode }) => {
  const owner = useMemo(() => createAccessibilityPreferenceOwner(binding.actorId, loadAccessibilityPreferences(), binding.ownsActor), [binding]);
  const value = useOwnedAccessibilityPreferences(owner, binding.ownerKey);
  return <AccessibilityPreferencesContext.Provider value={value}>{children}</AccessibilityPreferencesContext.Provider>;
};

/** One App-mounted owner for the router AND overlays, beneath Query/Auth/Theme.
 * AuthProvider no longer separately replays these rendering preferences. */
export const AccessibilityPreferencesProvider = ({ children }: { children: ReactNode }) => {
  const parent = useContext(AccessibilityPreferencesContext);
  const bridge = useContext(ProfilePreferenceSyncContext);
  const { user, isLoading } = useAuth();
  const userId = user?.id ?? null;
  const token = bridge?.ownership ?? null;
  const sync = bridge?.sync;
  const actorId = !isLoading && token?.ownerId === userId ? userId : null;
  const binding = useMemo<Binding>(() => ({
    ownerKey: allocateAccessibilityOwnerKey(),
    actorId,
    ownsActor: () => Boolean(sync && sync.getOwnership() === token
      && (token ? sync.isCurrent(token) && token.ownerId === userId : userId === null)),
  }), [actorId, sync, token, userId]);
  if (parent) throw new Error("Mount only one AccessibilityPreferencesProvider");
  if (!bridge) throw new Error("AccessibilityPreferencesProvider requires the existing AuthProvider ownership bridge");
  // Change the owner, never the identity of the router/forms/overlays subtree.
  return <OwnedPreferences binding={binding}>{children}</OwnedPreferences>;
};
