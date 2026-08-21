import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Project, SyntaxKind } from "ts-morph";

export interface RouteContractFinding {
  rule: string;
  message: string;
}

const criticalLiteralPattern =
  /^\/(?:teacher\/(?:dashboard|assignments|grading)|student\/(?:dashboard|assignments|xp|xp-history))(?:\/|$)/;

export const findCriticalRouteLiterals = (
  source: string,
  file = "critical.spec.ts"
): string[] => {
  const normalizedFile = file.replace(/\\/g, "/");
  const isCritical =
    source.includes("@critical-e2e") ||
    normalizedFile.includes("/cross-role/") ||
    normalizedFile.endsWith("/critical-path.spec.ts");
  if (!isCritical) return [];
  const project = new Project({ useInMemoryFileSystem: true });
  const sourceFile = project.createSourceFile("critical.spec.ts", source);
  return sourceFile
    .getDescendantsOfKind(SyntaxKind.StringLiteral)
    .map((literal) => literal.getLiteralValue())
    .filter((value) => criticalLiteralPattern.test(value));
};

const requiredRouterBindings = [
  "criticalRouteSegments.teacher.dashboard",
  "criticalRouteSegments.teacher.assignments",
  "criticalRouteSegments.teacher.gradingQueue",
  "criticalRouteSegments.teacher.gradingSubmission",
  "criticalRouteSegments.student.dashboard",
  "criticalRouteSegments.student.assignments",
  "criticalRouteSegments.student.assignmentDetail",
  "criticalRouteSegments.student.xpHistory",
] as const;

export const validateCriticalRouteContracts = (
  routerSource: string,
  criticalSpecSources: readonly { file: string; source: string }[]
): RouteContractFinding[] => {
  const findings: RouteContractFinding[] = [];
  for (const binding of requiredRouterBindings) {
    if (!routerSource.includes(binding)) {
      findings.push({
        rule: "router-binding",
        message: `AppRouter is missing canonical binding ${binding}`,
      });
    }
  }
  for (const { file, source } of criticalSpecSources) {
    for (const literal of findCriticalRouteLiterals(source, file)) {
      findings.push({
        rule: "stale-critical-route-literal",
        message: `Critical E2E route must use criticalRoutes, not "${literal}"`,
      });
    }
  }
  return findings;
};

const isMain =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));

if (isMain) {
  const routerSource = readFileSync("src/router/AppRouter.tsx", "utf8");
  const walk = (root: string): string[] => {
    if (!existsSync(root)) return [];
    return readdirSync(root).flatMap((name) => {
      const path = resolve(root, name);
      if (statSync(path).isDirectory()) return walk(path);
      return name.endsWith(".spec.ts") ? [path] : [];
    });
  };
  const specSources = walk(resolve("tests", "e2e")).map((path) => ({
    file: relative(process.cwd(), path).replace(/\\/g, "/"),
    source: readFileSync(path, "utf8"),
  }));
  const findings = validateCriticalRouteContracts(routerSource, specSources);
  if (findings.length > 0) {
    for (const finding of findings) {
      console.error(`[${finding.rule}] ${finding.message}`);
    }
    process.exitCode = 1;
  } else {
    console.log("Critical E2E route contract guard: PASS");
  }
}
