import type { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import type { EmbeddingProvider } from "../_shared/ai/embedding.ts";
import type {
  AgentExecutionContext,
  AuthenticatedRole,
} from "../_shared/ai/contracts.ts";
import type {
  AuthorizedProposalScope,
  ProposalAuthorizer,
  ProposalRequest,
} from "../_shared/ai/proposals.ts";
import type {
  ReadToolName,
  ToolDataSource,
} from "../_shared/ai/tools/registry.ts";

type LooseTable = {
  Row: Record<string, unknown>;
  Insert: Record<string, unknown>;
  Update: Record<string, unknown>;
  Relationships: [];
};
type LooseDatabase = {
  public: {
    Tables: Record<string, LooseTable>;
    Views: Record<string, LooseTable>;
    Functions: Record<
      string,
      { Args: Record<string, unknown>; Returns: unknown }
    >;
  };
};
type AdminClient = ReturnType<typeof createClient<LooseDatabase>>;

const stringInput = (
  input: Readonly<Record<string, unknown>>,
  name: string
): string | undefined =>
  typeof input[name] === "string" ? input[name] : undefined;

const safeData = <T>(data: T | null, error: { message: string } | null): T => {
  if (error) throw new Error("Authorized data read failed");
  if (data === null) throw new Error("Authorized data was not found");
  return data;
};

interface AuthorizedCourse {
  teacherId?: string;
  programId: string;
}

interface AuthorizedProgram {
  coordinatorId?: string;
}

export class SupabaseToolDataSource
  implements ToolDataSource, ProposalAuthorizer
{
  constructor(
    private readonly admin: AdminClient,
    private readonly embeddings: EmbeddingProvider,
    private readonly reader: AdminClient
  ) {}

  private async authorizedCourse(
    courseId: string,
    context: AgentExecutionContext
  ): Promise<AuthorizedCourse | null> {
    const { data: course } = await this.admin
      .from("courses")
      .select(
        "id,teacher_id,program_id,programs!inner(institution_id,coordinator_id)"
      )
      .eq("id", courseId)
      .maybeSingle();
    if (!course) return null;
    const courseRow = course as Record<string, unknown>;
    const programValue = courseRow.programs;
    const program = Array.isArray(programValue)
      ? programValue[0]
      : programValue;
    if (
      !program ||
      typeof program !== "object" ||
      (program as Record<string, unknown>).institution_id !==
        context.identity.institutionId
    ) {
      return null;
    }
    const teacherId =
      typeof courseRow.teacher_id === "string"
        ? courseRow.teacher_id
        : undefined;
    const programId = courseRow.program_id;
    if (typeof programId !== "string") {
      return null;
    }
    let authorized = false;
    switch (context.identity.role) {
      case "student": {
        const { data } = await this.admin
          .from("student_courses")
          .select("student_id")
          .eq("student_id", context.identity.userId)
          .eq("course_id", courseId)
          .eq("status", "active")
          .maybeSingle();
        authorized = Boolean(data);
        break;
      }
      case "teacher":
        authorized = teacherId === context.identity.userId;
        break;
      case "coordinator":
        authorized =
          (program as Record<string, unknown>).coordinator_id ===
          context.identity.userId;
        break;
      case "admin":
        authorized = true;
        break;
      case "parent":
        authorized = false;
        break;
    }
    return authorized ? { teacherId, programId } : null;
  }

  private async courseScope(
    courseId: string,
    context: AgentExecutionContext
  ): Promise<boolean> {
    return Boolean(await this.authorizedCourse(courseId, context));
  }

  private async studentScope(
    studentId: string,
    context: AgentExecutionContext,
    courseId = context.page.courseId
  ): Promise<boolean> {
    if (context.identity.role === "student") {
      return studentId === context.identity.userId;
    }
    if (context.identity.role === "parent") {
      const { data } = await this.admin
        .from("parent_student_links")
        .select("student_id")
        .eq("parent_id", context.identity.userId)
        .eq("student_id", studentId)
        .eq("verified", true)
        .maybeSingle();
      if (!data) return false;
      const { data: student } = await this.admin
        .from("profiles")
        .select("id")
        .eq("id", studentId)
        .eq("institution_id", context.identity.institutionId)
        .eq("status", "active")
        .maybeSingle();
      return Boolean(student);
    }
    if (!courseId || !(await this.courseScope(courseId, context))) return false;
    const { data } = await this.admin
      .from("student_courses")
      .select("student_id")
      .eq("student_id", studentId)
      .eq("course_id", courseId)
      .eq("status", "active")
      .maybeSingle();
    return Boolean(data);
  }

  private async authorizedProgram(
    programId: string,
    context: AgentExecutionContext
  ): Promise<AuthorizedProgram | null> {
    const { data } = await this.admin
      .from("programs")
      .select("id,institution_id,coordinator_id")
      .eq("id", programId)
      .eq("institution_id", context.identity.institutionId)
      .maybeSingle();
    if (!data) return null;
    const coordinatorValue = (data as Record<string, unknown>).coordinator_id;
    const coordinatorId =
      typeof coordinatorValue === "string" ? coordinatorValue : undefined;
    if (context.identity.role === "admin") return { coordinatorId };
    return context.identity.role === "coordinator" &&
      coordinatorId === context.identity.userId
      ? { coordinatorId }
      : null;
  }

  private async programScope(
    programId: string,
    context: AgentExecutionContext
  ): Promise<boolean> {
    return Boolean(await this.authorizedProgram(programId, context));
  }

  async authorizeProposal(
    request: ProposalRequest,
    context: AgentExecutionContext,
    approverRole: AuthenticatedRole
  ): Promise<AuthorizedProposalScope | null> {
    const studentId = request.studentId ?? context.page.studentId;
    const courseId = request.courseId ?? context.page.courseId;
    const programId = request.programId ?? context.page.programId;
    const course = courseId
      ? await this.authorizedCourse(courseId, context)
      : null;
    const program = programId
      ? await this.authorizedProgram(programId, context)
      : null;

    if (courseId && !course) return null;
    if (programId && !program && course?.programId !== programId) return null;
    if (course && programId && course.programId !== programId) return null;
    if (studentId && !(await this.studentScope(studentId, context, courseId))) {
      return null;
    }

    switch (approverRole) {
      case "student":
        return studentId
          ? {
              studentId,
              courseId,
              programId,
              requiredApproverUserId: studentId,
            }
          : null;
      case "teacher":
        return course?.teacherId
          ? {
              studentId,
              courseId,
              programId: programId ?? course.programId,
              requiredApproverUserId: course.teacherId,
            }
          : null;
      case "coordinator":
        return program?.coordinatorId
          ? {
              studentId,
              courseId,
              programId,
              requiredApproverUserId: program.coordinatorId,
            }
          : null;
      case "admin":
        return context.identity.role === "admin"
          ? {
              studentId,
              courseId,
              programId,
              requiredApproverUserId: context.identity.userId,
            }
          : null;
      case "parent":
        return null;
    }
  }

  async authorizeScope(
    tool: ReadToolName,
    input: Readonly<Record<string, unknown>>,
    context: AgentExecutionContext
  ): Promise<boolean> {
    const courseId = stringInput(input, "courseId") ?? context.page.courseId;
    const studentId = stringInput(input, "studentId") ?? context.page.studentId;
    const programId = stringInput(input, "programId") ?? context.page.programId;
    if (tool === "get_admin_institution_context") {
      return context.identity.role === "admin";
    }
    if (tool === "get_parent_child_progress") {
      return Boolean(
        studentId && (await this.studentScope(studentId, context))
      );
    }
    if (tool === "get_habit_context") {
      return Boolean(
        studentId &&
          context.identity.role === "student" &&
          studentId === context.identity.userId
      );
    }
    if (tool === "get_coordinator_outcome_context") {
      return Boolean(
        programId && (await this.programScope(programId, context))
      );
    }
    if (studentId && !(await this.studentScope(studentId, context, courseId)))
      return false;
    if (courseId) return this.courseScope(courseId, context);
    return tool === "get_student_learning_context" && Boolean(studentId);
  }

  async executeRead(
    tool: ReadToolName,
    input: Readonly<Record<string, unknown>>,
    context: AgentExecutionContext
  ): Promise<unknown> {
    const courseId = stringInput(input, "courseId") ?? context.page.courseId;
    const studentId = stringInput(input, "studentId") ?? context.page.studentId;
    const programId = stringInput(input, "programId") ?? context.page.programId;
    switch (tool) {
      case "get_student_learning_context": {
        let query = this.reader
          .from("outcome_attainment")
          .select("outcome_id,course_id,attainment_percent,last_calculated_at")
          .eq("student_id", studentId!)
          .order("last_calculated_at", { ascending: false })
          .limit(50);
        if (courseId) query = query.eq("course_id", courseId);
        const { data, error } = await query;
        return {
          studentId,
          courseId: courseId ?? null,
          attainment: safeData(data ?? [], error),
        };
      }
      case "get_course_mastery": {
        let query = this.reader
          .from("outcome_attainment")
          .select("student_id,outcome_id,attainment_percent,last_calculated_at")
          .eq("course_id", courseId!)
          .order("last_calculated_at", { ascending: false })
          .limit(100);
        if (studentId) query = query.eq("student_id", studentId);
        const { data, error } = await query;
        return { courseId, mastery: safeData(data ?? [], error) };
      }
      case "get_outcome_chain": {
        const { data: outcomes, error: outcomeError } = await this.reader
          .from("learning_outcomes")
          .select("id,type,title,course_id,program_id")
          .eq("course_id", courseId!)
          .limit(100);
        const outcomeRows = safeData(outcomes ?? [], outcomeError);
        const sourceIds = outcomeRows
          .map((outcome: Record<string, unknown>) => outcome.id)
          .filter((id: unknown): id is string => typeof id === "string");
        const { data: mappings, error: mappingError } = sourceIds.length
          ? await this.reader
              .from("outcome_mappings")
              .select("source_outcome_id,target_outcome_id,weight")
              .in("source_outcome_id", sourceIds)
              .limit(200)
          : { data: [], error: null };
        return {
          courseId,
          outcomes: outcomeRows,
          mappings: safeData(mappings ?? [], mappingError),
        };
      }
      case "get_habit_context": {
        const { data, error } = await this.reader
          .from("habit_tracking")
          .select(
            "id,is_perfect_day,login,read_content,submit,journal,created_at"
          )
          .eq("student_id", studentId!)
          .order("created_at", { ascending: false })
          .limit(14);
        return { studentId, recentHabits: safeData(data ?? [], error) };
      }
      case "get_at_risk_signals": {
        let enrollmentQuery = this.reader
          .from("student_courses")
          .select("student_id")
          .eq("course_id", courseId!)
          .eq("status", "active")
          .limit(200);
        if (studentId) {
          enrollmentQuery = enrollmentQuery.eq("student_id", studentId);
        }
        const { data: enrollments, error: enrollmentError } =
          await enrollmentQuery;
        const enrolledStudentIds = safeData(enrollments ?? [], enrollmentError)
          .map((enrollment: Record<string, unknown>) => enrollment.student_id)
          .filter((id: unknown): id is string => typeof id === "string");
        if (enrolledStudentIds.length === 0) {
          return { courseId, signals: [] };
        }
        const { data, error } = await this.reader
          .from("ai_feedback")
          .select("id,student_id,suggestion_data,created_at")
          .in("student_id", enrolledStudentIds)
          .eq("suggestion_type", "at_risk_prediction")
          .order("created_at", { ascending: false })
          .limit(50);
        return { courseId, signals: safeData(data ?? [], error) };
      }
      case "search_course_materials": {
        const query = String(input.query);
        const embedded = await this.embeddings.embed({ inputs: [query] });
        const vector = `[${embedded.vectors[0]!.join(",")}]`;
        const { data, error } = await this.reader.rpc(
          "search_course_materials_v2",
          {
            query_embedding: vector,
            match_course_ids: [courseId!],
            match_clo_ids: null,
            match_threshold: 0.7,
            match_count: 5,
          }
        );
        return {
          courseId,
          embedding: embedded.metadata,
          untrustedRetrievedMaterials: safeData(data ?? [], error),
        };
      }
      case "get_assignment_context": {
        const assignmentId = stringInput(input, "assignmentId")!;
        const { data, error } = await this.reader
          .from("assignments")
          .select("id,course_id,title,description,due_date,clo_weights")
          .eq("id", assignmentId)
          .eq("course_id", courseId!)
          .maybeSingle();
        return { assignment: safeData(data, error) };
      }
      case "get_teacher_course_context": {
        const { data: course, error: courseError } = await this.reader
          .from("courses")
          .select("id,name,code,program_id,teacher_id")
          .eq("id", courseId!)
          .maybeSingle();
        const { count, error: countError } = await this.reader
          .from("student_courses")
          .select("student_id", { count: "exact", head: true })
          .eq("course_id", courseId!)
          .eq("status", "active");
        if (countError) throw new Error("Authorized data read failed");
        return {
          course: safeData(course, courseError),
          activeStudentCount: count ?? 0,
        };
      }
      case "get_parent_child_progress": {
        let query = this.reader
          .from("outcome_attainment")
          .select("course_id,outcome_id,attainment_percent,last_calculated_at")
          .eq("student_id", studentId!)
          .order("last_calculated_at", { ascending: false })
          .limit(50);
        if (courseId) query = query.eq("course_id", courseId);
        const { data, error } = await query;
        return { childId: studentId, progress: safeData(data ?? [], error) };
      }
      case "get_coordinator_outcome_context": {
        const { data: courses, error: courseError } = await this.reader
          .from("courses")
          .select("id")
          .eq("program_id", programId!);
        const courseIds = safeData(courses ?? [], courseError)
          .map((course: Record<string, unknown>) => course.id)
          .filter((id: unknown): id is string => typeof id === "string");
        if (courseIds.length === 0) return { programId, outcomes: [] };
        const { data, error } = await this.reader
          .from("learning_outcomes")
          .select("id,type,title,course_id")
          .in("course_id", courseIds)
          .limit(200);
        return { programId, outcomes: safeData(data ?? [], error) };
      }
      case "get_admin_institution_context": {
        const [
          { count: profiles, error: profileError },
          { count: programs, error: programError },
        ] = await Promise.all([
          this.reader
            .from("profiles")
            .select("id", { count: "exact", head: true })
            .eq("institution_id", context.identity.institutionId)
            .eq("is_active", true),
          this.reader
            .from("programs")
            .select("id", { count: "exact", head: true })
            .eq("institution_id", context.identity.institutionId),
        ]);
        if (profileError || programError) {
          throw new Error("Authorized data read failed");
        }
        return {
          institutionId: context.identity.institutionId,
          activeProfileCount: profiles ?? 0,
          programCount: programs ?? 0,
        };
      }
    }
  }
}
