#!/usr/bin/env node
// =============================================================================
// deploy-guard.mjs — production deployment gate for Edeviser
// =============================================================================
// Prevents direct owner CLI production deploys from bypassing the Git/CI
// workflow (incident 2026-09-04: `vercel --prod` from a dirty working tree).
//
// A production deploy is allowed ONLY when:
//   1. the git working tree is clean (no staged, unstaged, or untracked files)
//   2. the current branch is `main`
//   3. local main is in sync with origin/main (no unpushed commits)
//
// On success it hands off to: vercel --prod [extra args...]
//
// Usage:
//   npm run deploy:prod            # guarded production deploy
//   node scripts/deploy-guard.mjs  # equivalent
// =============================================================================

import { execSync } from "node:child_process";

const run = (cmd) =>
  execSync(cmd, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();

const fail = (msg) => {
  console.error(`\n🚫 PRODUCTION DEPLOY BLOCKED\n${msg}\n`);
  console.error(
    "Correct path: commit your work → push → open PR → CI green → merge to main\n" +
      "→ Vercel deploys production from Git automatically.\n"
  );
  process.exit(1);
};

// --- 1. clean tree -----------------------------------------------------------
let status;
try {
  status = run("git status --porcelain");
} catch {
  fail("Not inside a git repository (or git is unavailable).");
}
if (status.length > 0) {
  fail(
    "The working tree is dirty. Uncommitted/untracked files would be deployed\n" +
      "without review. Commit or stash everything first.\n\n" +
      status
        .split("\n")
        .map((l) => `  ${l}`)
        .join("\n")
  );
}
console.log("✅ Working tree is clean");

// --- 2. branch is main --------------------------------------------------------
const branch = run("git branch --show-current");
if (branch !== "main") {
  fail(
    `Current branch is "${branch}" — production deploys are only allowed from "main".\n` +
      "Merge your branch to main via a PR first."
  );
}
console.log('✅ Branch is "main"');

// --- 3. in sync with origin/main ----------------------------------------------
try {
  execSync("git fetch origin main", { stdio: "pipe" });
} catch {
  fail("Could not fetch origin/main — check your network/remote and retry.");
}
const behind = run("git rev-list --count main..origin/main");
if (behind !== "0") {
  fail(`Local main is ${behind} commit(s) behind origin/main. Pull first.`);
}
const ahead = run("git rev-list --count origin/main..main");
if (ahead !== "0") {
  fail(`${ahead} local commit(s) not pushed to origin/main. Push first.`);
}
console.log("✅ main is in sync with origin/main");

console.log("\n🚀 All guards passed — delegating to: vercel --prod\n");
const args = process.argv
  .slice(2)
  .map((a) => JSON.stringify(a))
  .join(" ");
execSync(`vercel --prod ${args}`, { stdio: "inherit", shell: true });
