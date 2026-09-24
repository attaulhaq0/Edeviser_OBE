import type { Profile } from "@/types/app";
import {
  patchCachedProfilePreference,
  profilePreferenceLeaves,
  type ProfilePreferenceLeaves,
  type ProfilePreferencePatch,
} from "@/lib/profileCache";

export interface PreferenceOwnership { readonly ownerId: string }
interface ReadSnapshot {
  readonly ownership: PreferenceOwnership | null;
  readonly revision: number;
}

type Confirmed = {
  [Key in keyof ProfilePreferenceLeaves]?: { value: NonNullable<ProfilePreferenceLeaves[Key]>; revision: number };
};

/** A single AuthProvider's preference-only journal; never a global/session store. */
export const createProfilePreferenceSync = (
  onConfirmed: (ownerId: string, leaves: ProfilePreferenceLeaves, isCurrent: () => boolean) => void
) => {
  let ownership: PreferenceOwnership | null = null;
  let revision = 0;
  let confirmed: Confirmed = {};
  const reads = new WeakMap<Profile, ReadSnapshot>();
  const isCurrent = (token: PreferenceOwnership | null): boolean => token !== null && ownership === token;

  return {
    setOwner(ownerId: string | null): PreferenceOwnership | null {
      if (ownership?.ownerId === ownerId) return ownership;
      ownership = ownerId === null ? null : { ownerId };
      revision = 0;
      confirmed = {};
      return ownership;
    },
    getOwnership(): PreferenceOwnership | null { return ownership; },
    capture(ownerId: string): PreferenceOwnership | null {
      return ownership?.ownerId === ownerId ? ownership : null;
    },
    isCurrent,
    beginRead(ownerId: string): ReadSnapshot {
      return { ownership: ownership?.ownerId === ownerId ? ownership : null, revision };
    },
    trackRead(profile: Profile | null, snapshot: ReadSnapshot): Profile | null {
      if (profile) reads.set(profile, snapshot);
      return profile;
    },
    reconcile(profile: Profile): Profile | undefined {
      const snapshot = reads.get(profile);
      if (!snapshot) return profile; // A synchronous cache read has no in-flight race.
      if (!isCurrent(snapshot.ownership) || snapshot.ownership?.ownerId !== profile.id) return undefined;
      const newer: ProfilePreferenceLeaves = {};
      if (confirmed.preferred_language && confirmed.preferred_language.revision > snapshot.revision) {
        newer.preferred_language = confirmed.preferred_language.value;
      }
      if (confirmed.theme_preference && confirmed.theme_preference.revision > snapshot.revision) {
        newer.theme_preference = confirmed.theme_preference.value;
      }
      return { ...profile, ...newer };
    },
    confirm(token: PreferenceOwnership | null, patch: ProfilePreferencePatch): void {
      if (!isCurrent(token) || !token) return;
      const leaves = profilePreferenceLeaves(patch);
      if (Object.keys(leaves).length === 0) return;
      revision += 1;
      if (leaves.preferred_language !== undefined) confirmed.preferred_language = { value: leaves.preferred_language, revision };
      if (leaves.theme_preference !== undefined) confirmed.theme_preference = { value: leaves.theme_preference, revision };
      patchCachedProfilePreference(token.ownerId, patch);
      // React may execute the state updater later; it must check this token then.
      onConfirmed(token.ownerId, leaves, () => isCurrent(token));
    },
  };
};

export type ProfilePreferenceSync = ReturnType<typeof createProfilePreferenceSync>;
