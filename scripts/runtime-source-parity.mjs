import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { matchesRuntimeDependencyPath } from "./runtime-dependency-paths.mjs";

const ROOT = (() => {
  try {
    return resolve(dirname(fileURLToPath(import.meta.url)), "..");
  } catch {
    return resolve(process.cwd());
  }
})();
const FUNCTION_ROOT = resolve(ROOT, "supabase/functions");
const IMPORT_PATTERN =
  /^\s*(?:import\s*(?:type\s*)?(?:[\s\S]*?\sfrom\s*)?|export\s*(?:type\s*)?(?:[\s\S]*?\sfrom\s*)?)["']([^"']+)["']/gm;
const DYNAMIC_IMPORT_PATTERN = /\bimport\s*\(\s*["']([^"']+)["']/g;
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

// Git may materialize tracked source with CRLF while the Functions API returns
// LF. TypeScript semantics are unchanged, so compare the canonical LF form
// without normalizing any other byte.
export const normalizeRuntimeSource = (source) =>
  source.replaceAll("\r\n", "\n");

// Preserve quoted URL/string contents: treating the // inside an HTTPS import
// as a comment removes its closing quote and can swallow the next local import.
const stripComments = (source) => {
  const result = [...source];
  // Interpolations are code again, including nested templates and object braces.
  // This remains a bounded scanner, not a complete JavaScript/TypeScript parser.
  const frames = [{ kind: "code", interpolation: false, depth: 0 }];
  let comment = null;
  for (let index = 0; index < result.length; index++) {
    const char = result[index];
    const next = result[index + 1];
    if (comment) {
      if (comment === "line" && (char === "\n" || char === "\r")) {
        comment = null;
      } else if (comment === "block" && char === "*" && next === "/") {
        result[index] = result[++index] = " ";
        comment = null;
      } else if (char !== "\n" && char !== "\r") result[index] = " ";
      continue;
    }
    const frame = frames.at(-1);
    if (frame.kind === "string" || frame.kind === "template") {
      if (frame.escaped) frame.escaped = false;
      else if (char === "\\") frame.escaped = true;
      else if (char === frame.quote) frames.pop();
      else if (frame.kind === "template" && char === "$" && next === "{") {
        frames.push({ kind: "code", interpolation: true, depth: 0 });
        index++;
      }
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      frames.push({ kind: char === "`" ? "template" : "string", quote: char, escaped: false });
    } else if (char === "/" && (next === "/" || next === "*")) {
      comment = next === "/" ? "line" : "block";
      result[index] = result[++index] = " ";
    } else if (frame.interpolation && char === "{") {
      frame.depth++;
    } else if (frame.interpolation && char === "}") {
      if (frame.depth === 0) frames.pop();
      else frame.depth--;
    }
  }
  return result.join("");
};

export const relativeImportSpecifiers = (source) =>
  [
    ...stripComments(source).matchAll(IMPORT_PATTERN),
    ...stripComments(source).matchAll(DYNAMIC_IMPORT_PATTERN),
  ]
    .sort((a, b) => a.index - b.index)
    .map((match) => match[1])
    .filter((specifier) => specifier?.startsWith("."));

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

export const declaredLocalSourceClosure = (slug, runtimeDependencyPaths) => {
  const entrypoint = resolve(FUNCTION_ROOT, slug, "index.ts");
  if (!existsSync(entrypoint)) throw new Error(`${slug} entrypoint is missing`);
  const files = new Set();
  const visit = (file) => {
    if (files.has(file)) return;
    files.add(file);
    const source = readFileSync(file, "utf8");
    for (const specifier of relativeImportSpecifiers(source)) {
      const dependency = resolveRelativeImport(file, specifier);
      if (!dependency)
        throw new Error(
          `${localLogicalPath(
            file
          )} imports missing local dependency ${specifier}`
        );
      if (
        !dependency.startsWith(resolve(FUNCTION_ROOT, slug) + sep) &&
        !runtimeDependencyPaths.some((path) =>
          matchesRuntimeDependencyPath(
            `supabase/${localLogicalPath(dependency)}`,
            path
          )
        )
      ) {
        throw new Error(
          `${slug} imports undeclared runtime dependency ${localLogicalPath(
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
      normalizeRuntimeSource(readFileSync(file, "utf8")),
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
    for (const specifier of relativeImportSpecifiers(source)) {
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
      return [
        normalized.slice(marker),
        normalizeRuntimeSource(readFileSync(file, "utf8")),
      ];
    })
  );
};

export const sourceClosureFingerprint = (closure) =>
  sha256(
    [...closure.entries()]
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([path, source]) => `${path}\0${sha256(source)}`)
      .join("\n")
  );

export const assertSourceParity = ({
  slug,
  runtimeDependencyPaths,
  remoteSourceRoot,
}) => {
  const local = declaredLocalSourceClosure(slug, runtimeDependencyPaths);
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
