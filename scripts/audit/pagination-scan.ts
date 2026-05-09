// Pre-deployment audit — list-page pagination scan.
//
// Implements Task 14.3 / Req 12.3: every list page MUST paginate or
// virtualize its primary data table. Per requirements.md §12.3: "every list
// page under src/pages/ paginates or virtualizes its primary data table".
// An unbounded list query on a 10k-row table will ship all 10k rows to the
// client, breaking TTI budgets and burning bandwidth.
//
// Detection heuristics (in order of preference):
//   1. Hook call receives a pagination object: `useX({ page })`, `useX({
//      pagination: {...} })`, `useX({ pageSize })`, or positional form
//      `useX(pagination, ...)`.
//   2. Page uses `useVirtualizer` from `@tanstack/react-virtual`.
//   3. Page uses `useInfiniteQuery` from `@tanstack/react-query`.
//   4. Direct `.limit(...)` or `.range(...)` on a supabase query in the page.
//
// Any list page (src/pages/**/*ListPage.tsx) that doesn't match at least
// one of those heuristics is a Major finding.
//
// False-positive control:
//   - Files listed in audit/baselines/pagination-exceptions.json are
//     suppressed with a documented rationale.

import { existsSync, readFileSync } from "node:fs";
import { relative, resolve, sep } from "node:path";

import { type Finding } from "./findings.ts";
import { walkFiles } from "./fs-walk.ts";

const PAGES_ROOT = (): string => resolve("src", "pages");

// ─── Pagination signal detectors ───────────────────────────────────────────

/**
 * Signals that a page uses pagination / virtualization. Each regex is tested
 * against the file contents; a match means the page is pagination-compliant.
 */
const PAGINATION_SIGNALS: ReadonlyArray<{
  readonly name: string;
  readonly regex: RegExp;
}> = [
  {
    name: "hook-with-page-key-any-arg",
    // Matches a TanStack Query-style hook invocation `use<X>(…)` whose
    // argument list contains a `{ ... page ... }`, `{ ... pageSize ... }`,
    // or `{ ... pagination ... }` object. This handles both the first-arg
    // form `useX({ page })` and the second-arg form `useX(filter, { page })`.
    //
    // The `[^)]*` allows any characters (including newlines via the `s`
    // flag) between `use<X>(` and the pagination object as long as no
    // closing paren appears first. That keeps us inside a single hook
    // invocation without needing a full JS parser.
    regex: /use[A-Z]\w*\s*\(\s*[^)]*?\{[^}]*\b(?:page|pageSize|pagination)\b/s,
  },
  {
    name: "hook-with-pagination-positional",
    // use<X>(pagination ...)  where pagination is a typed variable
    regex: /use[A-Z]\w*\(\s*pagination\b/,
  },
  {
    name: "virtualizer",
    regex: /\buseVirtualizer\s*\(/,
  },
  {
    name: "infinite-query",
    regex: /\buseInfiniteQuery\s*\(/,
  },
  {
    name: "direct-limit",
    regex: /\.\s*limit\s*\(/,
  },
  {
    name: "direct-range",
    regex: /\.\s*range\s*\(/,
  },
  {
    name: "nuqs-page-param",
    // nuqs URL-param pagination; the hook reads `page` from URL state.
    regex: /useQueryState\s*\(\s*['"`]page['"`]/,
  },
  {
    name: "local-page-state",
    // `useState(1)` held in a `page` variable feeds a hook. When a file
    // declares `const [page, setPage] = useState(...)` the author is
    // tracking a page index — a strong signal pagination is in play even
    // if the hook invocation falls outside our lookahead budget.
    regex: /const\s*\[\s*page\s*,\s*set[A-Z]\w*\s*\]\s*=\s*useState/,
  },
];

// ─── Exception baseline loader ─────────────────────────────────────────────

interface PaginationExceptionEntry {
  readonly file: string;
  readonly rationale: string;
  readonly expiresAt?: string;
}

interface PaginationExceptionBaseline {
  readonly fileLevel?: readonly PaginationExceptionEntry[];
}

const EXCEPTION_PATH = (): string =>
  resolve("audit", "baselines", "pagination-exceptions.json");

interface ExceptionCheck {
  readonly suppressed: boolean;
  readonly rationale: string | null;
  readonly expired: boolean;
}

const loadExceptions = (
  now: Date = new Date()
): ((filePath: string) => ExceptionCheck) => {
  const path = EXCEPTION_PATH();
  if (!existsSync(path)) {
    return () => ({ suppressed: false, rationale: null, expired: false });
  }
  let baseline: PaginationExceptionBaseline;
  try {
    baseline = JSON.parse(
      readFileSync(path, "utf8")
    ) as PaginationExceptionBaseline;
  } catch {
    return () => ({ suppressed: false, rationale: null, expired: false });
  }
  const entries = baseline.fileLevel ?? [];
  const byFile = new Map<string, PaginationExceptionEntry>();
  for (const entry of entries) {
    byFile.set(entry.file.split("\\").join("/"), entry);
  }

  return (filePath: string): ExceptionCheck => {
    const normalised = relative(process.cwd(), filePath).split(sep).join("/");
    const entry = byFile.get(normalised);
    if (entry === undefined) {
      return { suppressed: false, rationale: null, expired: false };
    }
    if (entry.expiresAt) {
      const exp = new Date(entry.expiresAt);
      if (Number.isFinite(exp.getTime()) && exp.getTime() <= now.getTime()) {
        return { suppressed: false, rationale: entry.rationale, expired: true };
      }
    }
    return { suppressed: true, rationale: entry.rationale, expired: false };
  };
};

// ─── Scanner ──────────────────────────────────────────────────────────────

const isListPage = (name: string): boolean => /ListPage\.tsx$/.test(name);

export const scanListPagePagination = (
  now: Date = new Date()
): readonly Finding[] => {
  const root = PAGES_ROOT();
  if (!existsSync(root)) return [];

  const files = walkFiles(root, isListPage);
  const findings: Finding[] = [];
  const checkException = loadExceptions(now);

  for (const file of files) {
    const contents = readFileSync(file, "utf8");
    const exceptionCheck = checkException(file);
    if (exceptionCheck.suppressed) continue;

    const matchedSignals = PAGINATION_SIGNALS.filter((s) =>
      s.regex.test(contents)
    ).map((s) => s.name);

    if (matchedSignals.length > 0) continue;

    const relPath = relative(process.cwd(), file).split(sep).join("/");
    if (exceptionCheck.expired) {
      findings.push({
        severity: "Minor",
        requirementId: "12.3",
        message: `List page ${relPath} has no pagination signal AND its suppression window has expired. ${
          exceptionCheck.rationale ?? ""
        } Resolve by adding pagination or renewing the exception with a new expiresAt.`,
        location: { file: relPath },
        detail: {
          rule: "list-page-missing-pagination",
          expiredException: true,
          rationale: exceptionCheck.rationale,
        },
      });
    } else {
      findings.push({
        severity: "Major",
        requirementId: "12.3",
        message: `List page ${relPath} does not paginate or virtualize. An unbounded list query will fetch all rows and break TTI budgets on large tables. Use \`use<X>({ page })\`, \`useVirtualizer\`, \`useInfiniteQuery\`, or add \`.limit()\` to the query per requirements.md §12.3.`,
        location: { file: relPath },
        detail: {
          rule: "list-page-missing-pagination",
        },
      });
    }
  }

  return findings;
};
