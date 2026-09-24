import { createContext } from "react";
import type { PreferenceOwnership, ProfilePreferenceSync } from "@/lib/profilePreferenceSync";

interface PreferenceSyncContextValue {
  readonly sync: ProfilePreferenceSync;
  readonly ownership: PreferenceOwnership | null;
}

// Internal bridge only; AuthContext's public authentication API is unchanged.
// Publish owner identity separately so batched A → B → A refreshes setters even
// when the user id and public AuthContext references happen to be unchanged.
export const ProfilePreferenceSyncContext = createContext<PreferenceSyncContextValue | null>(null);
