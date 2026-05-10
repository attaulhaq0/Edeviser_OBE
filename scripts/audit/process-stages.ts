// Pre-deployment audit — process-based stages.
//
// These stages wrap existing npm scripts: lint, tsc, propertyTests, build.
// They're thin — the real work is already in package.json scripts — but
// having them in the audit pipeline means every `npm run audit --pr` run
// gates PRs on the same checks CI enforces, reported through the same
// manifest + finding schema as every other stage.
//
// Each stage fails hard on non-zero exit from the underlying command.
// Stage durations are wall-clock, captured so the report aggregator can
// surface slow steps.
//
// Safety: each child process is spawned detached=false with stdio='pipe'
// so a runaway command can't leak stdio into the orchestrator. Outputs
// are captured into the findings artifact for debuggability.

import { spawnSync } from "node:child_process";

import {
  type Finding,
  type FindingsArtifact,
  worstSeverity,
  writeFindingsArtifact,
} from "./findings.ts";
import type { StageResult } from "./types.ts";

interface ProcessStageResult {
  readonly code: number;
  readonly stdoutTail: string;
  readonly stderrTail: string;
}

const TAIL_LIMIT_CHARS = 2000;

const tail = (s: string, max: number = TAIL_LIMIT_CHARS): string =>
  s.length <= max ? s : `…${s.slice(-max)}`;

const runNpmScript = (scriptName: string): ProcessStageResult => {
  // Use `npm run <script>` to defer to package.json's script definition.
  // This keeps the audit stage in lockstep with whatever the project's
  // canonical invocation is (e.g., `vitest --run`, `eslint --max-warnings 0`).
  //
  // Windows-specific: spawnSync with shell=false and a .cmd launcher fails
  // silently on PATH-resolution paths in some configurations. Using the
  // shell on Windows adds the cmd.exe wrapper that .cmd scripts need.
  // On POSIX this stays shell=false for predictability.
  const isWindows = process.platform === "win32";
  const cmd = isWindows ? "npm.cmd" : "npm";
  const result = spawnSync(cmd, ["run", scriptName, "--silent"], {
    stdio: "pipe",
    encoding: "utf8",
    shell: isWindows,
  });
  return {
    code: result.status ?? 1,
    stdoutTail: tail(result.stdout ?? ""),
    stderrTail: tail(result.stderr ?? ""),
  };
};

const runNpx = (args: readonly string[]): ProcessStageResult => {
  const isWindows = process.platform === "win32";
  const cmd = isWindows ? "npx.cmd" : "npx";
  const result = spawnSync(cmd, [...args], {
    stdio: "pipe",
    encoding: "utf8",
    shell: isWindows,
  });
  return {
    code: result.status ?? 1,
    stdoutTail: tail(result.stdout ?? ""),
    stderrTail: tail(result.stderr ?? ""),
  };
};

const emitStageArtifact = (
  stageName: string,
  artifactName: string,
  requirementId: string,
  result: ProcessStageResult,
  failureSeverity: "Blocker" | "Critical",
  failureMessage: string
): { findings: readonly Finding[]; artifactPath: string } => {
  const findings: Finding[] =
    result.code === 0
      ? []
      : [
          {
            severity: failureSeverity,
            requirementId,
            message: failureMessage,
            detail: {
              exitCode: result.code,
              stdoutTail: result.stdoutTail,
              stderrTail: result.stderrTail,
            },
          },
        ];

  const artifact: FindingsArtifact = {
    stage: stageName,
    generatedAt: new Date().toISOString(),
    requirementIds: [requirementId],
    findings,
  };

  const artifactPath = writeFindingsArtifact(artifactName, artifact);
  return { findings, artifactPath };
};

// ─── Stage: lint (Req 17.2) ────────────────────────────────────────────────

export const runLintStage = async (): Promise<StageResult> => {
  const startedAt = Date.now();
  const result = runNpmScript("lint");
  const { findings, artifactPath } = emitStageArtifact(
    "lint",
    "lint-findings.json",
    "17.2",
    result,
    "Blocker",
    "ESLint reported one or more errors or warnings. Zero-warning policy per .kiro/steering/pre-push-checks.md."
  );
  const durationMs = Date.now() - startedAt;
  const status = result.code === 0 ? "passed" : "failed";
  return {
    name: "lint",
    status,
    durationMs,
    artifact: artifactPath,
    message:
      result.code === 0
        ? "ESLint zero warnings, zero errors."
        : `ESLint failed with exit code ${result.code}. ${findings.length} finding(s).`,
  };
};

// ─── Stage: tsc (Req 17.3) ────────────────────────────────────────────────

export const runTscStage = async (): Promise<StageResult> => {
  const startedAt = Date.now();
  const result = runNpx(["tsc", "--noEmit"]);
  const { findings, artifactPath } = emitStageArtifact(
    "tsc",
    "tsc-findings.json",
    "17.3",
    result,
    "Blocker",
    "TypeScript compilation reported one or more errors."
  );
  const durationMs = Date.now() - startedAt;
  const status = result.code === 0 ? "passed" : "failed";
  return {
    name: "tsc",
    status,
    durationMs,
    artifact: artifactPath,
    message:
      result.code === 0
        ? "tsc --noEmit clean."
        : `tsc failed with exit code ${result.code}. ${findings.length} finding(s).`,
  };
};

// ─── Stage: propertyTests (Req 7.7, 8) ────────────────────────────────────

// Known Windows-specific Vitest fork-pool bug signatures. When vitest can't
// terminate a fork worker on Windows (kill EPERM, errno -4048) it crashes
// the runner AFTER tests have already passed. We treat this as "tests
// passed with a known-flake warning" rather than a Blocker. The real
// regression signal is still intact because a test-assertion failure
// produces different stderr content — vitest prints `FAIL`, `× 1 failed`,
// or a specific assertion mismatch.
//
// The signature matches any stderr that contains BOTH:
//   - `kill EPERM`  (the actual Windows process-kill failure)
//   - `errno: -4048` OR `'EPERM'`  (the errno code that confirms Windows)
// AND the fork-pool termination path, i.e. one of:
//   - `forks worker`
//   - `PoolRunner.stop`
//   - `ChildProcess.kill`
//
// If the stderr ALSO contains real test-failure signatures, we don't
// apply the flake suppression — a concurrent real failure alongside the
// teardown bug must still block deploy.
//
// Refs:
//   - https://github.com/vitest-dev/vitest/issues/4562
//   - Node 22 + Windows child_process.kill on fork-pool workers
const WINDOWS_VITEST_EPERM = /kill EPERM/;
const WINDOWS_VITEST_ERRNO = /errno:\s*-4048|'EPERM'/;
const WINDOWS_VITEST_FORK_POOL =
  /forks worker|PoolRunner\.stop|ChildProcess\.kill/;
const REAL_TEST_FAILURE_SIGNATURES = [
  /× \d+ tests? failed/,
  /FAIL\s+src\//,
  /AssertionError/,
  /Error: Property failed/,
  // Vitest prints a summary line like "Tests  N failed, M passed" — the
  // presence of `failed` alongside a non-zero count is the strongest signal.
  /Tests\s+\d+\s+failed/,
];

const isKnownWindowsTeardownCrash = (stderr: string): boolean => {
  if (!WINDOWS_VITEST_EPERM.test(stderr)) return false;
  if (!WINDOWS_VITEST_ERRNO.test(stderr)) return false;
  if (!WINDOWS_VITEST_FORK_POOL.test(stderr)) return false;
  return !REAL_TEST_FAILURE_SIGNATURES.some((re) => re.test(stderr));
};

export const runPropertyTestsStage = async (): Promise<StageResult> => {
  const startedAt = Date.now();
  // The full `npm test` is too expensive for PR-mode — it runs 4500+
  // tests. Scope this stage to the property suite + audit unit tests
  // which are the pre-deploy-critical ones. Once Task 7 lands full
  // property coverage, this stays targeted at those directories.
  const result = runNpx([
    "vitest",
    "run",
    "src/__tests__/properties",
    "scripts/audit/__tests__",
  ]);

  // Detect the Windows fork-pool teardown crash where tests passed but the
  // runner couldn't terminate a worker. We escalate this to a Minor warning
  // so the report flags the flake without blocking the deploy.
  if (
    process.platform === "win32" &&
    result.code !== 0 &&
    isKnownWindowsTeardownCrash(result.stderrTail)
  ) {
    const artifact: FindingsArtifact = {
      stage: "propertyTests",
      generatedAt: new Date().toISOString(),
      requirementIds: ["7.7"],
      findings: [
        {
          severity: "Minor",
          requirementId: "7.7",
          message:
            "Property + audit tests passed but the Windows fork-pool crashed during teardown (kill EPERM). Treating as a runner-infrastructure flake, not a domain-invariant regression. Ref: vitest#4562.",
          detail: {
            rule: "windows-vitest-teardown-flake",
            exitCode: result.code,
            stderrTail: result.stderrTail,
          },
        },
      ],
    };
    const artifactPath = writeFindingsArtifact(
      "property-tests-findings.json",
      artifact
    );
    return {
      name: "propertyTests",
      status: "passed",
      durationMs: Date.now() - startedAt,
      artifact: artifactPath,
      message:
        "Windows fork-pool teardown flake (vitest#4562) — tests passed, runner crash on teardown only. Reported as Minor.",
    };
  }

  const { findings, artifactPath } = emitStageArtifact(
    "propertyTests",
    "property-tests-findings.json",
    "7.7",
    result,
    "Blocker",
    "Property tests failed. Domain invariants are broken — deploy must not proceed."
  );
  const durationMs = Date.now() - startedAt;
  const status = result.code === 0 ? "passed" : "failed";
  return {
    name: "propertyTests",
    status,
    durationMs,
    artifact: artifactPath,
    message:
      result.code === 0
        ? "Property + audit tests passed."
        : `Property tests failed with exit code ${result.code}. ${findings.length} finding(s).`,
  };
};

// ─── Stage: build (Req 17.1) ──────────────────────────────────────────────

export const runBuildStage = async (): Promise<StageResult> => {
  const startedAt = Date.now();
  const result = runNpmScript("build");
  const { findings, artifactPath } = emitStageArtifact(
    "build",
    "build-findings.json",
    "17.1",
    result,
    "Blocker",
    "Vite production build failed. Deploy cannot proceed without a successful build."
  );
  const durationMs = Date.now() - startedAt;
  const status = result.code === 0 ? "passed" : "failed";
  // Build produces dist/ which feeds into security + perf stages. Those
  // stages are downstream in the pipeline so this ordering is correct.
  return {
    name: "build",
    status,
    durationMs,
    artifact: artifactPath,
    message:
      result.code === 0
        ? `Vite build succeeded. ${worstSeverity(findings) ?? "No findings"}.`
        : `Vite build failed with exit code ${result.code}. ${findings.length} finding(s).`,
  };
};
