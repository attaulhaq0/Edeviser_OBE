import { describe, expect, it } from "vitest";
import { assertUsableStorageState } from "../../../tests/e2e/_helpers/auth";

describe("E2E authentication harness", () => {
  it("rejects an empty storage state instead of treating it as authenticated", () => {
    expect(() =>
      assertUsableStorageState({ cookies: [], origins: [] }, "teacher")
    ).toThrow("does not contain a Supabase session");
  });

  it("accepts a storage state containing a Supabase access token", () => {
    const state = {
      cookies: [],
      origins: [
        {
          origin: "https://preview.example.test",
          localStorage: [
            {
              name: "sb-preview-auth-token",
              value: JSON.stringify({
                access_token: "header.payload.signature",
              }),
            },
          ],
        },
      ],
    };

    expect(() => assertUsableStorageState(state, "student")).not.toThrow();
  });
});
