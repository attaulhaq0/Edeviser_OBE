import { describe, expect, it } from "vitest";

import { truncateAuditIdentifier } from "@/lib/auditLogPresentation";

describe("truncateAuditIdentifier", () => {
  it("handles nullable system identifiers and truncates long IDs", () => {
    expect(truncateAuditIdentifier(null)).toBe("—");
    expect(truncateAuditIdentifier(undefined)).toBe("—");
    expect(truncateAuditIdentifier("short-id")).toBe("short-id");
    expect(truncateAuditIdentifier("1234567890123456")).toBe("123456789012…");
  });
});
