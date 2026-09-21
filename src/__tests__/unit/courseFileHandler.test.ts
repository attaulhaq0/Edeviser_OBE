// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import {
  handleCourseFile,
  type Database,
  type Dependencies,
  type Query,
} from "../../../supabase/functions/generate-course-file/handler";
import {
  type Actor,
  type CourseFileReport,
  MAX_ROWS,
} from "../../../supabase/functions/generate-course-file/contracts";

const courseId = "11111111-1111-1111-1111-111111111111";
const semesterId = "22222222-2222-2222-2222-222222222222";
const actor: Actor = {
  id: "owner",
  role: "coordinator",
  institution_id: "tenant",
  is_active: true,
};
const body = { course_id: courseId, semester_id: semesterId };
type Row = Record<string, unknown>;
interface Trace {
  table: string;
  columns: string;
  filters: Array<[string, unknown]>;
  limit?: number;
}
function setup(
  options: {
    actor?: Actor | null;
    failAt?: number;
    fixtures?: Record<string, Row[]>;
    countOverride?: number;
    renderError?: boolean;
  } = {}
) {
  const fixtures: Record<string, Row[]> = {
    courses: [
      {
        id: courseId,
        name: "Course",
        code: "C1",
        program_id: "program",
        semester_id: semesterId,
      },
    ],
    programs: [
      { id: "program", institution_id: "tenant", coordinator_id: "owner" },
    ],
    semesters: [{ id: semesterId, institution_id: "tenant", name: "Term" }],
    learning_outcomes: [
      {
        id: "clo",
        type: "CLO",
        course_id: courseId,
        institution_id: "tenant",
        title: "Child",
        blooms_level: null,
      },
      {
        id: "plo",
        type: "PLO",
        program_id: "program",
        institution_id: "tenant",
        title: "Parent",
        blooms_level: null,
      },
      {
        id: "foreign-plo",
        type: "PLO",
        program_id: "other-program",
        institution_id: "tenant",
        title: "Excluded",
      },
    ],
    outcome_mappings: [
      { source_outcome_id: "plo", target_outcome_id: "clo", weight: 1 },
      { source_outcome_id: "foreign-plo", target_outcome_id: "clo", weight: 1 },
    ],
    assignments: [
      {
        id: "assignment",
        course_id: courseId,
        title: "Essay",
        total_marks: 10,
        clo_weights: [{ clo_id: "clo", weight: 1 }],
      },
    ],
    submissions: [{ id: "submission", assignment_id: "assignment" }],
    grades: [{ submission_id: "submission", score_percent: 75 }],
    outcome_attainment: [
      {
        id: "a",
        outcome_id: "clo",
        student_id: "student",
        course_id: courseId,
        scope: "student_course",
        attainment_percent: 70,
        sample_count: 1,
      },
      {
        id: "b",
        outcome_id: "clo",
        student_id: "other",
        course_id: "other-course",
        scope: "student_course",
        attainment_percent: 0,
        sample_count: 1,
      },
      {
        id: "c",
        outcome_id: "clo",
        student_id: null,
        course_id: courseId,
        scope: "course",
        attainment_percent: 0,
        sample_count: 1,
      },
    ],
    cqi_action_plans: [
      {
        id: "cqi",
        program_id: "program",
        semester_id: semesterId,
        outcome_type: "CLO",
        outcome_id: "clo",
        action_description: "Scoped action",
        root_cause: null,
        status: "planned",
      },
      {
        id: "other-cqi",
        program_id: "program",
        semester_id: "other-term",
        outcome_type: "CLO",
        outcome_id: "clo",
        action_description: "Excluded",
        status: "planned",
      },
    ],
    ...options.fixtures,
  };
  const trace: Trace[] = [];
  const db: Database = {
    from(table) {
      return {
        select(columns) {
          const current: Trace = { table, columns, filters: [] };
          trace.push(current);
          const number = trace.length;
          let selected = [...(fixtures[table] ?? [])];
          const result = () => ({
            data: selected.slice(0, current.limit ?? selected.length),
            error:
              options.failAt === number
                ? { message: "SECRET SQL or database detail" }
                : null,
            count: options.countOverride ?? selected.length,
          });
          const query: Query = {
            eq(column, value) {
              current.filters.push([column, value]);
              selected = selected.filter((r) => r[column] === value);
              return query;
            },
            in(column, values) {
              current.filters.push([column, values]);
              selected = selected.filter((r) =>
                values.includes(String(r[column]))
              );
              return query;
            },
            order() {
              return query;
            },
            limit(value) {
              current.limit = value;
              return query;
            },
            maybeSingle() {
              const res = result();
              return Promise.resolve({ ...res, data: selected[0] ?? null });
            },
            then(onfulfilled, onrejected) {
              return Promise.resolve(result()).then(onfulfilled, onrejected);
            },
          };
          return query;
        },
      };
    },
  };
  const render = vi.fn((_report: CourseFileReport) => {
    if (options.renderError) throw new Error("private renderer detail");
    return new TextEncoder().encode("%PDF-1.4\nfixture");
  });
  const deps: Dependencies = {
    authenticate: vi.fn(async () => ({
      user: options.actor === undefined ? actor : options.actor,
      error: null,
    })),
    database: vi.fn(() => db),
    render,
    now: () => new Date("2026-09-19T12:00:00Z"),
  };
  return { deps, render, trace };
}
const request = (payload: unknown = body) =>
  new Request("https://example.test/generate-course-file", {
    method: "POST",
    body: JSON.stringify(payload),
  });

describe("production course file handler boundary", () => {
  it("delivers a minimized authenticated PDF with canonical and bounded course/term queries", async () => {
    const { deps, trace, render } = setup();
    const response = await handleCourseFile(request(), deps);
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const data = await response.json();
    expect(atob(data.pdf_base64)).toContain("%PDF-");
    expect(data.download_url).toBeUndefined();
    expect(data.report_kind).toBe("normalized_course_snapshot");
    const report = render.mock.calls[0]![0];
    expect(report.mappings).toEqual([
      { clo_title: "Child", plo_title: "Parent", weight: 1 },
    ]);
    expect(report.grades[0]).toMatchObject({ avg: 75, count: 1 });
    expect(report.attainment).toEqual([
      { clo_title: "Child", avg_percent: 70, count: 1 },
    ]);
    expect(report.cqi).toHaveLength(1);
    expect(report.cqi[0]?.actions).toBe("Scoped action");
    expect(trace.some((q) => q.table === "journal_entries")).toBe(false);
    expect(
      trace.filter((q) => q.limit).every((q) => q.limit === MAX_ROWS + 1)
    ).toBe(true);
  });
  it.each([
    null,
    { ...actor, role: "teacher" },
    { ...actor, role: "student" },
    { ...actor, role: "parent" },
    { ...actor, is_active: false },
    { ...actor, institution_id: "" },
  ])(
    "denies unauthenticated/inactive/wrong role before reads: %j",
    async (user) => {
      const { deps, trace, render } = setup({ actor: user });
      expect((await handleCourseFile(request(), deps)).status).toBe(
        user ? 403 : 401
      );
      expect(trace).toHaveLength(0);
      expect(render).not.toHaveBeenCalled();
    }
  );
  it.each([
    { ...actor, institution_id: "foreign" },
    { ...actor, id: "other-coordinator" },
  ])("denies cross-tenant and unassigned coordinator: %j", async (user) => {
    const { deps, trace, render } = setup({ actor: user });
    expect((await handleCourseFile(request(), deps)).status).toBe(403);
    expect(trace).toHaveLength(2);
    expect(render).not.toHaveBeenCalled();
  });
  it("allows same-tenant admin even when not coordinator owner", async () => {
    const { deps } = setup({ actor: { ...actor, id: "admin", role: "admin" } });
    expect((await handleCourseFile(request(), deps)).status).toBe(200);
  });
  it.each([null, "other-term"])(
    "rejects null/mismatched course semester: %j",
    async (semester) => {
      const { deps, trace } = setup({
        fixtures: {
          courses: [
            { id: courseId, program_id: "program", semester_id: semester },
          ],
        },
      });
      const response = await handleCourseFile(request(), deps);
      expect(response.status).toBe(400);
      expect((await response.json()).code).toBe("SEMESTER_MISMATCH");
      expect(trace).toHaveLength(3);
    }
  );
  it("rejects a foreign-tenant semester", async () => {
    const { deps } = setup({
      fixtures: { semesters: [{ id: semesterId, institution_id: "foreign" }] },
    });
    expect((await handleCourseFile(request(), deps)).status).toBe(400);
  });
  it.each([null, [], {}, { course_id: "not-uuid", semester_id: semesterId }])(
    "rejects malformed payload %j",
    async (payload) => {
      const { deps, trace } = setup();
      expect((await handleCourseFile(request(payload), deps)).status).toBe(400);
      expect(trace).toHaveLength(0);
    }
  );
  it("handles invalid JSON and methods without a false 500", async () => {
    const { deps } = setup();
    expect(
      (
        await handleCourseFile(
          new Request("https://test", { method: "POST", body: "{" }),
          deps
        )
      ).status
    ).toBe(400);
    expect(
      (await handleCourseFile(new Request("https://test"), deps)).status
    ).toBe(405);
  });
  it.each(Array.from({ length: 11 }, (_, i) => i + 1))(
    "propagates query %i failure without rendering partial data or leaking internals",
    async (failAt) => {
      const { deps, render } = setup({ failAt });
      const response = await handleCourseFile(request(), deps);
      expect(response.status).toBe(503);
      expect(await response.text()).not.toContain("SECRET");
      expect(render).not.toHaveBeenCalled();
    }
  );
  it("refuses server-truncated and oversized populations", async () => {
    for (const countOverride of [2, MAX_ROWS + 1]) {
      const { deps, render } = setup({ countOverride });
      expect((await handleCourseFile(request(), deps)).status).toBe(
        countOverride > MAX_ROWS ? 422 : 503
      );
      expect(render).not.toHaveBeenCalled();
    }
  });
  it("rejects missing courses without reading academic tables", async () => {
    const { deps, trace } = setup({ fixtures: { courses: [] } });
    expect((await handleCourseFile(request(), deps)).status).toBe(403);
    expect(trace).toHaveLength(1);
  });
  it("rejects oversized generated bytes instead of delivering a partial PDF", async () => {
    const { deps } = setup();
    deps.render = () => new Uint8Array(5 * 1024 * 1024 + 1);
    const response = await handleCourseFile(request(), deps);
    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({ code: "REPORT_TOO_LARGE" });
  });
  it("fails authentication errors before constructing a data client", async () => {
    const { deps } = setup();
    deps.authenticate = async () => ({
      user: actor,
      error: "profile read failed",
    });
    expect((await handleCourseFile(request(), deps)).status).toBe(401);
    expect(deps.database).not.toHaveBeenCalled();
  });
  it("sanitizes unexpected rendering errors", async () => {
    const { deps } = setup({ renderError: true });
    const response = await handleCourseFile(request(), deps);
    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({ code: "GENERATION_FAILED" });
  });
});
