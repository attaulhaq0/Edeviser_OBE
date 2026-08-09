import { describe, expect, it } from "vitest";
import {
  PRODUCTION_PROJECT_REF,
  assertTenantOperationSafety,
  buildTenantDryRunReport,
  classifyRecord,
  expectedConfirmationToken,
  parseTenantOperationArgs,
  projectRefFromSupabaseUrl,
  sanitizeReportValue,
  type TenantAuditSnapshot,
  type TenantOperationOptions,
} from "@/lib/tenantOperations";

const options: TenantOperationOptions = {
  projectRef: PRODUCTION_PROJECT_REF,
  institutionId: "9fb38246-8bad-4372-acf7-e2d17558f2d0",
  expectedName: "Gulf Academy of Excellence",
  expectedSlug: "gulf-academy",
  operation: "reset",
  mode: "dry-run",
  runId: "gulf-audit-20260805",
  outputPath: "output/tenant-operations/gulf.json",
};

const snapshot: TenantAuditSnapshot = {
  projectRef: PRODUCTION_PROJECT_REF,
  institution: {
    id: options.institutionId,
    name: options.expectedName,
    slug: options.expectedSlug,
  },
  recordGroups: [
    { name: "profiles", count: 51, classification: "confirmed_seed_demo" },
    { name: "operational_rows", count: 100, classification: "unknown" },
    {
      name: "audit_logs",
      count: 6,
      classification: "unknown",
      appendOnly: true,
    },
  ],
  auth: {
    total: 51,
    confirmedSeedDemo: 51,
    confirmedStagingTest: 0,
    potentiallyReal: 0,
    unknown: 0,
    signedInLast30Days: 8,
    neverSignedIn: 23,
  },
  storage: [],
  crossTenantReferenceCount: 0,
  crossTenantScanComplete: true,
  ownershipScanComplete: true,
  capturedAt: "2026-08-05T00:00:00.000Z",
};

describe("tenant operations safety", () => {
  it("defaults to dry-run and rejects unknown or duplicate flags", () => {
    const parsed = parseTenantOperationArgs([
      "--project-ref",
      options.projectRef,
      "--institution-id",
      options.institutionId,
      "--expected-name",
      options.expectedName,
      "--expected-slug",
      options.expectedSlug,
      "--operation",
      "audit",
      "--run-id",
      options.runId,
      "--output-path",
      options.outputPath,
    ]);
    expect(parsed.mode).toBe("dry-run");
    expect(() => parseTenantOperationArgs(["--unknown", "value"])).toThrow(
      /Unknown/
    );
    expect(() =>
      parseTenantOperationArgs([
        "--project-ref",
        options.projectRef,
        "--project-ref",
        options.projectRef,
      ])
    ).toThrow(/Duplicate/);
  });

  it("extracts only exact hosted Supabase project refs", () => {
    expect(
      projectRefFromSupabaseUrl(`https://${PRODUCTION_PROJECT_REF}.supabase.co`)
    ).toBe(PRODUCTION_PROJECT_REF);
    expect(
      projectRefFromSupabaseUrl(
        `https://${PRODUCTION_PROJECT_REF}.supabase.co.attacker.test`
      )
    ).toBeNull();
    expect(projectRefFromSupabaseUrl("http://127.0.0.1:54321")).toBeNull();
  });

  it("aborts on project or exact institution identity mismatches", () => {
    expect(() =>
      assertTenantOperationSafety(
        options,
        "aaaaaaaaaaaaaaaaaaaa",
        snapshot.institution
      )
    ).toThrow(/Project reference mismatch/);
    expect(() =>
      assertTenantOperationSafety(options, options.projectRef, {
        ...snapshot.institution,
        slug: "wrong-slug",
      })
    ).toThrow(/Institution identity mismatch/);
  });

  it("makes production execute mode unavailable even with the exact token", () => {
    const executeOptions = { ...options, mode: "execute" as const };
    executeOptions.confirmationToken =
      expectedConfirmationToken(executeOptions);
    expect(() =>
      assertTenantOperationSafety(
        executeOptions,
        executeOptions.projectRef,
        snapshot.institution
      )
    ).toThrow(/Production execute mode is unavailable/);
  });

  it("requires the exact confirmation token for non-production execute mode", () => {
    const executeOptions: TenantOperationOptions = {
      ...options,
      projectRef: "abcdefghijklmnopqrst",
      mode: "execute",
    };
    expect(() =>
      assertTenantOperationSafety(
        executeOptions,
        executeOptions.projectRef,
        snapshot.institution
      )
    ).toThrow(/Exact confirmation token/);
    executeOptions.confirmationToken =
      expectedConfirmationToken(executeOptions);
    expect(() =>
      assertTenantOperationSafety(
        executeOptions,
        executeOptions.projectRef,
        snapshot.institution
      )
    ).not.toThrow();
  });

  it("never classifies manual, financial, or uploaded records as disposable seed", () => {
    expect(
      classifyRecord({
        seedOwned: true,
        stagingOwned: false,
        reproducible: true,
        testEmailDomain: true,
        paymentActivity: true,
        manualContent: false,
        uploadedFiles: false,
        recentActivity: false,
      })
    ).toBe("potentially_real");
    expect(
      classifyRecord({
        seedOwned: false,
        stagingOwned: false,
        reproducible: false,
        testEmailDomain: true,
        paymentActivity: false,
        manualContent: false,
        uploadedFiles: false,
        recentActivity: true,
      })
    ).toBe("unknown");
  });

  it("blocks unknown records and retains append-only audit rows", () => {
    const report = buildTenantDryRunReport(
      options,
      snapshot,
      "2026-08-05T01:00:00.000Z"
    );
    expect(report.verdict).toBe("BLOCKED");
    expect(
      report.plan.find((step) => step.group === "operational_rows")?.action
    ).toBe("block");
    expect(
      report.plan.find((step) => step.group === "audit_logs")?.action
    ).toBe("retain");
    expect(report.verification.institutionMustRemain).toBe(true);
  });

  it("blocks incomplete ownership, cross-tenant references, and unknown storage paths", () => {
    const report = buildTenantDryRunReport(options, {
      ...snapshot,
      recordGroups: [],
      ownershipScanComplete: false,
      crossTenantReferenceCount: 1,
      crossTenantScanComplete: false,
      storage: [
        {
          bucket: "submissions",
          objectCount: 1,
          recentObjectCount: 1,
          tenantPathCount: 0,
          unknownPathCount: 1,
        },
      ],
    });
    expect(report.blockers).toEqual(
      expect.arrayContaining([
        "Cross-tenant reference scan is incomplete",
        "Cross-tenant references exist",
        "Tenant ownership coverage is incomplete",
        "Storage objects with unknown tenant paths require manual review",
      ])
    );
  });

  it("produces deterministic count ordering", () => {
    const report = buildTenantDryRunReport(
      options,
      snapshot,
      "2026-08-05T01:00:00.000Z"
    );
    expect(Object.keys(report.preOperationCounts)).toEqual([
      "audit_logs",
      "operational_rows",
      "profiles",
    ]);
  });

  it("redacts secrets, tokens, keys, passwords, cookies, and emails recursively", () => {
    expect(
      sanitizeReportValue({
        apiKey: "secret",
        raw_token: "token",
        profile: { email: "private@example.test", displayName: "Safe" },
        cookie: "session",
      })
    ).toEqual({
      apiKey: "[REDACTED]",
      raw_token: "[REDACTED]",
      profile: { email: "[REDACTED]", displayName: "Safe" },
      cookie: "[REDACTED]",
    });
  });
});
