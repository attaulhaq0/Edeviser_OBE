import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertJwtRole,
  assertUsableStorageState,
  readStorageStateFile,
} from "../../../tests/e2e/_helpers/authContracts";

const tokenFor = (payload: Record<string, unknown>): string => {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `header.${encoded}.signature`;
};

const validState = {
  cookies: [],
  origins: [
    {
      origin: "https://preview.example.test",
      localStorage: [
        {
          name: "sb-preview-auth-token",
          value: JSON.stringify({
            access_token: tokenFor({ app_metadata: { role: "student" } }),
          }),
        },
      ],
    },
  ],
};

describe("E2E authentication harness", () => {
  it("rejects a missing storage-state file", () => {
    const missing = join(
      mkdtempSync(join(tmpdir(), "e2e-auth-")),
      "missing.json"
    );
    expect(() => readStorageStateFile(missing, "teacher")).toThrow(
      "storageState for teacher not found"
    );
  });

  it("rejects an empty storage-state file", () => {
    const path = join(mkdtempSync(join(tmpdir(), "e2e-auth-")), "empty.json");
    writeFileSync(path, "", "utf8");
    expect(() => readStorageStateFile(path, "teacher")).toThrow(
      "storageState for teacher is empty"
    );
  });

  it("rejects an empty storage state", () => {
    expect(() =>
      assertUsableStorageState({ cookies: [], origins: [] }, "teacher")
    ).toThrow("does not contain a Supabase session");
  });

  it("rejects storage state without a Supabase token", () => {
    expect(() =>
      assertUsableStorageState(
        {
          cookies: [],
          origins: [
            {
              origin: "https://preview.example.test",
              localStorage: [{ name: "theme", value: "dark" }],
            },
          ],
        },
        "student"
      )
    ).toThrow("does not contain a Supabase session");
  });

  it("accepts a state containing a Supabase access token", () => {
    expect(() => assertUsableStorageState(validState, "student")).not.toThrow();
  });

  it("rejects a malformed JWT", () => {
    expect(() => assertJwtRole("not-a-jwt", "teacher")).toThrow(
      "Invalid teacher access token"
    );
  });

  it("rejects a JWT with the wrong app_metadata role", () => {
    expect(() =>
      assertJwtRole(tokenFor({ app_metadata: { role: "student" } }), "teacher")
    ).toThrow('Expected JWT role "teacher", received "student"');
  });

  it("rejects a JWT with no app_metadata role", () => {
    expect(() => assertJwtRole(tokenFor({ sub: "user-1" }), "teacher")).toThrow(
      "missing an app_metadata role claim"
    );
  });

  it("accepts the expected app_metadata role as a local assertion", () => {
    expect(() =>
      assertJwtRole(
        tokenFor({ app_metadata: { role: "coordinator" } }),
        "coordinator"
      )
    ).not.toThrow();
  });
});
