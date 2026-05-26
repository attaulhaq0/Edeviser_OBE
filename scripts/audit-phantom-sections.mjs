// Phantom-section scanner: find page-level frontend files that look like
// real pages but have no actual backend connectivity (no supabase calls,
// no useQuery/useMutation, no hooks that talk to the DB).
//
// Heuristics:
// 1. File is a page-level component (under src/pages/<role>/)
// 2. File has no .from(), .rpc(), .functions.invoke() calls
// 3. File doesn't import from src/hooks/use*.ts (which is where DB hooks live)
// 4. File has UI primitives (Button, Card, etc.) — so it's a real page, not a layout
// 5. Optionally, file has hard-coded sample data (TODO: stretch goal)
//
// Also flags:
// - Forms with onSubmit that are no-ops or only toast()
// - Buttons with onClick={() => {}} or no onClick at all in places that look interactive
// - "Coming soon" / "Under construction" / "TODO" comments in pages
//
// Usage: node scripts/audit-phantom-sections.mjs
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (name === "node_modules" || name === "__tests__") continue;
      yield* walk(full);
    } else if (name.endsWith(".tsx")) {
      yield full;
    }
  }
}

const findings = [];

const HOOK_IMPORT_RE = /from ["']@\/hooks\/(use[A-Z]\w+)["']/g;
const SUPABASE_CALL_RE = /supabase\.(from|rpc|functions|storage|auth)\b/;
const STATE_HOOK_RE = /\b(useState|useReducer|useRef)\s*\(/;
const FORM_RE = /<form\b/;
const BUTTON_RE = /<Button\b/g;
const ON_CLICK_NOOP_RE = /onClick=\{\s*\(\)\s*=>\s*\{\s*\}\s*\}/;
// Match TODO/FIXME/coming-soon as actual identifiers, not in HTML attributes
// like placeholder="Type a name". So we look for them as words in JS contexts
// (after // or in strings clearly meant as code comments / status flags).
const TODO_RE = /(?:\/\/|\/\*)\s*(TODO|FIXME|XXX|HACK)\b|\b(Coming soon|Under construction|coming soon|under construction)\b/;
const NAVIGATE_RE = /navigate\s*\(\s*["']/;
const EMPTY_HANDLER_RE = /onClick=\{\s*\(\)\s*=>\s*\{\s*\/\*[^]*?\*\/\s*\}\s*\}/;
const HARDCODED_ARRAY_RE = /(?:const|let)\s+(?:items|data|rows|list)\s*=\s*\[/;
// Mock data heuristic: object literal with id and name fields hard-coded multiple times
const MOCK_DATA_RE = /\{\s*id:\s*["'`]\d+["'`]/g;

// Sub-component / shared component imports. If a page uses these, the
// backend connectivity might live in the imported component.
const COMPONENT_IMPORT_RE = /from ["'](@\/components\/[^"']+)["']/g;
// Imports of other pages (sub-pages, wizard steps)
const PAGE_IMPORT_RE = /from ["'](\.\/[A-Z][^"']+)["']/g;

for (const file of walk("src/pages")) {
  const rel = relative(".", file).replace(/\\/g, "/");
  // Skip layouts (they're routing wrappers, not pages)
  if (/Layout\.tsx$/.test(file)) continue;
  // Skip auth pages (LoginPage etc. are typically very minimal)
  if (rel.includes("/auth/")) continue;
  // Skip TanStack Table column defs (they don't need DB calls — they receive data via props)
  if (/\/columns\.tsx$/.test(rel)) continue;
  // Skip static legal pages
  if (/(TermsPage|PrivacyPage)\.tsx$/.test(rel)) continue;

  const content = readFileSync(file, "utf8");
  // Strip comments for analysis but keep originals for line lookup
  const code = content
    .replace(/\/\*[\s\S]*?\*\//g, (m) => " ".repeat(m.length))
    .replace(/^[ \t]*\/\/.*$/gm, (m) => " ".repeat(m.length));

  const reasons = [];

  // 1. No supabase calls?
  const hasSupabase = SUPABASE_CALL_RE.test(code);

  // 2. Imports from src/hooks/use* (DB hooks)?
  const hookImports = [...content.matchAll(HOOK_IMPORT_RE)].map((m) => m[1]);
  const hasDataHooks = hookImports.some(
    (h) =>
      // Filter out non-DB hooks
      !["useAuth", "useTheme", "useSidebar", "useTour", "useGuidedTour", "useDeferredMount", "useSearchParam"].includes(
        h
      )
  );

  // 2b. Imports from local files (sub-pages, sub-components, hooks not in @/hooks)?
  // If a page is just a wrapper that delegates to children, that's fine.
  const componentImports = [...content.matchAll(COMPONENT_IMPORT_RE)].map(
    (m) => m[1]
  );
  const pageImports = [...content.matchAll(PAGE_IMPORT_RE)].map((m) => m[1]);
  const isWrapper =
    (componentImports.length + pageImports.length) >= 2 && !hasSupabase;

  // 3. Is it a real page (has Card or significant JSX)?
  const hasUI = /(<Card|<Button|<Form\b|<Tabs|<Table)/.test(content);

  // 4. TODO / Coming soon markers?
  const todoMatch = content.match(TODO_RE);

  // 5. Hard-coded sample data?
  const mockMatches = [...content.matchAll(MOCK_DATA_RE)];
  const hasMockData = mockMatches.length >= 3;

  // 6. Forms with no real submit handler?
  const hasForm = FORM_RE.test(content);
  const onSubmitMatch = content.match(/onSubmit=\{[^}]*\}/);
  const formIsNoOp = hasForm && (
    !onSubmitMatch ||
    /onSubmit=\{\s*\(\)\s*=>\s*\{\s*\}/.test(onSubmitMatch[0]) ||
    /onSubmit=\{\s*\(\)\s*=>\s*toast/.test(onSubmitMatch[0])
  );

  // 7. Buttons with no-op onClick?
  const noOpButtons = [...content.matchAll(/<Button\b[^>]*onClick=\{\s*\(\)\s*=>\s*\{\s*\}/g)];

  // ─── Decide ─────────────────────────────────────────────────────────
  if (!hasUI) continue;

  // Pure phantom: no supabase, no DB hooks, and not a wrapper for child pages
  if (!hasSupabase && !hasDataHooks && !isWrapper) {
    reasons.push("no-backend-connectivity");
  }

  // Has TODO / Coming soon
  if (todoMatch) {
    reasons.push(`todo:${todoMatch[0].slice(0, 30)}`);
  }

  // Mock data
  if (hasMockData) {
    reasons.push(`mock-data:${mockMatches.length}-rows`);
  }

  // Form with no real submit
  if (formIsNoOp) {
    reasons.push("form-noop-submit");
  }

  if (noOpButtons.length > 0) {
    reasons.push(`noop-buttons:${noOpButtons.length}`);
  }

  if (reasons.length > 0) {
    findings.push({
      file: rel,
      reasons,
      hookImports: hookImports.slice(0, 5),
      hasSupabase,
      hasDataHooks,
    });
  }
}

// ─── Report ─────────────────────────────────────────────────────────
const phantom = findings.filter((f) => f.reasons.includes("no-backend-connectivity"));
const todoFlagged = findings.filter((f) => f.reasons.some((r) => r.startsWith("todo:")));
const mockFlagged = findings.filter((f) => f.reasons.some((r) => r.startsWith("mock-data:")));
const formFlagged = findings.filter((f) => f.reasons.includes("form-noop-submit"));
const noopBtnFlagged = findings.filter((f) => f.reasons.some((r) => r.startsWith("noop-buttons:")));

console.log("=== Phantom pages (no Supabase calls and no data hooks) ===");
console.log(`Count: ${phantom.length}\n`);
for (const f of phantom) {
  console.log(`  ${f.file}`);
}

console.log("\n=== Pages with TODO/coming soon/placeholder markers ===");
console.log(`Count: ${todoFlagged.length}\n`);
for (const f of todoFlagged) {
  const todo = f.reasons.find((r) => r.startsWith("todo:"));
  console.log(`  [${todo}] ${f.file}`);
}

console.log("\n=== Pages with hard-coded mock data ===");
console.log(`Count: ${mockFlagged.length}\n`);
for (const f of mockFlagged) {
  const mock = f.reasons.find((r) => r.startsWith("mock-data:"));
  console.log(`  [${mock}] ${f.file}`);
}

console.log("\n=== Pages with no-op form onSubmit ===");
console.log(`Count: ${formFlagged.length}\n`);
for (const f of formFlagged) {
  console.log(`  ${f.file}`);
}

console.log("\n=== Pages with no-op onClick handlers ===");
console.log(`Count: ${noopBtnFlagged.length}\n`);
for (const f of noopBtnFlagged) {
  const noop = f.reasons.find((r) => r.startsWith("noop-buttons:"));
  console.log(`  [${noop}] ${f.file}`);
}

writeFileSync(
  "scripts/phantom-section-findings.json",
  JSON.stringify({ phantom, todoFlagged, mockFlagged, formFlagged, noopBtnFlagged }, null, 2)
);
console.log("\nFull report: scripts/phantom-section-findings.json");
