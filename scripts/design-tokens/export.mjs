#!/usr/bin/env node
// Export-only DTCG Format/Color 2025.10 pilot. tokens.css remains the ONE
// editable authority; light/dark groups are organization, not Resolver modes.
// No CSS generation, general token reader, alias resolver or runtime module load.
import { createHash } from "node:crypto";
import {
  readFileSync,
  writeFileSync,
  lstatSync,
  realpathSync,
  statSync,
} from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const SOURCE = "src/design-system/tokens.css";
export const OUTPUT =
  "docs/design-system/portable-tokens.generated.tokens.json";
export const FORMAT = "https://www.designtokens.org/TR/2025.10/format/";
const ROOT = fileURLToPath(new URL("../../", import.meta.url));
export const NAMES = [
  "background",
  "foreground",
  "card",
  "card-foreground",
  "primary",
  "primary-foreground",
  "action-primary-hover",
  "action-primary-active",
];
const scopes = { light: ":root", dark: ".dark" };
const selected = new Set(NAMES.map((name) => `--${name}`));
const normalText = (text) => text.replace(/\r\n/g, "\n");
const hash = (value) =>
  createHash("sha256").update(value, "utf8").digest("hex");
const inside = (root, path) => {
  const rel = relative(root, path);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
};

/** This is deliberately NOT a general CSS parser: only flat literal declarations. */
export function extractSelectedColors(css) {
  if (typeof css !== "string" || !css.trim())
    throw new Error("CSS token source is empty");
  const cleaned = normalText(css).replace(/\/\*[\s\S]*?\*\//g, "");
  const values = { light: new Map(), dark: new Map() };
  for (const rule of cleaned.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const scope = Object.entries(scopes).find(
      ([, selector]) => rule[1]?.trim() === selector
    )?.[0];
    if (!scope) continue;
    for (const declaration of (rule[2] ?? "").split(";")) {
      const colon = declaration.indexOf(":");
      if (colon < 0) continue;
      const name = declaration.slice(0, colon).trim();
      if (!selected.has(name)) continue;
      const value = declaration.slice(colon + 1).trim();
      if (!/^#[\da-f]{6}$/i.test(value))
        throw new Error(
          `${scope} ${name} must be one literal opaque six-digit hex color`
        );
      if (values[scope].has(name))
        throw new Error(
          `Duplicate ${scope} ${name}; no cascade guess is portable`
        );
      values[scope].set(name, value.toLowerCase());
    }
  }
  for (const scope of Object.keys(scopes))
    for (const name of NAMES) {
      if (!values[scope].has(`--${name}`))
        throw new Error(`Missing ${scope} --${name}`);
    }
  return Object.fromEntries(
    Object.keys(scopes).map((scope) => [
      scope,
      Object.fromEntries(
        NAMES.map((name) => [name, values[scope].get(`--${name}`)])
      ),
    ])
  );
}

const color = (hex) => ({
  $type: "color",
  $value: {
    colorSpace: "srgb",
    components: [1, 3, 5].map(
      (start) => parseInt(hex.slice(start, start + 2), 16) / 255
    ),
    hex,
  },
});

export function buildPortableColors(css) {
  const values = extractSelectedColors(css);
  const semantic = Object.fromEntries(
    Object.keys(scopes).map((scope) => [
      scope,
      Object.fromEntries(
        NAMES.map((name) => [name, color(values[scope][name])])
      ),
    ])
  );
  return {
    $description:
      "Generated export-only opaque semantic color pilot. Edit src/design-system/tokens.css, never this JSON. Light/dark groups are NOT DTCG Resolver modes or full component/theme adoption.",
    $extensions: {
      "org.edeviser.portablePilot": {
        formatVersion: "2025.10",
        source: SOURCE,
        sourceScope: "eight literal opaque semantic colors in :root and .dark",
        selectedDeclarationsSha256: hash(JSON.stringify(values)),
        writer: "CSS-to-DTCG only; no JSON Pointer, alias or context resolver",
      },
    },
    semantic,
  };
}

function safePaths(root) {
  const source = resolve(root, SOURCE),
    output = resolve(root, OUTPUT);
  const sourceInfo = lstatSync(source, { throwIfNoEntry: false });
  if (
    !sourceInfo?.isFile() ||
    sourceInfo.isSymbolicLink() ||
    statSync(source).size > 1024 * 1024 ||
    !inside(root, realpathSync(source))
  )
    throw new Error("Unsafe or missing canonical CSS source");
  const parent = resolve(root, "docs/design-system");
  const parentInfo = lstatSync(parent, { throwIfNoEntry: false });
  if (
    !parentInfo?.isDirectory() ||
    parentInfo.isSymbolicLink() ||
    !inside(root, realpathSync(parent))
  )
    throw new Error("Unsafe generated token directory");
  const outputInfo = lstatSync(output, { throwIfNoEntry: false });
  if (
    outputInfo &&
    (outputInfo.isSymbolicLink() ||
      !outputInfo.isFile() ||
      !inside(root, realpathSync(output)))
  )
    throw new Error("Unsafe generated token artifact");
  return { source, output };
}

/** --check is read-only; --write updates ONLY the one generated JSON. */
export function runPortableColors(mode, root = ROOT) {
  if (mode !== "check" && mode !== "write")
    throw new Error("Pass exactly --check or --write");
  root = realpathSync(resolve(root));
  const paths = safePaths(root);
  const document = buildPortableColors(readFileSync(paths.source, "utf8"));
  const expected = JSON.stringify(document, null, 2) + "\n";
  if (mode === "write") writeFileSync(paths.output, expected, "utf8");
  else {
    const current = lstatSync(paths.output, { throwIfNoEntry: false });
    if (!current || normalText(readFileSync(paths.output, "utf8")) !== expected)
      throw new Error(
        `Portable token artifact drift/missing: ${OUTPUT}; review CSS then regenerate explicitly`
      );
  }
  return {
    count: NAMES.length * Object.keys(scopes).length,
    source: SOURCE,
    output: OUTPUT,
    mode,
  };
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    if (
      process.argv.length !== 3 ||
      !["--check", "--write"].includes(process.argv[2])
    )
      throw new Error("Pass exactly --check or --write");
    const result = runPortableColors(process.argv[2].slice(2));
    console.log(
      `DTCG 2025.10 color pilot ${result.mode}: ${result.count} source-derived tokens; no CSS/runtime output`
    );
  } catch (error) {
    console.error(
      `Portable token export FAILED: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    process.exitCode = 1;
  }
}
