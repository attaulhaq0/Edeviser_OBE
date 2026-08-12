import { afterEach, describe, expect, it } from "vitest";
import { getManagedServerKey } from "../../../api/_utils/serverSecret";

const originalEnv = process.env;

afterEach(() => {
  process.env = originalEnv;
});

describe("Vercel managed server key helper", () => {
  it("prefers the branch-scoped Vercel integration key", () => {
    const key = getManagedServerKey({
      SUPABASE_SECRET_KEY: "sb_secret_current_preview",
      SUPABASE_SECRET_KEYS: JSON.stringify({
        default: "sb_secret_stale_preview",
      }),
    });

    expect(key).toBe("sb_secret_current_preview");
  });

  it("selects the configured managed key without using the legacy fallback", () => {
    const key = getManagedServerKey({
      SUPABASE_SECRET_KEYS: JSON.stringify({ default: "sb_secret_test" }),
    });
    expect(key).toBe("sb_secret_test");
  });

  it("fails closed for malformed or missing managed configuration", () => {
    expect(() =>
      getManagedServerKey({ SUPABASE_SECRET_KEYS: "not-json" })
    ).toThrow(/not valid JSON/);
    expect(() => getManagedServerKey({})).toThrow(/not configured/);
  });

  it("requires an explicit transition flag for the legacy key", () => {
    expect(() =>
      getManagedServerKey({ SUPABASE_SERVICE_ROLE_KEY: "legacy" })
    ).toThrow(/not configured/);
    expect(
      getManagedServerKey({
        SUPABASE_SERVICE_ROLE_KEY: "legacy",
        ALLOW_LEGACY_SERVICE_ROLE_KEY: "true",
      })
    ).toBe("legacy");
  });
});
