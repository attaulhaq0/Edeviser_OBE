import { describe, expect, it } from "vitest";

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
              coordinator_id: null,
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
    const studentContext: AgentExecutionContext = {
      ...teacherContext(),
      specialist: "tutor",
      identity: {
        userId: ids.student,
        role: "student",
        institutionId: ids.institution,
      },
    };
    await expect(
      dataSource.authorizeScope(
        "get_student_learning_context",
        { studentId: ids.student },
        studentContext
      )
    ).resolves.toBe(true);
  });
});
