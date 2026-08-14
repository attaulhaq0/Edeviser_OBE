import { describe, expect, it, vi } from "vitest";

import type { AgentExecutionContext } from "../../../supabase/functions/_shared/ai/contracts";
import type { EmbeddingProvider } from "../../../supabase/functions/_shared/ai/embedding";
import { SupabaseToolDataSource } from "../../../supabase/functions/agent-orchestrator/data-source";

const ids = {
  teacher: "11111111-1111-4111-8111-111111111111",
  student: "22222222-2222-4222-8222-222222222222",
  otherStudent: "33333333-3333-4333-8333-333333333333",
  institution: "44444444-4444-4444-8444-444444444444",
  otherInstitution: "55555555-5555-4555-8555-555555555555",
  course: "66666666-6666-4666-8666-666666666666",
  foreignCourse: "77777777-7777-4777-8777-777777777777",
  program: "88888888-8888-4888-8888-888888888888",
  foreignProgram: "99999999-9999-4999-8999-999999999999",
  parent: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  coordinator: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  admin: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
};

type Row = Record<string, unknown>;

class FakeQuery {
  private readonly filters = new Map<string, unknown>();

  constructor(
    private readonly table: string,
    private readonly resolve: (
      table: string,
      filters: ReadonlyMap<string, unknown>
    ) => Row | null
  ) {}

  select(): this {
    return this;
  }

  eq(column: string, value: unknown): this {
    this.filters.set(column, value);
    return this;
  }

  async maybeSingle(): Promise<{ data: Row | null; error: null }> {
    return { data: this.resolve(this.table, this.filters), error: null };
  }
}

class FakeClient {
  from(table: string): FakeQuery {
    return new FakeQuery(table, (name, filters) => {
      if (name === "courses") {
        const courseId = filters.get("id");
        if (courseId === ids.course) {
          return {
            id: ids.course,
            teacher_id: ids.teacher,
            program_id: ids.program,
            programs: {
              institution_id: ids.institution,
              coordinator_id: ids.coordinator,
            },
          };
        }
        if (courseId === ids.foreignCourse) {
          return {
            id: ids.foreignCourse,
            teacher_id: ids.teacher,
            program_id: ids.program,
            programs: {
              institution_id: ids.otherInstitution,
              coordinator_id: null,
            },
          };
        }
      }
      if (
        name === "student_courses" &&
        filters.get("student_id") === ids.student &&
        filters.get("course_id") === ids.course &&
        filters.get("status") === "active"
      ) {
        return { student_id: ids.student };
      }
      if (
        name === "parent_student_links" &&
        filters.get("parent_id") === ids.parent &&
        filters.get("student_id") === ids.student &&
        filters.get("verified") === true
      ) {
        return { student_id: ids.student };
      }
      if (
        name === "profiles" &&
        filters.get("id") === ids.student &&
        filters.get("institution_id") === ids.institution &&
        filters.get("status") === "active"
      ) {
        return { id: ids.student };
      }
      if (
        name === "programs" &&
        filters.get("id") === ids.program &&
        filters.get("institution_id") === ids.institution
      ) {
        return {
          id: ids.program,
          institution_id: ids.institution,
          coordinator_id: ids.coordinator,
        };
      }
      return null;
    });
  }
}

const embeddings: EmbeddingProvider = {
  metadata: {
    provider: "test",
    model: "test",
    dimensions: 384,
    version: 2,
    maxInputTokens: 512,
    languageSupport: "english_only",
  },
  async embed() {
    throw new Error("not used by authorization tests");
  },
};

const client = new FakeClient() as unknown as ConstructorParameters<
  typeof SupabaseToolDataSource
>[0];
const dataSource = new SupabaseToolDataSource(client, embeddings, client);

const teacherContext = (courseId?: string): AgentExecutionContext => ({
  requestId: crypto.randomUUID(),
  runId: crypto.randomUUID(),
  sessionId: crypto.randomUUID(),
  specialist: "teacher",
  identity: {
    userId: ids.teacher,
    role: "teacher",
    institutionId: ids.institution,
  },
  page: {
    route: "/teacher/course",
    studentId: ids.student,
    courseId,
  },
});

const roleContext = (
  role: AgentExecutionContext["identity"]["role"],
  userId: string,
  page: AgentExecutionContext["page"] = { route: `/${role}` }
): AgentExecutionContext => ({
  ...teacherContext(),
  specialist:
    role === "student" ? "tutor" : role === "teacher" ? "teacher" : role,
  identity: { userId, role, institutionId: ids.institution },
  page,
});

describe("Supabase agent scope authorization", () => {
  it("binds a course proposal to the assigned teacher", async () => {
    await expect(
      dataSource.authorizeProposal(
        {
          actionType: "notify_parent",
          payload: {},
          reason: "Review required",
          evidence: [],
          studentId: ids.student,
        },
        teacherContext(ids.course),
        "teacher"
      )
    ).resolves.toMatchObject({
      studentId: ids.student,
      courseId: ids.course,
      requiredApproverUserId: ids.teacher,
    });
  });

  it("rejects foreign-institution and unenrolled-student proposal scopes", async () => {
    await expect(
      dataSource.authorizeProposal(
        {
          actionType: "notify_parent",
          payload: {},
          reason: "Review required",
          evidence: [],
          studentId: ids.student,
        },
        teacherContext(ids.foreignCourse),
        "teacher"
      )
    ).resolves.toBeNull();
    await expect(
      dataSource.authorizeProposal(
        {
          actionType: "notify_parent",
          payload: {},
          reason: "Review required",
          evidence: [],
          studentId: ids.otherStudent,
        },
        teacherContext(ids.course),
        "teacher"
      )
    ).resolves.toBeNull();
  });

  it("authorizes a student's own learning context without a course", async () => {
    const studentContext = roleContext("student", ids.student, {
      route: "/student",
      studentId: ids.student,
    });
    await expect(
      dataSource.authorizeScope(
        "get_student_learning_context",
        { studentId: ids.student },
        studentContext
      )
    ).resolves.toBe(true);
  });

  it("enforces the complete five-role authorization matrix", async () => {
    await expect(
      dataSource.authorizeScope(
        "get_course_mastery",
        { courseId: ids.course, studentId: ids.student },
        roleContext("student", ids.student, {
          route: "/student/course",
          courseId: ids.course,
          studentId: ids.student,
        })
      )
    ).resolves.toBe(true);

    await expect(
      dataSource.authorizeScope(
        "get_teacher_course_context",
        { courseId: ids.course },
        roleContext("teacher", ids.teacher, {
          route: "/teacher/course",
          courseId: ids.course,
        })
      )
    ).resolves.toBe(true);

    const parentContext = roleContext("parent", ids.parent, {
      route: "/parent/child",
      studentId: ids.student,
    });
    await expect(
      dataSource.authorizeScope(
        "get_parent_child_progress",
        { studentId: ids.student },
        parentContext
      )
    ).resolves.toBe(true);
    await expect(
      dataSource.authorizeScope(
        "search_course_materials",
        { courseId: ids.course, query: "private" },
        parentContext
      )
    ).resolves.toBe(false);

    await expect(
      dataSource.authorizeScope(
        "get_coordinator_outcome_context",
        { programId: ids.program },
        roleContext("coordinator", ids.coordinator, {
          route: "/coordinator/program",
          programId: ids.program,
        })
      )
    ).resolves.toBe(true);
    await expect(
      dataSource.authorizeScope(
        "get_coordinator_outcome_context",
        { programId: ids.foreignProgram },
        roleContext("coordinator", ids.coordinator)
      )
    ).resolves.toBe(false);

    await expect(
      dataSource.authorizeScope(
        "get_admin_institution_context",
        {},
        roleContext("admin", ids.admin)
      )
    ).resolves.toBe(true);
  });

  it("rejects an empty embedding result before vector search", async () => {
    const rpc = vi.fn();
    const searchClient = { rpc } as unknown as ConstructorParameters<
      typeof SupabaseToolDataSource
    >[0];
    const emptyEmbeddings: EmbeddingProvider = {
      ...embeddings,
      async embed() {
        return { vectors: [], metadata: embeddings.metadata };
      },
    };
    const searchDataSource = new SupabaseToolDataSource(
      searchClient,
      emptyEmbeddings,
      searchClient
    );
    await expect(
      searchDataSource.executeRead(
        "search_course_materials",
        { query: "authorized query" },
        teacherContext(ids.course)
      )
    ).rejects.toThrow("invalid output");
    expect(rpc).not.toHaveBeenCalled();
  });
});
