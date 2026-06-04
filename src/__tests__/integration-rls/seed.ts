/**
 * Feature: qa-partner-review-remediation — Req 19 (RLS_Smoke_Test), tasks 5.2
 *
 * Seeding + teardown for the RLS / insert integration smoke suite.
 *
 * This module uses the Supabase **Admin API** (service-role key) to create the
 * minimal real fixtures the RLS cases need, on a Supabase **PREVIEW branch
 * only**. It is *never* imported into the app bundle and is only ever invoked
 * from the integration suite, which itself is gated behind `shouldRunRls()`
 * (see `runner.ts`) so that a developer machine / unit-CI without secrets skips
 * cleanly instead of attempting any live work.
 *
 * Skip-safety contract:
 *   - Importing this module MUST NOT throw and MUST NOT create any client.
 *   - `createClient` and every network call live inside the exported functions,
 *     which are only called when `shouldRunRls()` is true.
 *
 * What gets seeded (Req 19.1):
 *   - One shared institution (`join_mode = 'open'` so the `handle_new_user`
 *     trigger never raises on a non-student role) + a program + a semester.
 *   - One auth user per role (admin, coordinator, teacher, student, parent),
 *     each with a matching `profiles` row whose `role` is upserted to the
 *     correct value (the trigger would otherwise force `student`).
 *   - A SECOND student (`otherStudentId`) that is intentionally NOT enrolled in
 *     the teacher's course — the target for negative nudge / RLS cases.
 *   - A course taught by the seeded teacher, a `course_section`, a
 *     `student_courses` enrollment for the seeded student, and a verified
 *     `parent_student_links` row linking parent → student.
 *
 * Everything is namespaced by a per-run UUID so concurrent runs never collide,
 * and `teardownRlsFixtures` deletes the created auth users (cascading their
 * profiles) plus every fixture row best-effort/idempotently in dependency order.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import type { Database } from "@/types/database";
import { assertNotProduction, readRlsEnv, type RlsEnv } from "./guard";

/** The five application roles the smoke suite seeds and signs in as. */
export type RlsRole =
  | "admin"
  | "coordinator"
  | "teacher"
  | "student"
  | "parent";

/** Ordered list of the seeded roles (one auth user + profile is created each). */
export const RLS_ROLES: readonly RlsRole[] = [
  "admin",
  "coordinator",
  "teacher",
  "student",
  "parent",
] as const;

/**
 * The fully-typed context returned by {@link seedRlsFixtures}. Tests use the
 * ids to build payloads and `emails`/`password` to sign in per role.
 */
export interface SeededCtx {
  /** Per-run UUID used to namespace every fixture (emails, slugs, codes). */
  readonly runId: string;
  /** The plaintext password shared by every seeded user (sign-in). */
  readonly password: string;
  /** Shared institution all fixtures belong to. */
  readonly institutionId: string;
  /** Program owning the seeded course. */
  readonly programId: string;
  /** Semester the seeded course is attached to. */
  readonly semesterId: string;
  /** Course taught by {@link teacherId}. */
  readonly courseId: string;
  /** Section of {@link courseId} the seeded student is enrolled in. */
  readonly sectionId: string;
  /** auth.users / profiles id for the seeded admin. */
  readonly adminId: string;
  /** auth.users / profiles id for the seeded coordinator. */
  readonly coordinatorId: string;
  /** auth.users / profiles id for the seeded teacher (owns {@link courseId}). */
  readonly teacherId: string;
  /** Seeded student, ENROLLED in {@link courseId} (positive cases). */
  readonly studentId: string;
  /** Second student, NOT enrolled in {@link courseId} (negative cases). */
  readonly otherStudentId: string;
  /** Seeded parent, verified-linked to {@link studentId}. */
  readonly parentId: string;
  /** role → namespaced email, used by `signInAs`. */
  readonly emails: Readonly<Record<RlsRole, string>>;
  /** Email of {@link otherStudentId} (kept for completeness / debugging). */
  readonly otherStudentEmail: string;
}

/** Typed service-role admin client (bypasses RLS — service-role key only). */
export type AdminClient = SupabaseClient<Database>;

/** Renders an unknown Supabase/Postgres error into a readable string. */
const describeError = (error: unknown): string => {
  if (error === null || error === undefined) return "unknown error";
  if (error instanceof Error) return error.message;
  if (typeof error === "object") {
    const maybe = error as { message?: unknown; code?: unknown };
    const parts = [maybe.message, maybe.code]
      .filter((p): p is string | number => p !== undefined && p !== null)
      .map(String);
    if (parts.length > 0) return parts.join(" ");
  }
  return String(error);
};

/**
 * Asserts a Supabase result succeeded and returns its non-null `data`. Throws a
 * descriptive error (naming the failing step) so a seeding failure aborts the
 * suite loudly rather than leaving partial state.
 */
const must = <T>(
  result: { data: T | null; error: unknown },
  step: string
): NonNullable<T> => {
  if (result.error || result.data === null || result.data === undefined) {
    throw new Error(
      `[rls-smoke seed] ${step} failed: ${describeError(result.error)}`
    );
  }
  return result.data as NonNullable<T>;
};

/**
 * Builds the typed service-role admin client. Reads the un-prefixed Node env
 * vars (never the `VITE_*` app vars). Throws a clear error if the required
 * secrets are absent — but this is only ever called on the live path, where
 * `shouldRunRls()` has already confirmed they exist.
 */
export const createAdminClient = (env: RlsEnv = readRlsEnv()): AdminClient => {
  if (!env.supabaseUrl || !env.supabaseServiceRoleKey) {
    throw new Error(
      "[rls-smoke seed] createAdminClient requires SUPABASE_URL and " +
        "SUPABASE_SERVICE_ROLE_KEY. This should only be called on the live " +
        "(preview) path guarded by shouldRunRls()."
    );
  }
  return createClient<Database>(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
};

/**
 * Creates one auth user (email pre-confirmed) and upserts its `profiles` row to
 * the correct role/status. The `handle_new_user` trigger always inserts a
 * baseline profile (forcing `role = 'student'` for non-invited sign-ups), so we
 * upsert afterward to pin the intended role — the service-role client bypasses
 * RLS, making this safe.
 */
const createSeededUser = async (
  admin: AdminClient,
  params: {
    role: RlsRole;
    email: string;
    password: string;
    fullName: string;
    institutionId: string;
  }
): Promise<string> => {
  const { data, error } = await admin.auth.admin.createUser({
    email: params.email,
    password: params.password,
    email_confirm: true,
    user_metadata: {
      full_name: params.fullName,
      institution_id: params.institutionId,
    },
  });
  if (error || !data.user) {
    throw new Error(
      `[rls-smoke seed] createUser(${params.role}) failed: ${describeError(
        error
      )}`
    );
  }
  const userId = data.user.id;

  const upsert = await admin
    .from("profiles")
    .upsert(
      {
        id: userId,
        email: params.email,
        full_name: params.fullName,
        role: params.role,
        institution_id: params.institutionId,
        status: "active",
        is_active: true,
      },
      { onConflict: "id" }
    )
    .select("id")
    .single();
  must(upsert, `profiles upsert (${params.role})`);

  return userId;
};

/**
 * Seeds the full fixture graph and returns a {@link SeededCtx}. Only call this
 * on the live (preview) path — it performs real Admin-API writes. A failure at
 * any step throws (aborting the suite) rather than returning partial state.
 */
export const seedRlsFixtures = async (
  env: RlsEnv = readRlsEnv()
): Promise<SeededCtx> => {
  // HARD production guard before ANY write: never seed against production, even
  // if a caller reaches this path with a misconfigured URL (Req 19 safety).
  assertNotProduction(env);
  const admin = createAdminClient(env);
  const runId = randomUUID();
  const password = `Rls!${runId}-aA9`;
  const email = (role: string): string =>
    `rls-smoke+${role}+${runId}@example.test`;

  // 1. Shared institution (open join_mode keeps the new-user trigger happy).
  const institution = must<{ id: string }>(
    await admin
      .from("institutions")
      .insert({
        name: `RLS Smoke Institution ${runId}`,
        slug: `rls-smoke-${runId}`,
        join_mode: "open",
      })
      .select("id")
      .single(),
    "institutions insert"
  );
  const institutionId = institution.id;

  // 2. One auth user + profile per role (correct role pinned via upsert).
  const ids = {} as Record<RlsRole, string>;
  const emails = {} as Record<RlsRole, string>;
  for (const role of RLS_ROLES) {
    const roleEmail = email(role);
    emails[role] = roleEmail;
    ids[role] = await createSeededUser(admin, {
      role,
      email: roleEmail,
      password,
      fullName: `RLS Smoke ${role}`,
      institutionId,
    });
  }

  // 3. A second student that is NOT enrolled (negative nudge / RLS target).
  const otherStudentEmail = email("student2");
  const otherStudentId = await createSeededUser(admin, {
    role: "student",
    email: otherStudentEmail,
    password,
    fullName: "RLS Smoke student2",
    institutionId,
  });

  // 4. Program + semester the course hangs off.
  const program = must<{ id: string }>(
    await admin
      .from("programs")
      .insert({
        name: `RLS Smoke Program ${runId}`,
        code: `RLS-P-${runId.slice(0, 8)}`,
        institution_id: institutionId,
      })
      .select("id")
      .single(),
    "programs insert"
  );
  const programId = program.id;

  const semester = must<{ id: string }>(
    await admin
      .from("semesters")
      .insert({
        name: `RLS Smoke Semester ${runId}`,
        code: `RLS-S-${runId.slice(0, 8)}`,
        institution_id: institutionId,
        start_date: "2025-01-01",
        end_date: "2025-06-30",
      })
      .select("id")
      .single(),
    "semesters insert"
  );
  const semesterId = semester.id;

  // 5. Course taught by the seeded teacher.
  const course = must<{ id: string }>(
    await admin
      .from("courses")
      .insert({
        name: `RLS Smoke Course ${runId}`,
        code: `RLS-C-${runId.slice(0, 8)}`,
        academic_year: "2025",
        semester: "Spring 2025",
        semester_id: semesterId,
        program_id: programId,
        teacher_id: ids.teacher,
      })
      .select("id")
      .single(),
    "courses insert"
  );
  const courseId = course.id;

  // 6. Section of that course, taught by the same teacher.
  const section = must<{ id: string }>(
    await admin
      .from("course_sections")
      .insert({
        course_id: courseId,
        section_code: `SEC-${runId.slice(0, 8)}`,
        teacher_id: ids.teacher,
      })
      .select("id")
      .single(),
    "course_sections insert"
  );
  const sectionId = section.id;

  // 7. Enroll the (primary) student in the course + section.
  must(
    await admin
      .from("student_courses")
      .insert({
        course_id: courseId,
        student_id: ids.student,
        section_id: sectionId,
        status: "active",
      })
      .select("id")
      .single(),
    "student_courses insert"
  );

  // 8. Verified parent → student link.
  must(
    await admin
      .from("parent_student_links")
      .insert({
        parent_id: ids.parent,
        student_id: ids.student,
        relationship: "parent",
        verified: true,
      })
      .select("id")
      .single(),
    "parent_student_links insert"
  );

  return {
    runId,
    password,
    institutionId,
    programId,
    semesterId,
    courseId,
    sectionId,
    adminId: ids.admin,
    coordinatorId: ids.coordinator,
    teacherId: ids.teacher,
    studentId: ids.student,
    otherStudentId,
    parentId: ids.parent,
    emails,
    otherStudentEmail,
  };
};

/** Runs a teardown step best-effort, warning (never throwing) on failure. */
const bestEffort = async (
  label: string,
  op: PromiseLike<unknown>
): Promise<void> => {
  try {
    await op;
  } catch (error) {
    // Teardown is idempotent/best-effort: a missing row or already-deleted user
    // is fine. Warn (don't swallow silently) but never fail the suite here.
    console.warn(
      `[rls-smoke teardown] ${label} skipped: ${describeError(error)}`
    );
  }
};

/**
 * Best-effort, idempotent teardown of everything {@link seedRlsFixtures}
 * created. Deletes fixture rows in dependency order first, then the auth users
 * (which cascade their `profiles`), then the institution. Safe to call even if
 * seeding only partially completed.
 */
export const teardownRlsFixtures = async (
  ctx: SeededCtx,
  env: RlsEnv = readRlsEnv()
): Promise<void> => {
  // Guard the teardown path too — deletes are writes and must never hit prod.
  assertNotProduction(env);
  const admin = createAdminClient(env);

  // Dependency order: links/enrollment → section → course → semester → program.
  await bestEffort(
    "parent_student_links",
    admin.from("parent_student_links").delete().eq("parent_id", ctx.parentId)
  );
  await bestEffort(
    "student_courses",
    admin.from("student_courses").delete().eq("course_id", ctx.courseId)
  );
  await bestEffort(
    "course_sections",
    admin.from("course_sections").delete().eq("course_id", ctx.courseId)
  );
  await bestEffort(
    "courses",
    admin.from("courses").delete().eq("id", ctx.courseId)
  );
  await bestEffort(
    "semesters",
    admin.from("semesters").delete().eq("id", ctx.semesterId)
  );
  await bestEffort(
    "programs",
    admin.from("programs").delete().eq("id", ctx.programId)
  );

  // Auth users (cascades their profiles). Includes the un-enrolled student.
  const userIds = [
    ctx.adminId,
    ctx.coordinatorId,
    ctx.teacherId,
    ctx.studentId,
    ctx.otherStudentId,
    ctx.parentId,
  ];
  for (const id of userIds) {
    await bestEffort(
      `auth.admin.deleteUser(${id})`,
      admin.auth.admin.deleteUser(id)
    );
  }

  // In case profiles did not cascade, remove them explicitly, then the inst.
  await bestEffort(
    "profiles (residual)",
    admin.from("profiles").delete().in("id", userIds)
  );
  await bestEffort(
    "institutions",
    admin.from("institutions").delete().eq("id", ctx.institutionId)
  );
};
