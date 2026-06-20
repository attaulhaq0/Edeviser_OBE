// @vitest-environment happy-dom
// =============================================================================
// useStudentDashboardAggregate.test.ts
// Feature: dashboard-and-ux-performance, Req 2 (per-role dashboard aggregate RPC)
// -----------------------------------------------------------------------------
// Proves the student dashboard critical block (KPIs + upcoming deadlines):
//   1. PARITY — the aggregate's `kpis` / `deadlines` deep-equal the exact shapes
//      `useStudentKPIs` / `useUpcomingDeadlines` produce (no data change).
//   2. HYDRATION — after the aggregate resolves, the EXACT section caches the
//      critical hooks read contain those values, so the section hooks become
//      cache hits instead of firing their own requests.
//   3. COLLAPSE — wiring the critical block exactly as `StudentDashboard` does
//      (aggregate + section hooks gated on `aggregate.isError`), a SUCCESSFUL
//      aggregate fires ZERO section `supabase.from` requests (one request total),
//      while a FAILED aggregate makes the section hooks fall back and fetch.
// The `get_student_dashboard` RPC is mocked; this is a hermetic unit test.
// =============================================================================
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";

// ─── Supabase mock (rpc + from) ──────────────────────────────────────────────
// `rpc` backs the aggregate; `from` backs the section fallback hooks. Tracking
// both lets us assert the critical block collapses to a single request.

const mockRpc = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

// Minimal chainable PostgREST builder: every filter method returns the builder,
// the builder is awaitable (resolves to an empty result), and `.maybeSingle()`
// resolves to a single empty row. This lets the fallback section hooks run to
// completion without throwing — we only assert WHETHER `supabase.from` was hit.
const makeFromBuilder = () => {
  const builder: Record<string, unknown> = {
    select: () => builder,
    eq: () => builder,
    in: () => builder,
    gte: () => builder,
    order: () => builder,
    limit: () => builder,
    maybeSingle: () => Promise.resolve({ data: null, error: null }),
    then: (resolve: (value: unknown) => unknown) =>
      resolve({ data: [], count: 0, error: null }),
  };
  return builder;
};

import { queryKeys } from "@/lib/queryKeys";
import { useStudentDashboardAggregate } from "@/hooks/useStudentDashboardAggregate";
import {
  useStudentKPIs,
  useUpcomingDeadlines,
  type StudentKPIData,
  type UpcomingDeadline,
} from "@/hooks/useStudentDashboard";
import {
  useStudentAttendance,
  type StudentCourseAttendance,
} from "@/hooks/useAttendance";
import { useStreakFreezeInventory } from "@/hooks/useStreakFreeze";
import {
  useProfileCompleteness,
  type ProfileCompletenessData,
} from "@/hooks/useProfileCompleteness";
import {
  useStudentAnnouncements,
  type Announcement,
} from "@/hooks/useAnnouncements";

// Critical-block harness: composes the three hooks EXACTLY as `StudentDashboard`
// wires them, so the test exercises the real gating, not a paraphrase of it.
const useCriticalBlock = (studentId: string) => {
  const aggregate = useStudentDashboardAggregate(studentId);
  const kpisHook = useStudentKPIs(studentId, { enabled: aggregate.isError });
  const deadlinesHook = useUpcomingDeadlines(studentId, 5, {
    enabled: aggregate.isError,
  });
  return { aggregate, kpisHook, deadlinesHook };
};

// Attendance-section harness: wires the aggregate + `useStudentAttendance`
// EXACTLY as `StudentDashboard` now does (attendance read from the aggregate,
// the section hook gated to a fallback-only fetch on `aggregate.isError`). It
// isolates attendance so the only `supabase.from` reads in these tests are the
// attendance fallback's — making the collapse/fallback assertions unambiguous.
const useAttendanceBlock = (studentId: string) => {
  const aggregate = useStudentDashboardAggregate(studentId);
  const attendanceHook = useStudentAttendance(studentId, {
    enabled: aggregate.isError,
  });
  const attendanceCourses = aggregate.data?.attendance ?? attendanceHook.data;
  return { aggregate, attendanceHook, attendanceCourses };
};

// Streak-freeze-section harness: wires the aggregate + `useStreakFreezeInventory`
// EXACTLY as `StudentDashboard` now does (freeze inventory read from the
// aggregate, the section hook gated to a fallback-only fetch on
// `aggregate.isError`). Isolating it means the only `supabase.from` reads in
// these tests are the freeze fallback's `student_gamification` read — making the
// collapse/fallback assertions unambiguous.
const useStreakFreezeBlock = (studentId: string) => {
  const aggregate = useStudentDashboardAggregate(studentId);
  const freezeHook = useStreakFreezeInventory(studentId, {
    enabled: aggregate.isError,
  });
  const freezeData = aggregate.data?.streakFreeze ?? freezeHook.data;
  return { aggregate, freezeHook, freezeData };
};

// Profile-completeness-section harness: wires the aggregate +
// `useProfileCompleteness` EXACTLY as `StudentDashboard` now does (completeness
// read from the aggregate, the section hook gated to a fallback-only fetch on
// `aggregate.isError`). Isolating it means the only `supabase.from` reads in
// these tests are the completeness fallback's `student_profiles` +
// `onboarding_progress` reads — making the collapse/fallback assertions
// unambiguous.
const useProfileCompletenessBlock = (studentId: string) => {
  const aggregate = useStudentDashboardAggregate(studentId);
  const completenessHook = useProfileCompleteness(studentId, {
    enabled: aggregate.isError,
  });
  const completenessData =
    aggregate.data?.profileCompleteness ?? completenessHook.data;
  return { aggregate, completenessHook, completenessData };
};

// Announcements-section harness: wires the aggregate + `useStudentAnnouncements`
// EXACTLY as `StudentDashboard`'s `AnnouncementsSection` now does (announcements
// read from the aggregate, the section hook gated to a fallback-only fetch on
// `aggregate.isError`). Isolating it means the only `supabase.from` reads in
// these tests are the announcements fallback's enrolled-courses query — making
// the collapse/fallback assertions unambiguous.
const useAnnouncementsBlock = (studentId: string) => {
  const aggregate = useStudentDashboardAggregate(studentId);
  const announcementsHook = useStudentAnnouncements(studentId, 5, {
    enabled: aggregate.isError,
  });
  const announcements = aggregate.data?.announcements ?? announcementsHook.data;
  return { aggregate, announcementsHook, announcements };
};

const STUDENT_ID = "11111111-1111-1111-1111-111111111111";

// Canonical section shapes. Typed as the section-hook return types, so the
// compiler enforces structural parity and the deep-equals enforce value parity.
const FIXTURE_KPIS: StudentKPIData = {
  enrolledCourses: 3,
  completedAssignments: 12,
  avgAttainment: 78,
  currentStreak: 5,
  currentLevel: 4,
  totalXP: 1340,
  totalActiveDays: 27,
};

const FIXTURE_DEADLINE_1: UpcomingDeadline = {
  id: "a1",
  title: "Essay 1",
  course_name: "Intro to OBE",
  due_date: "2026-09-01T00:00:00.000Z",
};

const FIXTURE_DEADLINE_2: UpcomingDeadline = {
  id: "a2",
  title: "Quiz 2",
  course_name: "Data Structures",
  due_date: "2026-09-03T00:00:00.000Z",
};

const FIXTURE_DEADLINES: UpcomingDeadline[] = [
  FIXTURE_DEADLINE_1,
  FIXTURE_DEADLINE_2,
];

// Canonical attendance shape — the exact `StudentCourseAttendance[]` that
// `useStudentAttendance` produces, so structural + value parity are enforced.
const FIXTURE_ATTENDANCE: StudentCourseAttendance[] = [
  {
    courseId: "c1",
    courseName: "Intro to OBE",
    attendancePercent: 92,
    totalSessions: 12,
    attended: 11,
  },
  {
    courseId: "c2",
    courseName: "Data Structures",
    attendancePercent: 60,
    totalSessions: 10,
    attended: 6,
  },
];

// Canonical streak-freeze shape — the exact `{ freezes, xpTotal }` that
// `useStreakFreezeInventory` produces, so structural + value parity are
// enforced. `xpTotal` mirrors the KPI `totalXP` because in production both are
// read from the same `student_gamification.xp_total` column.
const FIXTURE_STREAK_FREEZE = { freezes: 2, xpTotal: FIXTURE_KPIS.totalXP };

// Canonical profile-completeness shape — the exact `ProfileCompletenessData`
// that `useProfileCompleteness` produces, so structural + value parity are
// enforced.
const FIXTURE_PROFILE_COMPLETENESS: ProfileCompletenessData = {
  profile_completeness: 80,
  day1_completed: true,
};

// Canonical announcements shape — the exact `Announcement[]` that
// `useStudentAnnouncements(studentId, 5)` produces, already ordered pinned-desc
// then created-desc (limit 5), so structural + value parity are enforced.
const FIXTURE_ANNOUNCEMENTS: Announcement[] = [
  {
    id: "an1",
    course_id: "c1",
    author_id: "t1",
    title: "Welcome to the semester",
    content: "Please review the syllabus before our first session.",
    is_pinned: true,
    created_at: "2026-08-20T09:00:00.000Z",
    updated_at: "2026-08-20T09:00:00.000Z",
  },
  {
    id: "an2",
    course_id: "c2",
    author_id: "t2",
    title: "Assignment 1 posted",
    content: "Your first assignment is now available.",
    is_pinned: false,
    created_at: "2026-08-19T15:30:00.000Z",
    updated_at: "2026-08-19T15:30:00.000Z",
  },
];

// Canonical spendable-XP value — the exact number `get_xp_balance` returns and
// `useXPBalance` exposes as `{ balance }`. Distinct from `totalXP` (lifetime).
const FIXTURE_AVAILABLE_XP = 356;

// Full success payload mirroring the `get_student_dashboard` jsonb (all
// sections present), used by the attendance-, streak-freeze-,
// profile-completeness- and announcements-section tests.
const FIXTURE_AGGREGATE_DATA = {
  kpis: FIXTURE_KPIS,
  deadlines: FIXTURE_DEADLINES,
  attendance: FIXTURE_ATTENDANCE,
  streakFreeze: FIXTURE_STREAK_FREEZE,
  profileCompleteness: FIXTURE_PROFILE_COMPLETENESS,
  announcements: FIXTURE_ANNOUNCEMENTS,
  availableXP: FIXTURE_AVAILABLE_XP,
};

const makeClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

const makeWrapper = (client: QueryClient) => {
  const Wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client }, children);
  return Wrapper;
};

describe("useStudentDashboardAggregate (dashboard-and-ux-performance Req 2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockImplementation(() => makeFromBuilder());
  });

  it("calls get_student_dashboard once with the documented param name", async () => {
    mockRpc.mockResolvedValue({
      data: { kpis: FIXTURE_KPIS, deadlines: FIXTURE_DEADLINES },
      error: null,
    });

    const client = makeClient();
    const { result } = renderHook(
      () => useStudentDashboardAggregate(STUDENT_ID),
      { wrapper: makeWrapper(client) }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockRpc).toHaveBeenCalledWith("get_student_dashboard", {
      p_student_id: STUDENT_ID,
    });
  });

  it("parity: aggregate kpis + deadlines deep-equal the section-hook shapes (no data change)", async () => {
    mockRpc.mockResolvedValue({
      data: { kpis: FIXTURE_KPIS, deadlines: FIXTURE_DEADLINES },
      error: null,
    });

    const client = makeClient();
    const { result } = renderHook(
      () => useStudentDashboardAggregate(STUDENT_ID),
      { wrapper: makeWrapper(client) }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Value parity.
    expect(result.current.data?.kpis).toEqual(FIXTURE_KPIS);
    expect(result.current.data?.deadlines).toEqual(FIXTURE_DEADLINES);

    // Shape parity: exactly the StudentKPIData keys — no extra/missing fields
    // (guards against RPC jsonb key drift vs. what useStudentKPIs produces).
    expect(Object.keys(result.current.data?.kpis ?? {}).sort()).toEqual(
      Object.keys(FIXTURE_KPIS).sort()
    );
    expect(Object.keys(result.current.data?.deadlines[0] ?? {}).sort()).toEqual(
      Object.keys(FIXTURE_DEADLINE_1).sort()
    );
  });

  it("hydration: writes both section caches under the exact keys the critical hooks read", async () => {
    mockRpc.mockResolvedValue({
      data: { kpis: FIXTURE_KPIS, deadlines: FIXTURE_DEADLINES },
      error: null,
    });

    const client = makeClient();
    const { result } = renderHook(
      () => useStudentDashboardAggregate(STUDENT_ID),
      { wrapper: makeWrapper(client) }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // KPIs cache — the key `useStudentKPIs` reads.
    const kpisCache = client.getQueryData<StudentKPIData>(
      queryKeys.studentGamification.detail(STUDENT_ID)
    );
    // Deadlines cache — the key `useUpcomingDeadlines(studentId, 5)` reads.
    const deadlinesCache = client.getQueryData<UpcomingDeadline[]>(
      queryKeys.assignments.list({
        studentId: STUDENT_ID,
        upcoming: true,
        limit: 5,
      })
    );

    expect(kpisCache).toEqual(FIXTURE_KPIS);
    expect(deadlinesCache).toEqual(FIXTURE_DEADLINES);
  });

  it("does not call the RPC when studentId is missing (disabled)", () => {
    const client = makeClient();
    renderHook(() => useStudentDashboardAggregate(undefined), {
      wrapper: makeWrapper(client),
    });

    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("throws when the RPC returns an error (section hooks fall back)", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "boom" } });

    const client = makeClient();
    const { result } = renderHook(
      () => useStudentDashboardAggregate(STUDENT_ID),
      { wrapper: makeWrapper(client) }
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as { message: string }).message).toBe("boom");

    // No cache was hydrated, so section hooks would fetch as before.
    expect(
      client.getQueryData(queryKeys.studentGamification.detail(STUDENT_ID))
    ).toBeUndefined();
  });

  // ─── Collapse proof (the point of this change) ──────────────────────────────

  it("collapse: a successful aggregate fires the critical block with ZERO section requests", async () => {
    mockRpc.mockResolvedValue({
      data: { kpis: FIXTURE_KPIS, deadlines: FIXTURE_DEADLINES },
      error: null,
    });

    const client = makeClient();
    const { result } = renderHook(() => useCriticalBlock(STUDENT_ID), {
      wrapper: makeWrapper(client),
    });

    await waitFor(() => expect(result.current.aggregate.isSuccess).toBe(true));

    // The section hooks are gated on `aggregate.isError`, so on the happy path
    // they never enable → the underlying KPI/deadline table reads never fire.
    expect(mockFrom).not.toHaveBeenCalled();
    // Exactly one round-trip for the whole critical block: the aggregate RPC.
    expect(mockRpc).toHaveBeenCalledTimes(1);

    // …and the rendered values still come through (from the aggregate, not a fetch).
    expect(result.current.aggregate.data?.kpis).toEqual(FIXTURE_KPIS);
    expect(result.current.aggregate.data?.deadlines).toEqual(FIXTURE_DEADLINES);
    // Section hooks resolve from hydrated cache without ever fetching.
    await waitFor(() => {
      expect(result.current.kpisHook.data).toEqual(FIXTURE_KPIS);
      expect(result.current.deadlinesHook.data).toEqual(FIXTURE_DEADLINES);
    });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("fallback: a failed aggregate makes the section hooks fetch (KPIs + deadlines)", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "boom" } });

    const client = makeClient();
    const { result } = renderHook(() => useCriticalBlock(STUDENT_ID), {
      wrapper: makeWrapper(client),
    });

    await waitFor(() => expect(result.current.aggregate.isError).toBe(true));

    // Once the aggregate errors, the gated section hooks enable and fetch.
    await waitFor(() => expect(mockFrom).toHaveBeenCalled());
    const calledTables = mockFrom.mock.calls.map((c) => c[0]);
    // KPIs fallback reads `student_gamification`; deadlines fallback reads
    // `student_courses` — both prove the section requests returned on failure.
    expect(calledTables).toContain("student_gamification");
    expect(calledTables).toContain("student_courses");
  });

  // ─── Attendance section wiring (this change) ────────────────────────────────
  // Attendance is wired exactly like the KPI/deadline critical block: the
  // aggregate carries it, the section hook is a fallback gated on error.
  describe("attendance section", () => {
    it("collapse: a successful aggregate yields attendance with ZERO section requests", async () => {
      mockRpc.mockResolvedValue({ data: FIXTURE_AGGREGATE_DATA, error: null });

      const client = makeClient();
      const { result } = renderHook(() => useAttendanceBlock(STUDENT_ID), {
        wrapper: makeWrapper(client),
      });

      await waitFor(() =>
        expect(result.current.aggregate.isSuccess).toBe(true)
      );

      // The attendance value renders straight from the aggregate…
      expect(result.current.attendanceCourses).toEqual(FIXTURE_ATTENDANCE);
      // …and because the section hook is gated on `aggregate.isError`, the
      // per-course attendance fan-out (`supabase.from`) never fires.
      expect(mockFrom).not.toHaveBeenCalled();
      expect(mockRpc).toHaveBeenCalledTimes(1);

      // The gated hook resolves as a pure cache HIT from the aggregate's
      // hydration (it reads the same key), so the value is served WITHOUT any
      // supabase read — the collapse this change is about.
      await waitFor(() =>
        expect(result.current.attendanceHook.data).toEqual(FIXTURE_ATTENDANCE)
      );
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it("fallback: a failed aggregate makes useStudentAttendance fetch", async () => {
      mockRpc.mockResolvedValue({ data: null, error: { message: "boom" } });

      const client = makeClient();
      const { result } = renderHook(() => useAttendanceBlock(STUDENT_ID), {
        wrapper: makeWrapper(client),
      });

      await waitFor(() => expect(result.current.aggregate.isError).toBe(true));

      // Once the aggregate errors, the gated attendance hook enables and fetches.
      // Its first read is the enrolled-courses query against `student_courses`;
      // in this isolated harness that is the ONLY source of `from` calls.
      await waitFor(() => expect(mockFrom).toHaveBeenCalled());
      expect(mockFrom.mock.calls.map((c) => c[0])).toContain("student_courses");
    });

    it("hydration: writes the attendance cache under the exact key useStudentAttendance reads", async () => {
      mockRpc.mockResolvedValue({ data: FIXTURE_AGGREGATE_DATA, error: null });

      const client = makeClient();
      const { result } = renderHook(
        () => useStudentDashboardAggregate(STUDENT_ID),
        { wrapper: makeWrapper(client) }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const attendanceCache = client.getQueryData<StudentCourseAttendance[]>(
        queryKeys.attendanceRecords.list({
          studentId: STUDENT_ID,
          type: "student_courses",
        })
      );
      expect(attendanceCache).toEqual(FIXTURE_ATTENDANCE);
    });
  });

  // ─── Streak-freeze section wiring (this change) ─────────────────────────────
  // Streak freeze is wired exactly like the KPI/deadline critical block and the
  // attendance section: the aggregate carries it, and the inventory hook is a
  // fallback gated on `aggregate.isError`.
  describe("streak freeze section", () => {
    it("collapse: a successful aggregate yields streakFreeze with ZERO section requests", async () => {
      mockRpc.mockResolvedValue({ data: FIXTURE_AGGREGATE_DATA, error: null });

      const client = makeClient();
      const { result } = renderHook(() => useStreakFreezeBlock(STUDENT_ID), {
        wrapper: makeWrapper(client),
      });

      await waitFor(() =>
        expect(result.current.aggregate.isSuccess).toBe(true)
      );

      // The freeze value renders straight from the aggregate…
      expect(result.current.freezeData).toEqual(FIXTURE_STREAK_FREEZE);
      // …and because the inventory hook is gated on `aggregate.isError`, its
      // own `student_gamification` read (`supabase.from`) never fires.
      expect(mockFrom).not.toHaveBeenCalled();
      expect(mockRpc).toHaveBeenCalledTimes(1);

      // The gated hook resolves as a pure cache HIT from the aggregate's
      // hydration (it reads the same key), so the value is served WITHOUT any
      // supabase read — the collapse this change is about.
      await waitFor(() =>
        expect(result.current.freezeHook.data).toEqual(FIXTURE_STREAK_FREEZE)
      );
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it("fallback: a failed aggregate makes useStreakFreezeInventory fetch", async () => {
      mockRpc.mockResolvedValue({ data: null, error: { message: "boom" } });

      const client = makeClient();
      const { result } = renderHook(() => useStreakFreezeBlock(STUDENT_ID), {
        wrapper: makeWrapper(client),
      });

      await waitFor(() => expect(result.current.aggregate.isError).toBe(true));

      // Once the aggregate errors, the gated inventory hook enables and reads
      // its `student_gamification` row; in this isolated harness that is the
      // ONLY source of `from` calls.
      await waitFor(() => expect(mockFrom).toHaveBeenCalled());
      expect(mockFrom.mock.calls.map((c) => c[0])).toContain(
        "student_gamification"
      );
    });

    it("hydration: writes the streak-freeze cache under the exact key useStreakFreezeInventory reads", async () => {
      mockRpc.mockResolvedValue({ data: FIXTURE_AGGREGATE_DATA, error: null });

      const client = makeClient();
      const { result } = renderHook(
        () => useStudentDashboardAggregate(STUDENT_ID),
        { wrapper: makeWrapper(client) }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const freezeCache = client.getQueryData<{
        freezes: number;
        xpTotal: number;
      }>(
        queryKeys.studentGamification.list({
          scope: "streak_freeze",
          studentId: STUDENT_ID,
        })
      );
      expect(freezeCache).toEqual(FIXTURE_STREAK_FREEZE);
    });
  });

  // ─── Profile-completeness section wiring (this change) ──────────────────────
  // Profile completeness is wired exactly like the KPI/deadline critical block,
  // the attendance section, and the streak-freeze section: the aggregate carries
  // it, and `useProfileCompleteness` is a fallback gated on `aggregate.isError`.
  describe("profile completeness section", () => {
    it("collapse: a successful aggregate yields profileCompleteness with ZERO section requests", async () => {
      mockRpc.mockResolvedValue({ data: FIXTURE_AGGREGATE_DATA, error: null });

      const client = makeClient();
      const { result } = renderHook(
        () => useProfileCompletenessBlock(STUDENT_ID),
        { wrapper: makeWrapper(client) }
      );

      await waitFor(() =>
        expect(result.current.aggregate.isSuccess).toBe(true)
      );

      // The completeness value renders straight from the aggregate…
      expect(result.current.completenessData).toEqual(
        FIXTURE_PROFILE_COMPLETENESS
      );
      // …and because the section hook is gated on `aggregate.isError`, its own
      // `student_profiles` + `onboarding_progress` reads never fire.
      expect(mockFrom).not.toHaveBeenCalled();
      expect(mockRpc).toHaveBeenCalledTimes(1);

      // The gated hook resolves as a pure cache HIT from the aggregate's
      // hydration (it reads the same key), so the value is served WITHOUT any
      // supabase read — the collapse this change is about.
      await waitFor(() =>
        expect(result.current.completenessHook.data).toEqual(
          FIXTURE_PROFILE_COMPLETENESS
        )
      );
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it("fallback: a failed aggregate makes useProfileCompleteness fetch", async () => {
      mockRpc.mockResolvedValue({ data: null, error: { message: "boom" } });

      const client = makeClient();
      const { result } = renderHook(
        () => useProfileCompletenessBlock(STUDENT_ID),
        { wrapper: makeWrapper(client) }
      );

      await waitFor(() => expect(result.current.aggregate.isError).toBe(true));

      // Once the aggregate errors, the gated completeness hook enables and reads
      // both `student_profiles` and `onboarding_progress`; in this isolated
      // harness those are the ONLY sources of `from` calls.
      await waitFor(() => expect(mockFrom).toHaveBeenCalled());
      const calledTables = mockFrom.mock.calls.map((c) => c[0]);
      expect(calledTables).toContain("student_profiles");
      expect(calledTables).toContain("onboarding_progress");
    });

    it("hydration: writes the completeness cache under the exact key useProfileCompleteness reads", async () => {
      mockRpc.mockResolvedValue({ data: FIXTURE_AGGREGATE_DATA, error: null });

      const client = makeClient();
      const { result } = renderHook(
        () => useStudentDashboardAggregate(STUDENT_ID),
        { wrapper: makeWrapper(client) }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const completenessCache = client.getQueryData<ProfileCompletenessData>(
        queryKeys.onboarding.profileCompleteness(STUDENT_ID)
      );
      expect(completenessCache).toEqual(FIXTURE_PROFILE_COMPLETENESS);
    });
  });

  // ─── Announcements section wiring (this change) ─────────────────────────────
  // Announcements is wired exactly like the KPI/deadline critical block and the
  // attendance / streak-freeze / profile-completeness sections: the aggregate
  // carries it, and `useStudentAnnouncements` is a fallback gated on
  // `aggregate.isError`.
  describe("announcements section", () => {
    it("collapse: a successful aggregate yields announcements with ZERO section requests", async () => {
      mockRpc.mockResolvedValue({ data: FIXTURE_AGGREGATE_DATA, error: null });

      const client = makeClient();
      const { result } = renderHook(() => useAnnouncementsBlock(STUDENT_ID), {
        wrapper: makeWrapper(client),
      });

      await waitFor(() =>
        expect(result.current.aggregate.isSuccess).toBe(true)
      );

      // The announcements value renders straight from the aggregate…
      expect(result.current.announcements).toEqual(FIXTURE_ANNOUNCEMENTS);
      // …and because the section hook is gated on `aggregate.isError`, its own
      // enrolled-courses + announcements reads (`supabase.from`) never fire.
      expect(mockFrom).not.toHaveBeenCalled();
      expect(mockRpc).toHaveBeenCalledTimes(1);

      // The gated hook resolves as a pure cache HIT from the aggregate's
      // hydration (it reads the same key), so the value is served WITHOUT any
      // supabase read — the collapse this change is about.
      await waitFor(() =>
        expect(result.current.announcementsHook.data).toEqual(
          FIXTURE_ANNOUNCEMENTS
        )
      );
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it("fallback: a failed aggregate makes useStudentAnnouncements fetch", async () => {
      mockRpc.mockResolvedValue({ data: null, error: { message: "boom" } });

      const client = makeClient();
      const { result } = renderHook(() => useAnnouncementsBlock(STUDENT_ID), {
        wrapper: makeWrapper(client),
      });

      await waitFor(() => expect(result.current.aggregate.isError).toBe(true));

      // Once the aggregate errors, the gated announcements hook enables and
      // reads its enrolled-courses query against `student_courses`; in this
      // isolated harness that is the ONLY source of `from` calls.
      await waitFor(() => expect(mockFrom).toHaveBeenCalled());
      expect(mockFrom.mock.calls.map((c) => c[0])).toContain("student_courses");
    });

    it("hydration: writes the announcements cache under the exact key useStudentAnnouncements reads", async () => {
      mockRpc.mockResolvedValue({ data: FIXTURE_AGGREGATE_DATA, error: null });

      const client = makeClient();
      const { result } = renderHook(
        () => useStudentDashboardAggregate(STUDENT_ID),
        { wrapper: makeWrapper(client) }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const announcementsCache = client.getQueryData<Announcement[]>(
        queryKeys.announcements.list({ studentId: STUDENT_ID, limit: 5 })
      );
      expect(announcementsCache).toEqual(FIXTURE_ANNOUNCEMENTS);
    });
  });

  // ─── Available-XP (sidebar badge) wiring (Appendix A, Fix A) ────────────────
  // The aggregate carries `availableXP` and hydrates the EXACT key `useXPBalance`
  // reads, so the persistent sidebar `XPBalanceBadge` is a cache hit instead of a
  // separate `get_xp_balance` RPC per page mount. Guarded: a pre-migration payload
  // without `availableXP` must NOT hydrate (badge falls back), so no regression in
  // the brief client-ahead-of-migration window.
  describe("available XP section", () => {
    it("hydration: writes the balance cache under the exact key useXPBalance reads", async () => {
      mockRpc.mockResolvedValue({ data: FIXTURE_AGGREGATE_DATA, error: null });

      const client = makeClient();
      const { result } = renderHook(
        () => useStudentDashboardAggregate(STUDENT_ID),
        { wrapper: makeWrapper(client) }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const balanceCache = client.getQueryData<{ balance: number }>(
        queryKeys.marketplace.balance(STUDENT_ID)
      );
      expect(balanceCache).toEqual({ balance: FIXTURE_AVAILABLE_XP });
    });

    it("no-op: a payload without availableXP leaves the balance cache empty (badge falls back)", async () => {
      // Pre-migration shape: kpis + deadlines only, no availableXP.
      mockRpc.mockResolvedValue({
        data: { kpis: FIXTURE_KPIS, deadlines: FIXTURE_DEADLINES },
        error: null,
      });

      const client = makeClient();
      const { result } = renderHook(
        () => useStudentDashboardAggregate(STUDENT_ID),
        { wrapper: makeWrapper(client) }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(
        client.getQueryData(queryKeys.marketplace.balance(STUDENT_ID))
      ).toBeUndefined();
    });
  });
});
