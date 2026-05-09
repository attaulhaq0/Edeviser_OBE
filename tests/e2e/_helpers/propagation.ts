// Pre-deployment audit — propagation polling utility.
//
// Implements Task 4.11: `pollUntil` with uniform polling (no exponential
// backoff, so the caller knows exactly when the poll window closes). Used
// by cross-role specs for the 60-second grade→XP bound (Req 3.1) and the
// 2-second realtime-delivery bound (Req 6.3).
//
// The utility is deliberately dependency-free so it can be imported by
// non-Playwright call sites (script tests, report aggregator) without
// dragging a browser. It returns the resolved value on success or throws
// a typed PollTimeoutError on timeout.

export interface PollOptions {
  /** How often to invoke the predicate, in ms. */
  readonly intervalMs: number;
  /** Overall deadline from the first call, in ms. */
  readonly timeoutMs: number;
  /** Optional label — surfaced in the error message on timeout. */
  readonly label?: string;
}

export class PollTimeoutError extends Error {
  readonly elapsedMs: number;
  readonly lastError: unknown;
  constructor(
    label: string | undefined,
    elapsedMs: number,
    lastError: unknown
  ) {
    const msg = label
      ? `pollUntil timed out after ${elapsedMs}ms waiting for "${label}"`
      : `pollUntil timed out after ${elapsedMs}ms`;
    super(msg);
    this.name = "PollTimeoutError";
    this.elapsedMs = elapsedMs;
    this.lastError = lastError;
  }
}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Poll `fn` every `intervalMs` until it returns a truthy value or the
 * `timeoutMs` deadline passes. Truthy non-boolean return values are
 * returned to the caller. The predicate may throw — errors are caught,
 * the most recent one is preserved, and the next interval proceeds.
 */
export async function pollUntil<T>(
  fn: () => T | Promise<T>,
  opts: PollOptions
): Promise<T> {
  const startedAt = Date.now();
  let lastError: unknown = null;
  while (true) {
    try {
      const result = await fn();
      if (result) {
        return result;
      }
    } catch (error) {
      lastError = error;
    }
    const elapsed = Date.now() - startedAt;
    if (elapsed >= opts.timeoutMs) {
      throw new PollTimeoutError(opts.label, elapsed, lastError);
    }
    const remaining = opts.timeoutMs - elapsed;
    const nextWait = Math.min(opts.intervalMs, remaining);
    await sleep(nextWait);
  }
}
