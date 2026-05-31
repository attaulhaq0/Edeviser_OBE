// Task 6.11: Adaptive quiz practice correctness derivation (pure business logic)
// Requirements: 2.1, 2.4, 2.6

/**
 * Inputs for deriving the correctness of a single submitted practice answer.
 *
 * Correctness is determined from real evidence — never a hardcoded `true`
 * (the root cause of R2). The server's authoritative evaluation is preferred;
 * when absent, correctness is derived by comparing the submitted answer to the
 * question's known correct answer.
 */
export interface CorrectnessInput {
  /** The answer the student submitted. */
  selectedAnswer: string;
  /** The question's correct answer, when the question exposes it. */
  correctAnswer?: string | null;
  /** Server-evaluated correctness from the adaptive-selection response. */
  serverEvaluated?: boolean | null;
}

/**
 * Derives whether a submitted practice answer is correct.
 *
 * Resolution order (R2.1, R2.4, R2.6):
 * 1. WHEN the backend provides an authoritative evaluation
 *    (`serverEvaluated` is a boolean), use it directly.
 * 2. ELSE WHEN the question exposes its `correctAnswer`, derive correctness by
 *    equality against the submitted answer (trimmed, case-insensitive).
 * 3. ELSE return `false` — the system never silently reports "correct" without
 *    evidence (this is the bug R2 fixes; the previous code hardcoded `true`).
 *
 * The single value returned here drives the feedback UI, the recorded
 * `previous_answer_correct`, and the correct-count increment, guaranteeing the
 * displayed feedback matches the recorded value (R2.4, R2.6).
 *
 * This function is pure and total: it returns a defined boolean for every input.
 *
 * @param input - The submitted answer plus any available evaluation evidence.
 * @returns `true` only when there is evidence the answer is correct.
 */
export function deriveCorrectness(input: CorrectnessInput): boolean {
  const { selectedAnswer, correctAnswer, serverEvaluated } = input;

  // 1. Server-authoritative evaluation wins when present.
  if (typeof serverEvaluated === "boolean") {
    return serverEvaluated;
  }

  // 2. Fall back to equality against the known correct answer.
  if (correctAnswer != null) {
    return normalize(selectedAnswer) === normalize(correctAnswer);
  }

  // 3. No evidence ⇒ never report "correct".
  return false;
}

/** Normalizes an answer for tolerant comparison (trim + case-fold). */
function normalize(value: string): string {
  return value.trim().toLowerCase();
}
