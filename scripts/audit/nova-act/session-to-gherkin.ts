// scripts/audit/nova-act/session-to-gherkin.ts
//
// Task 21.9 / Req 18.3: Converts Nova Act session YAML to Gherkin feature files.
//
// Nova Act records each journey as a structured trajectory YAML file.
// This converter reads those files and produces Gherkin .feature files
// that can be used as living documentation and regression test stubs.
//
// Input format (session YAML):
//   role: admin
//   journey: ilo-creation
//   intent: "Create a new ILO"
//   steps:
//     - action: navigate
//       url: /admin/ilos
//     - action: click
//       selector: "Add ILO button"
//     - action: fill
//       field: title
//       value: "Test ILO"
//     - action: submit
//   outcome: success | failure | partial
//   blockers: []
//   screenshots: [step-1.png, step-2.png]
//
// Output format (Gherkin):
//   Feature: Admin ILO Creation
//     Scenario: Admin creates a new ILO
//       Given I am logged in as admin
//       When I navigate to /admin/ilos
//       And I click the "Add ILO button"
//       And I fill in "title" with "Test ILO"
//       And I submit the form
//       Then the ILO should be created successfully

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { resolve, join } from "node:path";

// ─── Types ────────────────────────────────────────────────────────────────

interface SessionStep {
  readonly action: string;
  readonly url?: string;
  readonly selector?: string;
  readonly field?: string;
  readonly value?: string;
  readonly description?: string;
}

interface SessionYaml {
  readonly role: string;
  readonly journey: string;
  readonly intent: string;
  readonly steps: readonly SessionStep[];
  readonly outcome: "success" | "failure" | "partial";
  readonly blockers: readonly string[];
  readonly screenshots: readonly string[];
}

// ─── YAML parser (minimal, no external dep) ───────────────────────────────
// Nova Act sessions are simple YAML — we parse only what we need.

const parseSimpleYaml = (content: string): Record<string, unknown> => {
  // This is a minimal YAML parser for the specific session format.
  // For production use, replace with a proper YAML library.
  const result: Record<string, unknown> = {};
  const lines = content.split("\n");
  let currentKey = "";
  let currentList: unknown[] = [];
  let inList = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    if (trimmed.startsWith("- ")) {
      if (inList) {
        currentList.push(trimmed.slice(2).replace(/^["']|["']$/g, ""));
      }
    } else if (trimmed.includes(":")) {
      if (inList && currentKey) {
        result[currentKey] = currentList;
        currentList = [];
        inList = false;
      }
      const colonIdx = trimmed.indexOf(":");
      const key = trimmed.slice(0, colonIdx).trim();
      const value = trimmed.slice(colonIdx + 1).trim();
      if (value === "") {
        currentKey = key;
        currentList = [];
        inList = true;
      } else {
        result[key] = value.replace(/^["']|["']$/g, "");
      }
    }
  }

  if (inList && currentKey) {
    result[currentKey] = currentList;
  }

  return result;
};

// ─── Step to Gherkin converter ────────────────────────────────────────────

const stepToGherkin = (step: SessionStep, index: number): string => {
  const keyword = index === 0 ? "When" : "And";

  switch (step.action) {
    case "navigate":
      return `${keyword} I navigate to "${step.url ?? "/"}"`;
    case "click":
      return `${keyword} I click the "${step.selector ?? "button"}"`;
    case "fill":
      return `${keyword} I fill in "${step.field ?? "field"}" with "${
        step.value ?? ""
      }"`;
    case "submit":
      return `${keyword} I submit the form`;
    case "assert":
      return `Then ${step.description ?? "the action succeeds"}`;
    case "wait":
      return `${keyword} I wait for "${
        step.description ?? "the page to load"
      }"`;
    default:
      return `${keyword} I ${step.action}${
        step.description ? ` "${step.description}"` : ""
      }`;
  }
};

// ─── Session to Gherkin converter ─────────────────────────────────────────

export const sessionToGherkin = (session: SessionYaml): string => {
  const featureName = `${capitalize(session.role)} ${formatJourneyName(
    session.journey
  )}`;
  const scenarioName = session.intent;

  const lines: string[] = [];
  lines.push(`Feature: ${featureName}`);
  lines.push(`  # Generated from Nova Act session trajectory`);
  lines.push(`  # Role: ${session.role}, Journey: ${session.journey}`);
  lines.push(`  # Outcome: ${session.outcome}`);
  lines.push("");
  lines.push(`  Scenario: ${scenarioName}`);
  lines.push(`    Given I am logged in as ${session.role}`);

  for (let i = 0; i < session.steps.length; i++) {
    lines.push(`    ${stepToGherkin(session.steps[i], i)}`);
  }

  if (session.outcome === "success") {
    lines.push(`    Then the journey completes successfully`);
  } else if (session.outcome === "failure") {
    lines.push(`    Then the journey fails with blockers:`);
    for (const blocker of session.blockers) {
      lines.push(`      | ${blocker} |`);
    }
  } else {
    lines.push(`    Then the journey partially completes`);
  }

  if (session.screenshots.length > 0) {
    lines.push("");
    lines.push(`  # Screenshots: ${session.screenshots.join(", ")}`);
  }

  return lines.join("\n") + "\n";
};

// ─── Helpers ──────────────────────────────────────────────────────────────

const capitalize = (s: string): string =>
  s.charAt(0).toUpperCase() + s.slice(1);

const formatJourneyName = (journey: string): string =>
  journey.split("-").map(capitalize).join(" ");

// ─── CLI entry point ──────────────────────────────────────────────────────

const main = (): void => {
  const novaActOutputDir = resolve("audit", "output", "nova-act");
  const gherkinOutputDir = resolve("audit", "output", "gherkin");

  if (!existsSync(novaActOutputDir)) {
    console.log(
      "[session-to-gherkin] No Nova Act output found — nothing to convert"
    );
    return;
  }

  mkdirSync(gherkinOutputDir, { recursive: true });

  let converted = 0;

  // Walk nova-act output for session YAML files
  const roles = readdirSync(novaActOutputDir).filter((entry) => {
    const fullPath = join(novaActOutputDir, entry);
    return existsSync(fullPath);
  });

  for (const role of roles) {
    const roleDir = join(novaActOutputDir, role);
    if (!existsSync(roleDir)) continue;

    const sessionFiles = readdirSync(roleDir).filter(
      (f) => f.endsWith(".yaml") || f.endsWith(".yml")
    );

    for (const sessionFile of sessionFiles) {
      const sessionPath = join(roleDir, sessionFile);
      const content = readFileSync(sessionPath, "utf8");

      try {
        const raw = parseSimpleYaml(content);
        const session = raw as unknown as SessionYaml;

        if (!session.role || !session.journey) continue;

        const gherkin = sessionToGherkin(session);
        const outputName = `${session.role}-${session.journey}.feature`;
        const outputPath = join(gherkinOutputDir, outputName);

        writeFileSync(outputPath, gherkin, "utf8");
        converted++;
        console.log(`[session-to-gherkin] Converted: ${outputName}`);
      } catch (error) {
        console.error(
          `[session-to-gherkin] Failed to convert ${sessionPath}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }
  }

  console.log(
    `[session-to-gherkin] Converted ${converted} session(s) to Gherkin`
  );
};

// Run if invoked directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
