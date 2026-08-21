
const SHA = /^[0-9a-f]{40}$/i;
const MAIN_REF = "refs/heads/main";

export const assertRuntimeReconciliationTarget = ({
  ref,
  reviewedSha,
  headSha,
  mainSha,
}) => {
  if (ref !== MAIN_REF)
    throw new Error("runtime reconciliation must run from main");
  for (const [name, sha] of Object.entries({ reviewedSha, headSha, mainSha })) {
    if (!SHA.test(sha ?? "")) throw new Error(`${name} must be a full SHA`);
  }
  const reviewed = reviewedSha.toLowerCase();
  const head = headSha.toLowerCase();
  const main = mainSha.toLowerCase();
  if (reviewed !== head)
    throw new Error("reviewed SHA does not match the dispatched main SHA");
  if (reviewed !== main)
    throw new Error("reviewed SHA is stale relative to current main");
  return reviewed;
};

const value = (args, name) => {
  const index = args.indexOf(name);
  return index === -1 ? "" : args[index + 1] ?? "";
};

const main = () => {
  const args = process.argv.slice(2);
  const reviewedSha = assertRuntimeReconciliationTarget({
    ref: value(args, "--ref"),
    reviewedSha: value(args, "--reviewed-sha"),
    headSha: value(args, "--head-sha"),
    mainSha: value(args, "--main-sha"),
  });
  process.stdout.write(`${reviewedSha}\n`);
};

if (process.argv[1]?.endsWith("verify-runtime-reconciliation-target.mjs")) {
  main();
}
