// =============================================================================
// SectionState — declarative loading / error / empty / data wrapper for a
// dashboard or page section backed by a TanStack Query.
//
// Spec: dashboard-and-ux-performance — Appendix B §B.3.5, Phase 7 Task 24.
// Problem it solves: several sections render `null` when their query errors, so a
// cancelled/timed-out request (the 8 s statement_timeout, see Appendix A) makes the
// section SILENTLY VANISH — indistinguishable from "no data". This surfaces a
// compact, retryable error instead, while still rendering nothing for a genuinely
// empty (but successful) result.
//
// Composes the existing Shimmer + ErrorState primitives (no duplicated UI) and is
// bilingual via the shared `common` namespace (Arabic/English) by default.
// =============================================================================
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import Shimmer from "@/components/shared/Shimmer";
import ErrorState from "@/components/shared/ErrorState";
import { cn } from "@/lib/utils";

export interface SectionStateProps<T> {
  /** TanStack Query `isLoading` (fetching with no data yet). */
  isLoading: boolean;
  /** TanStack Query `isError`. */
  isError: boolean;
  /** The query data (or a value hydrated from an aggregate). */
  data: T | null | undefined;
  /** Renders the populated section. Called only when data is present + non-empty. */
  children: (data: T) => ReactNode;
  /** Invoked by the error state's retry button (e.g. `query.refetch`). */
  onRetry?: () => void;
  /** Custom emptiness check. Defaults to: an array of length 0. */
  isEmpty?: (data: T) => boolean;
  /** Skeleton shown while loading with no data yet. Defaults to a Shimmer. */
  loadingFallback?: ReactNode;
  /** Rendered when the query SUCCEEDED but the result is empty. Defaults to null. */
  emptyFallback?: ReactNode;
  /** Optional error-copy overrides (default to the bilingual `common` namespace). */
  errorTitle?: string;
  errorMessage?: string;
  /** Utility classes applied to the default Shimmer / error block. */
  className?: string;
}

const defaultIsEmpty = (data: unknown): boolean =>
  Array.isArray(data) ? data.length === 0 : data == null;

export function SectionState<T>({
  isLoading,
  isError,
  data,
  children,
  onRetry,
  isEmpty = defaultIsEmpty,
  loadingFallback,
  emptyFallback = null,
  errorTitle,
  errorMessage,
  className,
}: SectionStateProps<T>) {
  const { t } = useTranslation("common");

  // No data yet → distinguish "still loading" from "failed before any success".
  if (data == null) {
    if (isError) {
      return (
        <ErrorState
          title={errorTitle ?? t("errorBoundary.title")}
          message={errorMessage ?? t("errors.generic")}
          onRetry={onRetry}
          retryLabel={t("actions.retry")}
          className={cn("py-6", className)}
        />
      );
    }
    if (isLoading) {
      return (
        <>
          {loadingFallback ?? (
            <Shimmer className={cn("h-32 rounded-xl", className)} />
          )}
        </>
      );
    }
    // Idle / disabled with no data → render nothing (matches prior behavior).
    return <>{emptyFallback}</>;
  }

  // We have data (possibly stale while a background refetch errors) → prefer it.
  if (isEmpty(data)) return <>{emptyFallback}</>;
  return <>{children(data)}</>;
}

export default SectionState;
