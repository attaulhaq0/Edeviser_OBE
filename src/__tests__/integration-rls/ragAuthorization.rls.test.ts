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

type Clients = Record<"admin" | "coordinator" | "teacher" | "student", RoleClient>;
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
  let ownEmbeddingId: string;
  let otherEmbeddingId: string;
  let foreignEmbeddingId: string;

  const ownCloId = randomUUID();
  const otherCloId = randomUUID();

  beforeAll(async () => {
    ctx = await seedRlsFixtures();
    admin = createAdminClient();
    const env = readRlsEnv();
    if (!env.supabaseUrl || !env.supabaseAnonKey) {
      throw new Error("RAG RLS test requires preview Supabase URL and anon key");
    }
    anonymous = createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    clients = Object.fromEntries(
      await Promise.all(
        ( ["admin", "coordinator", "teacher", "student"] as const).map(
          async (role) => [role, await signInAs(ctx.emails[role], ctx.password)]
        )
      )
    ) as Clients;

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
    if (otherCourse.error || !otherCourse.data) throw new Error(otherCourse.error?.message);
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
    if (otherSection.error || !otherSection.data) throw new Error(otherSection.error?.message);
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
    if (foreignProgram.error || !foreignProgram.data) throw new Error(foreignProgram.error?.message);
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
    if (foreignCourse.error || !foreignCourse.data) throw new Error(foreignCourse.error?.message);
    foreignCourseId = foreignCourse.data.id;

    const vector = `[${"0,".repeat(1535)}0]`;
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
          clo_ids: [randomUUID()],
          indexing_status: "indexed",
        },
      ])
      .select("id, source_filename");
    if (embeddings.error || !embeddings.data) throw new Error(embeddings.error?.message);
    ownEmbeddingId = embeddings.data.find((row) => row.source_filename.includes("own"))?.id ?? "";
    otherEmbeddingId = embeddings.data.find((row) => row.source_filename.includes("other"))?.id ?? "";
    foreignEmbeddingId = embeddings.data.find((row) => row.source_filename.includes("foreign"))?.id ?? "";
  });

  afterAll(async () => {
    if (!ctx || !admin) return;
    await admin
      .from("course_material_embeddings")
      .delete()
      .in("id", [ownEmbeddingId, otherEmbeddingId, foreignEmbeddingId].filter(Boolean));
    await admin.from("student_courses").delete().eq("course_id", otherCourseId);
    await admin.from("course_sections").delete().eq("id", otherSectionId);
    await admin.from("courses").delete().in("id", [otherCourseId, foreignCourseId].filter(Boolean));
    await admin.from("programs").delete().eq("id", foreignProgramId);
    await admin.from("institutions").delete().eq("id", foreignInstitutionId);
    await teardownRlsFixtures(ctx);
  });

  it("enforces direct REST table scope by role and institution", async () => {
    const [student, teacher, coordinator, administrator] = await Promise.all([
      clients.student.from("course_material_embeddings").select("id").in("course_id", [ctx.courseId, otherCourseId, foreignCourseId]),
      clients.teacher.from("course_material_embeddings").select("id").in("course_id", [ctx.courseId, otherCourseId, foreignCourseId]),
      clients.coordinator.from("course_material_embeddings").select("id").in("course_id", [ctx.courseId, otherCourseId, foreignCourseId]),
      clients.admin.from("course_material_embeddings").select("id").in("course_id", [ctx.courseId, otherCourseId, foreignCourseId]),
    ]);
    expect(student.error).toBeNull();
    expect(student.data?.map((row) => row.id)).toEqual([ownEmbeddingId]);
    expect(teacher.error).toBeNull();
    expect(teacher.data?.map((row) => row.id).sort()).toEqual([ownEmbeddingId, otherEmbeddingId].sort());
    expect(coordinator.error).toBeNull();
    expect(coordinator.data?.map((row) => row.id).sort()).toEqual([ownEmbeddingId, otherEmbeddingId].sort());
    expect(administrator.error).toBeNull();
    expect(administrator.data?.map((row) => row.id).sort()).toEqual([ownEmbeddingId, otherEmbeddingId].sort());
  });

  it("denies anonymous table access and filters forged or mixed RPC course/CLO ids", async () => {
    const directAnon = await anonymous.from("course_material_embeddings").select("id");
    expect(directAnon.error).not.toBeNull();

    const vector = `[${"0,".repeat(1535)}0]`;
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

    const [authorized, unauthorizedCourse, mixedCourses, forgedClo, anonRpc] = await Promise.all([
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
});
