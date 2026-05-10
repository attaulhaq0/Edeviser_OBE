// Pre-deployment audit — icon-only button aria-label scanner.
//
// Implements Task 15.2 / Req 11.2: every `<button>` / `<Button>` / `<a>` /
// `<Link>` whose rendered children consist only of a Lucide icon must
// expose an accessible name via `aria-label`, `aria-labelledby`, or a
// `<span className="sr-only">` visually-hidden text child.
//
// Scanner is regex-based. The JSX we care about is small enough that a
// lightweight scan covers the real patterns without pulling in ts-morph.
// When an icon-only element fails the check, it's a Major finding per
// Req 11.5 — keyboard and screen-reader users cannot tell what the button
// does.

import { existsSync, readFileSync } from "node:fs";
import { relative, resolve, sep } from "node:path";

import { type Finding } from "./findings.ts";
import { walkFiles } from "./fs-walk.ts";

const TARGET_ROOTS = (): readonly string[] => [
  resolve("src", "components"),
  resolve("src", "pages"),
];

// Match opening tags for interactive elements that commonly host an icon.
// We only look at opening tags because the body-only-icon rule means the
// body is brief enough to fit in the same tag expression.
const INTERACTIVE_OPEN =
  /<(Button|button|a|Link|IconButton)\b([\s\S]*?)>([\s\S]*?)<\/\1>/g;

/** Heuristic: does the tag body consist only of a Lucide icon? */
const isIconOnlyBody = (body: string): boolean => {
  const stripped = body.replace(/\s+/g, "").trim();
  if (stripped.length === 0) return false;
  // Single self-closing icon like `<ChevronRight className="h-4 w-4" />`
  // (PascalCase component name, self-closing, at most one icon).
  const selfClosing = /^<([A-Z][A-Za-z0-9]*)\b[^>]*\/>$/;
  if (selfClosing.test(stripped)) return true;
  // Two icons with no text — still icon-only from an a11y perspective.
  const twoIcons =
    /^<([A-Z][A-Za-z0-9]*)\b[^>]*\/>\s*<([A-Z][A-Za-z0-9]*)\b[^>]*\/>$/;
  if (twoIcons.test(stripped)) return true;
  return false;
};

/** Does the tag have an accessible name? */
const hasAccessibleName = (attrs: string, body: string): boolean => {
  if (/\baria-label\s*=/.test(attrs)) return true;
  if (/\baria-labelledby\s*=/.test(attrs)) return true;
  if (/\btitle\s*=/.test(attrs)) return true;
  // Visually-hidden label in the body.
  if (
    /<span[^>]*className\s*=\s*["']([^"']*\b(?:sr-only|visually-hidden)\b[^"']*)["']/.test(
      body
    )
  ) {
    return true;
  }
  return false;
};

/** Files to ignore — vendored UI, tests, type shims. */
const isAuditExcluded = (absPath: string): boolean => {
  const rel = relative(process.cwd(), absPath);
  if (rel.startsWith(`src${sep}components${sep}ui${sep}`)) return true;
  if (rel.includes(`${sep}__tests__${sep}`)) return true;
  if (rel.includes(`${sep}test${sep}`)) return true;
  if (rel.endsWith(".d.ts")) return true;
  return false;
};

export const scanIconOnlyButtons = (): readonly Finding[] => {
  const findings: Finding[] = [];
  for (const root of TARGET_ROOTS()) {
    if (!existsSync(root)) continue;
    const files = walkFiles(root, (name) => /\.tsx$/.test(name)).filter(
      (f) => !isAuditExcluded(f)
    );
    for (const file of files) {
      const contents = readFileSync(file, "utf8");
      const rel = relative(process.cwd(), file).split(sep).join("/");
      INTERACTIVE_OPEN.lastIndex = 0;
      let match: RegExpExecArray | null = INTERACTIVE_OPEN.exec(contents);
      while (match !== null) {
        const [, tag, rawAttrs, body] = match;
        if (tag === undefined || rawAttrs === undefined || body === undefined) {
          match = INTERACTIVE_OPEN.exec(contents);
          continue;
        }
        if (!isIconOnlyBody(body)) {
          match = INTERACTIVE_OPEN.exec(contents);
          continue;
        }
        if (hasAccessibleName(rawAttrs, body)) {
          match = INTERACTIVE_OPEN.exec(contents);
          continue;
        }
        const prefix = contents.slice(0, match.index);
        const line = prefix.split("\n").length;
        findings.push({
          severity: "Major",
          requirementId: "11.2",
          message: `Icon-only <${tag}> in ${rel}:${line} has no accessible name (aria-label, aria-labelledby, title, or sr-only child). Keyboard and screen-reader users cannot tell what the control does.`,
          location: { file: rel, line },
          detail: {
            rule: "icon-only-missing-aria-label",
            tag,
            bodyPreview: body.slice(0, 80).replace(/\s+/g, " ").trim(),
          },
        });
        match = INTERACTIVE_OPEN.exec(contents);
      }
    }
  }
  return findings;
};
