#!/usr/bin/env node
// Repository documentation tooling only. Never evaluates application modules.
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync, statSync, lstatSync, realpathSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";
import { z } from "zod";

export const INPUT = "docs/design-system/catalog/pilot.json";
export const JSON_OUTPUT = "docs/design-system/catalog/catalog.generated.json";
export const MARKDOWN_OUTPUT = "docs/design-system/catalog/README.generated.md";
const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const word = z.string().trim().min(1);
const entrySchema = z.object({
  id: word.regex(/^[a-z][a-z0-9-]*$/), exportName: word,
  canonicalImport: z.enum(["@/design-system", "@/design-system/primitives", "@/design-system/patterns"]),
  purpose: word, status: z.enum(["recommended-scoped", "adopted-primitive", "compatibility-review"]),
  constraints: z.array(word).min(1), requiredStates: z.array(word).min(1),
  replacement: z.object({ kind: z.literal("review-candidate"), targetIds: z.array(word).min(1), note: word }).strict().nullable(),
  example: z.object({ path: word, exportName: word }).strict(),
  evidence: z.array(z.object({ kind: z.enum(["test-source", "review-document"]), path: word, scope: word }).strict()).min(1),
}).strict();
const schema = z.object({ schemaVersion: z.literal(1), scope: z.literal("pilot"), entries: z.array(entrySchema).min(1).max(12) }).strict();
const sort = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const slash = (value) => value.replaceAll("\\", "/");
/** Normalize physical CRLF text endings only; escaped \\r/\\n values remain intact. */
export const normalizeCatalogText = (value) => value.replace(/\r\n/g, "\n");
const digest = (value) => createHash("sha256").update(normalizeCatalogText(value), "utf8").digest("hex");
const read = (path) => normalizeCatalogText(readFileSync(path, "utf8"));
// path.relative can itself be absolute when Windows drive letters differ.
export function isRepositoryRelativePath(path) {
  return Boolean(path) && !isAbsolute(path) && !/^[A-Za-z]:/.test(path)
    && !path.includes("\\") && !path.startsWith("/")
    && !path.split("/").some((part) => part === ".." || part === ".");
}
const inside = (root, absolute) => isRepositoryRelativePath(slash(relative(root, absolute)));
function localPath(root, path) {
  if (!isRepositoryRelativePath(path)) throw new Error(`Expected repository-relative POSIX path: ${path}`);
  const absolute = resolve(root, path);
  if (!inside(root, absolute)) throw new Error(`Path outside repository: ${path}`);
  if (!existsSync(absolute)) throw new Error(`Missing catalog file: ${path}`);
  if (!inside(root, realpathSync(absolute))) throw new Error(`Catalog realpath escapes repository: ${path}`);
  if (!statSync(absolute).isFile()) throw new Error(`Missing catalog file: ${path}`);
  return absolute;
}
function outputPath(root, path) {
  const parts = path.split("/");
  let parent = root;
  for (const part of parts.slice(0, -1)) {
    parent = resolve(parent, part);
    const info = lstatSync(parent, { throwIfNoEntry: false });
    if (!info || info.isSymbolicLink() || !info.isDirectory() || !inside(root, realpathSync(parent))) {
      throw new Error(`Unsafe catalog output parent: ${path}`);
    }
  }
  const absolute = resolve(root, path);
  const info = lstatSync(absolute, { throwIfNoEntry: false });
  if (info && (info.isSymbolicLink() || !info.isFile() || !inside(root, realpathSync(absolute)))) {
    throw new Error(`Unsafe catalog output target: ${path}`);
  }
  return absolute;
}
function evidencePathAllowed(item) {
  if (!isRepositoryRelativePath(item.path) || item.path.split("/").some((part) => part.startsWith("."))) return false;
  return item.kind === "test-source"
    ? /^(?:src\/__tests__|tests)\/.+\.(?:test|spec)\.[cm]?[jt]sx?$/.test(item.path)
    : /^(?:docs|src\/design-system)\/.+\.md$/.test(item.path);
}
function validate(root, value) {
  const parsed = schema.parse(value);
  const byId = new Map();
  for (const entry of parsed.entries) {
    if (byId.has(entry.id)) throw new Error(`Duplicate catalog id: ${entry.id}`);
    byId.set(entry.id, entry);
    localPath(root, entry.example.path);
    if (!/\.tsx$/.test(entry.example.path)) throw new Error(`Expected typed TSX example: ${entry.id}`);
    const segregated = entry.example.path.includes("/compatibility");
    if ((entry.status === "compatibility-review") !== segregated) throw new Error(`Example status segregation mismatch: ${entry.id}`);
    for (const item of entry.evidence) {
      if ([JSON_OUTPUT, MARKDOWN_OUTPUT].includes(item.path)) throw new Error(`Generated output cannot be its own evidence/input: ${item.path}`);
      if (!evidencePathAllowed(item)) throw new Error(`Invalid ${item.kind} evidence path: ${item.path}`);
      localPath(root, item.path);
    }
  }
  for (const entry of parsed.entries) {
    for (const id of entry.replacement?.targetIds ?? []) {
      if (id === entry.id || !byId.has(id)) throw new Error(`Invalid replacement target ${id} in ${entry.id}`);
      if (byId.get(id).status === "compatibility-review") throw new Error(`Replacement must reference a recommended/adopted candidate: ${id}`);
    }
  }
  return parsed;
}

/** Build a bounded owned JSON snapshot; compiler objects never leave this function. */
export function buildCatalog(root = ROOT) {
  root = realpathSync(resolve(root));
  const input = validate(root, JSON.parse(read(localPath(root, INPUT))));
  const configPath = localPath(root, "tsconfig.json");
  const loaded = ts.readConfigFile(configPath, ts.sys.readFile);
  if (loaded.error) throw new Error(ts.flattenDiagnosticMessageText(loaded.error.messageText, "\n"));
  const config = ts.parseJsonConfigFileContent(loaded.config, ts.sys, root);
  if (config.errors.length) throw new Error(ts.formatDiagnostics(config.errors, { getCanonicalFileName: (f) => f, getCurrentDirectory: () => root, getNewLine: () => "\n" }));
  const resolveModule = (specifier) => {
    const found = ts.resolveModuleName(specifier, resolve(root, "__catalog__.ts"), config.options, ts.sys).resolvedModule;
    if (!found) throw new Error(`Cannot resolve public module: ${specifier}`);
    return found.resolvedFileName;
  };
  const modulePaths = new Map([...new Set(input.entries.map((entry) => entry.canonicalImport))].map((specifier) => [specifier, resolveModule(specifier)]));
  const examples = [...new Set(input.entries.map((entry) => localPath(root, entry.example.path)))];
  for (const file of examples) {
    if (/@ts-(?:ignore|nocheck|expect-error)\b/.test(read(file))) throw new Error(`Suppressed example diagnostics: ${slash(relative(root, file))}`);
  }
  const program = ts.createProgram({
    rootNames: [...modulePaths.values(), ...examples, ...config.fileNames.filter((file) => file.endsWith(".d.ts"))],
    options: { ...config.options, noEmit: true, incremental: false },
  });
  const diagnostics = ts.getPreEmitDiagnostics(program);
  if (diagnostics.length) throw new Error(ts.formatDiagnostics(diagnostics, { getCanonicalFileName: (f) => f, getCurrentDirectory: () => root, getNewLine: () => "\n" }));
  const checker = program.getTypeChecker();
  const unalias = (symbol) => {
    const seen = new Set();
    while (symbol && symbol.flags & ts.SymbolFlags.Alias) {
      if (seen.has(symbol)) throw new Error("Cyclic export alias");
      seen.add(symbol); symbol = checker.getAliasedSymbol(symbol);
    }
    return symbol;
  };
  const source = (file) => {
    const value = program.getSourceFile(file);
    if (!value) throw new Error(`Source unavailable: ${file}`);
    return value;
  };
  const exported = (file, name) => {
    const module = checker.getSymbolAtLocation(source(file));
    const symbol = module && checker.getExportsOfModule(module).find((item) => item.name === name);
    if (!symbol) throw new Error(`Missing public export ${name} in ${slash(relative(root, file))}`);
    return unalias(symbol);
  };
  const portableSourcePath = (file) => {
    const absolute = realpathSync(file);
    const path = slash(relative(root, absolute));
    if (isRepositoryRelativePath(path) && !path.startsWith("node_modules/")) return path;
    const marker = "/node_modules/";
    const full = slash(absolute);
    const packageStart = full.lastIndexOf(marker);
    if (packageStart >= 0) return `npm:${full.slice(packageStart + marker.length)}`;
    throw new Error("Outside-repository declaration has no portable package provenance");
  };
  const location = (node) => ({
    path: portableSourcePath(node.getSourceFile().fileName),
    line: node.getSourceFile().getLineAndCharacterOfPosition(node.getStart()).line + 1,
  });
  const textFlags = ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope;
  const safeText = (text) => {
    if (text.length > 24000 || text.includes(root) || /[A-Za-z]:[\\/]/.test(text)) throw new Error("Unbounded or host-specific API type text");
    return normalizeCatalogText(text);
  };
  const docs = (symbol) => normalizeCatalogText(ts.displayPartsToString(symbol.getDocumentationComment(checker))) || null;
  const isNative = (declaration) => /\/node_modules\/(?:@types\/react\/|typescript\/lib\/lib\.)/.test(slash(declaration.getSourceFile().fileName));
  const rows = input.entries.map((entry) => {
    const symbol = exported(modulePaths.get(entry.canonicalImport), entry.exportName);
    const declaration = symbol.valueDeclaration ?? symbol.declarations?.[0];
    if (!declaration) throw new Error(`No declaration for ${entry.id}`);
    const origin = location(declaration);
    if (!origin.path.startsWith("src/")) throw new Error(`Expected application-owned facade implementation: ${entry.id}`);
    const exampleFile = source(localPath(root, entry.example.path));
    const exampleSymbol = exported(exampleFile.fileName, entry.example.exportName);
    const exampleDeclaration = exampleSymbol.valueDeclaration ?? exampleSymbol.declarations?.[0];
    if (!exampleDeclaration || exampleDeclaration.getSourceFile() !== exampleFile) throw new Error(`Example must be declared in its named file: ${entry.id}`);
    let used = false;
    const visit = (node) => {
      if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && unalias(checker.getSymbolAtLocation(node.tagName)) === symbol) used = true;
      ts.forEachChild(node, visit);
    };
    visit(exampleDeclaration);
    if (!used) throw new Error(`Example does not render the catalog export: ${entry.id}`);
    let canonicalBinding = false;
    for (const statement of exampleFile.statements) {
      if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
      const bindings = statement.importClause?.namedBindings;
      if (!bindings || !ts.isNamedImports(bindings)) continue;
      for (const binding of bindings.elements) {
        if (unalias(checker.getSymbolAtLocation(binding.name)) !== symbol) continue;
        if (statement.moduleSpecifier.text !== entry.canonicalImport) throw new Error(`Noncanonical example import for ${entry.id}`);
        canonicalBinding = true;
      }
    }
    if (!canonicalBinding) throw new Error(`Missing canonical named import in example: ${entry.id}`);
    const component = checker.getTypeOfSymbolAtLocation(symbol, declaration);
    const signatures = component.getCallSignatures();
    if (!signatures.length) throw new Error(`Unsupported non-callable component: ${entry.id}`);
    const api = signatures.map((signature) => {
      const parameter = signature.getParameters()[0];
      if (!parameter) throw new Error(`Missing component props parameter: ${entry.id}`);
      const props = checker.getTypeOfSymbolAtLocation(parameter, declaration);
      const nativeSources = new Set();
      let nativeOmitted = 0;
      const properties = [];
      for (const property of props.getProperties()) {
        const declarations = property.getDeclarations() ?? [];
        // Omit only React/TypeScript native definitions, NOT arbitrary dependency
        // declarations: CVA/mapped variant properties must remain discoverable.
        if (declarations.length && declarations.every(isNative)) {
          nativeOmitted++;
          declarations.forEach((node) => nativeSources.add(location(node).path));
          continue;
        }
        const at = declarations[0] ?? declaration;
        properties.push({
          name: property.name,
          type: safeText(checker.typeToString(checker.getTypeOfSymbolAtLocation(property, at), declaration, textFlags)),
          optional: Boolean(property.flags & ts.SymbolFlags.Optional),
          documentation: docs(property),
          declarations: declarations.map(location).sort((a, b) => sort(a.path, b.path) || a.line - b.line),
        });
      }
      if (properties.length > 100) throw new Error(`Unbounded non-native API: ${entry.id}`);
      return {
        signature: safeText(checker.signatureToString(signature, declaration, textFlags)),
        propsType: safeText(checker.typeToString(props, declaration, textFlags)),
        properties: properties.sort((a, b) => sort(a.name, b.name)),
        inheritedNative: { omittedCount: nativeOmitted, sources: [...nativeSources].sort(sort), note: "Native React/DOM properties are not expanded here. Consult the source types; this is a partial API summary." },
      };
    });
    return {
      ...entry, implementation: origin, documentation: docs(symbol),
      jsDocTags: symbol.getJsDocTags(checker).map((tag) => ({ name: tag.name, text: normalizeCatalogText(ts.displayPartsToString(tag.text ?? [])) })),
      api,
    };
  }).sort((a, b) => sort(a.id, b.id));
  const inputs = new Set([INPUT, "tsconfig.json"]);
  for (const file of program.getSourceFiles()) {
    const path = portableSourcePath(file.fileName);
    if (!path.startsWith("npm:")) inputs.add(path);
  }
  // Evidence is reference-only: its content is not used to derive APIs. Validate
  // existence/kind/containment, but do not create drift loops for review updates.
  for (const path of ["scripts/design-catalog/generate.mjs", "package-lock.json"]) if (existsSync(resolve(root, path))) inputs.add(path);
  return {
    schemaVersion: 1, scope: "pilot", typescriptVersion: ts.version,
    limitations: [
      `${input.entries.length} selected entries in the repository pilot, not a complete component or route inventory; unlisted exports are unclassified.`,
      "Status is curated adoption guidance, not proof that every variant meets accessibility or visual requirements.",
      "Examples are typechecked source compositions, not rendered stories. Evidence paths establish source existence, not executed results; the remediation ledger owns verification history.",
      "API details are source-derived; native React/DOM props are explicitly omitted. Defaults and runtime behavior are not inferred or evaluated.",
      "Compatibility replacements are review candidates, never automatic drop-in migrations.",
      "Evidence documents/test sources are reference-only and are not content-derived API inputs or execution attestations. Their paths, kinds and real containment are validated; edits to reference content alone do not require regeneration. Curated metadata and compiler inputs do.",
      "Dependency declaration provenance uses portable npm: paths, not host drive paths. Generated output paths reject symbolic links/junctions; this local tooling is not an adversarial filesystem sandbox.",
      "Input SHA-256 values hash UTF-8 TEXT after physical CRLF-to-LF normalization, not raw binary bytes. Artifact comparison and extracted API/JSDoc/tag line endings use the same policy. Literal escape sequences, other content and whitespace remain significant; tokens and binary font/assets are not transformed.",
    ],
    inputs: [...inputs].sort(sort).map((path) => ({ path, sha256: digest(read(localPath(root, path))) })),
    entries: rows,
  };
}

export function renderMarkdown(catalog) {
  const lines = ["# Design-system component catalog — pilot", "", "Generated from `pilot.json` and the existing TypeScript sources. Do not edit this file or the generated JSON by hand.", "", "Run `node scripts/design-catalog/generate.mjs --check` to validate/drift-check; use `--write` explicitly to regenerate after reviewing source/metadata changes.", "", ...catalog.limitations.map((note) => `- ${note}`), ""];
  for (const entry of catalog.entries) {
    lines.push(`## ${entry.exportName} — ${entry.status}`, "", entry.purpose, "", `Import: \`import { ${entry.exportName} } from "${entry.canonicalImport}"\``, "", `Implementation: [${entry.implementation.path}:${entry.implementation.line}](../../../${entry.implementation.path}#L${entry.implementation.line})`, "", ...entry.constraints.map((note) => `- ${note}`), "", `Required review states: ${entry.requiredStates.join("; ")}.`, "", `Typed example: [${entry.example.exportName}](../../../${entry.example.path}). **Not a rendered story.**`, "");
    if (entry.replacement) lines.push(`Replacement candidates: ${entry.replacement.targetIds.join(", ")}. ${entry.replacement.note}`, "");
    if (entry.documentation) lines.push(entry.documentation, "");
    for (const api of entry.api) {
      lines.push("```ts", api.signature, "```", "", `Native properties omitted: ${api.inheritedNative.omittedCount}. ${api.inheritedNative.note}`, "", "| Source-derived property | Optional | Type |", "| --- | --- | --- |");
      for (const property of api.properties) lines.push(`| ${property.name} | ${property.optional ? "yes" : "no"} | \`${property.type.replaceAll("|", "\\|").replaceAll("`", "'").replaceAll("\n", " ")}\` |`);
      lines.push("");
    }
    lines.push("Evidence references (not execution attestation):", ...entry.evidence.map((item) => `- [${item.kind}](../../../${item.path}): ${item.scope}`), "");
  }
  return normalizeCatalogText(lines.join("\n"));
}

/** check is read-only; write changes only the two named documentation artifacts. */
export function runCatalog(mode = "check", root = ROOT) {
  if (mode !== "check" && mode !== "write") throw new Error(`Unknown catalog mode: ${mode}`);
  root = realpathSync(resolve(root));
  // Preflight both destinations before deriving/writing either artifact. Never
  // follow an existing artifact link or a linked output directory, even inward.
  const destinations = new Map([JSON_OUTPUT, MARKDOWN_OUTPUT].map((path) => [path, outputPath(root, path)]));
  const catalog = buildCatalog(root);
  const outputs = [[JSON_OUTPUT, `${JSON.stringify(catalog, null, 2)}\n`], [MARKDOWN_OUTPUT, renderMarkdown(catalog)]];
  for (const [path, content] of outputs) {
    const absolute = destinations.get(path);
    if (mode === "write") writeFileSync(absolute, content, "utf8");
    else if (!existsSync(absolute) || read(absolute) !== content) throw new Error(`Catalog drift/missing artifact: ${path}; review then run --write`);
  }
  return catalog.entries.length;
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    const args = process.argv.slice(2);
    if (args.length !== 1 || !["--check", "--write"].includes(args[0])) throw new Error("Usage: node scripts/design-catalog/generate.mjs --check|--write");
    console.log(`Catalog ${args[0].slice(2)}: ${runCatalog(args[0].slice(2))} pilot entries; no runtime modules evaluated.`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1;
  }
}
