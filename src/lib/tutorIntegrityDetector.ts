// ─── Types ───────────────────────────────────────────────────────────────────

export interface IntegrityCheckResult {
  flagged: boolean;
  matchedKeywords: string[];
}

// ─── Keyword Patterns ────────────────────────────────────────────────────────

/**
 * Patterns that indicate a student is asking the AI to complete
 * graded work rather than seeking understanding.
 *
 * Each pattern is a regex that matches common phrasing variations.
 * Patterns are case-insensitive and match word boundaries to avoid
 * false positives (e.g., "write" in "rewrite" is fine, but
 * "write my essay" is flagged).
 */
const INTEGRITY_PATTERNS: Array<{ pattern: RegExp; keyword: string }> = [
  { pattern: /\bwrite my essay\b/i, keyword: "write my essay" },
  { pattern: /\bwrite my paper\b/i, keyword: "write my paper" },
  { pattern: /\bwrite my report\b/i, keyword: "write my report" },
  { pattern: /\bwrite my assignment\b/i, keyword: "write my assignment" },
  { pattern: /\bwrite this for me\b/i, keyword: "write this for me" },
  { pattern: /\bdo my homework\b/i, keyword: "do my homework" },
  { pattern: /\bdo my assignment\b/i, keyword: "do my assignment" },
  { pattern: /\bdo this for me\b/i, keyword: "do this for me" },
  { pattern: /\bgive me the answer\b/i, keyword: "give me the answer" },
  { pattern: /\bgive me the answers\b/i, keyword: "give me the answers" },
  { pattern: /\bgive me the solution\b/i, keyword: "give me the solution" },
  { pattern: /\bjust give me\b/i, keyword: "just give me" },
  { pattern: /\bsolve this for me\b/i, keyword: "solve this for me" },
  { pattern: /\bsolve my\b/i, keyword: "solve my" },
  { pattern: /\bcomplete my\b/i, keyword: "complete my" },
  { pattern: /\bcomplete this for me\b/i, keyword: "complete this for me" },
  { pattern: /\bfinish my\b/i, keyword: "finish my" },
  { pattern: /\bfinish this for me\b/i, keyword: "finish this for me" },
  { pattern: /\bdo it for me\b/i, keyword: "do it for me" },
  {
    pattern: /\bjust tell me the answer\b/i,
    keyword: "just tell me the answer",
  },
  { pattern: /\bcopy paste\b/i, keyword: "copy paste" },
  { pattern: /\bsubmit for me\b/i, keyword: "submit for me" },
];

// ─── Detection Function ─────────────────────────────────────────────────────

/**
 * Checks a student message for academic integrity violations.
 *
 * Returns whether the message was flagged and which keywords matched.
 * This is used by the chat Edge Function to set `flagged_integrity = true`
 * on the assistant message and to inject a pedagogical redirect.
 */
export const detectIntegrityViolation = (
  message: string
): IntegrityCheckResult => {
  if (!message.trim()) {
    return { flagged: false, matchedKeywords: [] };
  }

  const matchedKeywords: string[] = [];

  for (const { pattern, keyword } of INTEGRITY_PATTERNS) {
    if (pattern.test(message)) {
      matchedKeywords.push(keyword);
    }
  }

  return {
    flagged: matchedKeywords.length > 0,
    matchedKeywords,
  };
};

/**
 * Returns the list of integrity keyword patterns for external use
 * (e.g., testing or configuration display).
 */
export const getIntegrityPatterns = (): ReadonlyArray<{
  pattern: RegExp;
  keyword: string;
}> => {
  return INTEGRITY_PATTERNS;
};
