// ─── Academic Integrity Keyword Detection ───────────────────────────────────
//
// Detects academic integrity violations in student messages to the AI tutor.
// Identifies keywords/phrases indicating the student is trying to get the AI
// to complete graded work (e.g., "give me the answer", "write my essay").
//
// Pure functions — no side effects.

// ─── Types ──────────────────────────────────────────────────────────────────

/** Confidence level based on number and strength of matched patterns. */
export type IntegrityConfidence = 'low' | 'medium' | 'high';

/** Result of an academic integrity detection check. */
export interface IntegrityDetectionResult {
  /** Whether an integrity violation was detected. */
  detected: boolean;
  /** Confidence level based on number/strength of matches. */
  confidence: IntegrityConfidence;
  /** Which patterns were matched in the input text. */
  matchedPatterns: string[];
  /** Human-readable explanation for flagging (empty string if not detected). */
  flagReason: string;
}

// ─── Pattern Definitions ────────────────────────────────────────────────────

/**
 * A pattern entry with a regex, a human-readable label, and a weight
 * indicating how strongly this pattern signals an integrity violation.
 *
 * Weight scale:
 * - 1: weak signal (could be legitimate in context)
 * - 2: moderate signal (likely integrity violation)
 * - 3: strong signal (almost certainly an integrity violation)
 */
interface IntegrityPattern {
  readonly pattern: RegExp;
  readonly label: string;
  readonly weight: number;
}

/**
 * Ordered list of integrity violation patterns.
 * Patterns are checked case-insensitively against the input text.
 */
const INTEGRITY_PATTERNS: readonly IntegrityPattern[] = [
  // ── Strong signals (weight 3) ──
  { pattern: /\bgive\s+me\s+the\s+answer/i, label: 'give me the answer', weight: 3 },
  { pattern: /\bjust\s+tell\s+me\s+the\s+answer/i, label: 'just tell me the answer', weight: 3 },
  { pattern: /\bwrite\s+my\s+essay/i, label: 'write my essay', weight: 3 },
  { pattern: /\bdo\s+my\s+homework/i, label: 'do my homework', weight: 3 },
  { pattern: /\bsolve\s+this\s+for\s+me/i, label: 'solve this for me', weight: 3 },
  { pattern: /\bcomplete\s+this\s+assignment/i, label: 'complete this assignment', weight: 3 },
  { pattern: /\bwrite\s+the\s+code\s+for\s+me/i, label: 'write the code for me', weight: 3 },
  { pattern: /\bfinish\s+(this|my)\s+(assignment|homework|essay|project)/i, label: 'finish my assignment', weight: 3 },
  { pattern: /\bdo\s+(this|my)\s+(assignment|homework|essay|project)\s+for\s+me/i, label: 'do my assignment for me', weight: 3 },
  { pattern: /\bplagiari[sz]e/i, label: 'plagiarize', weight: 3 },

  // ── Moderate signals (weight 2) ──
  { pattern: /\banswer\s+key\b/i, label: 'answer key', weight: 2 },
  { pattern: /\bwhat(?:'s| is)\s+the\s+answer\s+to\s+question/i, label: "what's the answer to question", weight: 2 },
  { pattern: /\bcheat\b/i, label: 'cheat', weight: 2 },
  { pattern: /\bsolve\s+(?:it|this|the\s+problem)\s+for\s+me/i, label: 'solve it for me', weight: 2 },
  { pattern: /\bcomplete\s+(?:it|this)\s+for\s+me/i, label: 'complete it for me', weight: 2 },
  { pattern: /\bwrite\s+(?:it|this)\s+for\s+me/i, label: 'write it for me', weight: 2 },
  { pattern: /\bgive\s+me\s+(?:the\s+)?(?:full\s+)?solution/i, label: 'give me the solution', weight: 2 },
  { pattern: /\bcopy\s+(?:and\s+)?paste\s+(?:the\s+)?answer/i, label: 'copy paste answer', weight: 2 },

  // ── Weak signals (weight 1) ──
  { pattern: /\bjust\s+give\s+me\b/i, label: 'just give me', weight: 1 },
  { pattern: /\btell\s+me\s+the\s+answer/i, label: 'tell me the answer', weight: 1 },
  { pattern: /\bdo\s+it\s+for\s+me/i, label: 'do it for me', weight: 1 },
] as const;

// ─── Confidence Calculation ─────────────────────────────────────────────────

/**
 * Determines the confidence level based on the total weight of matched patterns.
 *
 * - High: total weight ≥ 5, or any single pattern with weight 3 matched
 * - Medium: total weight ≥ 2
 * - Low: total weight ≥ 1
 */
function calculateConfidence(
  matchedPatterns: readonly IntegrityPattern[],
): IntegrityConfidence {
  if (matchedPatterns.length === 0) return 'low';

  const totalWeight = matchedPatterns.reduce((sum, p) => sum + p.weight, 0);
  const hasStrongSignal = matchedPatterns.some((p) => p.weight >= 3);

  if (totalWeight >= 5 || hasStrongSignal) return 'high';
  if (totalWeight >= 2) return 'medium';
  return 'low';
}

// ─── Flag Reason Builder ────────────────────────────────────────────────────

/**
 * Builds a human-readable explanation for why the message was flagged.
 */
function buildFlagReason(matchedLabels: readonly string[]): string {
  if (matchedLabels.length === 0) return '';

  if (matchedLabels.length === 1) {
    return `Message flagged for potential academic integrity violation: detected phrase "${matchedLabels[0]}".`;
  }

  const quoted = matchedLabels.map((l) => `"${l}"`).join(', ');
  return `Message flagged for potential academic integrity violation: detected phrases ${quoted}.`;
}

// ─── Main Detection Function ────────────────────────────────────────────────

/**
 * Detects academic integrity violations in a student message.
 *
 * Behavior:
 * - Empty or whitespace-only text returns `detected: false`.
 * - Very short messages (< 3 characters) return `detected: false`.
 * - Detection is case-insensitive.
 * - Returns all matched patterns, confidence level, and a human-readable reason.
 *
 * @param text - The student message text to check.
 * @returns An IntegrityDetectionResult with detection status, confidence, matches, and reason.
 */
export function detectIntegrityViolation(text: string): IntegrityDetectionResult {
  const trimmed = text.trim();

  // Edge case: empty or very short messages cannot contain meaningful violations
  if (trimmed.length < 3) {
    return {
      detected: false,
      confidence: 'low',
      matchedPatterns: [],
      flagReason: '',
    };
  }

  const matched: IntegrityPattern[] = [];

  for (const entry of INTEGRITY_PATTERNS) {
    // Reset lastIndex for safety (patterns use /i flag, not /gi, but be safe)
    entry.pattern.lastIndex = 0;
    if (entry.pattern.test(trimmed)) {
      matched.push(entry);
    }
  }

  if (matched.length === 0) {
    return {
      detected: false,
      confidence: 'low',
      matchedPatterns: [],
      flagReason: '',
    };
  }

  const confidence = calculateConfidence(matched);
  const matchedLabels = matched.map((m) => m.label);

  return {
    detected: true,
    confidence,
    matchedPatterns: matchedLabels,
    flagReason: buildFlagReason(matchedLabels),
  };
}

/**
 * Convenience function that returns true if the text contains any
 * integrity violation patterns. Useful for quick boolean checks.
 *
 * @param text - The student message text to check.
 * @returns True if any integrity violation pattern is detected.
 */
export function hasIntegrityViolation(text: string): boolean {
  return detectIntegrityViolation(text).detected;
}
