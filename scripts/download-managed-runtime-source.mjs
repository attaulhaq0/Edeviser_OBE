
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { readManifest } from "./resolve-runtime-deployment-impact.mjs";

const ROOT = resolve(process.cwd());
const PROJECT_REF = /^[a-z0-9]{20}$/;

export const managedRuntimeSlugs = (manifest = readManifest()) =>
  manifest.runtimeGroups
    .flatMap((group) => group.functions.map((definition) => definition.slug))
    .sort();

export const prepareManagedRuntimeDownloadWorkdir = (
  outputRoot,
  projectRef
) => {
  const workdir = resolve(ROOT, outputRoot);
  const supabaseDir = join(workdir, "supabase");
  mkdirSync(supabaseDir, { recursive: true });
  writeFileSync(
    join(supabaseDir, "config.toml"),
    `project_id = "${projectRef}"\n`
  );
  return workdir;
};

export const downloadManagedRuntimeSource = ({
  projectRef,
  outputRoot,
  execute = execFileSync,
}) => {
  if (!PROJECT_REF.test(projectRef)) throw new Error("project ref is invalid");
  if (!outputRoot) throw new Error("output root is required");
  const workdir = prepareManagedRuntimeDownloadWorkdir(outputRoot, projectRef);
  execute(
    "supabase",
    [
      "functions",
      "download",
      "--project-ref",
      projectRef,
      "--use-api",
      "--workdir",
      workdir,
    ],
    { stdio: "inherit" }
  );
  for (const slug of managedRuntimeSlugs()) {
    if (!existsSync(join(workdir, "supabase", "functions", slug, "index.ts"))) {
      throw new Error(`downloaded ${slug} source is missing its entrypoint`);
    }
  }
  return workdir;
};

const value = (args, name) => {
  const index = args.indexOf(name);
  return index === -1 ? "" : args[index + 1] ?? "";
};

const main = () => {
  const args = process.argv.slice(2);
  downloadManagedRuntimeSource({
    projectRef: value(args, "--project-ref"),
    outputRoot: value(args, "--output-root"),
  });
};

if (process.argv[1]?.endsWith("download-managed-runtime-source.mjs")) main();
