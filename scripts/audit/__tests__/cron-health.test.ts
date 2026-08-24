import { describe, expect, it } from "vitest";
import {
  buildProbeHeaders,
  getProbeTimeoutMs,
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

  it("recognizes only the configured E Deviser Vercel Preview identity", () => {
    expect(
      isVercelPreviewUrl(
        "https://e-deviser-git-agent-foundation-rag-6ad77b-attaulhaq0s-projects.vercel.app"
      )
    ).toBe(true);
    expect(isVercelPreviewUrl("https://unrelated-preview.vercel.app")).toBe(
      false
    );
    expect(isVercelPreviewUrl("https://app.example.com")).toBe(false);
  });

  it("does not forward the bypass secret to an unrelated Vercel hostname", () => {
    const unrelatedUrl = "https://unrelated-preview.vercel.app";
    const headers = buildProbeHeaders(
      "cron-secret",
      "vercel-bypass-secret",
      isVercelPreviewUrl(unrelatedUrl)
    );

    expect(headers["x-vercel-protection-bypass"]).toBeUndefined();
    expect(headers.Authorization).toBe("Bearer cron-secret");
  });

  it("allows only the known long-running compute probe additional time", () => {
    expect(
      getProbeTimeoutMs(
        "https://e-deviser-git-branch-attaulhaq0s-projects.vercel.app/api/cron/compute-at-risk"
      )
    ).toBe(60_000);
    expect(
      getProbeTimeoutMs(
        "https://e-deviser-git-branch-attaulhaq0s-projects.vercel.app/api/cron/streak-reset"
      )
    ).toBe(60_000);
    expect(
      getProbeTimeoutMs(
        "https://e-deviser-git-branch-attaulhaq0s-projects.vercel.app/api/cron/leaderboard-refresh"
      )
    ).toBe(30_000);
    expect(
      getProbeTimeoutMs(
        "https://e-deviser-git-branch-attaulhaq0s-projects.vercel.app/api/cron/compute-at-risk-extra"
      )
    ).toBe(30_000);
  });
});
