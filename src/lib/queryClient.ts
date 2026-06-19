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
      retry: (failureCount, error) => {
        // Don't retry on 429 — respect rate limits
        if (is429(error)) return false;
        return failureCount < 3;
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000),
      refetchOnWindowFocus: false,
    },
    // Mutation 429 + error logging is handled by `mutationCache.onError` above.
  },
});
