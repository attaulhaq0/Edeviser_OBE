// Feature: prototype-frontend-rebuild (P3.6) — Admin Security console classification.
// Pure helpers in src/features/admin/security/security.ts.
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  AT_RISK_ATTEMPTS,
  isBlockActive,
  loginLockStatus,
  rateLimitSeverity,
} from "@/features/admin/security/security";

const NOW = Date.UTC(2026, 0, 1, 12, 0, 0);
const iso = (ms: number) => new Date(ms).toISOString();

describe("isBlockActive", () => {
  it("is true only while blocked_until is in the future", () => {
    expect(isBlockActive(iso(NOW + 60_000), NOW)).toBe(true);
    expect(isBlockActive(iso(NOW - 60_000), NOW)).toBe(false);
    expect(isBlockActive("not-a-date", NOW)).toBe(false);
  });

  it("property: future offset ⇒ active, past offset ⇒ inactive", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 10_000_000 }), (offset) => {
        return (
          isBlockActive(iso(NOW + offset), NOW) === true &&
          isBlockActive(iso(NOW - offset), NOW) === false
        );
      }),
      { numRuns: 200 }
    );
  });
});

describe("loginLockStatus", () => {
  it("locked while locked_until is in the future, regardless of count", () => {
    expect(loginLockStatus(iso(NOW + 60_000), 0, NOW)).toBe("locked");
    expect(loginLockStatus(iso(NOW + 60_000), 99, NOW)).toBe("locked");
  });

  it("at-risk once attempts reach the threshold (no active lock)", () => {
    expect(loginLockStatus(null, AT_RISK_ATTEMPTS, NOW)).toBe("at-risk");
    expect(loginLockStatus(iso(NOW - 60_000), AT_RISK_ATTEMPTS + 2, NOW)).toBe(
      "at-risk"
    );
  });

  it("ok below the threshold with no active lock", () => {
    expect(loginLockStatus(null, AT_RISK_ATTEMPTS - 1, NOW)).toBe("ok");
    expect(loginLockStatus(iso(NOW - 60_000), 0, NOW)).toBe("ok");
  });
});

describe("rateLimitSeverity", () => {
  it("maps block/lock → critical, limit/throttle/captcha → attention, else monitor", () => {
    expect(rateLimitSeverity("ip_blocked")).toBe("critical");
    expect(rateLimitSeverity("account_locked")).toBe("critical");
    expect(rateLimitSeverity("login_rate_limited")).toBe("attention");
    expect(rateLimitSeverity("captcha_challenge")).toBe("attention");
    expect(rateLimitSeverity("request_throttled")).toBe("attention");
    expect(rateLimitSeverity("page_view")).toBe("monitor");
  });

  it("property: always returns a known severity for any string", () => {
    fc.assert(
      fc.property(fc.string(), (s) =>
        ["critical", "attention", "monitor"].includes(rateLimitSeverity(s))
      ),
      { numRuns: 200 }
    );
  });
});
