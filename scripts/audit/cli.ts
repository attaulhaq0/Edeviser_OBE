// Pre-deployment audit — CLI argument parser.
//
// Kept intentionally dependency-free per tasks.md §1.4: "a lightweight arg
// parser (no new dep)". Supports the flags enumerated in design.md §Audit
// Runner: --stage, --role, --skip, --incremental, --env, --pr.

import type { AuditCliOptions, EnvId, StageName } from "./types.ts";

const KNOWN_STAGES: readonly StageName[] = [
  "lint",
  "tsc",
  "propertyTests",
  "build",
  "security",
  "connectivity",
  "rls",
  "cron",
  "e2e",
  "designTokens",
  "i18n",
  "a11y",
  "perf",
  "report",
];

const KNOWN_ENVS: readonly EnvId[] = ["local", "ci", "audit-staging"];

const isStage = (value: string): value is StageName =>
  (KNOWN_STAGES as readonly string[]).includes(value);

const isEnv = (value: string): value is EnvId =>
  (KNOWN_ENVS as readonly string[]).includes(value);

const splitEqual = (arg: string): { key: string; value: string | null } => {
  const eq = arg.indexOf("=");
  if (eq === -1) {
    return { key: arg, value: null };
  }
  return {
    key: arg.slice(0, eq),
    value: arg.slice(eq + 1),
  };
};

export const parseArgs = (argv: readonly string[]): AuditCliOptions => {
  let env: EnvId = "local";
  let stage: StageName | null = null;
  let role: string | null = null;
  const skip: StageName[] = [];
  let incremental = false;
  let pr = false;

  for (let i = 0; i < argv.length; i += 1) {
    const raw = argv[i];
    if (raw === undefined) {
      continue;
    }
    const { key, value } = splitEqual(raw);

    const take = (inline: string | null): string => {
      if (inline !== null) return inline;
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) {
        throw new Error(`Flag ${key} requires a value`);
      }
      i += 1;
      return next;
    };

    switch (key) {
      case "--env": {
        const v = take(value);
        if (!isEnv(v)) {
          throw new Error(
            `Invalid --env "${v}". Expected one of: ${KNOWN_ENVS.join(", ")}`
          );
        }
        env = v;
        break;
      }
      case "--stage": {
        const v = take(value);
        if (!isStage(v)) {
          throw new Error(
            `Invalid --stage "${v}". Expected one of: ${KNOWN_STAGES.join(
              ", "
            )}`
          );
        }
        stage = v;
        break;
      }
      case "--role": {
        role = take(value);
        break;
      }
      case "--skip": {
        const v = take(value);
        for (const entry of v.split(",")) {
          const trimmed = entry.trim();
          if (!trimmed) continue;
          if (!isStage(trimmed)) {
            throw new Error(
              `Invalid --skip entry "${trimmed}". Expected one of: ${KNOWN_STAGES.join(
                ", "
              )}`
            );
          }
          skip.push(trimmed);
        }
        break;
      }
      case "--incremental": {
        incremental = true;
        break;
      }
      case "--pr": {
        pr = true;
        break;
      }
      default: {
        if (key.startsWith("--")) {
          throw new Error(`Unknown flag: ${key}`);
        }
        // positional args are ignored at this stage
      }
    }
  }

  return {
    env,
    stage,
    role,
    skip: Object.freeze([...skip]),
    incremental,
    pr,
  };
};
