// Feature: student-experience-remediation
// Pure tutor status mapper (R4.2, R4.2a, R4.3).
//
// Maps a backend signal (HTTP status, SSE error code, and/or a network-error
// flag) emitted by the `chat-with-tutor` edge function to a discriminated
// `TutorUiState`. The mapping is TOTAL: every possible signal — including
// unknown/unrecognized values or a detection failure — resolves to a defined
// state, defaulting to the guaranteed `error` fallback so the student is never
// left without feedback.

/**
 * Discriminated union of every UI state the AI Tutor surface can render.
 *
 * - `ready`        — backend reachable and able to answer.
 * - `unavailable`  — unreachable / undeployed / unconfigured (network, 500, 502, 503).
 * - `not_enrolled` — request rejected because the student is not enrolled (403).
 * - `no_embeddings`— reachable but no course materials are embedded yet.
 * - `rate_limited` — daily message limit / token budget exceeded (429).
 * - `error`        — guaranteed fallback for unknown / unrecognized signals (R4.2a).
 */
export type TutorUiState =
  | { kind: "ready" }
  | { kind: "unavailable" }
  | { kind: "not_enrolled" }
  | { kind: "no_embeddings" }
  | { kind: "rate_limited"; resetHint?: string }
  | { kind: "error"; message: string };

/**
 * Backend signal describing the outcome of a tutor request. Every field is
 * optional so the mapper can be called with whatever evidence is available
 * (a fetch rejection yields only `networkError`; an SSE `error` event yields a
 * `code`; an HTTP error yields a `httpStatus` and usually a `code`).
 */
export interface TutorSignal {
  /** HTTP status of the response, when one was received. */
  httpStatus?: number;
  /** Structured error code from the response body or an SSE `error` event. */
  code?: string;
  /** True when the request never reached the backend (fetch threw / aborted network). */
  networkError?: boolean;
  /** Optional hint (e.g. reset time) surfaced in the rate-limited state. */
  resetHint?: string;
  /** Optional backend message threaded into the `error` fallback. */
  message?: string;
}

/** Default copy for the guaranteed fallback state. */
const DEFAULT_ERROR_MESSAGE = "The AI Tutor is unavailable right now.";

/**
 * Structured error codes emitted by the `chat-with-tutor` edge function
 * (HTTP body `code` and SSE `error` event `code`). Compared case-insensitively.
 */
const RATE_LIMITED_CODES = new Set([
  "rate_limit_exceeded",
  "token_budget_exceeded",
]);
const UNAVAILABLE_CODES = new Set([
  "embedding_error",
  "llm_error",
  "llm_unavailable",
  "no_stream",
]);
const NO_EMBEDDINGS_CODES = new Set(["no_embeddings"]);

const errorState = (message?: string): TutorUiState => ({
  kind: "error",
  message:
    message && message.trim().length > 0 ? message : DEFAULT_ERROR_MESSAGE,
});

/**
 * Map a backend signal to a `TutorUiState`. Total over all inputs.
 *
 * Precedence:
 * 1. A network failure is always `unavailable` regardless of any other field.
 * 2. A recognized structured `code` (from the body or an SSE error event) is
 *    authoritative, because SSE errors arrive on an otherwise-200 response.
 * 3. Otherwise the HTTP status decides: 2xx → `ready`, 403 → `not_enrolled`,
 *    429 → `rate_limited`, 500/502/503 → `unavailable`.
 * 4. Anything unrecognized (other statuses, unknown codes, empty signal,
 *    detection failure) falls back to the guaranteed `error` state.
 */
export function mapTutorError(signal: TutorSignal): TutorUiState {
  // 1. Network failure dominates — the backend was never reached.
  if (signal.networkError === true) {
    return { kind: "unavailable" };
  }

  // 2. A recognized structured code is authoritative (covers SSE error events
  //    that stream over a 200 response).
  const code = signal.code?.toLowerCase();
  if (code) {
    if (RATE_LIMITED_CODES.has(code)) {
      return { kind: "rate_limited", resetHint: signal.resetHint };
    }
    if (UNAVAILABLE_CODES.has(code)) {
      return { kind: "unavailable" };
    }
    if (NO_EMBEDDINGS_CODES.has(code)) {
      return { kind: "no_embeddings" };
    }
    // Unknown code: fall through to the HTTP status check below.
  }

  // 3. Map by HTTP status.
  const status = signal.httpStatus;
  if (typeof status === "number") {
    if (status >= 200 && status < 300) {
      return { kind: "ready" };
    }
    if (status === 403) {
      return { kind: "not_enrolled" };
    }
    if (status === 429) {
      return { kind: "rate_limited", resetHint: signal.resetHint };
    }
    if (status === 500 || status === 502 || status === 503) {
      return { kind: "unavailable" };
    }
  }

  // 4. Guaranteed fallback (R4.2a).
  return errorState(signal.message);
}
