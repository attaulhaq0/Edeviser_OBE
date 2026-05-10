// Pre-deployment audit — severity-to-verdict function.
//
// Implements Task 16.2 / Req 16.3, 16.4, 16.5, 16.6. The pure function
// severityToVerdict() matches the Go/No-Go Matrix in requirements.md
// §Definition of Done verbatim:
//
//   Blocker | Critical | Major                  | Verdict
//   --------|----------|------------------------|----------------------
//   ≥ 1     | any      | any                    | No-Go
//   0       | ≥ 1 (no waiver)                   | No-Go
//   0       | ≥ 1 (all waivers present)         | Go-with-backlog
//   0       | 0        | > majorBacklogLimit    | Go-with-backlog
//   0       | 0        | ≤ majorBacklogLimit    | Go-with-backlog
//   0       | 0        | 0                      | Go
//
// This function is the oracle for Property 15 (severity-to-verdict). When
// the property suite lands in Task 7.16, it will generate arbitrary
// (counts, waivers) tuples and assert that severityToVerdict matches the
// matrix above exactly.

export type Verdict = "Go" | "Go-with-backlog" | "No-Go";

export interface SeverityCounts {
  readonly blocker: number;
  readonly critical: number;
  readonly major: number;
  readonly minor: number;
  readonly trivial: number;
}

export interface Waiver {
  readonly severity: "Critical";
  readonly findingId: string;
  readonly signers: {
    readonly releaseEngineer: string;
    readonly qaLead: string;
    readonly techLead: string;
  };
  readonly expiresAt: string;
  readonly rationale: string;
}

export interface VerdictThresholds {
  /**
   * Number of Major findings permitted before "Go" degrades to
   * "Go-with-backlog". Any value > 0 triggers backlog mode per
   * requirements.md §Go/No-Go Matrix rows 5 and 6.
   */
  readonly majorBacklogLimit: number;
}

export const DEFAULT_THRESHOLDS: VerdictThresholds = {
  // The matrix says Major > 0 always degrades to "Go-with-backlog".
  // The limit exists to let future policy tune the threshold (e.g., 3
  // is acceptable, 10 is deploy-blocking) without changing the function.
  majorBacklogLimit: 0,
};

const isExpiredWaiver = (waiver: Waiver, now: Date): boolean => {
  const expiresAt = new Date(waiver.expiresAt);
  if (!Number.isFinite(expiresAt.getTime())) {
    // Malformed expiresAt is treated as expired for safety — a bad waiver
    // must not silently wave a Critical through.
    return true;
  }
  // Treat the exact boundary as expired: now >= expiresAt means the window
  // has closed. A waiver must have strictly-future expiration to be valid.
  return expiresAt.getTime() <= now.getTime();
};

const hasAllSigners = (waiver: Waiver): boolean => {
  const s = waiver.signers;
  return (
    typeof s.releaseEngineer === "string" &&
    s.releaseEngineer.trim() !== "" &&
    typeof s.qaLead === "string" &&
    s.qaLead.trim() !== "" &&
    typeof s.techLead === "string" &&
    s.techLead.trim() !== ""
  );
};

/**
 * A waiver is "valid" when it:
 *   - is scoped to a Critical finding (Blockers cannot be waived)
 *   - carries all three signer names (non-empty strings)
 *   - has an expiresAt in the future
 */
export const isWaiverValid = (
  waiver: Waiver,
  now: Date = new Date()
): boolean =>
  waiver.severity === "Critical" &&
  hasAllSigners(waiver) &&
  !isExpiredWaiver(waiver, now);

/**
 * Compute the Go / Go-with-backlog / No-Go verdict for a set of severity
 * counts, optionally accounting for waivers signed against specific Critical
 * findings.
 *
 * @param counts        Per-severity finding counts.
 * @param waivers       Waivers active for the run. Only waivers scoped to
 *                      a Critical finding are consulted.
 * @param thresholds    Tunable thresholds. Defaults to DEFAULT_THRESHOLDS.
 * @param now           Current time, injectable for deterministic tests.
 */
export const severityToVerdict = (
  counts: SeverityCounts,
  waivers: readonly Waiver[] = [],
  thresholds: VerdictThresholds = DEFAULT_THRESHOLDS,
  now: Date = new Date()
): Verdict => {
  // Blocker is never waivable.
  if (counts.blocker > 0) return "No-Go";

  // Every Critical needs its own signed-and-not-expired waiver.
  if (counts.critical > 0) {
    const validWaivers = waivers.filter((w) => isWaiverValid(w, now));
    const uniqueWaivedIds = new Set(validWaivers.map((w) => w.findingId));
    if (uniqueWaivedIds.size < counts.critical) return "No-Go";
    // At least one Critical waived → backlog, never a clean Go.
    return "Go-with-backlog";
  }

  // No Blocker or Critical. Majors degrade to backlog; the threshold knob
  // is retained so a future policy (e.g., "allow up to 2 Major") can be
  // set via audit/waivers.yml without changing this function.
  if (counts.major > thresholds.majorBacklogLimit) return "Go-with-backlog";

  // Minor and Trivial do not block deploy per §Go/No-Go Matrix row 6.
  return "Go";
};
