#!/usr/bin/env node
// Read-only declaration contract: compares JSX Route leaves/layouts against
// dated ledger rows. No React execution, browser, auth, baseline write or DB.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const GROUPS = ["admin", "coordinator", "teacher", "student", "parent"];
const wrappers = new Set([
  "RouteGuard",
  "PublicMain",
  "RouteContentBoundary",
  "Fragment",
  "Suspense",
]);

function parse(name, source, kind) {
  const file = ts.createSourceFile(
    name,
    source,
    ts.ScriptTarget.Latest,
    true,
    kind
  );
  if (file.parseDiagnostics.length)
    throw new Error(
      `Invalid ${name}: ${file.parseDiagnostics
        .map((d) => ts.flattenDiagnosticMessageText(d.messageText, " "))
        .join("; ")}`
    );
  return file;
}
const jsxName = (tag, source) => tag.getText(source);
const propName = (property) => property.name?.getText() ?? "";

/** Resolve only literal, local criticalRouteSegments values; no module execution. */
export function resolveCriticalSegments(source) {
  const file = parse("criticalRoutes.ts", source, ts.ScriptKind.TS);
  const declarations = [];
  const visit = (node) => {
    if (
      ts.isVariableDeclaration(node) &&
      node.name.getText(file) === "criticalRouteSegments"
    )
      declarations.push(node);
    ts.forEachChild(node, visit);
  };
  visit(file);
  const initial = declarations[0]?.initializer;
  const literal =
    initial && ts.isAsExpression(initial) ? initial.expression : initial;
  if (
    declarations.length !== 1 ||
    !literal ||
    !ts.isObjectLiteralExpression(literal)
  )
    throw new Error("Critical route segments must be one literal object");
  const result = new Map();
  const walk = (node, prefix) => {
    for (const property of node.properties) {
      if (!ts.isPropertyAssignment(property))
        throw new Error("Unsupported critical route property");
      const name = propName(property);
      const key = prefix ? `${prefix}.${name}` : name;
      if (ts.isObjectLiteralExpression(property.initializer))
        walk(property.initializer, key);
      else if (ts.isStringLiteral(property.initializer))
        result.set(key, property.initializer.text);
      else throw new Error(`Critical route ${key} is not a literal segment`);
    }
  };
  walk(literal, "");
  return result;
}

function attributesOf(node) {
  return (ts.isJsxElement(node) ? node.openingElement : node).attributes
    .properties;
}
function attribute(attributes, name) {
  return attributes.filter(
    (part) => ts.isJsxAttribute(part) && part.name.text === name
  );
}
function elementOwner(attributes, file) {
  const elements = attribute(attributes, "element");
  if (
    elements.length !== 1 ||
    !ts.isJsxExpression(elements[0].initializer) ||
    !elements[0].initializer.expression
  )
    throw new Error("Every Route needs one explicit JSX element");
  const found = new Set();
  const guardRoles = [];
  const visit = (node) => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const name = jsxName(node.tagName, file);
      if (name === "RouteGuard") {
        const roles = attribute(node.attributes.properties, "allowedRoles");
        const expression = roles[0]?.initializer;
        if (
          roles.length !== 1 ||
          !ts.isJsxExpression(expression) ||
          !ts.isArrayLiteralExpression(expression.expression) ||
          expression.expression.elements.length !== 1 ||
          !ts.isStringLiteral(expression.expression.elements[0])
        )
          throw new Error("RouteGuard must declare one literal allowed role");
        guardRoles.push(expression.expression.elements[0].text);
      } else if (!wrappers.has(name)) found.add(name);
    }
    ts.forEachChild(node, visit);
  };
  visit(elements[0].initializer.expression);
  if (found.size !== 1 || guardRoles.length > 1)
    throw new Error(
      `Route element has ambiguous owner/guard: ${[...found].join(", ")}`
    );
  return { owner: [...found][0], guardRole: guardRoles[0] ?? null };
}
const concatenate = (parent, path) => {
  if (path.startsWith("/")) return path;
  if (!parent) return path;
  return `${parent.replace(/\/\*$/, "")}/${path}`;
};

export function readDeclaredRoutes(routerSource, criticalSource) {
  const file = parse("AppRouter.tsx", routerSource, ts.ScriptKind.TSX);
  const segments = resolveCriticalSegments(criticalSource);
  const routes = [];
  const visit = (node, parent = { path: "", group: "public" }) => {
    const route =
      (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) &&
      jsxName(
        ts.isJsxElement(node) ? node.openingElement.tagName : node.tagName,
        file
      ) === "Route";
    if (!route) {
      ts.forEachChild(node, (child) => visit(child, parent));
      return;
    }
    const attrs = attributesOf(node);
    const index = attribute(attrs, "index"),
      paths = attribute(attrs, "path");
    if (
      (index.length !== 1 && paths.length !== 1) ||
      index.length > 1 ||
      paths.length > 1 ||
      (index.length && paths.length)
    )
      throw new Error("Route must declare exactly one index or path");
    let path;
    if (index.length) {
      if (index[0].initializer)
        throw new Error("Index Route must use a bare index attribute");
      if (!parent.path) throw new Error("Index Route has no parent path");
      path = parent.path.replace(/\/\*$/, "");
    } else {
      const initializer = paths[0].initializer;
      let segment;
      if (ts.isStringLiteral(initializer)) segment = initializer.text;
      else if (
        ts.isJsxExpression(initializer) &&
        initializer.expression
          ?.getText(file)
          .startsWith("criticalRouteSegments.")
      ) {
        const name = initializer.expression
          .getText(file)
          .slice("criticalRouteSegments.".length);
        segment = segments.get(name);
      }
      if (!segment || typeof segment !== "string")
        throw new Error(
          `Unsupported Route path expression at ${
            file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1
          }`
        );
      path = concatenate(parent.path, segment);
    }
    const layout = GROUPS.find((group) => path === `/${group}/*`);
    const group =
      layout ??
      (parent.group !== "public"
        ? parent.group
        : GROUPS.find((name) => path.startsWith(`/${name}/`)) ?? "public");
    const { owner, guardRole } = elementOwner(attrs, file);
    if (
      (layout || (parent.group === "public" && group !== "public")) &&
      guardRole !== group
    )
      throw new Error(`RouteGuard role does not match ${group} route ${path}`);
    if (guardRole && guardRole !== group)
      throw new Error(`RouteGuard role does not match ${group} route ${path}`);
    const record = {
      kind: layout ? "layout" : "leaf",
      group,
      path,
      owner,
      line: file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1,
    };
    routes.push(record);
    if (ts.isJsxElement(node))
      node.children.forEach((child) => visit(child, { path, group }));
  };
  visit(file);
  if (!routes.length) throw new Error("No JSX Route declarations found");
  const keys = new Set();
  for (const route of routes) {
    const key = `${route.kind}:${route.group}:${route.path}`;
    if (keys.has(key)) throw new Error(`Duplicate declared Route: ${key}`);
    keys.add(key);
  }
  return routes;
}

export function readLedgerRoutes(content) {
  const start = content.indexOf(
    "## Complete declared-route migration inventory"
  );
  const stop = content.indexOf(
    "### Coverage boundary and next matrix expansion",
    start
  );
  if (start < 0 || stop <= start)
    throw new Error("Route ledger inventory boundaries missing");
  const records = [];
  const ids = new Set();
  for (const line of content.slice(start, stop).split(/\r?\n/)) {
    if (!/^\|\s*route-/.test(line)) continue;
    const cells = line.split("|").map((value) => value.trim());
    const id = cells[1];
    if (ids.has(id)) throw new Error(`Duplicate route inventory id: ${id}`);
    ids.add(id);
    if (cells.at(-2) !== "SOURCE_INVENTORIED")
      throw new Error(`Unreviewed ledger status: ${id}`);
    if (id.startsWith("route-surface-")) continue; // separate non-Route owner rows
    const group =
      id.match(
        /^route-(admin|coordinator|teacher|student|parent|public)-\d{3}$/
      )?.[1] ??
      id.match(
        /^route-layout-(admin|coordinator|teacher|student|parent)$/
      )?.[1];
    if (!group) throw new Error(`Unsupported ledger route id: ${id}`);
    const kind = id.startsWith("route-layout-") ? "layout" : "leaf";
    const path = cells[2]?.match(/^`([^`]+)`/)?.[1];
    const owner = kind === "leaf" ? cells[3]?.match(/^`([^`]+)`/)?.[1] : null;
    if (!path || (kind === "leaf" && !owner))
      throw new Error(`Ledger lacks path/owner: ${id}`);
    records.push({ id, kind, group, path, owner });
  }
  if (!records.length) throw new Error("No ledger route entries found");
  return records;
}

export function compareRouteInventory(
  routerSource,
  criticalSource,
  ledgerSource
) {
  const source = readDeclaredRoutes(routerSource, criticalSource);
  const ledger = readLedgerRoutes(ledgerSource);
  const key = (row) => `${row.kind}:${row.group}:${row.path}`;
  const expected = new Map(ledger.map((row) => [key(row), row]));
  const found = new Map(source.map((row) => [key(row), row]));
  const findings = [];
  for (const row of ledger) {
    const current = found.get(key(row));
    if (!current)
      findings.push({
        rule: "missing-source-route",
        id: row.id,
        path: row.path,
      });
    else if (row.kind === "leaf" && current.owner !== row.owner)
      findings.push({
        rule: "route-owner-drift",
        id: row.id,
        path: row.path,
        expected: row.owner,
        actual: current.owner,
      });
  }
  for (const row of source)
    if (!expected.has(key(row)))
      findings.push({
        rule: "unrecorded-source-route",
        id: null,
        path: row.path,
        actual: row.owner,
      });
  return {
    counts: {
      sourceLeaves: source.filter((row) => row.kind === "leaf").length,
      ledgerLeaves: ledger.filter((row) => row.kind === "leaf").length,
      sourceLayouts: source.filter((row) => row.kind === "layout").length,
      ledgerLayouts: ledger.filter((row) => row.kind === "layout").length,
    },
    findings,
  };
}

export function checkCurrentRepository(root = ROOT) {
  const load = (file) => readFileSync(resolve(root, file), "utf8");
  return compareRouteInventory(
    load("src/router/AppRouter.tsx"),
    load("src/lib/criticalRoutes.ts"),
    load("docs/audits/frontend-forensic-remediation-ledger.md")
  );
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    const result = checkCurrentRepository();
    if (result.findings.length) {
      for (const finding of result.findings)
        console.error(
          `${finding.rule}: ${finding.id ?? "new"} ${finding.path} ${
            finding.expected ?? ""
          } ${finding.actual ?? ""}`
        );
      process.exitCode = 1;
    } else
      console.log(
        `SOURCE_INVENTORY_MATCH leaves=${result.counts.sourceLeaves} layouts=${result.counts.sourceLayouts}; no rendered/authorized route verification performed`
      );
  } catch (error) {
    console.error(
      `SOURCE_INVENTORY_FAILED: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    process.exitCode = 1;
  }
}
