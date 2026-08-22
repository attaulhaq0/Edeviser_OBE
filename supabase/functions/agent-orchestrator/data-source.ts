import type { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import type { EmbeddingProvider } from "../_shared/ai/embedding.ts";
import type {
  AgentActionProposal,
  AgentExecutionContext,
  AgentIdentity,
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
import type { CurrentExecutionAuthorizer } from "../_shared/ai/write-tools/execution.ts";

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
  implements ToolDataSource, ProposalAuthorizer, CurrentExecutionAuthorizer
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
        .eq("is_active", true)
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
        return context.identity.role === "parent" && studentId
          ? {
              studentId,
              courseId,
              programId,
              requiredApproverUserId: context.identity.userId,
            }
          : null;
    }
  }

  async authorizeCurrentScope(
    proposal: AgentActionProposal,
    approver: AgentIdentity
  ): Promise<boolean> {
    if (
      approver.userId !== proposal.requiredApproverUserId ||
      approver.role !== proposal.requiredApproverRole ||
      approver.institutionId !== proposal.institutionId ||
      approver.role !== "student" ||
      proposal.studentId !== approver.userId
    ) {
      return false;
    }
    if (proposal.actionType === "create_goal") return true;
    if (
      proposal.actionType !== "create_planner_session" ||
      !proposal.courseId ||
      proposal.payload.courseId !== proposal.courseId
    ) {
      return false;
    }
    const { data: enrollment, error: enrollmentError } = await this.admin
      .from("student_courses")
      .select("course_id")
      .eq("student_id", approver.userId)
      .eq("course_id", proposal.courseId)
      .eq("status", "active")
      .maybeSingle();
    if (enrollmentError) {
      throw new Error("Current execution authorization failed");
    }
    if (!enrollment) return false;
    const { data: course, error: courseError } = await this.admin
      .from("courses")
      .select("id,programs!inner(institution_id)")
      .eq("id", proposal.courseId)
      .eq("programs.institution_id", approver.institutionId)
      .maybeSingle();
    if (courseError) {
      throw new Error("Current execution authorization failed");
    }
    return Boolean(course);
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
    if (tool === "get_intervention_effects") {
      if (context.identity.role === "admin") return true;
      if (context.identity.role === "coordinator") {
        return Boolean(
          programId && (await this.programScope(programId, context))
        );
      }
      if (context.identity.role === "teacher") {
        return Boolean(courseId && (await this.courseScope(courseId, context)));
      }
      return Boolean(
        studentId && (await this.studentScope(studentId, context, courseId))
      );
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
    if (
      tool === "get_institution_ilos" ||
      tool === "get_outcome_hierarchy_health"
    ) {
      return context.identity.role === "admin";
    }
    if (
      tool === "get_ilo_detail" ||
      tool === "get_ilo_attainment" ||
      tool === "get_ilo_attainment_trend" ||
      tool === "get_ilo_mapping_coverage" ||
      tool === "get_ilo_program_contributions" ||
      tool === "get_ilo_evidence_summary" ||
      tool === "get_unmapped_program_outcomes"
    ) {
      const iloId = stringInput(input, "iloId");
      if (context.identity.role === "coordinator") {
        // Fail-closed: coordinators MUST scope every ILO read to one of their
        // own programs; institution-wide ILO reads are admin-only.
        if (!programId || !(await this.programScope(programId, context))) {
          return false;
        }
        if (iloId && !(await this.iloInInstitution(iloId, context))) {
          return false;
        }
        return true;
      }
      if (context.identity.role !== "admin") return false;
      if (iloId && !(await this.iloInInstitution(iloId, context))) {
        return false;
      }
      if (programId && !(await this.programScope(programId, context))) {
        return false;
      }
      return true;
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
    const iloId = stringInput(input, "iloId");
    switch (tool) {
      case "get_student_learning_context": {
        const { data: needsRefresh, error: freshnessError } =
          await this.admin.rpc("student_learning_state_needs_refresh_v1", {
            p_student_id: studentId!,
          });
        if (freshnessError)
          throw new Error("Learning State freshness check failed");
        if (needsRefresh !== false) {
          const { error: refreshError } = await this.admin.rpc(
            "refresh_student_learning_state_v1",
            { p_student_id: studentId! }
          );
          if (refreshError) {
            throw new Error("Learning State refresh failed");
          }
        }
        const { data, error } = await this.reader.rpc(
          "get_student_learning_state_v1",
          {
            p_student_id: studentId!,
            p_course_id: courseId ?? null,
            p_program_id: programId ?? null,
          }
        );
        return {
          studentId,
          courseId: courseId ?? null,
          learningState: safeData(data, error),
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
        const firstVector = embedded.vectors[0];
        if (
          !firstVector ||
          firstVector.length === 0 ||
          firstVector.some((value) => !Number.isFinite(value))
        ) {
          throw new Error("Authorized embedding read returned invalid output");
        }
        const vector = `[${firstVector.join(",")}]`;
        const searchRpc =
          this.embeddings.metadata.version === 3
            ? "search_course_materials_v3"
            : "search_course_materials_v2";
        const { data, error } = await this.reader.rpc(
          searchRpc,
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
      case "get_intervention_effects": {
        const { data, error } = await this.reader.rpc(
          "get_intervention_effects_v1",
          {
            p_student_id: studentId ?? null,
            p_course_id: courseId ?? null,
            p_program_id: programId ?? null,
          }
        );
        return {
          studentId: studentId ?? null,
          effects: safeData(data ?? [], error),
        };
      }
      case "get_institution_ilos": {
        const { data, error } = await this.reader
          .from("learning_outcomes")
          .select("id,title,title_ar,weight,sort_order")
          .eq("type", "ILO")
          .eq("institution_id", context.identity.institutionId)
          .order("sort_order")
          .limit(200);
        return {
          institutionId: context.identity.institutionId,
          ilos: safeData(data ?? [], error),
        };
      }
      case "get_ilo_detail": {
        const { data: ilo, error: iloError } = await this.reader
          .from("learning_outcomes")
          .select("id,title,title_ar,description,weight,institution_id")
          .eq("id", iloId!)
          .eq("type", "ILO")
          .maybeSingle();
        const iloRow = safeData(ilo, iloError);
        if (!iloRow) return { iloId, ilo: null, ploMappings: [] };
        const { data: mappings, error: mappingError } = await this.reader
          .from("outcome_mappings")
          .select("source_outcome_id,target_outcome_id,weight")
          .eq("source_outcome_id", iloId!)
          .limit(200);
        const allMappings = safeData(mappings ?? [], mappingError);
        // Program-scoped callers only see mappings whose target PLO belongs
        // to their authorized program.
        const allowedTargets = programId
          ? new Set(await this.scopedIloPloIds(iloId!, programId, context))
          : null;
        return {
          ilo: iloRow,
          ploMappings: allowedTargets
            ? allMappings.filter((m: Record<string, unknown>) =>
                allowedTargets.has(m.target_outcome_id as string)
              )
            : allMappings,
        };
      }
      case "get_ilo_attainment": {
        const ploIds = await this.scopedIloPloIds(iloId!, programId, context);
        if (ploIds.length === 0) {
          return { iloId, derivedFrom: "canonical_plo_mappings", ploAttainment: [] };
        }
        const { data, error } = await this.reader
          .from("outcome_attainment")
          .select(
            "outcome_id,scope,attainment_percent,sample_count,last_calculated_at"
          )
          .in("outcome_id", ploIds)
          .eq("scope", "program")
          .limit(200);
        return {
          iloId,
          derivedFrom: "canonical_plo_mappings",
          ploAttainment: safeData(data ?? [], error),
        };
      }
      case "get_ilo_attainment_trend": {
        const ploIds = await this.scopedIloPloIds(iloId!, programId, context);
        if (ploIds.length === 0) return { iloId, trend: [] };
        const { data, error } = await this.reader
          .from("outcome_attainment")
          .select("outcome_id,attainment_percent,sample_count,last_calculated_at")
          .in("outcome_id", ploIds)
          .eq("scope", "program")
          .order("last_calculated_at", { ascending: true })
          .limit(500);
        return { iloId, trend: safeData(data ?? [], error) };
      }
      case "get_ilo_mapping_coverage": {
        const { data: ilos, error: iloError } = await this.reader
          .from("learning_outcomes")
          .select("id")
          .eq("type", "ILO")
          .eq("institution_id", context.identity.institutionId)
          .limit(200);
        const iloIds = safeData(ilos ?? [], iloError)
          .map((row: Record<string, unknown>) => row.id)
          .filter((id: unknown): id is string => typeof id === "string");
        const { data: mappings, error: mappingError } = iloIds.length
          ? await this.reader
              .from("outcome_mappings")
              .select("source_outcome_id,target_outcome_id")
              .in("source_outcome_id", iloIds)
              .limit(500)
          : { data: [], error: null };
        const mappedPlos = new Set(
          safeData(mappings ?? [], mappingError)
            .map((m: Record<string, unknown>) => m.target_outcome_id)
            .filter((id: unknown): id is string => typeof id === "string")
        );
        let ploQuery = this.reader
          .from("learning_outcomes")
          .select("id,title,program_id")
          .eq("type", "PLO")
          .limit(500);
        ploQuery = programId
          ? ploQuery.eq("program_id", programId)
          : ploQuery.eq("institution_id", context.identity.institutionId);
        const { data: plos, error: ploError } = await ploQuery;
        const ploRows = safeData(plos ?? [], ploError);
        return {
          institutionId: context.identity.institutionId,
          programId: programId ?? null,
          totalPlos: ploRows.length,
          mappedPloCount: ploRows.filter((p: Record<string, unknown>) =>
            mappedPlos.has(p.id as string)
          ).length,
          unmappedPlos: ploRows.filter(
            (p: Record<string, unknown>) => !mappedPlos.has(p.id as string)
          ),
        };
      }
      case "get_ilo_program_contributions": {
        const ploIds = await this.scopedIloPloIds(iloId!, programId, context);
        if (ploIds.length === 0) return { iloId, contributions: [] };
        const { data, error } = await this.reader
          .from("learning_outcomes")
          .select("id,title,program_id")
          .in("id", ploIds)
          .eq("type", "PLO")
          .limit(200);
        return { iloId, contributions: safeData(data ?? [], error) };
      }
      case "get_ilo_evidence_summary": {
        const ploIds = await this.scopedIloPloIds(iloId!, programId, context);
        if (ploIds.length === 0) return { iloId, evidence: [] };
        const { data, error } = await this.reader
          .from("outcome_attainment")
          .select("outcome_id,sample_count,attainment_percent,last_calculated_at")
          .in("outcome_id", ploIds)
          .limit(200);
        return { iloId, evidence: safeData(data ?? [], error) };
      }
      case "get_unmapped_program_outcomes": {
        const { data: plos, error: ploError } = await this.reader
          .from("learning_outcomes")
          .select("id,title,program_id")
          .eq("type", "PLO")
          .eq("program_id", programId!)
          .limit(500);
        const ploRows = safeData(plos ?? [], ploError);
        const ploIds = ploRows
          .map((row: Record<string, unknown>) => row.id)
          .filter((id: unknown): id is string => typeof id === "string");
        if (ploIds.length === 0) return { programId, unmapped: [] };
        const { data: mappings, error: mappingError } = await this.reader
          .from("outcome_mappings")
          .select("target_outcome_id")
          .in("target_outcome_id", ploIds)
          .limit(500);
        const mapped = new Set(
          safeData(mappings ?? [], mappingError)
            .map((m: Record<string, unknown>) => m.target_outcome_id)
            .filter((id: unknown): id is string => typeof id === "string")
        );
        return {
          programId,
          unmapped: ploRows.filter(
            (p: Record<string, unknown>) => !mapped.has(p.id as string)
          ),
        };
      }
      case "get_outcome_hierarchy_health": {
        const { data: outcomes, error: outcomeError } = await this.reader
          .from("learning_outcomes")
          .select("id,type,institution_id,program_id,course_id,weight")
          .eq("institution_id", context.identity.institutionId)
          .limit(500);
        const rows = safeData(outcomes ?? [], outcomeError);
        const ids = rows
          .map((row: Record<string, unknown>) => row.id)
          .filter((id: unknown): id is string => typeof id === "string");
        const { data: mappings, error: mappingError } = ids.length
          ? await this.reader
              .from("outcome_mappings")
              .select("source_outcome_id,target_outcome_id,weight")
              .in("source_outcome_id", ids)
              .limit(1000)
          : { data: [], error: null };
        const mappingRows = safeData(mappings ?? [], mappingError);
        const typeById = new Map(
          rows.map((row: Record<string, unknown>) => [
            row.id as string,
            row.type as string,
          ])
        );
        const allowedPairs = new Set(["ILO>PLO", "PLO>CLO", "CLO>SUB_CLO"]);
        const invalidPairs = mappingRows.filter((m: Record<string, unknown>) => {
          const source = typeById.get(m.source_outcome_id as string);
          const target = typeById.get(m.target_outcome_id as string);
          return !source || !target || !allowedPairs.has(`${source}>${target}`);
        });
        const orphaned = rows
          .filter(
            (row: Record<string, unknown>) =>
              row.type !== "ILO" &&
              !mappingRows.some(
                (m: Record<string, unknown>) =>
                  m.target_outcome_id === row.id
              )
          )
          .map((row: Record<string, unknown>) => row.id);
        return {
          institutionId: context.identity.institutionId,
          outcomeCount: rows.length,
          mappingCount: mappingRows.length,
          invalidPairs,
          orphanedOutcomeIds: orphaned,
        };
      }
    }
  }

  private async iloPloTargetIds(iloId: string): Promise<string[]> {
    const { data, error } = await this.reader
      .from("outcome_mappings")
      .select("target_outcome_id")
      .eq("source_outcome_id", iloId)
      .limit(200);
    return safeData(data ?? [], error)
      .map((m: Record<string, unknown>) => m.target_outcome_id)
      .filter((id: unknown): id is string => typeof id === "string");
  }

  private async iloInInstitution(
    iloId: string,
    context: AgentExecutionContext
  ): Promise<boolean> {
    const { data } = await this.reader
      .from("learning_outcomes")
      .select("id,institution_id")
      .eq("id", iloId)
      .eq("type", "ILO")
      .maybeSingle();
    if (!data) return false;
    return (
      (data as Record<string, unknown>).institution_id ===
      context.identity.institutionId
    );
  }

  /**
   * PLO targets of an ILO restricted to the caller scope: program-scoped
   * callers only receive PLOs of their authorized program; admins receive the
   * full institution-wide target set.
   */
  private async scopedIloPloIds(
    iloId: string,
    programId: string | undefined,
    context: AgentExecutionContext
  ): Promise<string[]> {
    const targets = await this.iloPloTargetIds(iloId);
    if (targets.length === 0) return [];
    let query = this.reader
      .from("learning_outcomes")
      .select("id")
      .eq("type", "PLO")
      .in("id", targets);
    query = programId
      ? query.eq("program_id", programId)
      : query.eq("institution_id", context.identity.institutionId);
    const { data, error } = await query;
    return safeData(data ?? [], error)
      .map((row: Record<string, unknown>) => row.id)
      .filter((id: unknown): id is string => typeof id === "string");
  }
}
