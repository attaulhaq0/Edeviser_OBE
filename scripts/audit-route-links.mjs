// Find <Link to="..."> and navigate("...") calls that point to routes that
// don't exist in src/router/AppRouter.tsx.
//
// Usage: node scripts/audit-route-links.mjs

import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (name === "node_modules" || name === "__tests__") continue;
      yield* walk(full);
    } else if (name.endsWith(".ts") || name.endsWith(".tsx")) {
      yield full;
    }
  }
}

// ─── Extract route patterns from AppRouter.tsx ─────────────────────────────
const routerSource = readFileSync("src/router/AppRouter.tsx", "utf8");
const routePatternRe = /<Route\s+(?:[^>]*?\s)?path=["']([^"']+)["']/g;
const parentPathRe = /path=["']\/([^"']+)\/\*["']/g;

// Build the canonical set of full route paths.
const fullPaths = new Set();
fullPaths.add("/");
fullPaths.add("/login");
fullPaths.add("/signup");
fullPaths.add("/reset-password");
fullPaths.add("/update-password");
fullPaths.add("/terms");
fullPaths.add("/privacy");

// Heuristic: collect every <Route path="x"> and split the file at each
// nested-route block. We approximate by listing all path strings and all
// "/<role>/*" wrappers, then stitching them.
const allPaths = [...routerSource.matchAll(routePatternRe)].map((m) => m[1]);

// Parent prefixes (admin/*, coordinator/* etc.)
const parents = ["admin", "coordinator", "teacher", "student", "parent"];

for (const p of allPaths) {
  if (p.startsWith("/")) {
    fullPaths.add(p);
    continue;
  }
  // For relative paths, prefix with each role.
  for (const parent of parents) {
    fullPaths.add(`/${parent}/${p}`);
  }
}

// Add wildcard route segments like /accept-invite/:token
fullPaths.add("/accept-invite/:token");
fullPaths.add("/portfolio/:student_id");

console.log(`Loaded ${fullPaths.size} route patterns from AppRouter.`);

// ─── Match a navigated URL against the route patterns ──────────────────────
function matchesRoute(url) {
  // Strip query string and trailing slash
  const clean = url.split("?")[0].replace(/\/$/, "") || "/";

  for (const pat of fullPaths) {
    // Escape all regex metacharacters (including backslashes) first, then
    // re-introduce the wildcard and ":param" segment placeholders. Escaping
    // up front avoids incomplete-sanitization issues where backslashes or
    // other special characters in the pattern could alter the regex.
    const escaped = pat.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(
      "^" +
        escaped
          .replace(/\\\*/g, ".*") // escaped "\*" wildcard -> match anything
          .replace(/:(\w+)/g, "[^/]+") + // ":param" -> single path segment
        "$"
    );
    if (re.test(clean)) return pat;
  }
  return null;
}

// ─── Scan src/ for Link to="..." and navigate("...") calls ────────────────
const findings = [];
const linkRe = /<Link\s+(?:[^>]*?\s)?to=["']([^"']+)["']/g;
const navigateRe = /\bnavigate\s*\(\s*[`"']([^`"'$]+)[`"']/g;

for (const file of walk("src")) {
  if (file.includes("AppRouter.tsx")) continue;
  const content = readFileSync(file, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, (m) => " ".repeat(m.length))
    .replace(/^[ \t]*\/\/.*$/gm, (m) => " ".repeat(m.length));

  for (const re of [linkRe, navigateRe]) {
    for (const match of content.matchAll(re)) {
      const url = match[1];
      // Skip external links
      if (/^https?:|^mailto:|^tel:|^#/.test(url)) continue;
      // Skip dynamic strings (template literals, variables)
      if (url.includes("$") || url.includes("`")) continue;
      // Empty path
      if (!url || url === "/") continue;

      const matched = matchesRoute(url);
      if (!matched) {
        findings.push({
          file: relative(".", file).replace(/\\/g, "/"),
          url,
          line: content.slice(0, match.index).split("\n").length,
        });
      }
    }
  }
}

// ─── Group findings by URL ──────────────────────────────────────────────────
const byUrl = new Map();
for (const f of findings) {
  if (!byUrl.has(f.url)) byUrl.set(f.url, []);
  byUrl.get(f.url).push(f);
}
const sorted = [...byUrl.entries()].sort((a, b) => b[1].length - a[1].length);

console.log("\n=== Broken Link/navigate URLs ===");
console.log(`Distinct broken URLs: ${sorted.length}`);
console.log(`Total occurrences: ${findings.length}\n`);

for (const [url, hits] of sorted) {
  console.log(`  [${hits.length}x] ${url}`);
  for (const h of hits.slice(0, 3)) {
    console.log(`      ${h.file}:${h.line}`);
  }
}

writeFileSync(
  "scripts/route-link-findings.json",
  JSON.stringify(
    { count: sorted.length, byUrl: Object.fromEntries(sorted) },
    null,
    2
  )
);
