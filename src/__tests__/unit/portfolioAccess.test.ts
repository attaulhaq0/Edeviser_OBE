// =============================================================================
// portfolioAccess — Unit tests (Task 24.4)
// =============================================================================
// Example-based coverage for the pure public-portfolio access logic that backs
// the `PublicPortfolio` route (see src/lib/portfolioAccess.ts). These tests
// complement the exhaustive property test (portfolioAccess.property.test.ts) by
// pinning the concrete, human-readable cases the spec calls out:
//
//   - the discriminator distinguishes "exists but unauthorized" from "missing"
//   - the route mapping sends forbidden → 403 and not_found → 404 *distinctly*
//     so a guessable /portfolio/{id} URL cannot leak existence beyond the
//     intended forbidden/not-found split
//   - a malformed/unexpected RPC payload fails safe to forbidden (403), never
//     rendering protected content
//
// Validates: Requirements 24.3, 24.3a
//   (R24.2 sharing gate is covered by studentPortfolio.test.tsx +
//    usePortfolioSharing.test.tsx; R22.6 wording fallback by
//    localizationFallback.test.ts — not duplicated here.)

import { describe, it, expect } from "vitest";
import {
  evaluatePortfolioAccess,
  mapPortfolioAccessToRoute,
  parsePortfolioAccessStatus,
  type PortfolioAccessStatus,
  type PortfolioRouteOutcome,
} from "@/lib/portfolioAccess";

// ── evaluatePortfolioAccess (discriminator model, R24.3) ──────────────────────

describe("evaluatePortfolioAccess", () => {
  it("authorizes only when the profile exists, is public, AND sharing is permitted", () => {
    const status: PortfolioAccessStatus = evaluatePortfolioAccess({
      profileExists: true,
      portfolioPublic: true,
      sharingPermitted: true,
    });
    expect(status).toBe("authorized");
  });

  it("forbids an existing public portfolio when sharing is not permitted (R24.3a)", () => {
    // The decisive minor-safety case: public flag set but the school has NOT
    // granted permission → forbidden (403), never authorized and never 404.
    const status: PortfolioAccessStatus = evaluatePortfolioAccess({
      profileExists: true,
      portfolioPublic: true,
      sharingPermitted: false,
    });
    expect(status).toBe("forbidden");
  });

  it("forbids an existing permitted portfolio that is not marked public", () => {
    const status: PortfolioAccessStatus = evaluatePortfolioAccess({
      profileExists: true,
      portfolioPublic: false,
      sharingPermitted: true,
    });
    expect(status).toBe("forbidden");
  });

  it("forbids an existing portfolio that is neither public nor permitted", () => {
    const status: PortfolioAccessStatus = evaluatePortfolioAccess({
      profileExists: true,
      portfolioPublic: false,
      sharingPermitted: false,
    });
    expect(status).toBe("forbidden");
  });

  it("reports not_found for a missing profile regardless of the other flags", () => {
    const flagCombinations: ReadonlyArray<readonly [boolean, boolean]> = [
      [false, false],
      [false, true],
      [true, false],
      [true, true],
    ];
    for (const [portfolioPublic, sharingPermitted] of flagCombinations) {
      const status: PortfolioAccessStatus = evaluatePortfolioAccess({
        profileExists: false,
        portfolioPublic,
        sharingPermitted,
      });
      expect(status).toBe("not_found");
    }
  });
});

// ── mapPortfolioAccessToRoute (status → HTTP outcome, R24.3/24.3a) ─────────────

describe("mapPortfolioAccessToRoute", () => {
  it("renders an authorized portfolio", () => {
    const outcome: PortfolioRouteOutcome =
      mapPortfolioAccessToRoute("authorized");
    expect(outcome).toEqual({ kind: "render" });
  });

  it("maps forbidden → 403 Forbidden (not 404)", () => {
    const outcome: PortfolioRouteOutcome =
      mapPortfolioAccessToRoute("forbidden");
    expect(outcome).toEqual({ kind: "error", status: 403 });
  });

  it("maps not_found → 404 Not Found (not 403)", () => {
    const outcome: PortfolioRouteOutcome =
      mapPortfolioAccessToRoute("not_found");
    expect(outcome).toEqual({ kind: "error", status: 404 });
  });

  it("distinguishes forbidden from not_found by status code (R24.3a)", () => {
    const forbidden = mapPortfolioAccessToRoute("forbidden");
    const notFound = mapPortfolioAccessToRoute("not_found");

    // Both are error outcomes...
    expect(forbidden.kind).toBe("error");
    expect(notFound.kind).toBe("error");

    // ...but their status codes are different, so an existing-but-unauthorized
    // portfolio is never reported as missing.
    if (forbidden.kind === "error" && notFound.kind === "error") {
      expect(forbidden.status).toBe(403);
      expect(notFound.status).toBe(404);
      expect(forbidden.status).not.toBe(notFound.status);
    }
  });

  it("never returns a render outcome for either error status", () => {
    expect(mapPortfolioAccessToRoute("forbidden").kind).not.toBe("render");
    expect(mapPortfolioAccessToRoute("not_found").kind).not.toBe("render");
  });
});

// ── parsePortfolioAccessStatus (network-boundary hardening) ────────────────────

describe("parsePortfolioAccessStatus", () => {
  it("passes through each known status verbatim", () => {
    expect(parsePortfolioAccessStatus("authorized")).toBe("authorized");
    expect(parsePortfolioAccessStatus("forbidden")).toBe("forbidden");
    expect(parsePortfolioAccessStatus("not_found")).toBe("not_found");
  });

  it("treats null/undefined as forbidden so a missing payload never renders", () => {
    expect(parsePortfolioAccessStatus(null)).toBe("forbidden");
    expect(parsePortfolioAccessStatus(undefined)).toBe("forbidden");
  });

  it("treats an unrecognized text value as forbidden (fail-safe to 403)", () => {
    for (const raw of ["", "AUTHORIZED", "ok", "deny", "404", "unknown"]) {
      const status = parsePortfolioAccessStatus(raw);
      expect(status).toBe("forbidden");
      // And the resulting route outcome is a 403, never a render.
      expect(mapPortfolioAccessToRoute(status)).toEqual({
        kind: "error",
        status: 403,
      });
    }
  });

  it("round-trips a parsed unexpected value to a non-rendering route", () => {
    // End-to-end: arbitrary RPC text → conservative status → never renders.
    const outcome = mapPortfolioAccessToRoute(
      parsePortfolioAccessStatus("totally-unexpected")
    );
    expect(outcome.kind).toBe("error");
  });
});
