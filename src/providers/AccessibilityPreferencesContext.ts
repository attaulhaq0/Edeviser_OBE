import { createContext } from "react";
import type { UseMutationResult, UseQueryResult } from "@tanstack/react-query";
import type { AccessibilityPreferences } from "@/lib/accessibilityPreferences";
import type { AccessibilityOwnerSnapshot } from "@/lib/accessibilityPreferenceOwner";

export interface AccessibilityPreferenceControls extends AccessibilityOwnerSnapshot {
  /** Opaque lifecycle identity; bind transient UI state to this, not user id. */
  ownerKey: string;
  patchLatest: (patch: Partial<AccessibilityPreferences>) => void;
  retryProfileRead: () => Promise<void>;
  retryAccountSync: () => Promise<void>;
  retryDevicePersistence: () => boolean;
  retryFont: () => void;
}
export interface AccessibilityPreferencesContextValue {
  read: UseQueryResult<AccessibilityPreferences, Error>;
  update: UseMutationResult<AccessibilityPreferences, Error, AccessibilityPreferences>;
  controls: AccessibilityPreferenceControls;
}
export const AccessibilityPreferencesContext = createContext<AccessibilityPreferencesContextValue | null>(null);
