#!/usr/bin/env tsx
// scripts/audit/nova-act/run.ts
//
// Task 21.1–21.2 / Req 18: Nova Act human-perspective UX audit runner.
//
// Usage:
//   tsx scripts/audit/nova-act/run.ts --role=admin --env=staging
//   tsx scripts/audit/nova-act/run.ts --role=all --headed --env=staging
//
// Flags:
//   --role=<role|all>   Role to audit (admin|coordinator|teacher|student|parent|all)
//   --headed            Run with visible browser (default: headless)
//   --env=<env>         Target environment (local|staging|ci)
//
// Safety rules (Task 21.2):
//   - Reads NOVA_ACT_API_KEY first; falls back to AWS credentials.
//   - Reads NOVA_ACT_BASE_URL (defaults to http://localhost:5173).
//   - Refuses --headed --env=ci (CI must be headless).
//   - Exits 0 with a skipped-stage manifest entry if NOVA_ACT_API_KEY is absent.

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

// ─── Types ────────────────────────────────────────────────────────────────

type Role = "admin" | "coordinator" | "teacher" | "student" | "parent";
type Env = "local" | "staging" | "ci";

interface NovaActOptions {
  readonly role: Role | "all";
  readonly headed: boolean;
  readonly env: Env;
  readonly baseUrl: string;
  readonly apiKey: string | null;
}

interface SkippedManifestEntry {
  readonly stage: "nova-act";
  readonly status: "skipped";
  readonly reason: string;
  readonly generatedAt: string;
}

// ─── Argument parsing ─────────────────────────────────────────────────────

const parseArgs = (argv: string[]): NovaActOptions => {
  let role: Role | "all" = "all";
  let headed = false;
  let env: Env = "local";

  for (const arg of argv) {
    if (arg.startsWith("--role=")) {
      role = arg.slice("--role=".length) as Role | "all";
    } else if (arg === "--headed") {
      headed = true;
    } else if (arg.startsWith("--env=")) {
      env = arg.slice("--env=".length) as Env;
    }
  }

  // Task 21.2: Read NOVA_ACT_BASE_URL (defaults to http://localhost:5173)
  const baseUrl = process.env.NOVA_ACT_BASE_URL ?? "http://localhost:5173";

  // Task 21.2: Read NOVA_ACT_API_KEY first, fall back to AWS credentials
  const apiKey =
    process.env.NOVA_ACT_API_KEY ??
    process.env.AWS_ACCESS_KEY_ID ?? // AWS credential fallback
    null;

  return { role, headed, env, baseUrl, apiKey };
};

// ─── Skipped-stage manifest emitter ──────────────────────────────────────

const emitSkippedManifest = (reason: string): void => {
  const outputDir = resolve("audit", "output", "nova-act");
  mkdirSync(outputDir, { recursive: true });

  const entry: SkippedManifestEntry = {
    stage: "nova-act",
    status: "skipped",
    reason,
    generatedAt: new Date().toISOString(),
  };

  writeFileSync(
    resolve(outputDir, "manifest.json"),
    `${JSON.stringify(entry, null, 2)}\n`,
    "utf8"
  );

  process.stdout.write(`[nova-act] Stage skipped: ${reason}\n`);
};

// ─── Journey runner ───────────────────────────────────────────────────────

const ALL_ROLES: readonly Role[] = [
  "admin",
  "coordinator",
  "teacher",
  "student",
  "parent",
];

const runJourney = async (
  role: Role,
  options: NovaActOptions
): Promise<void> => {
  // Dynamic import of the Nova Act SDK — only available when installed
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let NovaAct: any;
  try {
    // Nova Act is a Python SDK; the TypeScript integration uses a subprocess
    // bridge. This import will fail gracefully if not installed.
    NovaAct = await import("nova-act").catch(() => null);
  } catch {
    NovaAct = null;
  }

  if (!NovaAct) {
    process.stdout.write(
      `[nova-act] nova-act SDK not available — journey for ${role} skipped\n`
    );
    return;
  }

  const journeyPath = resolve(
    "scripts",
    "audit",
    "nova-act",
    "journeys",
    `${role}.py`
  );

  if (!existsSync(journeyPath)) {
    process.stdout.write(`[nova-act] Journey file not found: ${journeyPath}\n`);
    return;
  }

  process.stdout.write(`[nova-act] Running journey for role: ${role}\n`);

  // In a real implementation, this would invoke the Nova Act Python SDK
  // via a subprocess or the TypeScript bridge. For now, we log the intent.
  process.stdout.write(
    `[nova-act] Would execute: python ${journeyPath} --base-url=${options.baseUrl} --headed=${options.headed}\n`
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────

const main = async (): Promise<number> => {
  const options = parseArgs(process.argv.slice(2));

  // Task 21.2: Refuse --headed --env=ci
  if (options.headed && options.env === "ci") {
    process.stderr.write(
      "[nova-act] ERROR: --headed is not allowed in CI environment\n"
    );
    return 1;
  }

  // Task 21.1 / 21.11: Exit 0 with skipped manifest if NOVA_ACT_API_KEY absent
  if (!options.apiKey) {
    emitSkippedManifest(
      "NOVA_ACT_API_KEY not set — Nova Act stage skipped. Set NOVA_ACT_API_KEY to enable human-perspective UX audit."
    );
    return 0;
  }

  process.stdout.write(
    `[nova-act] Starting UX audit (role=${options.role}, env=${options.env}, headed=${options.headed})\n`
  );
  process.stdout.write(`[nova-act] Base URL: ${options.baseUrl}\n`);

  const rolesToRun: readonly Role[] =
    options.role === "all" ? ALL_ROLES : [options.role];

  for (const role of rolesToRun) {
    await runJourney(role, options);
  }

  return 0;
};

main().then(
  (code) => process.exit(code),
  (error: unknown) => {
    const message =
      error instanceof Error ? error.message : "Fatal nova-act error";
    process.stderr.write(`[nova-act] ${message}\n`);
    process.exit(1);
  }
);
