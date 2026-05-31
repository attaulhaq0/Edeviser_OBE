// Feature: student-experience-remediation, Property 12: Public portfolio access
// discriminator distinguishes forbidden from not-found.
//
// For any combination of profile existence, `portfolio_public`, and
// `portfolio_sharing_permitted` states, the `portfolio_public_access`
// discriminator (modeled by `evaluatePortfolioAccess`) returns `authorized`
// only when the profile exists AND is public AND sharing is permitted, returns
// `not_found` only when no such profile exists, and returns `forbidden` in
// every other case; and the route status mapping (`mapPortfolioAccessToRoute`)
// is `authorized → render`, `forbidden → 403`, `not_found → 404` — so an
// unauthorized but existing portfolio yields 403, never 404 and never rendered
// content.
//
// **Validates: Requirements 24.3**

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  evaluatePortfolioAccess,
  mapPortfolioAccessToRoute,
  parsePortfolioAccessStatus,
  type PortfolioAccessInput,
  type PortfolioAccessStatus,
} from "@/lib/portfolioAccess";

// ─── Arbitraries ────────────────────────────────────────────────────────────

/** Any combination of the three boolean inputs the discriminator inspects. */
const accessInputArb: fc.Arbitrary<PortfolioAccessInput> = fc.record({
  profileExists: fc.boolean(),
  portfolioPublic: fc.boolean(),
  sharingPermitted: fc.boolean(),
});

/** The closed set of known discriminator statuses. */
const statusArb = fc.constantFrom<PortfolioAccessStatus>(
  "authorized",
  "forbidden",
  "not_found"
);

/**
 * Arbitrary raw RPC payloads: the known status strings plus arbitrary
 * unexpected values (text column crossing the network), including null and
 * undefined, to exercise `parsePortfolioAccessStatus`'s conservative fallback.
 */
const rawStatusArb = fc.oneof(
  fc.constantFrom("authorized", "forbidden", "not_found"),
  fc.string(),
  fc.constant(null),
  fc.constant(undefined)
);

const FRESH = { numRuns: 100 } as const;

// ─── Property 12 ─────────────────────────────────────────────────────────────

describe("Property 12 — Public portfolio access discriminator", () => {
  it("P12a: a non-existent profile is always not_found → 404, regardless of flags", () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        fc.boolean(),
        (portfolioPublic, sharingPermitted) => {
          const status = evaluatePortfolioAccess({
            profileExists: false,
            portfolioPublic,
            sharingPermitted,
          });
          expect(status).toBe("not_found");

          const outcome = mapPortfolioAccessToRoute(status);
          expect(outcome).toEqual({ kind: "error", status: 404 });
        }
      ),
      FRESH
    );
  });

  it("P12b: an existing profile is authorized → render iff BOTH public AND sharing-permitted", () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        fc.boolean(),
        (portfolioPublic, sharingPermitted) => {
          const status = evaluatePortfolioAccess({
            profileExists: true,
            portfolioPublic,
            sharingPermitted,
          });

          const expectAuthorized = portfolioPublic && sharingPermitted;
          if (expectAuthorized) {
            expect(status).toBe("authorized");
            expect(mapPortfolioAccessToRoute(status)).toEqual({
              kind: "render",
            });
          } else {
            expect(status).toBe("forbidden");
            expect(mapPortfolioAccessToRoute(status)).toEqual({
              kind: "error",
              status: 403,
            });
          }
        }
      ),
      FRESH
    );
  });

  it("P12c: forbidden is never collapsed into not_found — an existing-but-unauthorized profile yields 403, never 404, never render", () => {
    fc.assert(
      fc.property(accessInputArb, (input) => {
        const status = evaluatePortfolioAccess(input);

        // The only way to reach not_found is a non-existent profile.
        if (status === "not_found") {
          expect(input.profileExists).toBe(false);
        }

        // An existing profile is never not_found: forbidden is preserved
        // (never collapsed into not_found) for every unauthorized-but-existing case.
        if (input.profileExists) {
          expect(status).not.toBe("not_found");
        }

        const outcome = mapPortfolioAccessToRoute(status);
        if (status === "forbidden") {
          expect(outcome).toEqual({ kind: "error", status: 403 });
          // forbidden must never render protected content and never be a 404.
          expect(outcome.kind).not.toBe("render");
          if (outcome.kind === "error") {
            expect(outcome.status).not.toBe(404);
          }
        }
      }),
      FRESH
    );
  });

  it("P12d: render outcome occurs only for an existing, public, sharing-permitted profile", () => {
    fc.assert(
      fc.property(accessInputArb, (input) => {
        const outcome = mapPortfolioAccessToRoute(
          evaluatePortfolioAccess(input)
        );
        if (outcome.kind === "render") {
          expect(input.profileExists).toBe(true);
          expect(input.portfolioPublic).toBe(true);
          expect(input.sharingPermitted).toBe(true);
        }
      }),
      FRESH
    );
  });

  it("P12e: the route mapping is total over every status and only authorized renders", () => {
    fc.assert(
      fc.property(statusArb, (status) => {
        const outcome = mapPortfolioAccessToRoute(status);
        switch (status) {
          case "authorized":
            expect(outcome).toEqual({ kind: "render" });
            break;
          case "forbidden":
            expect(outcome).toEqual({ kind: "error", status: 403 });
            break;
          case "not_found":
            expect(outcome).toEqual({ kind: "error", status: 404 });
            break;
        }
        // Only authorized renders; every other status is a non-rendering error.
        expect(outcome.kind === "render").toBe(status === "authorized");
      }),
      FRESH
    );
  });

  it("P12f: unrecognized RPC payloads are parsed conservatively as forbidden (403), never not_found or render", () => {
    fc.assert(
      fc.property(rawStatusArb, (raw) => {
        const status = parsePortfolioAccessStatus(raw);

        if (
          raw === "authorized" ||
          raw === "forbidden" ||
          raw === "not_found"
        ) {
          expect(status).toBe(raw);
        } else {
          // Any malformed/unexpected value must not be able to expose content
          // or masquerade as a missing profile.
          expect(status).toBe("forbidden");
        }

        const outcome = mapPortfolioAccessToRoute(status);
        if (status === "forbidden") {
          expect(outcome).toEqual({ kind: "error", status: 403 });
        }
      }),
      FRESH
    );
  });
});
