/**
 * Feature: ai-tutor-rag, RAG authorization hardening.
 *
 * Runs only against an isolated Supabase preview branch. The fixtures prove
 * both direct table RLS and SECURITY INVOKER RPC filtering for role, course,
 * program, institution, forged CLO, and mixed course-id requests.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import type { Database } from "@/types/database";
import { shouldRunRls, readRlsEnv } from "./guard";
import {
  createAdminClient,
  seedRlsFixtures,
  teardownRlsFixtures,
  type SeededCtx,
} from "./seed";
import { signInAs, type RoleClient } from "./signIn";

type Clients = Record<
  "admin" | "coordinator" | "teacher" | "student" | "parent",
  RoleClient
>;
type AdminClient = SupabaseClient<Database>;

const run = describe.skipIf(!shouldRunRls());

run("course material embedding authorization", () => {
  let ctx: SeededCtx;
  let admin: AdminClient;
  let clients: Clients;
  let anonymous: AdminClient;
  let otherCourseId: string;
  let otherSectionId: string;
  let foreignInstitutionId: string;
  let foreignProgramId: string;
  let foreignCourseId: string;
  let inactiveCourseId: string;
  let inactiveSectionId: string;
  let otherTeacherId: string;
  let otherCoordinatorId: string;
  let otherProgramId: string;
  let otherTeacherCourseId: string;
  let otherTeacherSectionId: string;
  let ownEmbeddingId: string;
  let otherEmbeddingId: string;
  let foreignEmbeddingId: string;
  let otherProgramEmbeddingId: string;

  const ownCloId = randomUUID();
  const otherCloId = randomUUID();
  const foreignCloId = randomUUID();
  const otherProgramCloId = randomUUID();

  beforeAll(async () => {
    ctx = await seedRlsFixtures();
    admin = createAdminClient();
    const env = readRlsEnv();
    if (!env.supabaseUrl || !env.supabaseAnonKey) {
      throw new Error(
        "RAG RLS test requires preview Supabase URL and anon key"
      );
    }
    anonymous = createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    clients = Object.fromEntries(
      await Promise.all(
        (["admin", "coordinator", "teacher", "student", "parent"] as const).map(
          async (role) => [role, await signInAs(ctx.emails[role], ctx.password)]
        )
      )
    ) as Clients;

    const createScopedUser = async (
      role: "teacher" | "coordinator"
    ): Promise<string> => {
      const email = `rag-${role}+${ctx.runId}@example.test`;
      const created = await admin.auth.admin.createUser({
        email,
        password: ctx.password,
        email_confirm: true,
        user_metadata: {
          full_name: `RAG ${role}`,
          institution_id: ctx.institutionId,
        },
      });
      if (created.error || !created.data.user) {
        throw new Error(created.error?.message ?? `create ${role} failed`);
      }
      const profile = await admin.from("profiles").upsert(
        {
          id: created.data.user.id,
          email,
          full_name: `RAG ${role}`,
          role,
          institution_id: ctx.institutionId,
          status: "active",
          is_active: true,
        },
        { onConflict: "id" }
      );
      if (profile.error) throw new Error(profile.error.message);
      return created.data.user.id;
    };

    otherTeacherId = await createScopedUser("teacher");
    otherCoordinatorId = await createScopedUser("coordinator");

    const otherProgram = await admin
      .from("programs")
      .insert({
        name: `RAG Other Coordinator Program ${ctx.runId}`,
        code: `RAG-OC-${ctx.runId.slice(0, 8)}`,
        institution_id: ctx.institutionId,
        coordinator_id: otherCoordinatorId,
      })
      .select("id")
      .single();
    if (otherProgram.error || !otherProgram.data) {
      throw new Error(otherProgram.error?.message);
    }
    otherProgramId = otherProgram.data.id;

    const otherTeacherCourse = await admin
      .from("courses")
      .insert({
        name: `RAG Other Teacher Course ${ctx.runId}`,
        code: `RAG-OT-${ctx.runId.slice(0, 8)}`,
        academic_year: "2025",
        semester: "Spring 2025",
        semester_id: ctx.semesterId,
        program_id: otherProgramId,
        teacher_id: otherTeacherId,
      })
      .select("id")
      .single();
    if (otherTeacherCourse.error || !otherTeacherCourse.data) {
      throw new Error(otherTeacherCourse.error?.message);
    }
    otherTeacherCourseId = otherTeacherCourse.data.id;

    const otherTeacherSection = await admin
      .from("course_sections")
      .insert({
        course_id: otherTeacherCourseId,
        section_code: `RAG-OT-SEC-${ctx.runId.slice(0, 8)}`,
        teacher_id: otherTeacherId,
      })
      .select("id")
      .single();
    if (otherTeacherSection.error || !otherTeacherSection.data) {
      throw new Error(otherTeacherSection.error?.message);
    }
    otherTeacherSectionId = otherTeacherSection.data.id;

    const otherCourse = await admin
      .from("courses")
      .insert({
        name: `RAG Other Student Course ${ctx.runId}`,
        code: `RAG-O-${ctx.runId.slice(0, 8)}`,
        academic_year: "2025",
        semester: "Spring 2025",
        semester_id: ctx.semesterId,
        program_id: ctx.programId,
        teacher_id: ctx.teacherId,
      })
      .select("id")
      .single();
    if (otherCourse.error || !otherCourse.data)
      throw new Error(otherCourse.error?.message);
    otherCourseId = otherCourse.data.id;

    const otherSection = await admin
      .from("course_sections")
      .insert({
        course_id: otherCourseId,
        section_code: `RAG-O-SEC-${ctx.runId.slice(0, 8)}`,
        teacher_id: ctx.teacherId,
      })
      .select("id")
      .single();
    if (otherSection.error || !otherSection.data)
      throw new Error(otherSection.error?.message);
    otherSectionId = otherSection.data.id;
    const enrollment = await admin.from("student_courses").insert({
      course_id: otherCourseId,
      student_id: ctx.otherStudentId,
      section_id: otherSectionId,
      status: "active",
    });
    if (enrollment.error) throw new Error(enrollment.error.message);

    const foreignInstitution = await admin
      .from("institutions")
      .insert({
        name: `RAG Foreign Institution ${ctx.runId}`,
        slug: `rag-foreign-${ctx.runId.slice(0, 8)}`,
        join_mode: "open",
      })
      .select("id")
      .single();
    if (foreignInstitution.error || !foreignInstitution.data) {
      throw new Error(foreignInstitution.error?.message);
    }
    foreignInstitutionId = foreignInstitution.data.id;

    const foreignProgram = await admin
      .from("programs")
      .insert({
        name: `RAG Foreign Program ${ctx.runId}`,
        code: `RAG-F-${ctx.runId.slice(0, 8)}`,
        institution_id: foreignInstitutionId,
        coordinator_id: ctx.coordinatorId,
      })
      .select("id")
      .single();
    if (foreignProgram.error || !foreignProgram.data)
      throw new Error(foreignProgram.error?.message);
    foreignProgramId = foreignProgram.data.id;

    const foreignCourse = await admin
      .from("courses")
      .insert({
        name: `RAG Foreign Course ${ctx.runId}`,
        code: `RAG-FC-${ctx.runId.slice(0, 8)}`,
        academic_year: "2025",
        semester: "Spring 2025",
        semester_id: ctx.semesterId,
        program_id: foreignProgramId,
        teacher_id: ctx.teacherId,
      })
      .select("id")
      .single();
    if (foreignCourse.error || !foreignCourse.data)
      throw new Error(foreignCourse.error?.message);
    foreignCourseId = foreignCourse.data.id;

    const inactiveCourse = await admin
      .from("courses")
      .insert({
        name: `RAG Inactive Course ${ctx.runId}`,
        code: `RAG-I-${ctx.runId.slice(0, 8)}`,
        academic_year: "2025",
        semester: "Spring 2025",
        semester_id: ctx.semesterId,
        program_id: ctx.programId,
        teacher_id: ctx.teacherId,
      })
      .select("id")
      .single();
    if (inactiveCourse.error || !inactiveCourse.data) {
      throw new Error(inactiveCourse.error?.message);
    }
    inactiveCourseId = inactiveCourse.data.id;

    const inactiveSection = await admin
      .from("course_sections")
      .insert({
        course_id: inactiveCourseId,
        section_code: `RAG-I-SEC-${ctx.runId.slice(0, 8)}`,
        teacher_id: ctx.teacherId,
      })
      .select("id")
      .single();
    if (inactiveSection.error || !inactiveSection.data) {
      throw new Error(inactiveSection.error?.message);
    }
    inactiveSectionId = inactiveSection.data.id;

    const inactiveEnrollment = await admin.from("student_courses").insert({
      course_id: inactiveCourseId,
      student_id: ctx.studentId,
      section_id: inactiveSectionId,
      status: "dropped",
    });
    if (inactiveEnrollment.error) {
      throw new Error(inactiveEnrollment.error.message);
    }

    const outcomes = await admin.from("learning_outcomes").insert([
      {
        id: ownCloId,
        institution_id: ctx.institutionId,
        program_id: ctx.programId,
        course_id: ctx.courseId,
        title: `RAG Own CLO ${ctx.runId}`,
        type: "CLO",
        sort_order: 1,
      },
      {
        id: otherCloId,
        institution_id: ctx.institutionId,
        program_id: ctx.programId,
        course_id: otherCourseId,
        title: `RAG Other CLO ${ctx.runId}`,
        type: "CLO",
        sort_order: 1,
      },
      {
        id: foreignCloId,
        institution_id: foreignInstitutionId,
        program_id: foreignProgramId,
        course_id: foreignCourseId,
        title: `RAG Foreign CLO ${ctx.runId}`,
        type: "CLO",
        sort_order: 1,
      },
      {
        id: otherProgramCloId,
        institution_id: ctx.institutionId,
        program_id: otherProgramId,
        course_id: otherTeacherCourseId,
        title: `RAG Other Program CLO ${ctx.runId}`,
        type: "CLO",
        sort_order: 1,
      },
    ]);
    if (outcomes.error) throw new Error(outcomes.error.message);

    const vector = `[1,${"0,".repeat(1534)}0]`;
    const embeddings = await admin
      .from("course_material_embeddings")
      .insert([
        {
          course_id: ctx.courseId,
          institution_id: ctx.institutionId,
          chunk_text: "authorized course material",
          source_filename: `rag-own-${ctx.runId}`,
          material_type: "lecture_notes",
          token_count: 3,
          chunk_index: 0,
          embedding: vector,
          clo_ids: [ownCloId],
          indexing_status: "indexed",
        },
        {
          course_id: otherCourseId,
          institution_id: ctx.institutionId,
          chunk_text: "other student's course material",
          source_filename: `rag-other-${ctx.runId}`,
          material_type: "lecture_notes",
          token_count: 4,
          chunk_index: 0,
          embedding: vector,
          clo_ids: [otherCloId],
          indexing_status: "indexed",
        },
        {
          course_id: foreignCourseId,
          institution_id: foreignInstitutionId,
          chunk_text: "foreign institution material",
          source_filename: `rag-foreign-${ctx.runId}`,
          material_type: "lecture_notes",
          token_count: 4,
          chunk_index: 0,
          embedding: vector,
          clo_ids: [foreignCloId],
          indexing_status: "indexed",
        },
        {
          course_id: otherTeacherCourseId,
          institution_id: ctx.institutionId,
          chunk_text: "other teacher and coordinator program material",
          source_filename: `rag-other-program-${ctx.runId}`,
          material_type: "lecture_notes",
          token_count: 5,
          chunk_index: 0,
          embedding: vector,
          clo_ids: [otherProgramCloId],
          indexing_status: "indexed",
        },
      ])
      .select("id, source_filename");
    if (embeddings.error || !embeddings.data)
      throw new Error(embeddings.error?.message);
    ownEmbeddingId =
      embeddings.data.find((row) => row.source_filename.includes("own"))?.id ??
      "";
    otherEmbeddingId =
      embeddings.data.find((row) => row.source_filename.includes("other"))
        ?.id ?? "";
    foreignEmbeddingId =
      embeddings.data.find((row) => row.source_filename.includes("foreign"))
        ?.id ?? "";
    const otherProgramEmbedding = embeddings.data.find((row) =>
      row.source_filename.includes("other-program")
    );
    if (!otherProgramEmbedding) {
      throw new Error("other-program embedding fixture was not created");
    }
    otherProgramEmbeddingId = otherProgramEmbedding.id;
  });

  afterAll(async () => {
    if (!ctx || !admin) return;
    await admin
      .from("course_material_embeddings")
      .delete()
      .in(
        "id",
        [
          ownEmbeddingId,
          otherEmbeddingId,
          foreignEmbeddingId,
          otherProgramEmbeddingId,
        ].filter(Boolean)
      );
    if (otherCourseId)
      await admin
        .from("student_courses")
        .delete()
        .eq("course_id", otherCourseId);
    if (inactiveCourseId)
      await admin
        .from("student_courses")
        .delete()
        .eq("course_id", inactiveCourseId);
    if (inactiveSectionId)
      await admin.from("course_sections").delete().eq("id", inactiveSectionId);
    if (otherSectionId)
      await admin.from("course_sections").delete().eq("id", otherSectionId);
    if (otherTeacherSectionId)
      await admin
        .from("course_sections")
        .delete()
        .eq("id", otherTeacherSectionId);
    await admin
      .from("learning_outcomes")
      .delete()
      .in("id", [ownCloId, otherCloId, foreignCloId, otherProgramCloId]);
    await admin
      .from("courses")
      .delete()
      .in(
        "id",
        [
          otherCourseId,
          foreignCourseId,
          inactiveCourseId,
          otherTeacherCourseId,
        ].filter(Boolean)
      );
    if (otherProgramId)
      await admin.from("programs").delete().eq("id", otherProgramId);
    if (foreignProgramId)
      await admin.from("programs").delete().eq("id", foreignProgramId);
    if (foreignInstitutionId)
      await admin.from("institutions").delete().eq("id", foreignInstitutionId);
    if (otherTeacherId) await admin.auth.admin.deleteUser(otherTeacherId);
    if (otherCoordinatorId)
      await admin.auth.admin.deleteUser(otherCoordinatorId);
    await teardownRlsFixtures(ctx);
  });

  it("enforces direct REST table scope by role and institution", async () => {
    const [student, teacher, coordinator, administrator, parent] =
      await Promise.all([
        clients.student
          .from("course_material_embeddings")
          .select("id")
          .in("course_id", [
            ctx.courseId,
            otherCourseId,
            foreignCourseId,
            otherTeacherCourseId,
          ]),
        clients.teacher
          .from("course_material_embeddings")
          .select("id")
          .in("course_id", [
            ctx.courseId,
            otherCourseId,
            foreignCourseId,
            otherTeacherCourseId,
          ]),
        clients.coordinator
          .from("course_material_embeddings")
          .select("id")
          .in("course_id", [
            ctx.courseId,
            otherCourseId,
            foreignCourseId,
            otherTeacherCourseId,
          ]),
        clients.admin
          .from("course_material_embeddings")
          .select("id")
          .in("course_id", [
            ctx.courseId,
            otherCourseId,
            foreignCourseId,
            otherTeacherCourseId,
          ]),
        clients.parent
          .from("course_material_embeddings")
          .select("id")
          .in("course_id", [
            ctx.courseId,
            otherCourseId,
            foreignCourseId,
            otherTeacherCourseId,
          ]),
      ]);
    expect(student.error).toBeNull();
    expect(student.data?.map((row) => row.id)).toEqual([ownEmbeddingId]);
    expect(teacher.error).toBeNull();
    expect(teacher.data?.map((row) => row.id).sort()).toEqual(
      [ownEmbeddingId, otherEmbeddingId].sort()
    );
    expect(coordinator.error).toBeNull();
    expect(coordinator.data?.map((row) => row.id).sort()).toEqual(
      [ownEmbeddingId, otherEmbeddingId].sort()
    );
    expect(administrator.error).toBeNull();
    expect(administrator.data?.map((row) => row.id).sort()).toEqual(
      [ownEmbeddingId, otherEmbeddingId, otherProgramEmbeddingId].sort()
    );
    expect(parent.error).toBeNull();
    expect(parent.data).toHaveLength(0);
  });

  it("denies anonymous table access and filters forged or mixed RPC course/CLO ids", async () => {
    const directAnon = await anonymous
      .from("course_material_embeddings")
      .select("id");
    expect(directAnon.error).not.toBeNull();

    const vector = `[1,${"0,".repeat(1534)}0]`;
    const rpc = (
      client: SupabaseClient<Database>,
      courseIds: string[],
      cloIds?: string[]
    ) =>
      client.rpc("search_course_materials", {
        query_embedding: vector,
        match_course_ids: courseIds,
        ...(cloIds ? { match_clo_ids: cloIds } : {}),
        match_threshold: 0,
        match_count: 10,
      });

    const [authorized, unauthorizedCourse, mixedCourses, forgedClo, anonRpc] =
      await Promise.all([
        rpc(clients.student, [ctx.courseId], [ownCloId]),
        rpc(clients.student, [otherCourseId], [otherCloId]),
        rpc(clients.student, [ctx.courseId, otherCourseId, foreignCourseId]),
        rpc(clients.student, [ctx.courseId], [randomUUID()]),
        rpc(anonymous, [ctx.courseId]),
      ]);
    expect(authorized.error).toBeNull();
    expect(authorized.data?.map((row) => row.id)).toEqual([ownEmbeddingId]);
    expect(unauthorizedCourse.error).toBeNull();
    expect(unauthorizedCourse.data).toHaveLength(0);
    expect(mixedCourses.error).toBeNull();
    expect(mixedCourses.data?.map((row) => row.id)).toEqual([ownEmbeddingId]);
    expect(forgedClo.error).toBeNull();
    expect(forgedClo.data).toHaveLength(0);
    expect(anonRpc.error).not.toBeNull();
  });

  it("rejects inconsistent metadata even for the privileged writer", async () => {
    const vector = `[${"0,".repeat(1535)}0]`;
    const wrongInstitution = await admin
      .from("course_material_embeddings")
      .insert({
        course_id: ctx.courseId,
        institution_id: foreignInstitutionId,
        chunk_text: "invalid institution metadata",
        source_filename: `rag-invalid-institution-${ctx.runId}`,
        material_type: "lecture_notes",
        token_count: 3,
        chunk_index: 0,
        embedding: vector,
        clo_ids: [ownCloId],
        indexing_status: "indexed",
      });
    const wrongClo = await admin.from("course_material_embeddings").insert({
      course_id: ctx.courseId,
      institution_id: ctx.institutionId,
      chunk_text: "invalid CLO metadata",
      source_filename: `rag-invalid-clo-${ctx.runId}`,
      material_type: "lecture_notes",
      token_count: 3,
      chunk_index: 0,
      embedding: vector,
      clo_ids: [otherCloId],
      indexing_status: "indexed",
    });
    try {
      expect(wrongInstitution.error).not.toBeNull();
      expect(wrongClo.error).not.toBeNull();
    } finally {
      await admin
        .from("course_material_embeddings")
        .delete()
        .in("source_filename", [
          `rag-invalid-institution-${ctx.runId}`,
          `rag-invalid-clo-${ctx.runId}`,
        ]);
    }
  });

  const invokeFunction = async (
    client: RoleClient,
    functionName: "embed-course-material" | "chat-with-tutor",
    body: Record<string, unknown>
  ): Promise<Response> => {
    const env = readRlsEnv();
    const session = (await client.auth.getSession()).data.session;
    if (!env.supabaseUrl || !env.supabaseAnonKey || !session?.access_token) {
      throw new Error("RAG Edge Function test requires a preview session");
    }
    return fetch(`${env.supabaseUrl}/functions/v1/${functionName}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: env.supabaseAnonKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  };

  it("denies student embedding writes before deletion or insertion", async () => {
    const before = await admin
      .from("course_material_embeddings")
      .select("id")
      .eq("id", otherEmbeddingId)
      .single();
    const response = await invokeFunction(
      clients.student,
      "embed-course-material",
      {
        file_url: "does-not-exist.txt",
        course_id: otherCourseId,
        institution_id: foreignInstitutionId,
        clo_ids: [otherCloId],
        material_type: "lecture_notes",
        source_filename: `rag-other-${ctx.runId}`,
        reindex: true,
      }
    );
    expect(response.status).toBe(403);
    const after = await admin
      .from("course_material_embeddings")
      .select("id")
      .eq("id", otherEmbeddingId)
      .single();
    expect(before.error).toBeNull();
    expect(after.error).toBeNull();
  });

  it("requires active enrollment and in-course CLO scope for tutor RAG", async () => {
    const deniedRequests = [
      { course_id: inactiveCourseId },
      { course_id: foreignCourseId },
      { course_id: ctx.courseId, clo_scope: [randomUUID()] },
    ];
    for (const request of deniedRequests) {
      const response = await invokeFunction(
        clients.student,
        "chat-with-tutor",
        {
          message: "Explain this course outcome.",
          ...request,
        }
      );
      expect(response.status).toBe(403);
    }
  });
});
