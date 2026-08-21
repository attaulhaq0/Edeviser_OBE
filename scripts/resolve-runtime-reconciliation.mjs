
import {
  readManifest,
  validateManifest,
} from "./resolve-runtime-deployment-impact.mjs";

const GROUP_NAME = /^[a-z][a-z0-9-]*$/;

export const resolveRuntimeReconciliation = (
  groupName,
  manifest = readManifest()
) => {
  if (!GROUP_NAME.test(groupName ?? ""))
    throw new Error("runtime group selection is invalid");
  const validation = validateManifest(manifest);
  if (validation.failures.length)
    throw new Error(
      `runtime manifest is invalid: ${validation.failures.join("; ")}`
    );
  const group = manifest.runtimeGroups.find(
    (entry) => entry.name === groupName
  );
  if (!group) throw new Error(`runtime group is not declared: ${groupName}`);
  const functions = group.functions.map((definition) => definition.slug).sort();
  if (functions.length === 0)
    throw new Error(`runtime group has no deployable functions: ${groupName}`);
  return { group: group.name, functions };
};

const value = (args, name) => {
  const index = args.indexOf(name);
  return index === -1 ? "" : args[index + 1] ?? "";
};

const main = () => {
  const args = process.argv.slice(2);
  const group = value(args, "--group");
  const format = value(args, "--format") || "json";
  if (!group) throw new Error("--group is required");
  const resolved = resolveRuntimeReconciliation(group);
  if (format === "github") {
    process.stdout.write(
      `runtime_group=${
        resolved.group
      }\ndeployment_closure=${resolved.functions.join(" ")}\n`
    );
    return;
  }
  if (format !== "json") throw new Error("--format must be json or github");
  process.stdout.write(`${JSON.stringify(resolved)}\n`);
};

if (process.argv[1]?.endsWith("resolve-runtime-reconciliation.mjs")) main();
