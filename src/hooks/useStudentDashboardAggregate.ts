import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import type {
  StudentKPIData,
  UpcomingDeadline,
} from "@/hooks/useStudentDashboard";
import type { StudentCourseAttendance } from "@/hooks/useAttendance";
import type { ProfileCompletenessData } from "@/hooks/useProfileCompleteness";

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
 */
export interface StudentDashboardAggregate {
  kpis: StudentKPIData;
  deadlines: UpcomingDeadline[];
  attendance: StudentCourseAttendance[];
  streakFreeze: { freezes: number; xpTotal: number };
  profileCompleteness: ProfileCompletenessData;
}

/**
 * Loose-but-typed view of the Supabase `rpc` surface for a function that is not
 * present in the generated `Database` types yet.
 *
 * `get_student_dashboard` is intentionally NOT in `src/types/database.ts`, so a
 * direct `supabase.rpc("get_student_dashboard", …)` would not type-check. Per the
 * repo precedent (the `send_teacher_nudge` integration-test helper) we cast ONLY
 * the `rpc` surface — never `any`, and never a `.from/.insert/.update/.upsert(
 * … as never)` builder cast — so the Static_Cast_Guard stays green. We cast the
 * client (not the detached method) so the `rpc` call keeps its `this` binding.
 * Remove this shim once the RPC is added to the generated types.
 */
interface RpcResponse {
  data: unknown;
  error: { message: string } | null;
}
type RpcInvoker = (
  fn: string,
  args: Record<string, unknown>
) => PromiseLike<RpcResponse>;

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
    staleTime: 30_000,
    queryFn: async (): Promise<StudentDashboardAggregate> => {
      // `get_student_dashboard` is not in the generated Database types; cast only
      // the `rpc` surface (repo precedent) — no `any`, no builder `as never`.
      const client = supabase as unknown as { rpc: RpcInvoker };
      const { data, error } = await client.rpc("get_student_dashboard", {
        p_student_id: studentId,
      });
      if (error) throw error;
      if (!data) {
        throw new Error("get_student_dashboard returned no data");
      }

      const payload = data as StudentDashboardAggregate;

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

      return payload;
    },
  });
};
