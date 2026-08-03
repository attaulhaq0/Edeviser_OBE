// TEMP orphan scanner — lists src/components/shared/* files with ZERO references
// anywhere in src. Conservative: a candidate is an orphan ONLY if NO import path
// ending in `/<name>` (relative OR absolute) appears anywhere else. This catches
// `@/components/shared/X`, `./X`, `../shared/X`, and `vi.mock("...X")`. Erring
// toward "referenced" so we never false-positive-delete a used file. Read-only.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const SRC = join(process.cwd(), "src");
const sharedDir = join(SRC, "components", "shared");

const walk = (dir) => {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...walk(p));
    else if (/\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
};

const allFiles = walk(SRC);
const corpus = allFiles.map((p) => [p, readFileSync(p, "utf8")]);

const sharedFiles = readdirSync(sharedDir)
  .filter((n) => /\.(ts|tsx)$/.test(n))
  .map((n) => join(sharedDir, n));

const orphans = [];
for (const file of sharedFiles) {
  const nameNoExt = file.split(/[\\/]/).pop().replace(/\.(ts|tsx)$/, "");
  // Match any import specifier ending in `/<name>` followed by a quote.
  const needleDq = `/${nameNoExt}"`;
  const needleSq = `/${nameNoExt}'`;
  let refs = 0;
  for (const [p, content] of corpus) {
    if (p === file) continue;
    if (content.includes(needleDq) || content.includes(needleSq)) {
      refs++;
      break;
    }
  }
  if (refs === 0) orphans.push(nameNoExt);
}

orphans.sort();
console.log(`ORPHANS (${orphans.length}):`);
for (const o of orphans) console.log(o);
