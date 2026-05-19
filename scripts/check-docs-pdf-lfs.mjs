import { readFileSync } from "node:fs";

const attributes = readFileSync(".gitattributes", "utf8");

const riskyPatterns = [
  /^docs\/pdf(?:\/\*\*\/\*\.pdf|\/\*\*|\/.*)?\s/i,
  /^\*\.pdf\s/i,
];

const offenders = attributes
  .split(/\r?\n/)
  .map((line, index) => ({ line: line.trim(), number: index + 1 }))
  .filter(({ line }) => line && !line.startsWith("#"))
  .filter(({ line }) => riskyPatterns.some((pattern) => pattern.test(line)))
  .filter(({ line }) => /\bfilter=lfs\b/i.test(line));

if (offenders.length > 0) {
  console.error(
    "docs/pdf PDFs must stay as normal Git blobs. LFS filters break Vercel clones for existing PDFs."
  );
  for (const offender of offenders) {
    console.error(`.gitattributes:${offender.number}: ${offender.line}`);
  }
  process.exit(1);
}

console.log("docs/pdf PDF Git attributes are deploy-safe.");
