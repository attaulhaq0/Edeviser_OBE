import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { mapSupabaseError } from "@/lib/mapSupabaseError";
import { toast } from "sonner";
import * as Sentry from "@sentry/react";

/**
 * Standard mutation options with error handling
 *
 * Extends TanStack Query's UseMutationOptions with automatic:
 * - Error mapping via mapSupabaseError
 * - Sonner toast notifications
 * - Sentry error logging
 */
interface StandardMutationOptions<
  TData = unknown,
  TError = Error,
  TVariables = void,
  TContext = unknown
> extends UseMutationOptions<TData, TError, TVariables, TContext> {
  /** Custom error message (overrides mapped message) */
  errorMessage?: string;
  /** Custom success message */
  successMessage?: string;
  /** Whether to show success toast (default: true) */
  showSuccessToast?: boolean;
  /** Whether to show error toast (default: true) */
  showErrorToast?: boolean;
}

/**
 * Wrapper around TanStack Query's useMutation with standard error handling
 *
 * Features:
 * - Automatically maps Supabase errors to user-friendly messages
 * - Emits Sonner toasts for success/error
 * - Logs errors to Sentry (if configured)
 * - Backward-compatible with existing useMutation call sites
 *
 * Usage:
 * ```tsx
 * const mutation = useStandardMutation({
 *   mutationFn: async (data) => {
 *     const { error } = await supabase.from('users').insert(data);
 *     if (error) throw error;
 *   },
 *   successMessage: 'User created successfully',
 *   onSuccess: () => {
 *     queryClient.invalidateQueries({ queryKey: ['users'] });
 *   },
 * });
 *
 * return (
 *   <button onClick={() => mutation.mutate(newUser)} disabled={mutation.isPending}>
 *     {mutation.isPending ? 'Creating...' : 'Create User'}
 *   </button>
 * );
 * ```
 */
export const useStandardMutation = <
  TData = unknown,
  TError = Error,
  TVariables = void,
  TContext = unknown
>(
  options: StandardMutationOptions<TData, TError, TVariables, TContext>
) => {
  const {
    errorMessage: customErrorMessage,
    successMessage,
    showSuccessToast = true,
    showErrorToast = true,
    onError: customOnError,
    onSuccess: customOnSuccess,
    ...mutationOptions
  } = options;

  return useMutation<TData, TError, TVariables, TContext>({
    ...mutationOptions,
    onSuccess: (data, variables, context) => {
      // Show success toast if configured
      if (showSuccessToast && successMessage) {
        toast.success(successMessage);
      }

      // Call custom onSuccess handler
      if (customOnSuccess) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (customOnSuccess as any)(data, variables, context);
      }
    },
    onError: (error: TError, variables, context) => {
      // Map error to user-friendly message
      let userMessage = customErrorMessage;

      if (!userMessage && error instanceof Error) {
        try {
          const mapped = mapSupabaseError(error);
          userMessage = mapped.userMessage;
        } catch {
          userMessage = error.message || "An error occurred";
        }
      }

      // Show error toast if configured
      if (showErrorToast && userMessage) {
        toast.error(userMessage);
      }

      // Log to Sentry if configured
      try {
        if (typeof Sentry !== "undefined" && Sentry.captureException) {
          Sentry.captureException(error);
        }
      } catch {
        // Fallback: log to console
        console.error("Mutation error:", error);
      }

      // Call custom onError handler
      if (customOnError) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (customOnError as any)(error, variables, context);
      }
    },
  });
};
