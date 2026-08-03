// =============================================================================
// useCoordinatorProfileSettings — coordinator "Me" page real settings (Phase B)
// =============================================================================
//
// Read + write hooks for the coordinator profile settings that now have real
// backing storage:
//   • Academic profile (department / designation / academic_rank /
//     highest_degree / years_experience) — columns added by migration
//     20260823000001. Read via `select("*")` + cast so the code compiles
//     against the current generated Database type and degrades gracefully to
//     "not set" if the columns are not present yet (pre-migration / preview).
//   • Coordinator alert notification preferences — persisted inside the
//     existing `profiles.notification_preferences` jsonb under a
//     `coordinator_alerts` sub-key, MERGED so sibling settings (muted_courses,
//     quiet_hours used by useNotificationPreferences) are preserved.
//
// All writes are self-service (id = auth.uid()) and rely on the existing
// profiles UPDATE RLS policy — no new backend/RPC. No sensitive data.
// =============================================================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import type { Json } from "@/types/database";

// ─── Academic profile ─────────────────────────────────────────────────────

export interface CoordinatorAcademicProfile {
  department: string | null;
  designation: string | null;
  academic_rank: string | null;
  highest_degree: string | null;
  years_experience: number | null;
  phone: string | null;
  office_location: string | null;
  office_hours: string | null;
  bio: string | null;
}

const EMPTY_ACADEMIC: CoordinatorAcademicProfile = {
  department: null,
  designation: null,
  academic_rank: null,
  highest_degree: null,
  years_experience: null,
  phone: null,
  office_location: null,
  office_hours: null,
  bio: null,
};

// The academic columns may not yet exist in the generated Database type, so we
// read the full row and pick these fields through this loose shape.
interface ProfileAcademicRow {
  department?: string | null;
  designation?: string | null;
  academic_rank?: string | null;
  highest_degree?: string | null;
  years_experience?: number | null;
  phone?: string | null;
  office_location?: string | null;
  office_hours?: string | null;
  bio?: string | null;
}

export const useCoordinatorAcademicProfile = (userId?: string | null) => {
  return useQuery({
    queryKey: queryKeys.profiles.detail(`${userId ?? ""}:academic`),
    enabled: !!userId,
    queryFn: async (): Promise<CoordinatorAcademicProfile> => {
      // select("*") (not a typed column list) so this compiles regardless of
      // whether database.ts has been regenerated for migration 20260823000001.
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId!)
        .maybeSingle();
      // Degrade gracefully: a missing-column error (pre-migration) or any read
      // failure yields the "not set" placeholder rather than crashing the page.
      if (error || !data) return EMPTY_ACADEMIC;
      const row = data as unknown as ProfileAcademicRow;
      return {
        department: row.department ?? null,
        designation: row.designation ?? null,
        academic_rank: row.academic_rank ?? null,
        highest_degree: row.highest_degree ?? null,
        years_experience:
          typeof row.years_experience === "number"
            ? row.years_experience
            : null,
        phone: row.phone ?? null,
        office_location: row.office_location ?? null,
        office_hours: row.office_hours ?? null,
        bio: row.bio ?? null,
      };
    },
  });
};

export const useUpdateCoordinatorAcademicProfile = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      values,
    }: {
      userId: string;
      values: CoordinatorAcademicProfile;
    }): Promise<void> => {
      const { error } = await supabase
        .from("profiles")
        // `as never`: the academic columns may be absent from the generated
        // Update type until database.ts is regenerated (migration 20260823000001).
        .update(values as never)
        .eq("id", userId);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({
        queryKey: queryKeys.profiles.detail(`${variables.userId}:academic`),
      });
    },
  });
};

// ─── Coordinator alert notification preferences ─────────────────────────────

export interface CoordinatorAlertPrefs {
  ploDrop: boolean;
  curriculumGap: boolean;
  evidenceReady: boolean;
  teacherInactivity: boolean;
  cqiDeadline: boolean;
}

export const DEFAULT_COORDINATOR_ALERT_PREFS: CoordinatorAlertPrefs = {
  ploDrop: true,
  curriculumGap: true,
  evidenceReady: true,
  teacherInactivity: false,
  cqiDeadline: true,
};

const boolOr = (v: unknown, fallback: boolean): boolean =>
  typeof v === "boolean" ? v : fallback;

/**
 * Parse coordinator alert prefs out of a profile's `notification_preferences`
 * jsonb (`coordinator_alerts` sub-key), falling back to the defaults per key.
 */
export const readCoordinatorAlertPrefs = (
  notificationPreferences: unknown
): CoordinatorAlertPrefs => {
  const np = (notificationPreferences ?? {}) as Record<string, unknown>;
  const ca = (np.coordinator_alerts ?? {}) as Record<string, unknown>;
  const d = DEFAULT_COORDINATOR_ALERT_PREFS;
  return {
    ploDrop: boolOr(ca.ploDrop, d.ploDrop),
    curriculumGap: boolOr(ca.curriculumGap, d.curriculumGap),
    evidenceReady: boolOr(ca.evidenceReady, d.evidenceReady),
    teacherInactivity: boolOr(ca.teacherInactivity, d.teacherInactivity),
    cqiDeadline: boolOr(ca.cqiDeadline, d.cqiDeadline),
  };
};

export const useUpdateCoordinatorAlertPrefs = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      prefs,
    }: {
      userId: string;
      prefs: CoordinatorAlertPrefs;
    }): Promise<void> => {
      // Merge into the existing jsonb so muted_courses / quiet_hours (owned by
      // useNotificationPreferences) are never clobbered.
      const { data, error: readErr } = await supabase
        .from("profiles")
        .select("notification_preferences")
        .eq("id", userId)
        .maybeSingle();
      if (readErr) throw readErr;
      const current = (data?.notification_preferences ?? {}) as Record<
        string,
        unknown
      >;
      const merged = { ...current, coordinator_alerts: prefs };
      const { error } = await supabase
        .from("profiles")
        .update({ notification_preferences: merged as unknown as Json })
        .eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      // Cover both this feature and the sibling useNotificationPreferences cache.
      qc.invalidateQueries({ queryKey: queryKeys.notificationPreferences.all });
    },
  });
};
