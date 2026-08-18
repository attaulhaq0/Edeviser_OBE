import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";

const ROOT = resolve(process.cwd());
const FUNCTION_ROOT = resolve(ROOT, "supabase/functions");
const IMPORT_PATTERN = /(?:from\s*|import\s*)["']([^"']+)["']/g;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

const walkFiles = (path) =>
  readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    const child = join(path, entry.name);
    return entry.isDirectory() ? walkFiles(child) : [child];
  });

const localLogicalPath = (path) =>
  `functions/${relative(FUNCTION_ROOT, path).replaceAll("\\", "/")}`;
const resolveRelativeImport = (fromPath, specifier) => {
  const base = resolve(dirname(fromPath), specifier);
  const candidates = extname(base)
    ? [base]
    : [base, `${base}.ts`, `${base}.tsx`, join(base, "index.ts")];
  return (
    candidates.find(
      (candidate) => existsSync(candidate) && statSync(candidate).isFile()
    ) ?? null
  );
};

export const declaredLocalSourceClosure = (slug, declaredSharedPaths) => {
  const entrypoint = resolve(FUNCTION_ROOT, slug, "index.ts");
  if (!existsSync(entrypoint)) throw new Error(`${slug} entrypoint is missing`);
  const files = new Set();
  const visit = (file) => {
    if (files.has(file)) return;
    files.add(file);
    const source = readFileSync(file, "utf8");
    for (const match of source.matchAll(IMPORT_PATTERN)) {
      const specifier = match[1];
      if (!specifier?.startsWith(".")) continue;
      const dependency = resolveRelativeImport(file, specifier);
      if (!dependency)
        throw new Error(
          `${localLogicalPath(
            file
          )} imports missing local dependency ${specifier}`
        );
      if (
        !dependency.startsWith(resolve(FUNCTION_ROOT, slug)) &&
        !declaredSharedPaths.some((path) =>
          dependency.startsWith(resolve(ROOT, path.replace(/\/\*\*$/, "")))
        )
      ) {
        throw new Error(
          `${slug} imports undeclared shared dependency ${localLogicalPath(
            dependency
          )}`
        );
      }
      visit(dependency);
    }
  };
  visit(entrypoint);
  return new Map(
    [...files].map((file) => [
      localLogicalPath(file),
      readFileSync(file, "utf8"),
    ])
  );
};

export const downloadedRemoteSourceClosure = (remoteSourceRoot, slug) => {
  const root = resolve(ROOT, remoteSourceRoot);
  const files = walkFiles(root);
  const logicalPaths = new Map(
    files.flatMap((file) => {
      const normalized = relative(root, file).replaceAll("\\", "/");
      const marker = normalized.indexOf("functions/");
      return marker < 0 ? [] : [[normalized.slice(marker), file]];
    })
  );
  const entrypoint = logicalPaths.get(`functions/${slug}/index.ts`);
  if (!entrypoint)
    throw new Error(`downloaded ${slug} source is missing its entrypoint`);
  const closure = new Set();
  const visit = (file) => {
    if (closure.has(file)) return;
    closure.add(file);
    const source = readFileSync(file, "utf8");
    for (const match of source.matchAll(IMPORT_PATTERN)) {
      const specifier = match[1];
      if (!specifier?.startsWith(".")) continue;
      const dependency = resolveRelativeImport(file, specifier);
      if (!dependency)
        throw new Error(
          `downloaded ${slug} source imports missing dependency ${specifier}`
        );
      visit(dependency);
    }
  };
  visit(entrypoint);
  return new Map(
    [...closure].map((file) => {
      const normalized = relative(root, file).replaceAll("\\", "/");
      const marker = normalized.indexOf("functions/");
      return [normalized.slice(marker), readFileSync(file, "utf8")];
    })
  );
};

export const sourceClosureFingerprint = (closure) =>
  sha256(
    [...closure.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([path, source]) => `${path}\0${sha256(source)}`)
      .join("\n")
  );

export const assertSourceParity = ({
  slug,
  declaredSharedPaths,
  remoteSourceRoot,
}) => {
  const local = declaredLocalSourceClosure(slug, declaredSharedPaths);
  const remote = downloadedRemoteSourceClosure(remoteSourceRoot, slug);
  const missingRemote = [...local.keys()].filter((path) => !remote.has(path));
  const unexpectedRemote = [...remote.keys()].filter(
    (path) => !local.has(path)
  );
  const different = [...local.keys()].filter(
    (path) => remote.has(path) && local.get(path) !== remote.get(path)
  );
  if (missingRemote.length || unexpectedRemote.length || different.length) {
    throw new Error(
      `${slug} reviewed/deployed source mismatch (missing remote: ${
        missingRemote.join(", ") || "none"
      }; unexpected remote: ${
        unexpectedRemote.join(", ") || "none"
      }; content differs: ${different.join(", ") || "none"})`
    );
  }
  return {
    fingerprint: sourceClosureFingerprint(local),
    files: [...local.keys()].sort(),
  };
};
