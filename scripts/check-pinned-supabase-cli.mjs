import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const packageJson = JSON.parse(
  await readFile(resolve(root, "package.json"), "utf8")
);
const cliVersion = packageJson.devDependencies?.supabase;

if (
  !/^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/.test(cliVersion ?? "")
) {
  throw new Error("Supabase CLI must be an exact devDependency version");
}

const workflowDirectory = resolve(root, ".github", "workflows");
const workflows = (await readdir(workflowDirectory))
  .filter((name) => /\.ya?ml$/.test(name))
  .sort();

export const normalizeYamlScalar = (value) => {
  const normalized = value.trim();
  const quoted = /^(['"])(.*)\1$/.exec(normalized);
  return quoted ? quoted[2] : normalized;
};

for (const workflow of workflows) {
  const source = await readFile(resolve(workflowDirectory, workflow), "utf8");
  if (
    source.includes("supabase@latest") ||
    source.includes("version: latest")
  ) {
    throw new Error(`${workflow} must use the project-pinned Supabase CLI`);
  }
  const setupCliUses = [
    ...source.matchAll(/uses:\s*supabase\/setup-cli@[^\r\n]+/g),
  ];
  const setupSteps = [
    ...source.matchAll(
      /uses:\s*supabase\/setup-cli@[^\r\n]+\r?\n\s*with:\s*\r?\n\s*version:\s*([^\s#]+)/g
    ),
  ];
  if (setupSteps.length !== setupCliUses.length)
    throw new Error(
      `${workflow} must give every supabase/setup-cli step an explicit version`
    );
  for (const step of setupSteps) {
    if (normalizeYamlScalar(step[1]) !== cliVersion)
      throw new Error(
        `${workflow} must configure supabase/setup-cli with ${cliVersion}`
      );
  }
}

process.stdout.write(`Pinned Supabase CLI: ${cliVersion}\n`);
