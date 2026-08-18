import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const packageJson = JSON.parse(
  await readFile(resolve(root, "package.json"), "utf8")
);
const cliVersion = packageJson.devDependencies?.supabase;

if (!/^\d+\.\d+\.\d+$/.test(cliVersion ?? "")) {
  throw new Error("Supabase CLI must be an exact devDependency version");
}

for (const workflow of ["ci.yml", "pre-deploy-audit.yml"]) {
  const source = await readFile(resolve(root, ".github", "workflows", workflow), "utf8");
  if (source.includes("supabase@latest")) {
    throw new Error(`${workflow} must use the project-pinned Supabase CLI`);
  }
}

process.stdout.write(`Pinned Supabase CLI: ${cliVersion}\n`);
