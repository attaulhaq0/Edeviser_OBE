import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Project, SyntaxKind } from "ts-morph";

export interface CriticalE2EFinding {
  file: string;
  line: number;
  rule: string;
  message: string;
}

const lineAt = (source: string, position: number): number =>
  source.slice(0, position).split("\n").length;

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const analyzeCriticalE2ESource = (
  source: string,
  file = "critical.spec.ts"
): CriticalE2EFinding[] => {
  const normalizedFile = file.replace(/\\/g, "/");
  const isCritical =
    source.includes("@critical-e2e") ||
    normalizedFile.includes("/cross-role/") ||
    normalizedFile.endsWith("/critical-path.spec.ts");
  if (!isCritical) return [];

  const project = new Project({ useInMemoryFileSystem: true });
  const sourceFile = project.createSourceFile(file, source);
  const findings: CriticalE2EFinding[] = [];
  const add = (position: number, rule: string, message: string): void => {
    findings.push({ file, line: lineAt(source, position), rule, message });
  };

  for (const clause of sourceFile.getDescendantsOfKind(
    SyntaxKind.CatchClause
  )) {
    if (clause.getFullText().includes("@allow-critical-catch")) continue;
    add(
      clause.getStart(),
      "no-swallowed-catch",
      "Critical E2E catch clauses require an explicit documented exception"
    );
  }

  for (const statement of sourceFile.getDescendantsOfKind(
    SyntaxKind.IfStatement
  )) {
    if (
      statement.getExpression().getText().includes(".isVisible(") &&
      /\.(click|fill|check|selectOption)\s*\(/.test(
        statement.getThenStatement().getText()
      ) &&
      !statement.getElseStatement()
    ) {
      add(
        statement.getStart(),
        "no-conditional-required-action",
        "A required critical action cannot be conditional on locator visibility"
      );
    }
  }

  for (const call of sourceFile.getDescendantsOfKind(
    SyntaxKind.CallExpression
  )) {
    const expression = call.getExpression().getText();
    const text = call.getText();
    if (expression === "test.skip" || expression.endsWith(".test.skip")) {
      add(
        call.getStart(),
        "no-critical-skip",
        "Critical E2E scenarios cannot pass by skipping missing setup"
      );
    }
    if (
      expression.endsWith(".catch") &&
      call.getExpression().getText().includes("textContent") &&
      /=>\s*(?:["']0["']|0|true|null)/.test(text)
    ) {
      add(
        call.getStart(),
        "no-success-compatible-fallback",
        "Required locator data cannot default to a success-compatible value"
      );
    }
  }

  for (const match of source.matchAll(/@critical-control\s+([^\r\n]+)/g)) {
    const label = match[1]?.trim();
    if (!label) continue;
    const requiredControl = new RegExp(
      `getByRole\\([\\s\\S]{0,240}name:\\s*["'\\x60]${escapeRegExp(
        label
      )}["'\\x60][\\s\\S]{0,120}\\.click\\s*\\(`
    );
    if (!requiredControl.test(source)) {
      add(
        match.index ?? 0,
        "missing-critical-control",
        `Required critical control "${label}" is not unconditionally activated`
      );
    }
  }

  return findings;
};

const walkCriticalSpecs = (root: string): string[] => {
  if (!existsSync(root)) return [];
  const files: string[] = [];
  for (const name of readdirSync(root)) {
    const path = resolve(root, name);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      if (name !== "node_modules") files.push(...walkCriticalSpecs(path));
    } else if (name.endsWith(".spec.ts")) {
      files.push(path);
    }
  }
  return files;
};

export const checkCriticalE2EFiles = (
  root = resolve("tests", "e2e")
): CriticalE2EFinding[] =>
  walkCriticalSpecs(root).flatMap((path) =>
    analyzeCriticalE2ESource(
      readFileSync(path, "utf8"),
      relative(process.cwd(), path).replace(/\\/g, "/")
    )
  );

const isMain =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));

if (isMain) {
  const findings = checkCriticalE2EFiles();
  if (findings.length > 0) {
    for (const finding of findings) {
      console.error(
        `${finding.file}:${finding.line} [${finding.rule}] ${finding.message}`
      );
    }
    process.exitCode = 1;
  } else {
    console.log("Critical E2E no-swallow guard: PASS");
  }
}
