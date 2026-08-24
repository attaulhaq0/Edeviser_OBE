// Security contract: runtime call-graph ↔ gateway-config consistency.
//
// Born from production incident 2026-08-24 (supabase_logs.json audit):
//   - weekly-summary-cron & streak-risk-cron invoked send-email-notification
//     with the managed secret key (non-JWT) while the gateway had
//     verify_jwt = true → silent 401 wall, all student emails dropped.
//   - weekly-summary-cron filtered submissions.created_at — column does not
//     exist (real: submitted_at) → 41× PG 42703 + submissions_count always 0.
//
// Guards enforced here:
//   G1  No query against `submissions` may reference created_at anywhere.
//   G2  weekly-summary-cron must use submitted_at for its weekly window.
//   G3  Every function invoked SERVER-to-server (from supabase/functions/**)
//       MUST have verify_jwt = false in supabase/config.toml and MUST exist.
//   G4  notifications-runtime governance pins the email pipeline functions.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const FN_DIR = join(ROOT, "supabase", "functions");
const SRC_DIR = join(ROOT, "src");

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else if (/\.tsx?$/.test(entry)) acc.push(p);
  }
  return acc;
}

const fnFiles = walk(FN_DIR).filter((f) => !f.includes("_shared"));
const srcFiles = walk(SRC_DIR);

const INVOKE_RE = /functions\s*\.\s*invoke\(\s*["'`]([a-z0-9-]+)["'`]/gi;

interface Target {
  server: boolean;
  browser: boolean;
}
const invokeGraph = new Map<string, Target>();
for (const f of [...fnFiles, ...srcFiles]) {
  const text = readFileSync(f, "utf8");
  const isServer = f.startsWith(FN_DIR);
  for (const m of text.matchAll(INVOKE_RE)) {
    const target = m[1] ?? "";
    if (!target) continue;
    const t = invokeGraph.get(target) ?? { server: false, browser: false };
    if (isServer) t.server = true;
    else t.browser = true;
    invokeGraph.set(target, t);
  }
}

function parseVerifyJwt(): Map<string, boolean> {
  const toml = readFileSync(join(ROOT, "supabase", "config.toml"), "utf8");
  const map = new Map<string, boolean>();
  let current = "";
  for (const raw of toml.split(/\r?\n/)) {
    const line = raw.trim();
    if (line.startsWith("[functions.") && line.endsWith("]")) {
      current = line.slice("[functions.".length, -1);
      continue;
    }
    const vj = line.match(/^verify_jwt\s*=\s*(true|false)/);
    if (vj && current) map.set(current, vj[1] === "true");
  }
  return map;
}

describe("runtime call-graph ↔ gateway config contract", () => {
  it("G3: every server-invoked function has verify_jwt = false and exists", () => {
    const cfg = parseVerifyJwt();
    const offenders: string[] = [];
    for (const [target, kinds] of invokeGraph) {
      if (!kinds.server) continue;
      if (!cfg.has(target))
        offenders.push(`${target}: missing from config.toml`);
      else if (cfg.get(target))
        offenders.push(`${target}: verify_jwt=true blocks sb_secret callers`);
    }
    expect(offenders).toEqual([]);
  });

  it("G4: notifications-runtime pipeline is pinned verify_jwt=false", () => {
    const cfg = parseVerifyJwt();
    for (const fn of [
      "send-email-notification",
      "weekly-summary-cron",
      "streak-risk-cron",
    ]) {
      expect(cfg.get(fn)).toBe(false);
    }
  });
});

describe("submissions schema-drift guard", () => {
  const DRIFT_RE =
    /from\(["']submissions["']\)[^;]{0,400}?\.(?:gte|lte|lt|gt|order)\(\s*["']created_at["']/g;

  it("G1: no submissions query references the nonexistent created_at column", () => {
    const offenders: string[] = [];
    for (const f of [...fnFiles, ...srcFiles]) {
      const hits = [...readFileSync(f, "utf8").matchAll(DRIFT_RE)];
      if (hits.length > 0) offenders.push(f.replace(ROOT, ""));
    }
    expect(offenders).toEqual([]);
  });

  it("G2: weekly-summary-cron aggregates the weekly window on submitted_at", () => {
    const text = readFileSync(
      join(FN_DIR, "weekly-summary-cron", "index.ts"),
      "utf8"
    );
    expect(text).toContain('.gte("submitted_at"');
    // xp_transactions legitimately has created_at — scope the ban to
    // submissions queries only (see G1).
    const submissionsDrift = [
      ...text.matchAll(
        /from\(["']submissions["']\)[^;]{0,400}?\.gte\(\s*["']created_at["']/g
      ),
    ];
    expect(submissionsDrift).toEqual([]);
  });
});
