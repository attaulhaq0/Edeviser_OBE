// @vitest-environment happy-dom
// Actual QueryClient/query observers; only the Supabase read boundary returns DTOs.
import type { ReactNode } from "react";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useStudentAcademicSummary, useStudentProgress } from "@/hooks/useStudentProgress";
import { queryKeys } from "@/lib/queryKeys";

const db = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ supabase: { from: db.from } }));

type Stage = "enrollments" | "attainment" | "clos" | "weakest" | "assignments";
interface ReadResult { data: unknown; error: Error | null }
interface ReadCall { table: string; columns: string; steps: Array<{ method: string; args: unknown[] }> }
interface AttainmentRow { course_id: string | null; attainment_percent: number; sample_count: number | null }
interface Scenario {
  courses: string[];
  attainment: AttainmentRow[];
  clos: Array<{ course_id: string | null }>;
  weakest: null | { outcome_id: string; course_id: string; attainment_percent: number; learning_outcomes: { id: string; title: string; blooms_level: string | null } | null };
  assignments: Array<{ id: string; title: string; due_date: string; course_id: string }>;
  errors: Partial<Record<Stage, Error>>;
}
const scenario = (courseId = "course-a", percent = 60): Scenario => ({
  courses: [courseId],
  attainment: [{ course_id: courseId, attainment_percent: percent, sample_count: 2 }],
  clos: [{ course_id: courseId }],
  weakest: null,
  assignments: [],
  errors: {},
});
let current: Scenario;
let reads: ReadCall[];
let overrideRead: ((call: ReadCall, stage: Stage) => Promise<ReadResult> | undefined) | undefined;
const clients: QueryClient[] = [];
const stageOf = (call: ReadCall): Stage => {
  if (call.table === "student_courses") return "enrollments";
  if (call.table === "learning_outcomes") return "clos";
  if (call.table === "assignments") return "assignments";
  if (call.table === "outcome_attainment") return call.columns.includes("learning_outcomes!inner") ? "weakest" : "attainment";
  throw new Error(`Unexpected table: ${call.table}`);
};
const replyFor = (value: Scenario, stage: Stage): ReadResult => {
  if (value.errors[stage]) return { data: null, error: value.errors[stage] ?? null };
  const data = {
    enrollments: value.courses.map((id) => ({ course_id: id, courses: { id, name: `Course ${id}`, code: `CODE-${id}` } })),
    attainment: value.attainment,
    clos: value.clos,
    weakest: value.weakest,
    assignments: value.assignments,
  }[stage];
  return { data, error: null };
};
function readBuilder(table: string) {
  const call: ReadCall = { table, columns: "", steps: [] };
  const step = (method: string, ...args: unknown[]) => { call.steps.push({ method, args }); return builder; };
  const builder = {
    select: (columns: string) => { call.columns = columns; return builder; },
    eq: (column: string, value: unknown) => step("eq", column, value),
    in: (column: string, values: string[]) => step("in", column, values),
    gte: (column: string, value: string) => step("gte", column, value),
    order: (column: string, options: { ascending: boolean }) => step("order", column, options),
    limit: (value: number) => step("limit", value),
    maybeSingle: () => step("maybeSingle"),
    then: (resolve: (value: ReadResult) => unknown, reject?: (reason: unknown) => unknown) => {
      reads.push(call);
      const stage = stageOf(call);
      return (overrideRead?.(call, stage) ?? Promise.resolve(replyFor(current, stage))).then(resolve, reject);
    },
  };
  return builder;
}
function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  clients.push(client);
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return { client, wrapper };
}
const baseKey = (studentId: string | undefined) => queryKeys.outcomeAttainment.list({ studentId, view: "progress" });
const summaryKey = (studentId: string | undefined) => queryKeys.outcomeAttainment.list({ studentId, view: "academic-summary" });
const actorOf = (call: ReadCall) => call.steps.find((step) => step.method === "eq" && step.args[0] === "student_id")?.args[1];

beforeEach(() => {
  current = scenario();
  reads = [];
  overrideRead = undefined;
  db.from.mockReset().mockImplementation(readBuilder);
});
afterEach(() => {
  cleanup();
  for (const client of clients.splice(0)) client.clear();
});

describe("student academic summary query orchestration", () => {
  it.each<Stage>(["enrollments", "attainment", "clos"])("surfaces %s failure instead of hanging disabled and recovers on public refetch", async (stage) => {
    const failure = new Error(`${stage} unavailable`);
    current.errors[stage] = failure;
    const { client, wrapper } = setup();
    const { result } = renderHook(() => useStudentAcademicSummary("student-a"), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBe(failure);
    expect(result.current.isPending).toBe(false);
    expect(reads.some((call) => ["weakest", "assignments"].includes(stageOf(call)))).toBe(false);
    delete current.errors[stage];
    await act(async () => { await result.current.refetch(); });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.averageMastery).toBe(60);
    expect(client.getQueryCache().find({ queryKey: baseKey("student-a"), exact: true })?.getObserversCount()).toBe(0);
    expect(client.getQueryCache().find({ queryKey: summaryKey("student-a"), exact: true })?.getObserversCount()).toBe(1);
  });

  it("fetches fresh base data despite its60s cache and refreshes again through the public result", async () => {
    const { client, wrapper } = setup();
    const base = renderHook(() => useStudentProgress("student-a"), { wrapper });
    await waitFor(() => expect(base.result.current.isSuccess).toBe(true));
    expect(base.result.current.data?.averageAttainment).toBe(60);
    base.unmount();
    current.attainment = [{ course_id: "course-a", attainment_percent: 95, sample_count: 2 }];
    const summary = renderHook(() => useStudentAcademicSummary("student-a"), { wrapper });
    await waitFor(() => expect(summary.result.current.data?.averageMastery).toBe(95));
    current.attainment = [{ course_id: "course-a", attainment_percent: 30, sample_count: 2 }];
    await act(async () => { await summary.result.current.refetch(); });
    await waitFor(() => expect(summary.result.current.data?.averageMastery).toBe(30));
    expect(client.getQueryData(baseKey("student-a"))).toMatchObject({ averageAttainment: 30 });
    expect(reads.filter((call) => stageOf(call) === "enrollments")).toHaveLength(3);
  });

  it.each(["all", "lists"] as const)("responds to the existing canonical %s invalidation prefix", async (prefix) => {
    const { client, wrapper } = setup();
    const { result } = renderHook(() => useStudentAcademicSummary("student-a"), { wrapper });
    await waitFor(() => expect(result.current.data?.averageMastery).toBe(60));
    current.attainment = [{ course_id: "course-a", attainment_percent: 88, sample_count: 2 }];
    await act(async () => { await client.invalidateQueries({ queryKey: prefix === "all" ? queryKeys.outcomeAttainment.all : queryKeys.outcomeAttainment.lists() }); });
    await waitFor(() => expect(result.current.data?.averageMastery).toBe(88));
    expect(client.getQueryData(["student-academic-summary", "student-a"])).toBeUndefined();
    expect(reads.filter((call) => stageOf(call) === "enrollments")).toHaveLength(2);
  });

  it.each([undefined, ""])("does not start either query without a student ID (%s)", async (studentId) => {
    const { wrapper } = setup();
    const { result } = renderHook(() => useStudentAcademicSummary(studentId), { wrapper });
    expect(result.current.fetchStatus).toBe("idle");
    expect(result.current.data).toBeUndefined();
    expect(db.from).not.toHaveBeenCalled();
    // Manual refetch also retains the guarded no-ID public contract.
    await act(async () => { await result.current.refetch(); });
    await waitFor(() => expect(result.current.data).toMatchObject({ activeCourseCount: 0, recordedCourseCount: 0, averageMastery: null, perCourse: [] }));
    expect(db.from).not.toHaveBeenCalled();
  });

  it("isolates an actor change from a late old read and clears the visible result when the ID disappears", async () => {
    const first = scenario("course-a", 20), second = scenario("course-b", 90);
    let releaseFirst: ((value: ReadResult) => void) | undefined;
    const firstEnrollment = new Promise<ReadResult>((resolve) => { releaseFirst = resolve; });
    overrideRead = (call, stage) => {
      if (stage === "enrollments" && actorOf(call) === "student-a") return firstEnrollment;
      const courseFilter = call.steps.find((step) => step.method === "in" && step.args[0] === "course_id")?.args[1];
      const isFirst = actorOf(call) === "student-a" || Array.isArray(courseFilter) && courseFilter.includes("course-a");
      return Promise.resolve(replyFor(isFirst ? first : second, stage));
    };
    const { client, wrapper } = setup();
    const { result, rerender } = renderHook(({ id }: { id: string | undefined }) => useStudentAcademicSummary(id), { wrapper, initialProps: { id: "student-a" as string | undefined } });
    await waitFor(() => expect(reads.some((call) => actorOf(call) === "student-a")).toBe(true));
    rerender({ id: "student-b" });
    await waitFor(() => expect(result.current.data?.averageMastery).toBe(90));
    await act(async () => { releaseFirst?.(replyFor(first, "enrollments")); });
    await waitFor(() => expect(client.getQueryData(summaryKey("student-a"))).toMatchObject({ averageMastery: 20 }));
    expect(result.current.data?.perCourse[0]?.course_id).toBe("course-b");
    expect(result.current.data?.averageMastery).toBe(90);
    const readCount = reads.length;
    rerender({ id: undefined });
    expect(result.current.data).toBeUndefined();
    expect(result.current.fetchStatus).toBe("idle");
    expect(reads).toHaveLength(readCount);
  });
});

describe("student academic summary presentation metadata without math changes", () => {
  it("preserves per-row/course averaging, rounding, all bands, strongest and weakest while distinguishing row presence", async () => {
    current.courses = ["a", "b", "c", "d", "zero", "unrecorded"];
    current.attainment = [
      { course_id: "a", attainment_percent: 80, sample_count: 2 },
      { course_id: "a", attainment_percent: 90, sample_count: 3 },
      { course_id: "b", attainment_percent: 70, sample_count: 0 },
      { course_id: "c", attainment_percent: 50, sample_count: null },
      { course_id: "d", attainment_percent: 49, sample_count: 4 },
      { course_id: "zero", attainment_percent: 0, sample_count: 0 },
      { course_id: null, attainment_percent: 100, sample_count: 100 },
    ];
    current.clos = [{ course_id: "a" }, { course_id: "a" }, { course_id: "zero" }, { course_id: null }];
    current.weakest = { outcome_id: "clo-zero", course_id: "zero", attainment_percent: 0, learning_outcomes: { id: "clo-zero", title: "Recorded zero outcome", blooms_level: null } };
    current.assignments = [{ id: "assignment-a", title: "Evidence review", due_date: "2035-04-12T12:00:00Z", course_id: "a" }];
    const { wrapper } = setup();
    const { result } = renderHook(() => useStudentAcademicSummary("student-a"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toMatchObject({
      activeCourseCount: 6, recordedCourseCount: 5, averageMastery: 42,
      excellentCount: 1, satisfactoryCount: 1, developingCount: 1, notYetCount: 3,
      strongestCourse: { courseId: "a", name: "Course a", mastery: 85 },
      weakestClo: { cloId: "clo-zero", courseId: "zero", title: "Recorded zero outcome", mastery: 0 },
      nextDeadline: { assignmentId: "assignment-a", title: "Evidence review", courseName: "Course a", dueAt: "2035-04-12T12:00:00Z" },
      classStanding: undefined, termComparison: undefined,
    });
    expect(result.current.data?.perCourse.map((course) => [course.attainment_percent, course.attainmentRecorded, course.evidence_count, course.clo_count])).toEqual([
      [85, true, 5, 2], [70, true, 0, 0], [50, true, 0, 0], [49, true, 4, 0], [0, true, 0, 1], [0, false, 0, 0],
    ]);
  });

  it("returns empty enrollment without downstream reads and retains numeric zero aggregation", async () => {
    current.courses = [];
    const { wrapper } = setup();
    const { result } = renderHook(() => useStudentAcademicSummary("student-a"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toMatchObject({ activeCourseCount: 0, recordedCourseCount: 0, averageMastery: 0, perCourse: [], strongestCourse: undefined, weakestClo: undefined, nextDeadline: undefined });
    expect(reads.map(stageOf)).toEqual(["enrollments"]);
  });

  it.each([false, true])("distinguishes unrecorded from recorded real-zero with no evidence (%s)", async (recorded) => {
    current.attainment = recorded ? [{ course_id: "course-a", attainment_percent: 0, sample_count: 0 }] : [];
    const { wrapper } = setup();
    const { result } = renderHook(() => useStudentAcademicSummary("student-a"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toMatchObject({ activeCourseCount: 1, recordedCourseCount: recorded ? 1 : 0, averageMastery: 0, notYetCount: 1, strongestCourse: { mastery: 0 } });
    expect(result.current.data?.perCourse[0]).toMatchObject({ attainment_percent: 0, attainmentRecorded: recorded, evidence_count: 0 });
  });

  it.each(["unmatched-course", "missing-outcome"] as const)("retains the weakest-outcome guard for %s", async (sample) => {
    current.weakest = { outcome_id: "clo-a", course_id: sample === "unmatched-course" ? "other-course" : "course-a", attainment_percent: 12, learning_outcomes: sample === "missing-outcome" ? null : { id: "clo-a", title: "Unmatched row", blooms_level: null } };
    const { wrapper } = setup();
    const { result } = renderHook(() => useStudentAcademicSummary("student-a"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.weakestClo).toBeUndefined();
    expect(result.current.data?.averageMastery).toBe(60);
  });

  it.each(["weakest", "assignments"] as const)("surfaces a %s read error and recovers instead of manufacturing missing data", async (stage) => {
    const failure = new Error(`${stage} denied`);
    current.errors[stage] = failure;
    const { wrapper } = setup();
    const { result } = renderHook(() => useStudentAcademicSummary("student-a"), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBe(failure);
    expect(result.current.data).toBeUndefined();
    delete current.errors[stage];
    current.assignments = [{ id: "next", title: "Next work", due_date: "2035-04-12", course_id: "course-a" }];
    await act(async () => { await result.current.refetch(); });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.nextDeadline?.assignmentId).toBe("next");
  });

  it("retains exact existing read predicates, both student_course scopes, orders and limits", async () => {
    const earliest = Date.now();
    const { wrapper } = setup();
    const { result } = renderHook(() => useStudentAcademicSummary("student-a"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const requiredStage = (stage: Stage) => {
      const call = reads.find((read) => stageOf(read) === stage);
      if (!call) throw new Error(`Missing expected read: ${stage}`);
      return call;
    };
    const stages = { enrollments: requiredStage("enrollments"), attainment: requiredStage("attainment"), clos: requiredStage("clos"), weakest: requiredStage("weakest"), assignments: requiredStage("assignments") };
    expect(stages.enrollments.columns).toBe("course_id, courses!inner(id, name, code)");
    expect(stages.enrollments.steps).toEqual([{ method: "eq", args: ["student_id", "student-a"] }, { method: "eq", args: ["status", "active"] }]);
    expect(stages.attainment.columns).toBe("course_id, attainment_percent, sample_count");
    expect(stages.attainment.steps).toEqual([{ method: "eq", args: ["student_id", "student-a"] }, { method: "in", args: ["course_id", ["course-a"]] }, { method: "eq", args: ["scope", "student_course"] }]);
    expect(stages.clos.columns).toBe("course_id");
    expect(stages.clos.steps).toEqual([{ method: "in", args: ["course_id", ["course-a"]] }, { method: "eq", args: ["type", "CLO"] }]);
    expect(stages.weakest.columns).toBe("outcome_id, course_id, attainment_percent, learning_outcomes!inner(id, title, blooms_level)");
    expect(stages.weakest.steps).toEqual([{ method: "eq", args: ["student_id", "student-a"] }, { method: "eq", args: ["scope", "student_course"] }, { method: "in", args: ["course_id", ["course-a"]] }, { method: "order", args: ["attainment_percent", { ascending: true }] }, { method: "limit", args: [1] }, { method: "maybeSingle", args: [] }]);
    expect(stages.assignments.columns).toBe("id, title, due_date, course_id");
    expect(stages.assignments.steps).toEqual([{ method: "in", args: ["course_id", ["course-a"]] }, { method: "gte", args: ["due_date", expect.any(String)] }, { method: "order", args: ["due_date", { ascending: true }] }, { method: "limit", args: [1] }]);
    const boundary = stages.assignments.steps[1]?.args[1];
    expect(typeof boundary).toBe("string");
    const timestamp = Date.parse(String(boundary));
    expect(timestamp).toBeGreaterThanOrEqual(earliest);
    expect(timestamp).toBeLessThanOrEqual(Date.now());
    expect(db.from.mock.calls.map(([table]) => table)).toEqual(["student_courses", "outcome_attainment", "learning_outcomes", "outcome_attainment", "assignments"]);
  });
});
