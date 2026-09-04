import { execFileSync } from "node:child_process";

const SHA = /^[0-9a-f]{40}$/i;
const ZERO_SHA = "0".repeat(40);

export const selectProductionBaseSha = ({
  before,
  head,
  lastEvaluatedSha = "",
  resolveCommit,
}) => {
  if (!SHA.test(head) || !resolveCommit(head))
    throw new Error("reviewed head does not resolve to a commit");
  // Prefer the last fully-evaluated main tip (the previous successful run's
  // head). A cancelled or gate-blocked earlier run never evaluated its diff,
  // so anchoring on event.before would silently skip those runtime changes;
  // anchoring on the last evaluation re-scans the gap and self-heals.
  if (
    lastEvaluatedSha !== ZERO_SHA &&
    SHA.test(lastEvaluatedSha) &&
    resolveCommit(lastEvaluatedSha)
  )
    return lastEvaluatedSha;
  if (before !== ZERO_SHA && SHA.test(before) && resolveCommit(before))
    return before;
  const firstParent = resolveCommit(`${head}^`);
  if (!firstParent)
    throw new Error(
      "cannot resolve reviewed head's first parent as deployment base"
    );
  return firstParent;
};

const value = (args, name) => {
  const index = args.indexOf(name);
  return index === -1 ? "" : args[index + 1] ?? "";
};

const main = () => {
  const args = process.argv.slice(2);
  const before = value(args, "--before");
  const head = value(args, "--head");
  const lastEvaluatedSha = value(args, "--last-evaluated-sha");
  if (!before || !head) throw new Error("--before and --head are required");
  const resolveCommit = (revision) => {
    try {
      return execFileSync(
        "git",
        ["rev-parse", "--verify", `${revision}^{commit}`],
        {
          encoding: "utf8",
        }
      )
        .trim()
        .replace(/\^\{commit\}$/, "");
    } catch {
      return "";
    }
  };
  process.stdout.write(
    `${selectProductionBaseSha({
      before,
      head,
      lastEvaluatedSha,
      resolveCommit,
    })}\n`
  );
};

if (process.argv[1]?.endsWith("resolve-production-base-sha.mjs")) main();
