// SCHEDULED FOR DELETION IN TASK 93 — see .kiro/specs/ui-consistency-global-fixes/tasks.md
//
// Feature: ui-consistency-global-fixes, Property 1: Bug Condition — UI Consistency Global Defects
// **Validates: Requirements 1.2, 1.3, 1.5, 1.10, 1.11, 1.13, 1.16, 1.18, 1.20, 1.21, 1.25, 1.26**
//
// CRITICAL: This test is DESIGNED to pass on the unfixed codebase. It encodes
// simplified static-analysis probes for a subset of the 26 `clause_1_n_holds(X)`
// predicates from design.md §2. The property succeeds when at least one probe
// surfaces a concrete counterexample — confirming `isBugCondition(X)` holds
// for the current build.
//
// DO NOT attempt to fix the defects surfaced here in this task — tasks 2+ own
// the remediation. This file is scheduled for deletion in task 93 once the
// per-clause FC/PC property tests (tasks 83–89) replace it.

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import * as fs from "fs";
import * as path from "path";

// ─── Types ──────────────────────────────────────────────────────────────────

type Role = "admin" | "coordinator" | "teacher" | "student" | "parent";
type Theme = "light" | "dark";
type Locale = "en" | "ar-QA";
type ProfileState = "new" | "resuming" | "completed-onboarding";
type DataState = "empty" | "populated" | "error";

interface UiStateTuple {
  role: Role;
  page: string;
  theme: Theme;
  locale: Locale;
  profileState: ProfileState;
  dataState: DataState;
}

interface ProbeResult {
  clause: string;
  found: string[];
}

// ─── Repo roots & glob helpers ──────────────────────────────────────────────

const projectRoot = path.resolve(__dirname, "../../..");
const srcRoot = path.join(projectRoot, "src");

interface WalkOptions {
  exts: readonly string[];
  skipDirs?: readonly string[];
}

const DEFAULT_SKIP_DIRS: readonly string[] = [
  "node_modules",
  "dist",
  "coverage",
  "__tests__",
  ".claude",
  ".git",
];

const walkFiles = (root: string, opts: WalkOptions): string[] => {
  const out: string[] = [];
  const skip = new Set([...(opts.skipDirs ?? []), ...DEFAULT_SKIP_DIRS]);
  const stack: string[] = [root];
  while (stack.length > 0) {
    const cur = stack.pop() as string;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(cur, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (skip.has(entry.name)) continue;
      const full = path.join(cur, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (opts.exts.includes(ext)) out.push(full);
      }
    }
  }
  return out;
};

const readText = (absPath: string): string => {
  try {
    return fs.readFileSync(absPath, "utf-8");
  } catch {
    return "";
  }
};

const rel = (absPath: string): string =>
  path.relative(projectRoot, absPath).replace(/\\/g, "/");

const lineNumberOf = (source: string, index: number): number => {
  let line = 1;
  for (let i = 0; i < index && i < source.length; i++) {
    if (source[i] === "\n") line++;
  }
  return line;
};

// ─── Probes ─────────────────────────────────────────────────────────────────

const BRAND_GRADIENT = "from-teal-500 to-blue-600";

// Clause 1.2 — rogue gradients on CTA buttons
const probeClause1_2 = async (): Promise<ProbeResult> => {
  const found: string[] = [];
  const files = walkFiles(srcRoot, { exts: [".tsx"] });
  // Match JSX opening tags that contain a gradient utility. The gradient may
  // appear on <Button>, <button>, or container elements; we flag any JSX tag
  // whose className has `bg-gradient-to-[rlbt]` paired with `from-...` where
  // the from-* + to-* combination is not the brand gradient.
  const tagRe =
    /<(Button|button)\b[^>]*className=(?:"([^"]*)"|\{`([^`]*)`\}|\{"([^"]*)"\})[^>]*>/g;
  for (const file of files) {
    const src = readText(file);
    let m: RegExpExecArray | null;
    while ((m = tagRe.exec(src)) !== null) {
      const cls = m[2] ?? m[3] ?? m[4] ?? "";
      if (!cls.includes("bg-gradient-to-")) continue;
      // Allow the brand gradient and tolerate additional classes around it.
      if (cls.includes(BRAND_GRADIENT)) continue;
      // Ignore gradients that aren't primary CTAs — e.g. `bg-clip-text` is
      // used on decorative text gradients, not button surfaces.
      if (cls.includes("bg-clip-text")) continue;
      const line = lineNumberOf(src, m.index);
      found.push(
        `${rel(file)}:${line} — non-brand button gradient: ${cls.trim()}`
      );
    }
  }
  return { clause: "1.2", found };
};

// Clause 1.3 — section cards with gradient header missing `overflow-hidden`
const probeClause1_3 = async (): Promise<ProbeResult> => {
  const found: string[] = [];
  const files = walkFiles(srcRoot, { exts: [".tsx"] });
  // Find every `<Card ...>` opening tag; if its inner class attribute lacks
  // `overflow-hidden` AND the file contains the brand gradient inline style,
  // flag the opening tag.
  const brandGradientStyle = "linear-gradient(93.65deg, #14B8A6";
  const cardOpenRe =
    /<Card\b[^>]*className=(?:"([^"]*)"|\{`([^`]*)`\}|\{"([^"]*)"\})[^>]*>/g;
  for (const file of files) {
    const src = readText(file);
    if (!src.includes(brandGradientStyle)) continue;
    let m: RegExpExecArray | null;
    while ((m = cardOpenRe.exec(src)) !== null) {
      const cls = m[1] ?? m[2] ?? m[3] ?? "";
      // Only flag Cards that appear to wrap a gradient header — look ahead
      // up to 400 chars for the brand gradient style. This avoids flagging
      // unrelated cards elsewhere in the same file.
      const slice = src.slice(m.index, m.index + 400);
      if (!slice.includes(brandGradientStyle)) continue;
      if (cls.includes("overflow-hidden")) continue;
      const line = lineNumberOf(src, m.index);
      found.push(
        `${rel(file)}:${line} — gradient header Card missing overflow-hidden`
      );
    }
  }
  return { clause: "1.3", found };
};

// Clause 1.5 — Shadcn Dialog/Sheet/Popover with black background classes
const probeClause1_5 = async (): Promise<ProbeResult> => {
  const found: string[] = [];
  const files = walkFiles(srcRoot, { exts: [".tsx"] });
  const darkClassRe =
    /\b(bg-black|bg-slate-900|bg-slate-950|bg-gray-900|bg-gray-950|bg-neutral-900|bg-neutral-950|bg-zinc-900|bg-zinc-950)\b/;
  const surfaceRe =
    /<(DialogContent|SheetContent|PopoverContent|DropdownMenuContent)\b[^>]*className=(?:"([^"]*)"|\{`([^`]*)`\}|\{"([^"]*)"\})[^>]*>/g;
  for (const file of files) {
    const src = readText(file);
    let m: RegExpExecArray | null;
    while ((m = surfaceRe.exec(src)) !== null) {
      const cls = m[2] ?? m[3] ?? m[4] ?? "";
      if (!darkClassRe.test(cls)) continue;
      const line = lineNumberOf(src, m.index);
      found.push(
        `${rel(file)}:${line} — ${m[1]} uses dark surface class: ${cls.trim()}`
      );
    }
  }
  return { clause: "1.5", found };
};

// Clause 1.10 — missing `.dark` variants on critical tokens in src/index.css
const probeClause1_10 = async (): Promise<ProbeResult> => {
  const found: string[] = [];
  const cssPath = path.join(srcRoot, "index.css");
  const src = readText(cssPath);
  // Extract the `.dark { ... }` block content (non-greedy across newlines).
  const darkBlockMatches = Array.from(src.matchAll(/\.dark\s*\{([\s\S]*?)\}/g));
  const darkBlockText = darkBlockMatches.map((m) => m[1] ?? "").join("\n");
  // Critical tokens per design.md ADR-01 that must have `.dark` entries. We
  // deliberately include tokens that are commonly omitted (foreground pairs
  // and the brand CTA text pin).
  const criticalTokens: readonly string[] = [
    "--destructive-foreground",
    "--card-foreground",
    "--popover-foreground",
    "--primary-foreground",
    "--muted-foreground",
  ];
  for (const token of criticalTokens) {
    if (!darkBlockText.includes(`${token}:`)) {
      found.push(`src/index.css — .dark block missing ${token}`);
    }
  }
  return { clause: "1.10", found };
};

// Clause 1.11 — LoginPage lacks a "Create account" / Sign up link
const probeClause1_11 = async (): Promise<ProbeResult> => {
  const found: string[] = [];
  const loginPath = path.join(srcRoot, "pages", "LoginPage.tsx");
  const src = readText(loginPath);
  if (!src) {
    found.push("src/pages/LoginPage.tsx — file not found");
    return { clause: "1.11", found };
  }
  const hasSignupRoute = /to=["']\/signup["']/.test(src);
  const hasSignupCopy = /(Create account|Sign up|Register)/i.test(src);
  if (!hasSignupRoute && !hasSignupCopy) {
    found.push(
      "src/pages/LoginPage.tsx — no '/signup' link and no 'Create account' / 'Sign up' copy"
    );
  }
  return { clause: "1.11", found };
};

// Clause 1.13 — role layouts lack a profile dropdown component
const probeClause1_13 = async (): Promise<ProbeResult> => {
  const found: string[] = [];
  const layouts: readonly string[] = [
    "pages/admin/AdminLayout.tsx",
    "pages/coordinator/CoordinatorLayout.tsx",
    "pages/teacher/TeacherLayout.tsx",
    "pages/student/StudentLayout.tsx",
    "pages/parent/ParentLayout.tsx",
  ];
  for (const relPath of layouts) {
    const full = path.join(srcRoot, relPath);
    const src = readText(full);
    if (!src) continue;
    const hasProfileDropdown = /ProfileDropdown|UserDropdown|UserMenu/.test(
      src
    );
    if (!hasProfileDropdown) {
      found.push(`src/${relPath} — no ProfileDropdown / UserMenu in top bar`);
    }
  }
  return { clause: "1.13", found };
};

// Clause 1.16 — role layouts lack a top-bar Settings icon button
const probeClause1_16 = async (): Promise<ProbeResult> => {
  const found: string[] = [];
  const layouts: readonly string[] = [
    "pages/admin/AdminLayout.tsx",
    "pages/coordinator/CoordinatorLayout.tsx",
    "pages/teacher/TeacherLayout.tsx",
    "pages/student/StudentLayout.tsx",
    "pages/parent/ParentLayout.tsx",
  ];
  for (const relPath of layouts) {
    const full = path.join(srcRoot, relPath);
    const src = readText(full);
    if (!src) continue;
    // Identify the top-bar header region and assert it renders a Settings
    // icon button. The expected landmark is the LanguageSwitcher row — the
    // Settings icon must appear near it.
    const topBarRe =
      /<div[^>]*className="[^"]*(?:flex items-center justify-end|justify-end)[^"]*"[^>]*>[\s\S]{0,400}LanguageSwitcher[\s\S]{0,400}<\/div>/;
    const topBarMatch = topBarRe.exec(src);
    const topBarSlice = topBarMatch?.[0] ?? "";
    // The sidebar "Settings" nav entry does not count — we require a top-bar
    // Settings icon button, which would appear inside the LanguageSwitcher row.
    const topBarHasSettings =
      topBarSlice.includes("Settings") || topBarSlice.includes("settings");
    if (!topBarHasSettings) {
      found.push(
        `src/${relPath} — top bar next to LanguageSwitcher has no Settings icon button`
      );
    }
  }
  return { clause: "1.16", found };
};

// Clause 1.18 — no `AvatarUpload` component exists / is used
const probeClause1_18 = async (): Promise<ProbeResult> => {
  const found: string[] = [];
  const componentPath = path.join(
    srcRoot,
    "components",
    "shared",
    "AvatarUpload.tsx"
  );
  if (!fs.existsSync(componentPath)) {
    found.push(
      "src/components/shared/AvatarUpload.tsx — component file does not exist"
    );
  }
  // Separately, scan pages for any usage of `<AvatarUpload` to cross-check.
  const files = walkFiles(srcRoot, { exts: [".tsx"] });
  let anyUsage = false;
  for (const file of files) {
    const src = readText(file);
    if (/<AvatarUpload\b/.test(src)) {
      anyUsage = true;
      break;
    }
  }
  if (!anyUsage) {
    found.push(
      "src/** — no JSX usage of <AvatarUpload ...> found anywhere in the app"
    );
  }
  return { clause: "1.18", found };
};

// Clause 1.20 — OnboardingWizard does not navigate() optimistically before
// awaiting processOnboarding.mutateAsync()
const probeClause1_20 = async (): Promise<ProbeResult> => {
  const found: string[] = [];
  const wizardPath = path.join(
    srcRoot,
    "pages",
    "student",
    "onboarding",
    "OnboardingWizard.tsx"
  );
  const src = readText(wizardPath);
  if (!src) {
    found.push(
      "src/pages/student/onboarding/OnboardingWizard.tsx — file not found"
    );
    return { clause: "1.20", found };
  }
  const mutateAsyncRe = /processOnboarding\.mutateAsync\s*\(/;
  const mutateAsyncMatch = mutateAsyncRe.exec(src);
  if (!mutateAsyncMatch) {
    found.push(
      "src/pages/student/onboarding/OnboardingWizard.tsx — processOnboarding.mutateAsync call not found"
    );
    return { clause: "1.20", found };
  }
  // The `navigate(...)` in question is the redirect to the dashboard route.
  // Find a navigate to `/student` (optionally `/student/dashboard`) and check
  // whether it appears BEFORE the mutateAsync call in source order.
  const navigateRe = /navigate\(\s*["']\/student(?:\/dashboard)?["']\s*\)/g;
  const navigateMatches = Array.from(src.matchAll(navigateRe));
  const optimisticBeforeMutation = navigateMatches.some(
    (nm) =>
      (nm.index ?? Number.MAX_SAFE_INTEGER) < (mutateAsyncMatch.index ?? 0)
  );
  if (!optimisticBeforeMutation) {
    const mutLine = lineNumberOf(src, mutateAsyncMatch.index ?? 0);
    found.push(
      `src/pages/student/onboarding/OnboardingWizard.tsx:${mutLine} — navigate() to /student not called before processOnboarding.mutateAsync()`
    );
  }
  return { clause: "1.20", found };
};

// Clause 1.21 — role dashboards missing a `WelcomeHero` / greeting hero
const probeClause1_21 = async (): Promise<ProbeResult> => {
  const found: string[] = [];
  const dashboards: readonly string[] = [
    "pages/admin/AdminDashboard.tsx",
    "pages/coordinator/CoordinatorDashboard.tsx",
    "pages/teacher/TeacherDashboard.tsx",
    "pages/parent/ParentDashboard.tsx",
  ];
  for (const relPath of dashboards) {
    const full = path.join(srcRoot, relPath);
    const src = readText(full);
    if (!src) continue;
    const hasWelcomeHero = /<WelcomeHero\b/.test(src);
    const hasGreetingHero = /greeting\s*\(/.test(src) && /0f172a/.test(src);
    if (!hasWelcomeHero && !hasGreetingHero) {
      found.push(
        `src/${relPath} — no <WelcomeHero /> and no inline greeting hero card`
      );
    }
  }
  return { clause: "1.21", found };
};

// Clause 1.25 — Switch bindings that call mutate without optimistic update
const probeClause1_25 = async (): Promise<ProbeResult> => {
  const found: string[] = [];
  // The canonical hook landmark is `src/hooks/useOptimisticToggle.ts`. If it
  // does not exist, any Switch wired to a mutation is by definition non-
  // optimistic (the design-ADR says this hook is the single source of truth).
  const hookPath = path.join(srcRoot, "hooks", "useOptimisticToggle.ts");
  const hookExists = fs.existsSync(hookPath);

  const files = walkFiles(srcRoot, { exts: [".tsx"] });
  const switchRe = /<Switch\b[^/>]*onCheckedChange=/g;
  for (const file of files) {
    const src = readText(file);
    let m: RegExpExecArray | null;
    while ((m = switchRe.exec(src)) !== null) {
      // Look at the 800-character window around the match for either an
      // explicit optimistic pattern or a reference to useOptimisticToggle.
      const windowStart = Math.max(0, m.index - 400);
      const window = src.slice(windowStart, m.index + 800);
      const hasOptimistic =
        window.includes("useOptimisticToggle") ||
        window.includes("onMutate") ||
        window.includes("setOptimistic");
      // A Switch wired to `field.onChange` (react-hook-form) is not a
      // mutation-bound toggle — it's local form state, not a network write.
      const isFormField = /onCheckedChange=\{\s*field\.onChange\s*\}/.test(
        m[0] + src.slice(m.index + m[0].length, m.index + m[0].length + 200)
      );
      if (isFormField) continue;
      if (hookExists && hasOptimistic) continue;
      const line = lineNumberOf(src, m.index);
      found.push(
        `${rel(
          file
        )}:${line} — Switch bound to mutation without optimistic update`
      );
    }
  }
  return { clause: "1.25", found };
};

// Clause 1.26 — JSX text nodes in pages/components that are plain English
// literals and are not wrapped in `t(...)` or a translation call
const probeClause1_26 = async (): Promise<ProbeResult> => {
  const found: string[] = [];
  const targetRoots = [
    path.join(srcRoot, "pages"),
    path.join(srcRoot, "components"),
  ];
  // Narrow allowlist of tokens that are allowed as bare JSX text per
  // design.md §8 / ADR-11 (library names, units, outcome acronyms).
  const allowlist: readonly string[] = [
    "MB",
    "KB",
    "%",
    "Edeviser",
    "ILO",
    "ILOs",
    "PLO",
    "PLOs",
    "CLO",
    "CLOs",
    "XP",
    "Bloom",
    "Bloom's",
    "©",
  ];
  // Only check text that looks like a real English phrase — starts with a
  // capital letter and has at least one space followed by another word.
  const textNodeRe = />\s*([A-Z][A-Za-z][A-Za-z ,'!&.:-]{4,80}?)\s*</g;
  const files = targetRoots.flatMap((r) => walkFiles(r, { exts: [".tsx"] }));
  // Stop after MAX_HITS counterexamples per clause to keep the log scannable.
  const MAX_HITS = 25;
  for (const file of files) {
    if (found.length >= MAX_HITS) break;
    const src = readText(file);
    let m: RegExpExecArray | null;
    while ((m = textNodeRe.exec(src)) !== null) {
      const text = (m[1] ?? "").trim();
      if (text.length === 0) continue;
      if (allowlist.some((a) => text === a)) continue;
      // Words-only filter: skip JSX fragments, template glue, and tag names.
      if (/^[A-Z][a-zA-Z]+$/.test(text)) continue; // single CamelCase identifier
      if (!text.includes(" ")) continue; // need at least one space
      // Skip obvious non-user-facing content like JSDoc / code examples.
      if (text.includes("=") || text.includes("/")) continue;
      // Skip if the matched text starts a sentence that is already wrapped
      // in `t(...)` — a quick heuristic: check the preceding 40 chars.
      const back = src.slice(Math.max(0, m.index - 40), m.index);
      if (/\bt\(\s*$/.test(back)) continue;
      const line = lineNumberOf(src, m.index);
      found.push(`${rel(file)}:${line} — hard-coded English text: "${text}"`);
      if (found.length >= MAX_HITS) break;
    }
  }
  return { clause: "1.26", found };
};

// ─── Generator for X — UI rendered-state tuple ──────────────────────────────

const routesByRole: Readonly<Record<Role, readonly string[]>> = {
  admin: [
    "/admin/dashboard",
    "/admin/users",
    "/admin/bonus-events",
    "/admin/badges/spotlight",
    "/admin/onboarding",
  ],
  coordinator: [
    "/coordinator/dashboard",
    "/coordinator/matrix",
    "/coordinator/cqi",
  ],
  teacher: ["/teacher/dashboard", "/teacher/grading", "/teacher/courses"],
  student: ["/student/dashboard", "/student/courses", "/student/habits"],
  parent: ["/parent/dashboard", "/parent/children", "/parent/progress"],
};

const uiStateArb: fc.Arbitrary<UiStateTuple> = fc
  .constantFrom<Role>("admin", "coordinator", "teacher", "student", "parent")
  .chain((role) =>
    fc.record({
      role: fc.constant(role),
      page: fc.constantFrom(...routesByRole[role]),
      theme: fc.constantFrom<Theme>("light", "dark"),
      locale: fc.constantFrom<Locale>("en", "ar-QA"),
      profileState: fc.constantFrom<ProfileState>(
        "new",
        "resuming",
        "completed-onboarding"
      ),
      dataState: fc.constantFrom<DataState>("empty", "populated", "error"),
    })
  );

// ─── Test ───────────────────────────────────────────────────────────────────

describe("Property 1 — UI Consistency Bug Condition C(X)", () => {
  // Run all probes once up front. The property below asserts that the union of
  // their findings is non-empty under every sampled state tuple — which is
  // sampling-independent because probes are static-source scans. Running 100
  // iterations is deliberate: it satisfies the project PBT convention and
  // exercises the generator over X without requiring real DOM mounting.

  let probeResults: ProbeResult[] = [];

  it("runs every clause probe and logs counterexamples for the PR description", async () => {
    probeResults = await Promise.all([
      probeClause1_2(),
      probeClause1_3(),
      probeClause1_5(),
      probeClause1_10(),
      probeClause1_11(),
      probeClause1_13(),
      probeClause1_16(),
      probeClause1_18(),
      probeClause1_20(),
      probeClause1_21(),
      probeClause1_25(),
      probeClause1_26(),
    ]);

    // Emit a clause-by-clause counterexample summary for the PR description.
    console.log("\n=== UI Consistency Bug Condition — probe results ===");
    for (const r of probeResults) {
      console.log(
        `\nClause 1.${r.clause.split(".")[1]} — ${
          r.found.length
        } counterexample(s):`
      );
      if (r.found.length === 0) {
        console.log("  (no defects found by this probe)");
      } else {
        for (const f of r.found.slice(0, 10)) {
          console.log(`  • ${f}`);
        }
        if (r.found.length > 10) {
          console.log(`  … and ${r.found.length - 10} more`);
        }
      }
    }
    console.log("=== end probe results ===\n");

    // Sanity: all probes ran.
    expect(probeResults).toHaveLength(12);
  });

  it("C(X) holds — at least one probe finds a defect for every sampled state X", () => {
    expect(probeResults.length).toBeGreaterThan(0);
    const anyProbeFoundDefects = probeResults.some((r) => r.found.length > 0);
    fc.assert(
      fc.property(uiStateArb, (_x: UiStateTuple) => {
        // The bug condition C(X) is the disjunction over the 26 predicates.
        // The probes above are a subset covering clauses 1.2, 1.3, 1.5, 1.10,
        // 1.11, 1.13, 1.16, 1.18, 1.20, 1.21, 1.25, 1.26 — if any one fires,
        // the bug is observable regardless of which X we picked.
        expect(anyProbeFoundDefects).toBe(true);
      }),
      { numRuns: 100 }
    );
  });
});
