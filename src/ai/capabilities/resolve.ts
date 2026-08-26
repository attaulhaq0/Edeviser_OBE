// Feature: Page Capability Matrix (tasks.md 3.2).
// Pure resolver: longest-pattern match wins; null = fail-closed (no assistant).
//
// DISPLAY/HINT ONLY — this resolver is NOT an authorization boundary. The
// server tool registry independently enforces role, context, and scope
// (authorizeScope) and RLS enforces data access; client capability data must
// never be treated as access control.

import PAGE_CAPABILITY_ROWS from "@/ai/capabilities/registry";
import type { PageCapabilityRow } from "@/ai/capabilities/types";

const normalize = (path: string): string => {
  const bare = path.split("?")[0]?.split("#")[0] ?? "/";
  const trimmed = bare.replace(/\/+$/, "");
  return trimmed === "" ? "/" : trimmed;
};

/** True when `pattern` matches `path` semantics (:param = one segment, * = rest). */
export const patternMatches = (pattern: string, path: string): boolean => {
  const p = normalize(pattern).split("/");
  const t = normalize(path).split("/");
  const star = p[p.length - 1] === "*";
  if (star) {
    if (t.length < p.length - 1) return false;
    return p.slice(0, -1).every((seg, i) => seg.startsWith(":") || seg === t[i]);
  }
  if (p.length !== t.length) return false;
  return p.every((seg, i) => seg.startsWith(":") || seg === t[i]);
};

/**
 * Resolve capabilities for a route path. Longest pattern wins.
 * Returns null when no row matches — callers must render NO assistant surface
 * on a null result (fail-closed).
 */
export const resolvePageCapabilities = (
  path: string,
  rows: readonly PageCapabilityRow[] = PAGE_CAPABILITY_ROWS,
): PageCapabilityRow | null => {
  const target = normalize(path);
  let best: PageCapabilityRow | null = null;
  let bestLen = -1;
  for (const row of rows) {
    if (!row.roles.length) continue;
    if (!patternMatches(row.pathPattern, target)) continue;
    const len = normalize(row.pathPattern).length;
    if (len > bestLen) {
      best = row;
      bestLen = len;
    }
  }
  return best;
};