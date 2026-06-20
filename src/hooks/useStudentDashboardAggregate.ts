import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { DASHBOARD_STALE_TIME_MS } from "@/lib/queryConfig";
import type {
  StudentKPIData,
  UpcomingDeadline,
} from "@/hooks/useStudentDashboard";
import type { StudentCourseAttendance } from "@/hooks/useAttendance";
import type { ProfileCompletenessData } from "@/hooks/useProfileCompleteness";
import type { Announcement } from "@/hooks/useAnnouncements";

/**
 * Shape of the single `jsonb` payload returned by the `get_student_dashboard`
 * Postgres RPC (see
 * `supabase/migrations/20260821000006_create_get_student_dashboard_rpc.sql`).
 *
 * It is the union of the per-section hook results this aggregate hydrates:
 *   - `kpis`         → exactly what `useStudentKPIs` produces (`StudentKPIData`)
 *   - `deadlines`    → exactly what `useUpcomingDeadlines` produces (`UpcomingDeadline[]`)
 *   - `attendance`   → exactly what `useStudentAttendance` produces (`StudentCourseAttendance[]`)
 *   - `streakFreeze` → exactly what `useStreakFreezeInventory` produces (`{ freezes, xpTotal }`)
 *   - `profileCompleteness` → exactly what `useProfileCompleteness` produces (`ProfileCompletenessData`)
 *   - `announcements` → exactly what `useStudentAnnouncements(studentId, 5)` produces (`Announcement[]`)
 */
export interface StudentDashboardAggregate {
  kpis: StudentKPIData;
  deadlines: UpcomingDeadline[];
  attendance: StudentCourseAttendance[];
  streakFreeze: { freezes: number; xpTotal: number };
  profileCompleteness: ProfileCompletenessData;
  announcements: Announcement[];
  // Spendable XP (earned − spent), identical to the `get_xp_balance` RPC. Optional
  // so a client deployed slightly ahead of the migration degrades gracefully (the
  // sidebar XP badge simply falls back to its own fetch until the field is present).
  availableXP?: number;
}

/**
 * Student dashboard aggregate (spec: dashboard-and-ux-performance, Req 2).
 *
 * Collapses the dashboard's critical above-the-fold fan-out (`useStudentKPIs`'
 * four batched queries + `useUpcomingDeadlines`) into ONE round-trip by calling
 * the `get_student_dashboard` RPC, then HYDRATES the exact caches the per-section
 * hooks read so those hooks resolve as cache hits instead of firing their own
 * requests.
 *
 * Backward-compatible + reversible: the section hooks keep their own `queryFn`,
 * so on a cache miss / RPC failure they fetch exactly as before — no behavior
 * change, no new data visibility (the RPC is `SECURITY INVOKER`).
 */
export const useStudentDashboardAggregate = (studentId: string | undefined) => {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: queryKeys.studentDashboard.detail(studentId ?? ""),
    enabled: !!studentId,
    staleTime: DASHBOARD_STALE_TIME_MS,
    queryFn: async (): Promise<StudentDashboardAggregate> => {
      if (!studentId) {
        throw new Error("useStudentDashboardAggregate: studentId is required");
      }
      // `get_student_dashboard` is now in the generated Database types, so the
      // rpc call is fully typed (Returns: Json). Cast the Json payload to the
      // section-union shape the RPC is built from.
      const { data, error } = await supabase.rpc("get_student_dashboard", {
        p_student_id: studentId,
      });
      if (error) throw error;
      if (!data) {
        throw new Error("get_student_dashboard returned no data");
      }

      const payload = data as unknown as StudentDashboardAggregate;

      // Hydrate the EXACT caches the critical section hooks read so they become
      // cache hits. Keys mirror `useStudentKPIs` / `useUpcomingDeadlines`
      // verbatim — do not change these or the hooks will miss the cache.
      queryClient.setQueryData(
        queryKeys.studentGamification.detail(studentId ?? ""),
        payload.kpis as StudentKPIData
      );
      queryClient.setQueryData(
        queryKeys.assignments.list({
          studentId,
          upcoming: true,
          limit: 5,
        }),
        payload.deadlines as UpcomingDeadline[]
      );
      // Attendance section: hydrate the EXACT key `useStudentAttendance` reads so
      // its fallback (gated on aggregate error) resolves as a cache hit instead
      // of firing its own per-course fan-out.
      queryClient.setQueryData(
        queryKeys.attendanceRecords.list({
          studentId,
          type: "student_courses",
        }),
        payload.attendance as StudentCourseAttendance[]
      );
      // Streak-freeze section: hydrate the EXACT key `useStreakFreezeInventory`
      // reads so its fallback (gated on aggregate error) resolves as a cache hit
      // instead of firing its own `student_gamification` read.
      queryClient.setQueryData(
        queryKeys.studentGamification.list({
          scope: "streak_freeze",
          studentId,
        }),
        payload.streakFreeze
      );
      // Profile-completeness section: hydrate the EXACT key
      // `useProfileCompleteness` reads so its fallback (gated on aggregate
      // error) resolves as a cache hit instead of firing its own
      // `student_profiles` + `onboarding_progress` reads.
      queryClient.setQueryData(
        queryKeys.onboarding.profileCompleteness(studentId ?? ""),
        payload.profileCompleteness
      );
      // Announcements section: hydrate the EXACT key `useStudentAnnouncements(
      // studentId, 5)` reads so its fallback (gated on aggregate error) resolves
      // as a cache hit instead of firing its own enrolled-courses + announcements
      // reads. The RPC already returns the rows pinned-desc then created-desc,
      // limit 5 — the same order/shape `useStudentAnnouncements` produces.
      queryClient.setQueryData(
        queryKeys.announcements.list({ studentId, limit: 5 }),
        payload.announcements as Announcement[]
      );
      // Available (spendable) XP: hydrate the EXACT key `useXPBalance` reads so the
      // persistent sidebar `XPBalanceBadge` resolves as a cache hit instead of firing
      // its own `get_xp_balance` RPC on every page mount (the #1 DB-time consumer —
      // see spec Appendix A, Fix A). Guarded so a pre-migration payload (no
      // availableXP) leaves the badge to fetch as before — no regression.
      if (typeof payload.availableXP === "number") {
        queryClient.setQueryData(queryKeys.marketplace.balance(studentId), {
          balance: payload.availableXP,
        });
      }

      return payload;
    },
  });
};
