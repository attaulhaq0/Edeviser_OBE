import {
  createClient,
  type SupabaseClient,
  type User,
} from "@supabase/supabase-js";
import { mkdir, rename, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import {
  buildTenantDryRunReport,
  classifyRecord,
  parseTenantOperationArgs,
  projectRefFromSupabaseUrl,
  sanitizeReportValue,
  type InstitutionIdentity,
  type RecordClassification,
  type TenantAuditSnapshot,
  type TenantAuthSummary,
  type TenantOperationOptions,
  type TenantRecordGroup,
  type TenantStorageSummary,
} from "@/lib/tenantOperations";

const directTenantTables = [
  "academic_calendar_events",
  "accreditation_approvals",
  "accreditation_generated_reports",
  "accreditation_report_jobs",
  "ai_assistance_events",
  "ai_governance_policies",
  "audit_logs",
  "badge_definitions",
  "badge_spotlight_schedule",
  "blooms_progression",
  "class_donations",
  "communication_threads",
  "competency_frameworks",
  "coordinator_ai_insights",
  "course_material_embeddings",
  "departments",
  "development_seed_runs",
  "fee_accounts",
  "friendships",
  "graduate_attributes",
  "institution_contacts",
  "institution_settings",
  "invitations",
  "knowledge_quests",
  "learning_outcomes",
  "marketplace_items",
  "mastery_recovery_pathways",
  "onboarding_questions",
  "outcome_attainment_snapshots",
  "profiles",
  "program_accreditations",
  "programs",
  "question_bank",
  "quiz_generation_logs",
  "sale_events",
  "semesters",
  "social_challenges",
  "student_content",
  "student_profiles",
  "surveys",
  "teacher_handoff_requests",
  "teams",
  "tutor_conversations",
  "tutor_llm_logs",
  "tutor_plan_updates",
  "tutor_usage_limits",
  "verified_explanations",
  "xp_events",
  "xp_purchases",
] as const;

const appendOnlyTables = new Set(["audit_logs"]);

interface LiveContext {
  client: SupabaseClient;
  projectRef: string;
  options: TenantOperationOptions;
}

interface CountResult {
  count: number;
  complete: boolean;
}

const safeError = (message: string): Error => new Error(message);

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value)
    throw safeError(`Required process environment variable ${name} is missing`);
  return value;
}

function buildContext(options: TenantOperationOptions): LiveContext {
  // Intentionally do not load .env or .env.local. Operators must provide an
  // explicit, isolated process environment for every run.
  const url = requiredEnvironment("TENANT_OPERATIONS_SUPABASE_URL");
  const serviceKey = requiredEnvironment("TENANT_OPERATIONS_SERVICE_ROLE_KEY");
  const projectRef = projectRefFromSupabaseUrl(url);
  if (!projectRef)
    throw safeError("Supabase URL is not an exact hosted project URL");
  if (projectRef !== options.projectRef)
    throw safeError("Project reference mismatch; operation aborted");
  return {
    client: createClient(url, serviceKey, { auth: { persistSession: false } }),
    projectRef,
    options,
  };
}

function isInstitutionIdentity(value: unknown): value is InstitutionIdentity {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.slug === "string"
  );
}

async function readInstitution(
  context: LiveContext
): Promise<InstitutionIdentity> {
  const { data, error } = await context.client
    .from("institutions")
    .select("id,name,slug")
    .eq("id", context.options.institutionId)
    .maybeSingle();
  if (error) throw safeError("Institution identity query failed");
  if (!isInstitutionIdentity(data))
    throw safeError("Expected institution was not found");
  return data;
}

async function readDirectCount(
  context: LiveContext,
  table: (typeof directTenantTables)[number]
): Promise<CountResult> {
  const { count, error } = await context.client
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq("institution_id", context.options.institutionId);
  if (error || count === null) return { count: 0, complete: false };
  return { count, complete: true };
}

function metadataBoolean(metadata: User["app_metadata"], key: string): boolean {
  return metadata[key] === true;
}

function authClassification(
  user: User,
  expectedSlug: string
): RecordClassification {
  const email = user.email?.toLowerCase() ?? "";
  const domain = email.split("@")[1] ?? "";
  const seedOwned = metadataBoolean(user.app_metadata, "seed_owned");
  const stagingOwned = metadataBoolean(user.app_metadata, "staging_owned");
  const reproducible = metadataBoolean(
    user.app_metadata,
    "reproducible_fixture"
  );
  return classifyRecord({
    seedOwned,
    stagingOwned,
    reproducible,
    testEmailDomain:
      domain === `${expectedSlug}.test` || domain.endsWith(".test"),
    paymentActivity: false,
    manualContent: false,
    uploadedFiles: false,
    recentActivity:
      typeof user.last_sign_in_at === "string" &&
      Date.parse(user.last_sign_in_at) >= Date.now() - 30 * 24 * 60 * 60 * 1000,
  });
}

async function readProfileIds(context: LiveContext): Promise<Set<string>> {
  const { data, error } = await context.client
    .from("profiles")
    .select("id")
    .eq("institution_id", context.options.institutionId);
  if (error || !Array.isArray(data))
    throw safeError("Tenant profile inventory failed");
  return new Set(
    data.flatMap((row: unknown) => {
      if (!row || typeof row !== "object") return [];
      const id = (row as Record<string, unknown>).id;
      return typeof id === "string" ? [id] : [];
    })
  );
}

async function readAuthSummary(
  context: LiveContext,
  profileIds: ReadonlySet<string>
): Promise<TenantAuthSummary> {
  const classifications: Record<RecordClassification, number> = {
    confirmed_seed_demo: 0,
    confirmed_staging_test: 0,
    potentially_real: 0,
    unknown: 0,
  };
  let total = 0;
  let signedInLast30Days = 0;
  let neverSignedIn = 0;
  for (let page = 1; ; page += 1) {
    const { data, error } = await context.client.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error) throw safeError("Auth-user inventory failed");
    for (const user of data.users) {
      if (!profileIds.has(user.id)) continue;
      total += 1;
      classifications[
        authClassification(user, context.options.expectedSlug)
      ] += 1;
      if (!user.last_sign_in_at) neverSignedIn += 1;
      else if (
        Date.parse(user.last_sign_in_at) >=
        Date.now() - 30 * 24 * 60 * 60 * 1000
      ) {
        signedInLast30Days += 1;
      }
    }
    if (data.users.length < 1000) break;
  }
  return {
    total,
    confirmedSeedDemo: classifications.confirmed_seed_demo,
    confirmedStagingTest: classifications.confirmed_staging_test,
    potentiallyReal: classifications.potentially_real,
    unknown: classifications.unknown,
    signedInLast30Days,
    neverSignedIn,
  };
}

interface BucketCounts {
  objects: number;
  recent: number;
  tenantPaths: number;
  unknownPaths: number;
}

async function countBucketPath(
  context: LiveContext,
  bucket: string,
  prefix: string,
  depth: number,
  counts: BucketCounts
): Promise<boolean> {
  if (depth > 8) return false;
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await context.client.storage
      .from(bucket)
      .list(prefix, {
        limit: 1000,
        offset,
        sortBy: { column: "name", order: "asc" },
      });
    if (error || !data) return false;
    for (const entry of data) {
      const fullPath = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.id === null) {
        if (
          !(await countBucketPath(context, bucket, fullPath, depth + 1, counts))
        )
          return false;
        continue;
      }
      counts.objects += 1;
      if (
        entry.created_at &&
        Date.parse(entry.created_at) >= Date.now() - 30 * 24 * 60 * 60 * 1000
      ) {
        counts.recent += 1;
      }
      const tenantPath =
        fullPath.startsWith(`${context.options.expectedSlug}/`) ||
        fullPath.startsWith(`${context.options.institutionId}/`);
      if (tenantPath) counts.tenantPaths += 1;
      else counts.unknownPaths += 1;
    }
    if (data.length < 1000) break;
  }
  return true;
}

async function readStorage(
  context: LiveContext
): Promise<{ summaries: TenantStorageSummary[]; complete: boolean }> {
  const { data: buckets, error } = await context.client.storage.listBuckets();
  if (error || !buckets) return { summaries: [], complete: false };
  const summaries: TenantStorageSummary[] = [];
  let complete = true;
  for (const bucket of [...buckets].sort((left, right) =>
    left.name.localeCompare(right.name)
  )) {
    const counts: BucketCounts = {
      objects: 0,
      recent: 0,
      tenantPaths: 0,
      unknownPaths: 0,
    };
    if (!(await countBucketPath(context, bucket.id, "", 0, counts)))
      complete = false;
    summaries.push({
      bucket: bucket.id,
      objectCount: counts.objects,
      recentObjectCount: counts.recent,
      tenantPathCount: counts.tenantPaths,
      unknownPathCount: counts.unknownPaths,
    });
  }
  return { summaries, complete };
}

async function captureSnapshot(
  context: LiveContext
): Promise<TenantAuditSnapshot> {
  const institution = await readInstitution(context);
  const recordGroups: TenantRecordGroup[] = [];
  let directCountsComplete = true;
  for (const table of directTenantTables) {
    const result = await readDirectCount(context, table);
    if (!result.complete) directCountsComplete = false;
    recordGroups.push({
      name: table,
      count: result.count,
      classification:
        result.count === 0 || table === "development_seed_runs"
          ? "confirmed_seed_demo"
          : "unknown",
      appendOnly: appendOnlyTables.has(table),
    });
  }
  const profileIds = await readProfileIds(context);
  const auth = await readAuthSummary(context, profileIds);
  const storage = await readStorage(context);
  return {
    projectRef: context.projectRef,
    institution,
    recordGroups,
    auth,
    storage: storage.summaries,
    crossTenantReferenceCount: 0,
    // The REST adapter cannot prove every indirect FK path. Keep this false so
    // a future execute remains blocked until the SQL cross-reference scan is attached.
    crossTenantScanComplete: false,
    ownershipScanComplete: directCountsComplete && storage.complete,
    capturedAt: new Date().toISOString(),
  };
}

function resolveOutputPath(outputPath: string): string {
  const root = resolve(process.cwd());
  const target = isAbsolute(outputPath)
    ? resolve(outputPath)
    : resolve(root, outputPath);
  const relativeTarget = relative(root, target);
  if (relativeTarget.startsWith("..") || isAbsolute(relativeTarget)) {
    throw safeError("Output path must remain inside the repository workspace");
  }
  return target;
}

async function writeReportAtomically(
  outputPath: string,
  report: unknown
): Promise<void> {
  await mkdir(dirname(outputPath), { recursive: true });
  const temporaryPath = `${outputPath}.partial`;
  const serialized = `${JSON.stringify(
    sanitizeReportValue(report),
    null,
    2
  )}\n`;
  await writeFile(temporaryPath, serialized, { encoding: "utf8" });
  await rename(temporaryPath, outputPath);
}

async function main(): Promise<void> {
  const options = parseTenantOperationArgs(process.argv.slice(2));
  const context = buildContext(options);
  const snapshot = await captureSnapshot(context);
  const report = buildTenantDryRunReport(options, snapshot);
  const outputPath = resolveOutputPath(options.outputPath);
  await writeReportAtomically(outputPath, report);
  process.stdout.write(
    `${report.verdict}: ${report.blockers.length} blocker(s); report written inside workspace\n`
  );
}

main().catch((error: unknown) => {
  const message =
    error instanceof Error
      ? error.message
      : "Unknown tenant-operations failure";
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
