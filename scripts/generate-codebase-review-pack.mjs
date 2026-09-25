#!/usr/bin/env node
/**
 * Bounded review-preparation export. Never bundles source/PDFs or asserts live
 * DB, RLS, security, route rendering, deployment, or customer readiness.
 * Historical docs/codebase-review-pack artifacts are deliberately untouched.
 * Usage: node scripts/generate-codebase-review-pack.mjs --out <new-empty-path>
 */
import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_ROOT = fileURLToPath(new URL("../", import.meta.url));
const LEDGER_PATH = "docs/audits/frontend-forensic-remediation-ledger.md";
const MAX_LEDGER_BYTES = 2 * 1024 * 1024;
const routeId =
  /^route-(?:(?:admin|coordinator|teacher|student|parent|public)-\d{3}|layout-[a-z-]+|surface-[a-z-]+)$/;
const statusValues = ["verified", "unverified", "skipped", "failed"];
const inside = (parent, target) => {
  const rel = relative(parent, target);
  return (
    rel === "" ||
    (rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel))
  );
};
const hash = (content) =>
  createHash("sha256").update(content, "utf8").digest("hex");
const csv = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;

/** Inventory rows are evidence of the ledger snapshot, never runtime proof. */
export function parseInventory(ledger) {
  if (typeof ledger !== "string" || ledger.length === 0)
    throw new Error("Ledger is missing or empty");
  const start = ledger.indexOf(
    "## Complete declared-route migration inventory"
  );
  const stop = ledger.indexOf(
    "### Coverage boundary and next matrix expansion",
    start
  );
  if (start < 0 || stop <= start)
    throw new Error("Declared-route inventory boundaries are missing");
  const rows = [];
  const seen = new Set();
  const prefix = ledger.slice(0, start).split(/\r?\n/).length - 1;
  const lines = ledger.slice(start, stop).split(/\r?\n/);
  for (let offset = 0; offset < lines.length; offset++) {
    const line = lines[offset];
    if (!/^\|\s*route-/.test(line)) continue;
    const cells = line.split("|").map((part) => part.trim());
    const id = cells[1];
    if (!routeId.test(id) || seen.has(id))
      throw new Error(`Invalid or duplicate inventory id: ${id}`);
    const ledgerStatus = cells.at(-2);
    if (ledgerStatus !== "SOURCE_INVENTORIED")
      throw new Error(`Unreviewed inventory status for ${id}: ${ledgerStatus}`);
    const kind = id.startsWith("route-layout-")
      ? "layout"
      : id.startsWith("route-surface-")
      ? "supplemental"
      : "leaf";
    const path =
      kind === "leaf" ? cells[2]?.match(/^`([^`]+)`(?:\s|$)/)?.[1] : null;
    if (kind === "leaf" && (!path || path.length > 200 || /[\r\n]/.test(path)))
      throw new Error(`Invalid route pattern in ${id}`);
    seen.add(id);
    rows.push({
      id,
      kind,
      path,
      ledgerLine: prefix + offset + 1,
      ledgerStatus,
      verificationStatus: "unverified",
    });
  }
  if (rows.length === 0) throw new Error("No route inventory rows found");
  return rows.sort((a, b) => a.id.localeCompare(b.id));
}

export function buildReview(ledger) {
  const rows = parseInventory(ledger);
  const counts = Object.fromEntries(statusValues.map((status) => [status, 0]));
  counts.unverified = rows.length;
  return {
    schemaVersion: 1,
    source: {
      path: LEDGER_PATH,
      sha256: hash(ledger.replace(/\r\n/g, "\n")),
      kind: "dated-source-inventory-not-live-state",
    },
    checksExecuted: 0,
    routeCounts: {
      leaf: rows.filter((row) => row.kind === "leaf").length,
      layout: rows.filter((row) => row.kind === "layout").length,
      supplemental: rows.filter((row) => row.kind === "supplemental").length,
    },
    verificationCounts: counts,
    readiness: {
      implemented: "not_tested",
      connected: "not_tested",
      deployed: "not_tested",
      customerReady: "not_tested",
    },
    limitations: [
      "Source inventory is dated; this generator does not inspect current route modules or execute a browser.",
      "No runtime, RLS, secret-redaction, accreditation, deployment or performance check ran; zero failures is not a passing suite.",
      "Verified/skipped/failed are distinct statuses but require independently executed evidence; this export cannot grant them.",
      "Historical full-source PDFs and old CSVs remain untouched and must not be distributed as verified evidence.",
    ],
    routes: rows,
  };
}

function outputPath(root, output) {
  if (!output || !isAbsolute(output))
    throw new Error("--out must be a new absolute path outside the repository");
  const out = resolve(output);
  if (!/^edeviser-review-[a-z0-9-]+$/.test(basename(out)))
    throw new Error("--out directory must be named edeviser-review-<id>");
  if (existsSync(out) || lstatSync(out, { throwIfNoEntry: false }))
    throw new Error("Output exists; refusing to overwrite it");
  const parent = dirname(out);
  const parentStat = lstatSync(parent, { throwIfNoEntry: false });
  if (!parentStat?.isDirectory() || parentStat.isSymbolicLink())
    throw new Error("Output parent must be a real existing directory");
  const parentReal = realpathSync(parent);
  const resolvedOut = join(parentReal, basename(out));
  if (inside(root, resolvedOut) || inside(resolvedOut, root))
    throw new Error("Output must be separate from the repository");
  return { out: resolvedOut, parent: parentReal };
}

/** Prepare all bytes before atomically naming an output directory. */
export function runReview({ root = DEFAULT_ROOT, out } = {}) {
  const sourceRoot = realpathSync(resolve(root));
  const destination = outputPath(sourceRoot, out);
  const ledgerFile = resolve(sourceRoot, LEDGER_PATH);
  const info = lstatSync(ledgerFile, { throwIfNoEntry: false });
  if (
    !info?.isFile() ||
    info.isSymbolicLink() ||
    !inside(sourceRoot, realpathSync(ledgerFile))
  )
    throw new Error("Ledger must be a regular owned file");
  if (statSync(ledgerFile).size > MAX_LEDGER_BYTES)
    throw new Error("Ledger exceeds bounded input size");
  const report = buildReview(readFileSync(ledgerFile, "utf8"));
  const data = JSON.stringify(report, null, 2) + "\n";
  const header = [
    "inventory_id",
    "route_kind",
    "route_pattern",
    "ledger_line",
    "source_status",
    "verification_status",
  ];
  const table =
    [
      header,
      ...report.routes.map((row) => [
        row.id,
        row.kind,
        row.path,
        row.ledgerLine,
        row.ledgerStatus,
        row.verificationStatus,
      ]),
    ]
      .map((cells) => cells.map(csv).join(","))
      .join("\n") + "\n";
  const summary =
    `# Bounded codebase review preparation — NOT a verification certificate\n\n` +
    `Source: \`${LEDGER_PATH}\` (SHA-256 \`${report.source.sha256}\`).\n\n` +
    `This run performed **0 checks**. Ledger route declarations: **${report.routeCounts.leaf} leaves**, **${report.routeCounts.layout} layouts**, **${report.routeCounts.supplemental} supplemental surfaces**. ` +
    `Verification status for these inventory rows: ${report.verificationCounts.unverified} **unverified**, 0 verified, 0 skipped, 0 failed. ` +
    `The zero failed count has no passing-test meaning because no runtime checks were run.\n\n` +
    report.limitations.map((item) => `- ${item}`).join("\n") +
    "\n";
  let staging;
  try {
    staging = mkdtempSync(join(destination.parent, ".edeviser-review-stage-"));
    writeFileSync(join(staging, "manifest.json"), data, {
      encoding: "utf8",
      flag: "wx",
    });
    writeFileSync(join(staging, "route-status.csv"), table, {
      encoding: "utf8",
      flag: "wx",
    });
    writeFileSync(join(staging, "generation-report.md"), summary, {
      encoding: "utf8",
      flag: "wx",
    });
    if (readdirSync(staging).length !== 3)
      throw new Error("Incomplete prepared output");
    renameSync(staging, destination.out);
    staging = undefined;
  } finally {
    if (staging) rmSync(staging, { recursive: true, force: true });
  }
  return {
    counts: report.routeCounts,
    output: destination.out,
    checksExecuted: 0,
  };
}

function main(args) {
  if (args.length === 1 && args[0] === "--help") {
    console.log(
      "Usage: node scripts/generate-codebase-review-pack.mjs --out <new-absolute-edeviser-review-id> [--root <fixture-root>]"
    );
    return;
  }
  const options = {};
  for (let i = 0; i < args.length; i += 2) {
    const flag = args[i];
    if (!["--out", "--root"].includes(flag) || !args[i + 1] || options[flag])
      throw new Error(`Invalid or missing argument ${flag ?? "<none>"}`);
    options[flag] = args[i + 1];
  }
  const result = runReview({ root: options["--root"], out: options["--out"] });
  console.log(
    `Prepared ${result.counts.leaf} unverified route leaves and no execution claims in a separate output directory.`
  );
}

if (
  process.argv[1] &&
  realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error(
      `Review preparation FAILED: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    process.exitCode = 1;
  }
}
