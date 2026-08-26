import { describe, expect, it } from "vitest";

import {
  buildSkipManifest,
  extractProjectRef,
  previewRefMismatchReason,
  rlsSkipReason,
  type RlsEnv,
} from "@/__tests__/integration-rls/guard";

// Feature: deferral-ledger #278 Wave D opener.
// Property 1 — configured-but-invalid must fail loudly: half-valid credentials
// pointing at a project other than the Git-linked preview produce a hard
// configuration reason, never a silent run against an unrelated database.
describe("previewRefMismatchReason (#278)", () => {
  const env = (overrides: Partial<RlsEnv>): RlsEnv => ({
    dbEnv: "preview",
    supabaseUrl: "https://aaaaaaaaaaaaaaaaaaaaaa.supabase.co",
    supabaseAnonKey: "k",
    supabaseServiceRoleKey: "k",
    ...overrides,
  });

  it("rejects when SUPABASE_URL and the Git-linked preview ref disagree", () => {
    expect(
      previewRefMismatchReason(env({ previewRef: "bbbbbbbbbbbbbbbbbbbbbb" }))
    ).toContain("does not match");
  });

  it("accepts when both refs match (case-insensitive)", () => {
    expect(
      previewRefMismatchReason(
        env({
          supabaseUrl: "https://AAAAAAAAAAAAAAAAAAAAAA.supabase.co",
          previewRef: "aaaaaaaaaaaaaaaaaaaaaa",
        })
      )
    ).toBeNull();
  });

  it("never trips when the CI-resolved ref is absent (local dev)", () => {
    expect(previewRefMismatchReason(env({}))).toBeNull();
  });

  it("fails closed on an unresolvable URL host while previewRef is set", () => {
    expect(
      previewRefMismatchReason({
        dbEnv: "preview",
        supabaseUrl: "https://api.example.com",
        supabaseAnonKey: "k",
        supabaseServiceRoleKey: "k",
        previewRef: "bbbbbbbbbbbbbbbbbbbbbb",
      })
    ).toContain("resolvable");
  });

  it("rejects a lookalike suffixed Supabase host even over HTTPS", () => {
    const env = {
      dbEnv: "preview",
      supabaseUrl:
        "https://bbbbbbbbbbbbbbbbbbbbbb.supabase.co.attacker.example",
      supabaseAnonKey: "k",
      supabaseServiceRoleKey: "k",
      previewRef: "bbbbbbbbbbbbbbbbbbbbbb",
    } satisfies RlsEnv;
    expect(extractProjectRef(env.supabaseUrl)).toBeNull();
    expect(previewRefMismatchReason(env)).toContain("not a resolvable");
  });

  it("rejects a cleartext HTTP URL even when the ref matches", () => {
    expect(
      previewRefMismatchReason({
        dbEnv: "preview",
        supabaseUrl: "http://bbbbbbbbbbbbbbbbbbbbbb.supabase.co",
        supabaseAnonKey: "k",
        supabaseServiceRoleKey: "k",
        previewRef: "bbbbbbbbbbbbbbbbbbbbbb",
      })
    ).toContain("HTTPS");
  });

  it("stays silent for an unresolvable URL host without previewRef", () => {
    expect(
      previewRefMismatchReason({
        dbEnv: "preview",
        supabaseUrl: "https://api.example.com",
        supabaseAnonKey: "k",
        supabaseServiceRoleKey: "k",
      })
    ).toBeNull();
  });

  it("propagates into rlsSkipReason as a blocking reason", () => {
    expect(
      rlsSkipReason(env({ previewRef: "cccccccccccccccccccccc" }))
    ).toContain("does not match");
  });
});

// Property 2 — every run leaves evidence: the manifest records each collected
// file with its terminal status and counts skips explicitly.
describe("buildSkipManifest (#278)", () => {
  const files = [
    {
      filepath: "/w/src/__tests__/integration-rls/a.rls.test.ts",
      result: { status: "pass" },
    },
    {
      filepath: "/w/src/__tests__/integration-rls/b.rls.test.ts",
      result: { status: "skipped" },
    },
    { filepath: null, result: undefined }, // hostile/malformed row
  ] as const;

  it("summarizes ran/skipped counts and tolerates malformed rows", () => {
    const manifest = buildSkipManifest([...files], {
      requiredMode: true,
      now: new Date(0),
    });
    expect(manifest.totalFiles).toBe(3);
    expect(manifest.skippedFiles).toBe(1);
    expect(manifest.requiredMode).toBe(true);
    expect(manifest.generatedAt).toBe(new Date(0).toISOString());
    expect(manifest.entries[1]?.status).toBe("skipped");
    expect(manifest.entries[2]).toEqual({
      file: "<unresolved-filepath>",
      status: "unknown",
    });
  });
});

it("extractProjectRef continues to resolve preview hosts (regression guard)", () => {
  expect(extractProjectRef("https://ibmcubqyguldyowqxbro.supabase.co")).toBe(
    "ibmcubqyguldyowqxbro"
  );
  expect(extractProjectRef("not-a-url")).toBeNull();
});
