import { z } from "zod";

export const PRODUCTION_PROJECT_REF = "cdlgtbvxlxjpcddjazzx";
export const PRODUCTION_EXECUTION_AVAILABLE = false;

export const tenantOperationSchema = z.enum([
  "audit",
  "reset",
  "seed",
  "verify",
]);
export const tenantOperationModeSchema = z.enum(["dry-run", "execute"]);
export const recordClassificationSchema = z.enum([
  "confirmed_seed_demo",
  "confirmed_staging_test",
  "potentially_real",
  "unknown",
]);

export type TenantOperation = z.infer<typeof tenantOperationSchema>;
export type TenantOperationMode = z.infer<typeof tenantOperationModeSchema>;
export type RecordClassification = z.infer<typeof recordClassificationSchema>;

const optionsSchema = z.object({
  projectRef: z
    .string()
    .trim()
    .regex(/^[a-z]{20}$/),
  institutionId: z.string().uuid(),
  expectedName: z.string().trim().min(1),
  expectedSlug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  operation: tenantOperationSchema,
  mode: tenantOperationModeSchema.default("dry-run"),
  runId: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9][A-Za-z0-9._-]{2,127}$/),
  confirmationToken: z.string().trim().optional(),
  confirmInstitutionId: z.string().uuid().optional(),
  outputPath: z.string().trim().min(1),
});

export interface TenantOperationOptions {
  projectRef: string;
  institutionId: string;
  expectedName: string;
  expectedSlug: string;
  operation: TenantOperation;
  mode: TenantOperationMode;
  runId: string;
  confirmationToken?: string;
  /** A deliberately separate, exact target guard required for any deletion. */
  confirmInstitutionId?: string;
  outputPath: string;
}

export interface InstitutionIdentity {
  id: string;
  name: string;
  slug: string;
}

export interface RecordEvidence {
  seedOwned: boolean;
  stagingOwned: boolean;
  reproducible: boolean;
  testEmailDomain: boolean;
  paymentActivity: boolean;
  manualContent: boolean;
  uploadedFiles: boolean;
  recentActivity: boolean;
}

export interface TenantRecordGroup {
  name: string;
  count: number;
  classification: RecordClassification;
  appendOnly?: boolean;
  dependsOn?: readonly string[];
  evidence?: readonly string[];
}

export interface TenantStorageSummary {
  bucket: string;
  objectCount: number;
  recentObjectCount: number;
  tenantPathCount: number;
  unknownPathCount: number;
}

export interface TenantAuthSummary {
  total: number;
  confirmedSeedDemo: number;
  confirmedStagingTest: number;
  potentiallyReal: number;
  unknown: number;
  signedInLast30Days: number;
  neverSignedIn: number;
}

export interface TenantAuditSnapshot {
  projectRef: string;
  institution: InstitutionIdentity;
  recordGroups: readonly TenantRecordGroup[];
  auth: TenantAuthSummary;
  storage: readonly TenantStorageSummary[];
  crossTenantReferenceCount: number;
  crossTenantScanComplete: boolean;
  ownershipScanComplete: boolean;
  capturedAt: string;
}

export interface TenantPlanStep {
  order: number;
  group: string;
  action: "delete" | "retain" | "leave_unchanged" | "block";
  count: number;
  reason: string;
}

export interface TenantDryRunReport {
  schemaVersion: 1;
  runId: string;
  projectRef: string;
  institution: InstitutionIdentity;
  operation: TenantOperation;
  mode: TenantOperationMode;
  capturedAt: string;
  generatedAt: string;
  verdict: "SAFE" | "BLOCKED";
  blockers: readonly string[];
  preOperationCounts: Readonly<Record<string, number>>;
  auth: TenantAuthSummary;
  storage: readonly TenantStorageSummary[];
  crossTenantReferenceCount: number;
  plan: readonly TenantPlanStep[];
  verification: {
    institutionMustRemain: true;
    appendOnlyAuditMustRemain: true;
    expectedCandidateRowsAfterApprovedReset: 0;
  };
}

const flagMap = {
  "--project-ref": "projectRef",
  "--institution-id": "institutionId",
  "--expected-name": "expectedName",
  "--expected-slug": "expectedSlug",
  "--operation": "operation",
  "--mode": "mode",
  "--run-id": "runId",
  "--confirmation-token": "confirmationToken",
  "--confirm-institution-id": "confirmInstitutionId",
  "--output-path": "outputPath",
} as const;

type Flag = keyof typeof flagMap;

const isFlag = (value: string): value is Flag => value in flagMap;

export function parseTenantOperationArgs(
  args: readonly string[]
): TenantOperationOptions {
  const parsed: Record<string, string> = {};
  for (let index = 0; index < args.length; ) {
    const flag = args[index];
    if (flag === "--dry-run" || flag === "--execute") {
      if (parsed.mode !== undefined) {
        throw new Error("Duplicate tenant-operations mode flag");
      }
      parsed.mode = flag === "--dry-run" ? "dry-run" : "execute";
      index += 1;
      continue;
    }
    const value = args[index + 1];
    if (!flag || !isFlag(flag)) {
      throw new Error(`Unknown tenant-operations flag: ${flag ?? "<missing>"}`);
    }
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for ${flag}`);
    }
    const key = flagMap[flag];
    if (parsed[key] !== undefined) {
      throw new Error(`Duplicate tenant-operations flag: ${flag}`);
    }
    parsed[key] = value;
    index += 2;
  }
  const result = optionsSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      `Invalid tenant-operations arguments: ${z.prettifyError(result.error)}`
    );
  }
  return result.data;
}

export function projectRefFromSupabaseUrl(url: string): string | null {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    const match = hostname.match(/^([a-z]{20})\.supabase\.co$/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

export function expectedConfirmationToken(
  options: TenantOperationOptions
): string {
  return [
    "CONFIRM-TENANT-OPERATION",
    options.projectRef,
    options.institutionId,
    options.expectedSlug,
    options.operation,
    options.runId,
  ].join(":");
}

export function assertTenantOperationSafety(
  options: TenantOperationOptions,
  actualProjectRef: string,
  institution: InstitutionIdentity
): void {
  if (actualProjectRef !== options.projectRef) {
    throw new Error("Project reference mismatch; operation aborted");
  }
  if (
    institution.id !== options.institutionId ||
    institution.name !== options.expectedName ||
    institution.slug !== options.expectedSlug
  ) {
    throw new Error("Institution identity mismatch; operation aborted");
  }
  if (options.mode === "dry-run") return;
  if (options.confirmationToken !== expectedConfirmationToken(options)) {
    throw new Error("Exact confirmation token required for execute mode");
  }
  if (options.confirmInstitutionId !== options.institutionId) {
    throw new Error("Exact --confirm-institution-id is required for execute mode");
  }
  if (
    options.projectRef === PRODUCTION_PROJECT_REF &&
    !PRODUCTION_EXECUTION_AVAILABLE
  ) {
    throw new Error("Production execute mode is unavailable in this build");
  }
}

export function classifyRecord(evidence: RecordEvidence): RecordClassification {
  if (
    evidence.paymentActivity ||
    evidence.manualContent ||
    evidence.uploadedFiles
  ) {
    return "potentially_real";
  }
  if (evidence.seedOwned && evidence.reproducible) return "confirmed_seed_demo";
  if (evidence.stagingOwned && evidence.reproducible)
    return "confirmed_staging_test";
  if (evidence.testEmailDomain && evidence.reproducible)
    return "confirmed_seed_demo";
  return "unknown";
}

function actionForGroup(group: TenantRecordGroup): TenantPlanStep["action"] {
  if (group.appendOnly) return "retain";
  if (
    group.classification === "potentially_real" ||
    group.classification === "unknown"
  ) {
    return "block";
  }
  return group.count > 0 ? "delete" : "leave_unchanged";
}

function reasonForGroup(action: TenantPlanStep["action"]): string {
  if (action === "retain")
    return "Append-only history is retained and never bypassed";
  if (action === "block")
    return "Ownership is potentially real or unknown and requires manual review";
  if (action === "delete")
    return "Confirmed reproducible seed/test records are reset candidates";
  return "No owned rows require a change";
}

export function buildTenantDryRunReport(
  options: TenantOperationOptions,
  snapshot: TenantAuditSnapshot,
  generatedAt = new Date().toISOString()
): TenantDryRunReport {
  assertTenantOperationSafety(
    options,
    snapshot.projectRef,
    snapshot.institution
  );

  const groups = [...snapshot.recordGroups].sort((left, right) => {
    const dependencyDelta =
      (right.dependsOn?.length ?? 0) - (left.dependsOn?.length ?? 0);
    return dependencyDelta || left.name.localeCompare(right.name);
  });
  const plan = groups.map((group, index) => {
    const action = actionForGroup(group);
    return {
      order: index + 1,
      group: group.name,
      action,
      count: group.count,
      reason: reasonForGroup(action),
    } satisfies TenantPlanStep;
  });

  const blockers = new Set<string>();
  if (!snapshot.crossTenantScanComplete)
    blockers.add("Cross-tenant reference scan is incomplete");
  if (snapshot.crossTenantReferenceCount > 0)
    blockers.add("Cross-tenant references exist");
  if (!snapshot.ownershipScanComplete)
    blockers.add("Tenant ownership coverage is incomplete");
  if (plan.some((step) => step.action === "block" && step.count > 0)) {
    blockers.add("Potentially real or unknown records require manual review");
  }
  if (snapshot.auth.potentiallyReal > 0 || snapshot.auth.unknown > 0) {
    blockers.add(
      "Potentially real or unknown Auth users require manual review"
    );
  }
  if (snapshot.storage.some((entry) => entry.unknownPathCount > 0)) {
    blockers.add(
      "Storage objects with unknown tenant paths require manual review"
    );
  }

  const preOperationCounts = Object.fromEntries(
    [...snapshot.recordGroups]
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((group) => [group.name, group.count])
  );

  return {
    schemaVersion: 1,
    runId: options.runId,
    projectRef: options.projectRef,
    institution: snapshot.institution,
    operation: options.operation,
    mode: options.mode,
    capturedAt: snapshot.capturedAt,
    generatedAt,
    verdict: blockers.size === 0 ? "SAFE" : "BLOCKED",
    blockers: [...blockers].sort(),
    preOperationCounts,
    auth: snapshot.auth,
    storage: [...snapshot.storage].sort((left, right) =>
      left.bucket.localeCompare(right.bucket)
    ),
    crossTenantReferenceCount: snapshot.crossTenantReferenceCount,
    plan,
    verification: {
      institutionMustRemain: true,
      appendOnlyAuditMustRemain: true,
      expectedCandidateRowsAfterApprovedReset: 0,
    },
  };
}

const sensitiveKeyPattern =
  /(authorization|cookie|email|key|password|secret|token)/i;

export function sanitizeReportValue(value: unknown, key = ""): unknown {
  if (sensitiveKeyPattern.test(key)) return "[REDACTED]";
  if (Array.isArray(value))
    return value.map((entry) => sanitizeReportValue(entry));
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entryValue]) => [
        entryKey,
        sanitizeReportValue(entryValue, entryKey),
      ])
    );
  }
  return value;
}
