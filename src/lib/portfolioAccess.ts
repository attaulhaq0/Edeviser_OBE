// Task 6.18: Public-portfolio route status mapping (pure business logic)
// Requirements: 24.3
//
// Mirrors the SECURITY DEFINER `portfolio_public_access(p_student_id)` RPC
// (see design.md → "Public portfolio RLS") so the `PublicPortfolio` route can
// translate the data-layer authorization discriminator into an HTTP-style
// outcome WITHOUT leaking protected content.
//
// The decisive distinction this enforces (R24.3):
//   - an existing-but-unauthorized portfolio yields 403 (forbidden), never 404
//   - a non-existent portfolio yields 404 (not_found)
//   - an authorized portfolio renders
// so a guessable `/portfolio/{userId}` URL cannot be used to tell "private"
// portfolios apart by status code beyond the intended forbidden/not-found split.

/**
 * Authorization discriminator returned by the `portfolio_public_access` RPC.
 *
 * - `authorized` → the profile exists, is public, AND sharing is permitted.
 * - `forbidden`  → the profile exists but is not authorized for public view.
 * - `not_found`  → no such profile exists.
 */
export type PortfolioAccessStatus = "authorized" | "forbidden" | "not_found";

/**
 * Outcome the public-portfolio route should take, derived purely from the
 * authorization discriminator. Modeled as a discriminated union so consumers
 * handle every case exhaustively and never accidentally render protected
 * content for a non-`render` outcome.
 *
 * - `{ kind: "render" }`            → render the public portfolio.
 * - `{ kind: "error"; status: 403 }`→ Forbidden (exists, not authorized).
 * - `{ kind: "error"; status: 404 }`→ Not Found (no such portfolio).
 */
export type PortfolioRouteOutcome =
  | { readonly kind: "render" }
  | { readonly kind: "error"; readonly status: 403 | 404 };

/**
 * Inputs to the authorization rule, mirroring the columns the RPC inspects.
 * This is a faithful model of the SQL discriminator's decision logic, kept in
 * `src/lib/` so the rule can be reasoned about and tested as pure logic.
 */
export interface PortfolioAccessInput {
  /** Whether a `profiles` row exists for the requested student id. */
  readonly profileExists: boolean;
  /** `profiles.portfolio_public`. */
  readonly portfolioPublic: boolean;
  /** `profiles.portfolio_sharing_permitted` (school/admin granted). */
  readonly sharingPermitted: boolean;
}

/**
 * Pure model of the `portfolio_public_access` discriminator (R24.3).
 *
 * Equivalent to the SQL CASE expression:
 * ```sql
 * WHEN NOT EXISTS (profile)                                  THEN 'not_found'
 * WHEN portfolio_public = true AND portfolio_sharing_permitted = true THEN 'authorized'
 * ELSE                                                            'forbidden'
 * ```
 *
 * The non-existence check is evaluated first so that a missing profile is
 * always `not_found`; an existing profile is `authorized` only when BOTH the
 * public flag AND the sharing permission are set, and `forbidden` in every
 * other existing-profile case.
 *
 * This function is total: it returns a defined `PortfolioAccessStatus` for any
 * combination of boolean inputs.
 */
export function evaluatePortfolioAccess(
  input: PortfolioAccessInput
): PortfolioAccessStatus {
  if (!input.profileExists) return "not_found";
  if (input.portfolioPublic && input.sharingPermitted) return "authorized";
  return "forbidden";
}

/**
 * The route status mapping (R24.3): `authorized → render`, `forbidden → 403`,
 * `not_found → 404`.
 *
 * Total over `PortfolioAccessStatus`; the exhaustive `switch` is compile-time
 * checked via the `never` assertion so adding a new status without updating the
 * mapping is a type error rather than a silent fall-through to rendering.
 */
export function mapPortfolioAccessToRoute(
  status: PortfolioAccessStatus
): PortfolioRouteOutcome {
  switch (status) {
    case "authorized":
      return { kind: "render" };
    case "forbidden":
      return { kind: "error", status: 403 };
    case "not_found":
      return { kind: "error", status: 404 };
    default: {
      // Exhaustiveness guard: unreachable while `PortfolioAccessStatus` is
      // fully handled above.
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

/**
 * Safely narrow the raw `text` returned by the RPC into a known
 * `PortfolioAccessStatus`.
 *
 * The RPC column type is `text`, so the value crossing the network boundary is
 * an arbitrary string. Any unrecognized value is treated conservatively as
 * `forbidden` — which maps to 403 and never renders — so a malformed or
 * unexpected response can never expose protected content.
 */
export function parsePortfolioAccessStatus(
  raw: string | null | undefined
): PortfolioAccessStatus {
  switch (raw) {
    case "authorized":
    case "forbidden":
    case "not_found":
      return raw;
    default:
      return "forbidden";
  }
}
