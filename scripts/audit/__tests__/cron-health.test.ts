import { describe, expect, it } from "vitest";
import {
  buildProbeHeaders,
  isVercelPreviewUrl,
} from "../cron-health.ts";

describe("cron health Vercel Preview protection", () => {
  it("adds the bypass header while preserving cron authentication headers", () => {
    const headers = buildProbeHeaders(
      "cron-secret",
      "vercel-bypass-secret",
      true
    );

    expect(Object.keys(headers)).toContain("x-vercel-protection-bypass");
    expect(headers.Authorization).toBe("Bearer cron-secret");
    expect(headers["x-cron-secret"]).toBe("cron-secret");
  });

  it("recognizes only Vercel-hosted preview URLs", () => {
    expect(isVercelPreviewUrl("https://example-preview.vercel.app")).toBe(
      true
    );
    expect(isVercelPreviewUrl("https://app.example.com")).toBe(false);
  });
});
