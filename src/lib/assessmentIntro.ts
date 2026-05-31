// ── Benefit-Oriented Assessment Framing (R17) ────────────────────────
//
// Pure logic supporting the onboarding assessment intro panels. Each
// assessment step shows a benefit-oriented title, the concrete outcomes a
// student gains, and an estimated time *before* requesting any responses
// (R17.1, R17.2, R17.3). The assessment body must stay gated until both the
// benefit information and the estimated time are successfully displayed
// (R17.2a) — this module owns that gate decision so it can be unit-tested
// independently of React.

/**
 * The resolved framing content shown before an assessment body. Sourced from
 * i18next so it is always available in both English and Arabic (R17.4).
 */
export interface AssessmentIntroContent {
  /** Benefit-oriented title (e.g., "Discover How You Learn Best"). */
  readonly title: string;
  /** Short benefit-oriented description. */
  readonly description: string;
  /** Estimated time copy (e.g., "About 1 minute"). */
  readonly estimatedTime: string;
  /** Concrete outcomes (personalized recommendations, AI Tutor, bonus XP). */
  readonly benefits: readonly string[];
}

/**
 * R17.2a — the assessment body may only be revealed once both the benefit
 * information and the estimated time have been successfully resolved for
 * display. A blank/whitespace-only benefit list or estimated time keeps the
 * body gated so a student is never asked for responses before the value of
 * the assessment has been communicated.
 */
export function canDisplayAssessmentBody(content: {
  readonly benefits: readonly string[];
  readonly estimatedTime: string;
}): boolean {
  const hasBenefit = content.benefits.some(
    (benefit) => benefit.trim().length > 0
  );
  const hasEstimatedTime = content.estimatedTime.trim().length > 0;
  return hasBenefit && hasEstimatedTime;
}

/**
 * Decides whether the assessment body should render.
 *
 * The body renders only when the student has explicitly begun the assessment
 * (`hasBegun`) AND the framing content is displayable (`canDisplayAssessmentBody`).
 * Because `hasBegun` can only become true via the intro panel — which itself
 * renders the benefit + estimated time — this guarantees the framing is shown
 * before any responses are requested (R17.2a).
 */
export function shouldRenderAssessmentBody(args: {
  readonly hasBegun: boolean;
  readonly benefits: readonly string[];
  readonly estimatedTime: string;
}): boolean {
  return args.hasBegun && canDisplayAssessmentBody(args);
}
