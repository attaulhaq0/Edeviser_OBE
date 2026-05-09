// Pre-deployment audit — shared filesystem walker.
//
// Extracted from scripts/audit/security-scan.ts so every scanner can share
// one predicate-driven recursive walk. Filesystem APIs only — no globby
// dependency to keep the audit runner startup fast.

import { readdirSync, statSync } from "node:fs";
import { relative, sep } from "node:path";

export const walkFiles = (
  root: string,
  predicate: (filename: string) => boolean
): string[] => {
  const results: string[] = [];
  const stack = [root];
  while (stack.length > 0) {
    const current = stack.pop();
    if (current === undefined) continue;
    const entries = readdirSync(current);
    for (const name of entries) {
      const full = `${current}${sep}${name}`;
      const s = statSync(full);
      if (s.isDirectory()) {
        stack.push(full);
      } else if (predicate(name)) {
        results.push(full);
      }
    }
  }
  return results;
};

const TSX_EXTENSIONS = /\.(ts|tsx)$/;
const JSX_EXTENSIONS = /\.(jsx|tsx)$/;

export const isTsOrTsxFile = (name: string): boolean =>
  TSX_EXTENSIONS.test(name);

export const isJsxFile = (name: string): boolean => JSX_EXTENSIONS.test(name);

/**
 * True if the workspace-relative path is inside an audit-excluded area:
 * test files, vendored Shadcn UI primitives, and generated types. The
 * design system rules apply to our own code, not to vendored primitives
 * or test fixtures.
 */
export const isAuditExcluded = (absPath: string): boolean => {
  const rel = relative(process.cwd(), absPath);
  if (rel.includes(`${sep}__tests__${sep}`)) return true;
  if (rel.includes(`${sep}test${sep}`)) return true;
  if (rel.startsWith(`src${sep}components${sep}ui${sep}`)) return true;
  if (rel.startsWith(`src${sep}types${sep}`)) return true;
  if (rel.endsWith(".d.ts")) return true;
  return false;
};
