// @vitest-environment node
// All requests are synthetic Response objects; never contact a real Preview.
import { afterEach, describe, expect, it, vi } from "vitest";
import type { FullConfig } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import globalSetup from "../../../tests/e2e/_fixtures/seed.ts";
import { teardownSeedData } from "../../../tests/e2e/_fixtures/teardown.ts";
import {
  fixtureProjectMode,
  validatePreviewInputs,
  verifyGitLinkedPreview,
  type PreviewFixtureEnvironment,
} from "../../../tests/e2e/_helpers/previewFixtureTarget.ts";

const parentRef = "parentref12345678";
const previewRef = "previewref12345678";
const branch = "feature/review-boundaries";
const prNumber = "342";
const safe = (): PreviewFixtureEnvironment => ({
  E2E_FIXTURES_ENABLED: "true",
  SUPABASE_DB_ENV: "preview",
  SUPABASE_ACCESS_TOKEN: "fake-management-token",
  SUPABASE_PARENT_PROJECT_REF: parentRef,
  SUPABASE_PREVIEW_REF: previewRef,
  SUPABASE_PREVIEW_BRANCH: branch,
  SUPABASE_PREVIEW_PR_NUMBER: prNumber,
  GITHUB_HEAD_REF: branch,
  VITE_SUPABASE_URL: `https://${previewRef}.supabase.co`,
  VITE_SUPABASE_ANON_KEY: "fake-preview-anon",
});
const linked = (patch: Record<string, unknown> = {}) => ({
  project_ref: previewRef,
  git_branch: branch,
  pr_number: 342,
  status: "FUNCTIONS_DEPLOYED",
  ...patch,
});
const fakeBranchLookup = (rows: unknown, status = 200) =>
  vi.fn<typeof fetch>(
    async () =>
      new Response(JSON.stringify(rows), {
        status,
        headers: { "Content-Type": "application/json" },
      })
  );
const config = (names: string[]) =>
  ({
    projects: names.map((name) => ({ name })),
  } as unknown as FullConfig);
const root = resolve(__dirname, "../../..");

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("V15 Preview audit fixtures fail closed before mutation", () => {
  it("distinguishes fixture-free legacy collection from authenticated audit projects", () => {
    expect(fixtureProjectMode(["legacy-smoke"])).toBe("legacy");
    expect(fixtureProjectMode(["teacher", "rtl-ar"])).toBe("audit");
    expect(fixtureProjectMode(["legacy-smoke", "admin"])).toBe("audit");
    expect(() => fixtureProjectMode([])).toThrow();
    expect(() => fixtureProjectMode(["unknown"])).toThrow();
  });

  it("does not rewrite auth states or call the network on guard-off legacy collection", async () => {
    const forbidden = vi.fn<typeof fetch>(async () => {
      throw new Error("No network authorized");
    });
    vi.stubGlobal("fetch", forbidden);
    vi.stubEnv("AUDIT_RUN_ID", "inherited-run-must-not-authorize-teardown");
    vi.stubEnv("AUDIT_FIXTURE_STARTED", "true");
    vi.stubEnv("E2E_FIXTURES_ENABLED", "");
    await globalSetup(config(["legacy-smoke"]));
    expect(forbidden).not.toHaveBeenCalled();
    expect(process.env.AUDIT_RUN_ID).toBeUndefined();
    expect(process.env.AUDIT_FIXTURE_STARTED).toBeUndefined();
    // No fake storageState files are created in the branch above: only an
    // explicit positive, verified audit run can call mkdirSync/storageState.
    const source = readFileSync(
      resolve(root, "tests/e2e/_fixtures/seed.ts"),
      "utf8"
    );
    expect(source).not.toContain("writeEmptyStorageStates");
    expect(source.indexOf(`if (selected === "legacy")`)).toBeLessThan(
      source.indexOf("mkdirSync(STORAGE_STATES_DIR")
    );
    await teardownSeedData({ ...safe(), AUDIT_RUN_ID: "old" });
    expect(forbidden).not.toHaveBeenCalled();
  });

  it("refuses unauthenticated audit projects before any management lookup or seed", async () => {
    const forbidden = vi.fn<typeof fetch>(async () => {
      throw new Error("No network authorized");
    });
    vi.stubGlobal("fetch", forbidden);
    vi.stubEnv("E2E_FIXTURES_ENABLED", "");
    await expect(globalSetup(config(["admin"]))).rejects.toThrow(
      "explicit Preview fixture authorization"
    );
    expect(forbidden).not.toHaveBeenCalled();
    expect(process.env.AUDIT_FIXTURE_STARTED).toBeUndefined();
  });

  it.each([
    ["not preview", { SUPABASE_DB_ENV: "production" }],
    [
      "same ref",
      {
        SUPABASE_PREVIEW_REF: parentRef,
        VITE_SUPABASE_URL: `https://${parentRef}.supabase.co`,
      },
    ],
    ["wrong URL", { VITE_SUPABASE_URL: `https://${parentRef}.supabase.co` }],
    ["insecure URL", { VITE_SUPABASE_URL: `http://${previewRef}.supabase.co` }],
    ["missing PR", { SUPABASE_PREVIEW_PR_NUMBER: "" }],
    ["wrong head", { GITHUB_HEAD_REF: "another-branch" }],
  ] as const)(
    "rejects %s without fetching a Preview catalog",
    async (_label, patch) => {
      const fetcher = fakeBranchLookup([linked()]);
      await expect(
        verifyGitLinkedPreview({ ...safe(), ...patch }, fetcher)
      ).rejects.toThrow();
      expect(fetcher).not.toHaveBeenCalled();
    }
  );

  it.each([
    ["direct branch", [linked({ git_branch: null, pr_number: null })]],
    ["wrong PR", [linked({ pr_number: 341 })]],
    ["wrong Git head", [linked({ git_branch: "feature/elsewhere" })]],
    ["not deployed", [linked({ status: "MIGRATIONS_RUNNING" })]],
    ["ambiguous", [linked(), linked()]],
    ["missing", []],
  ] as const)(
    "rejects %s metadata after read-only lookup",
    async (_label, rows) => {
      const fetcher = fakeBranchLookup(rows);
      await expect(verifyGitLinkedPreview(safe(), fetcher)).rejects.toThrow(
        "No unique FUNCTIONS_DEPLOYED Git-linked Preview"
      );
      expect(fetcher).toHaveBeenCalledTimes(1);
    }
  );

  it("accepts one exact Git-linked deployed branch and rechecks before owned teardown", async () => {
    const calls: Array<{ url: string; method: string; body?: string }> = [];
    const transport: typeof fetch = async (input, init) => {
      const url = String(input),
        method = init?.method ?? "GET";
      calls.push({
        url,
        method,
        body: typeof init?.body === "string" ? init.body : undefined,
      });
      if (method === "GET")
        return new Response(JSON.stringify([linked()]), { status: 200 });
      if (
        url ===
        `https://${previewRef}.supabase.co/functions/v1/audit-fixtures/teardown`
      )
        return new Response("ok", { status: 200 });
      throw new Error("Unexpected mutation destination");
    };
    expect(validatePreviewInputs(safe()).url).toBe(
      `https://${previewRef}.supabase.co`
    );
    const target = await verifyGitLinkedPreview(safe(), transport);
    expect(target).toEqual({
      ref: previewRef,
      url: `https://${previewRef}.supabase.co`,
      branch,
      prNumber,
    });
    await teardownSeedData(
      {
        ...safe(),
        AUDIT_FIXTURE_STARTED: "true",
        AUDIT_RUN_ID: "owned-test-run",
        AUDIT_PREVIEW_REF: previewRef,
        AUDIT_PREVIEW_BRANCH: branch,
        AUDIT_PREVIEW_PR_NUMBER: prNumber,
      },
      transport
    );
    expect(calls.map((call) => call.method)).toEqual(["GET", "GET", "POST"]);
    expect(JSON.parse(calls[2]?.body ?? "null")).toEqual({
      runId: "owned-test-run",
    });
  });

  it("refuses inherited run id and changed teardown identity without a POST", async () => {
    const fetcher = fakeBranchLookup([linked()]);
    await teardownSeedData(
      { ...safe(), AUDIT_RUN_ID: "inherited-only" },
      fetcher
    );
    expect(fetcher).not.toHaveBeenCalled();
    await expect(
      teardownSeedData(
        {
          ...safe(),
          AUDIT_FIXTURE_STARTED: "true",
          AUDIT_RUN_ID: "owned",
          AUDIT_PREVIEW_REF: "differentref",
          AUDIT_PREVIEW_BRANCH: branch,
          AUDIT_PREVIEW_PR_NUMBER: prNumber,
        },
        fetcher
      )
    ).rejects.toThrow("identity changed");
    expect(fetcher).toHaveBeenCalledTimes(1); // management GET only
  });

  it("does not present CI backend-presence as a Git-linked Preview validation", () => {
    const workflow = readFileSync(
      resolve(root, ".github/workflows/ci.yml"),
      "utf8"
    );
    const e2e = workflow.split("  e2e:")[1]?.split(/\n {2}[a-z-]+:/)[0] ?? "";
    expect(e2e).toContain("E2E Collection (not role runtime)");
    expect(e2e).toContain("VITE_SUPABASE_URL: http://localhost:54321");
    expect(e2e).not.toContain("secrets.VITE_SUPABASE_URL");
    expect(e2e).not.toContain("npx playwright test --project=legacy-smoke");
    expect(workflow).toContain(".git_branch == $branch");
    expect(workflow).toContain(".pr_number //");
  });
});
