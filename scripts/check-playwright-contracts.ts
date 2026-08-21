import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const extractPlaywrightProjectNames = (source: string): Set<string> =>
  new Set(
    [...source.matchAll(/\bname:\s*["']([^"']+)["']/g)]
      .map((match) => match[1])
      .filter((name): name is string => Boolean(name))
  );

export const extractWorkflowProjectReferences = (source: string): string[] =>
  [
    ...source.matchAll(
      /\bplaywright\s+test\b[^\r\n]*?--project(?:=|\s+)(["']?)([\w-]+)\1/g
    ),
  ]
    .map((match) => match[2])
    .filter((name): name is string => Boolean(name));

export const findMissingPlaywrightProjects = (
  configSource: string,
  workflowSources: readonly string[]
): string[] => {
  const configured = extractPlaywrightProjectNames(configSource);
  return [
    ...new Set(
      workflowSources
        .flatMap(extractWorkflowProjectReferences)
        .filter((name) => !configured.has(name))
    ),
  ].sort();
};

const isMain =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));

if (isMain) {
  const configSource = readFileSync("playwright.config.ts", "utf8");
  const workflowRoot = resolve(".github", "workflows");
  const workflowSources = readdirSync(workflowRoot)
    .filter((name) => /\.ya?ml$/.test(name))
    .map((name) => readFileSync(resolve(workflowRoot, name), "utf8"));
  const missing = findMissingPlaywrightProjects(configSource, workflowSources);
  if (missing.length > 0) {
    console.error(
      `Playwright workflow references missing project(s): ${missing.join(", ")}`
    );
    process.exitCode = 1;
  } else {
    console.log("Playwright workflow project contract: PASS");
  }
}
