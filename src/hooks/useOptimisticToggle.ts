import { useCallback, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

/**
 * Generic row type with an id and a field to toggle
 */
interface ToggleableRow {
  id: string;
  [key: string]: unknown;
}

/**
 * Configuration for useOptimisticToggle
 */
interface UseOptimisticToggleConfig<TRow extends ToggleableRow> {
  /** Query key for the data being toggled */
  queryKey: unknown[];
  /** Mutation function that performs the toggle on the server */
  mutationFn: (rowId: string, newValue: boolean) => Promise<void>;
  /** Field name to toggle (e.g., 'is_active', 'is_verified') */
  field: keyof TRow;
}

/**
 * Return type for useOptimisticToggle
 */
interface UseOptimisticToggleReturn {
  /** Current checked state (optimistic) */
  isChecked: boolean;
  /** Handler to toggle the value */
  onToggle: () => void;
  /** Whether the toggle is currently in optimistic state (mutation pending) */
  isOptimistic: boolean;
  /** Whether the mutation is pending */
  isPending: boolean;
}

/**
 * Hook for optimistic toggle updates with TanStack Query
 *
 * Implements the standard pattern:
 * 1. onMutate: optimistically update the cache
 * 2. onError: rollback to previous value
 * 3. onSettled: invalidate the query to refetch
 *
 * Usage:
 * ```tsx
 * const { isChecked, onToggle, isOptimistic } = useOptimisticToggle({
 *   queryKey: queryKeys.user.list(),
 *   mutationFn: async (userId, newValue) => {
 *     await supabase.from('users').update({ is_active: newValue }).eq('id', userId);
 *   },
 *   field: 'is_active',
 * });
 *
 * return (
 *   <div className="flex items-center gap-2">
 *     <Switch checked={isChecked} onCheckedChange={onToggle} />
 *     {isOptimistic && <Loader2 className="h-4 w-4 animate-spin" />}
 *   </div>
 * );
 * ```
 */
export const useOptimisticToggle = <TRow extends ToggleableRow>(
  rowId: string,
  currentValue: boolean,
  config: UseOptimisticToggleConfig<TRow>
): UseOptimisticToggleReturn => {
  const queryClient = useQueryClient();
  const [optimisticValue, setOptimisticValue] = useState(currentValue);

  const mutation = useMutation({
    mutationFn: async () => {
      await config.mutationFn(rowId, !optimisticValue);
    },
    onMutate: async () => {
      // Cancel any outgoing refetches so they don't overwrite optimistic update
      await queryClient.cancelQueries({ queryKey: config.queryKey });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData(config.queryKey);

      // Optimistically update the cache
      queryClient.setQueryData(config.queryKey, (old: unknown) => {
        if (!Array.isArray(old)) return old;
        return old.map((row: TRow) =>
          row.id === rowId ? { ...row, [config.field]: !optimisticValue } : row
        );
      });

      // Update local optimistic state
      setOptimisticValue((prev) => !prev);

      return { previousData };
    },
    onError: (_err, _variables, context) => {
      // Rollback to previous value on error
      if (context?.previousData) {
        queryClient.setQueryData(config.queryKey, context.previousData);
      }
      setOptimisticValue(currentValue);
    },
    onSettled: () => {
      // Invalidate the query to refetch fresh data
      queryClient.invalidateQueries({ queryKey: config.queryKey });
    },
  });

  const onToggle = useCallback(() => {
    mutation.mutate();
  }, [mutation]);

  return {
    isChecked: optimisticValue,
    onToggle,
    isOptimistic: mutation.isPending,
    isPending: mutation.isPending,
  };
};
