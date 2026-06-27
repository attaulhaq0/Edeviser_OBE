import { QueryClient, QueryCache, MutationCache } from "@tanstack/react-query";
import * as Sentry from "@sentry/react";
import { toast } from "sonner";

/**
 * Global query/mutation error safety net (spec: production-bug-fixes, Req 6).
 *
 * Without a cache-level handler, surfacing an error relies on every consumer
 * reading `isError`/`error`; a forgotten branch becomes a silent no-op
 * (violates engineering-guardrails "never swallow errors silently"). These
 * handlers are a defense-in-depth FALLBACK — per-hook handling stays primary.
 *
 * Behaviour:
 *   - ALWAYS log (console + Sentry). Sentry is a no-op until consent-gated init,
 *     so this is safe to call unconditionally.
 *   - Toast is DEDUP-AWARE: a query/mutation opts out with
 *     `meta: { suppressGlobalError: true }` so hooks that already toast their own
 *     message never double-toast.
 *   - Queries get a fallback toast (components commonly render error UI but
 *     forget to toast). Mutations overwhelmingly toast their own specific
 *     message, so the mutation net only logs + surfaces the shared 429 notice —
 *     this avoids the app-wide double-toast the requirement warns against.
 */

const RATE_LIMIT_MESSAGE = "Too many requests. Please wait a moment.";

const is429 = (error: unknown): boolean =>
  !!error &&
  typeof error === "object" &&
  "status" in error &&
  (error as { status: number }).status === 429;

/**
 * Best-effort extraction of an HTTP status code from an unknown error.
 *
 * Different Supabase error shapes carry status in different places:
 *   - `error.status`         — Storage / some REST errors, fetch Response-likes
 *   - `error.context.status` — Edge Function errors (FunctionsHttpError wraps
 *                              the upstream `Response` in `context`)
 * PostgREST errors carry a Postgres `code` (not an HTTP status), so this returns
 * `undefined` for them and the caller falls back to count-based retry.
 */
export const getErrorStatus = (error: unknown): number | undefined => {
  if (!error || typeof error !== "object") return undefined;
  const e = error as { status?: unknown; context?: { status?: unknown } };
  if (typeof e.status === "number") return e.status;
  if (e.context && typeof e.context.status === "number")
    return e.context.status;
  return undefined;
};

/**
 * Query retry policy (spec: dashboard-and-ux-performance — reduce request
 * fan-out). TanStack Query's default retries 3× on every failure. That is
 * wasteful for DETERMINISTIC client errors (4xx): a 404/403/400/422 will simply
 * reproduce the same failure on every retry, multiplying the request fan-out
 * (e.g. a single broken call becoming 4 network requests). We therefore:
 *   - never retry 429 (respect the rate limit — surfaced as a toast instead),
 *   - never retry other 4xx EXCEPT 408 (Request Timeout, which is transient),
 *   - retry everything else (network errors, 5xx, and unknown/PostgREST errors
 *     with no detectable status) up to 3 times.
 */
export const shouldRetryQuery = (
  failureCount: number,
  error: unknown
): boolean => {
  if (is429(error)) return false;
  const status = getErrorStatus(error);
  if (status !== undefined && status >= 400 && status < 500 && status !== 408) {
    return false;
  }
  return failureCount < 3;
};

/** Best-effort human-readable message from an unknown error. */
export const getErrorMessage = (error: unknown): string => {
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string" &&
    (error as { message: string }).message.length > 0
  ) {
    return (error as { message: string }).message;
  }
  return "Something went wrong. Please try again.";
};

const optedOut = (meta: Record<string, unknown> | undefined): boolean =>
  meta?.suppressGlobalError === true;

/** queryCache.onError — log always; fallback toast unless opted out. */
export const handleGlobalQueryError = (
  error: unknown,
  meta?: Record<string, unknown>
): void => {
  console.error("[query error]", error);
  Sentry.captureException(error, { tags: { source: "queryCache" } });
  if (optedOut(meta)) return;
  toast.error(is429(error) ? RATE_LIMIT_MESSAGE : getErrorMessage(error));
};

/**
 * mutationCache.onError — log always; only surface the shared 429 notice
 * (mutations toast their own specific message). Opt-out still suppresses it.
 */
export const handleGlobalMutationError = (
  error: unknown,
  meta?: Record<string, unknown>
): void => {
  console.error("[mutation error]", error);
  Sentry.captureException(error, { tags: { source: "mutationCache" } });
  if (optedOut(meta)) return;
  if (is429(error)) toast.error(RATE_LIMIT_MESSAGE);
};

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => handleGlobalQueryError(error, query.meta),
  }),
  mutationCache: new MutationCache({
    onError: (error, _vars, _ctx, mutation) =>
      handleGlobalMutationError(error, mutation.options.meta),
  }),
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes
      retry: shouldRetryQuery,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000),
      refetchOnWindowFocus: false,
    },
    // Mutation 429 + error logging is handled by `mutationCache.onError` above.
  },
});
