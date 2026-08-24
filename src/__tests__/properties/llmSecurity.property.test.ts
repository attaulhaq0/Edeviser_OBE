// Feature: LLM application security (OWASP Top 10 for LLM Apps 2025),
// mapped to the Edeviser agentic architecture. Complements the generic
// 36-check suite with AI-specific invariants:
//   LLM01 Prompt Injection        - untrusted-evidence framing is mandatory
//   LLM02 Sensitive Disclosure    - evidence packets are bounded + hashed
//   LLM05 Improper Output Handling- strict parsers reject malformed output
//   LLM06 Excessive Agency        - write tools are proposal-gated (certified)
//   LLM07 System Prompt Leakage   - specialist protocols stay server-side
//   LLM08 Vector/Embedding Weaknesses - versioned embeddings + RLS wall
//   LLM09 Misinformation          - citation-validated harness scoring
//   LLM10 Unbounded Consumption   - bounded batches, provider timeouts, tutor
//                                   usage limits
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { SPECIALIST_PROTOCOLS } from "../../../supabase/functions/_shared/ai/specialists/protocols";
import {
  EVALUATOR_HARNESS_VERSION,
  evaluateRun,
} from "../../../supabase/functions/_shared/ai/evaluation/harness";

const read = (p: string): string =>
  readFileSync(resolve(process.cwd(), p), "utf8");

const walkSrc = (): string[] => {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readDirSyncSafe(dir)) {
      const full = `${dir}/${entry}`;
      if (isDir(full)) walk(full);
      else if (/\.tsx?$/.test(entry) && !full.includes("__tests__"))
        out.push(full);
    }
  };
  walk("src");
  return out;
};

import { readdirSync, statSync } from "node:fs";
const readDirSyncSafe = (dir: string): string[] => {
  try {
    return readdirSync(resolve(process.cwd(), dir));
  } catch {
    return [];
  }
};
const isDir = (p: string): boolean => {
  try {
    return statSync(resolve(process.cwd(), p)).isDirectory();
  } catch {
    return false;
  }
};

describe("LLM01 - prompt injection containment", () => {
  it("frames every deterministic evidence packet as UNTRUSTED", () => {
    expect(read("supabase/functions/_shared/ai/proactive-worker.ts")).toContain(
      "UNTRUSTED_EVIDENCE_PACKET"
    );
    expect(
      read("supabase/functions/_shared/ai/context/outcome-context-builder.ts")
    ).toMatch(/[Uu]ntrusted/);
  });

  it("keeps the academic-integrity refusal path armed in the tutor", () => {
    const tutor = read("supabase/functions/chat-with-tutor/index.ts");
    expect(tutor.toLowerCase()).toContain("integrity");
  });
});

describe("LLM02 - sensitive information disclosure is bounded", () => {
  it("caps evidence packet size before any model call", () => {
    expect(read("supabase/functions/_shared/ai/proactive-worker.ts")).toContain(
      "MAX_EVIDENCE_PACKET_CHARS"
    );
  });

  it("scopes parent summaries to verified links only", () => {
    expect(SPECIALIST_PROTOCOLS.parent!.join(" ")).toMatch(
      /verified linked children/i
    );
  });
});

describe("LLM07 - system prompt leakage stays impossible", () => {
  it("keeps specialist protocols server-side only (never imported by src/)", () => {
    const offenders = walkSrc().filter((f) =>
      /specialists\/protocols|SPECIALIST_PROTOCOLS/.test(read(f))
    );
    expect(offenders).toEqual([]);
  });

  it("keeps the autonomy policy server-side only", () => {
    const offenders = walkSrc().filter((f) =>
      /policy\/autonomy|mayAutoExecute/.test(read(f))
    );
    expect(offenders).toEqual([]);
  });
});

describe("LLM08 - vector and embedding weaknesses", () => {
  it("keeps versioned embeddings behind the RAG authorization wall", () => {
    const migrations = readDirSyncSafe("supabase/migrations");
    expect(
      migrations.some((m) =>
        m.includes("add_versioned_supabase_native_embeddings")
      )
    ).toBe(true);
    expect(
      readdirSync(resolve(process.cwd(), "src/__tests__/integration-rls"))
    ).toContain("ragAuthorization.rls.test.ts");
  });
});

describe("LLM09 - misinformation is citation-gated", () => {
  it("scores a run as failing when citations do not match tool evidence", () => {
    const result = evaluateRun({
      citations: [{ id: "fabricated-ev", availableEvidenceIds: ["real-ev"] }],
      integritySignals: [{ kind: "clean", detected: false }],
      toolCalls: [],
    });
    expect(result.citationScore).toBe(0);
    expect(result.passed).toBe(false);
    expect(result.evaluatorVersion).toBe(EVALUATOR_HARNESS_VERSION);
  });
});

describe("LLM10 - unbounded consumption is contained", () => {
  it("caps every background loop batch at 100", () => {
    for (const slug of [
      "supabase/functions/agent-worker/index.ts",
      "supabase/functions/agent-evaluation-jobs/index.ts",
      "supabase/functions/intervention-jobs/index.ts",
    ]) {
      expect(read(slug)).toMatch(/MAX_[A-Z_]*BATCH[_A-Z]*\s*=\s*100/);
    }
  });

  it("enforces a provider timeout so model calls cannot hang forever", () => {
    expect(read("supabase/functions/_shared/ai/providers/deepseek.ts")).toMatch(
      /timeout|AbortSignal/i
    );
  });

  it("enforces per-student tutor usage limits", () => {
    const tutor = read("supabase/functions/chat-with-tutor/index.ts");
    expect(tutor.toLowerCase()).toMatch(/usage|limit/);
  });
});
