// Unit tests for scripts/audit/pr-comment.ts (Task 16.5, Req 17.5).

import { describe, expect, it } from "vitest";

import { generatePrCommentBody } from "../pr-comment.ts";
import type { Finding } from "../findings.ts";

const BASE_VERDICT = {
  verdict: "Go" as const,
  commitSha: "abc1234567890",
  migrationHead: null,
  envId: "ci",
  generatedAt: "2026-05-09T10:00:00.000Z",
  counts: { blocker: 0, critical: 0, major: 0, minor: 0, trivial: 0 },
  waiverCount: 0,
};

describe("generatePrCommentBody (Task 16.5, Req 17.5)", () => {
  it("includes the verdict emoji and label", () => {
    const body = generatePrCommentBody(BASE_VERDICT, []);
    expect(body).toContain("✅");
    expect(body).toContain("Go");
  });

  it("includes the short commit SHA", () => {
    const body = generatePrCommentBody(BASE_VERDICT, []);
    expect(body).toContain("abc1234");
  });

  it("includes the severity counts table", () => {
    const body = generatePrCommentBody(BASE_VERDICT, []);
    expect(body).toContain("Blocker");
    expect(body).toContain("Critical");
    expect(body).toContain("Major");
  });

  it("shows No-Go emoji for No-Go verdict", () => {
    const noGo = { ...BASE_VERDICT, verdict: "No-Go" as const };
    const body = generatePrCommentBody(noGo, []);
    expect(body).toContain("🚫");
    expect(body).toContain("No-Go");
  });

  it("shows warning emoji for Go-with-backlog verdict", () => {
    const backlog = { ...BASE_VERDICT, verdict: "Go-with-backlog" as const };
    const body = generatePrCommentBody(backlog, []);
    expect(body).toContain("⚠️");
    expect(body).toContain("Go-with-backlog");
  });

  it("shows top-3 findings sorted by severity (worst first)", () => {
    const findings: Finding[] = [
      { severity: "Minor", requirementId: "9.1", message: "minor issue" },
      { severity: "Blocker", requirementId: "13.1", message: "blocker issue" },
      { severity: "Major", requirementId: "10.3", message: "major issue" },
      { severity: "Trivial", requirementId: "9.8", message: "trivial issue" },
    ];
    const body = generatePrCommentBody(BASE_VERDICT, findings);
    // Blocker should appear before Major in the output
    const blockerIdx = body.indexOf("blocker issue");
    const majorIdx = body.indexOf("major issue");
    expect(blockerIdx).toBeLessThan(majorIdx);
    // Should mention remaining count
    expect(body).toContain("and 1 more");
  });

  it("shows waiver count when waivers are active", () => {
    const withWaivers = { ...BASE_VERDICT, waiverCount: 2 };
    const body = generatePrCommentBody(withWaivers, []);
    expect(body).toContain("2 active waiver");
  });

  it("includes a link to the full report", () => {
    const body = generatePrCommentBody(BASE_VERDICT, []);
    expect(body).toContain("audit-report.md");
  });
});
