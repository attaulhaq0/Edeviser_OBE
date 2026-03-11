// =============================================================================
// AnonymousToggle — Toggle leaderboard visibility with status indicator
// =============================================================================

import { useCallback } from 'react';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAnonymousStatus, useToggleAnonymous } from '@/hooks/useLeaderboard';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const AnonymousToggle = () => {
  const { data: status, isLoading: isLoadingStatus } = useAnonymousStatus();
  const toggleMutation = useToggleAnonymous();

  const isAnonymous = status?.isAnonymous ?? false;

  const handleToggle = useCallback(() => {
    toggleMutation.mutate(undefined, {
      onSuccess: (isNowAnonymous) => {
        toast.success(
          isNowAnonymous
            ? 'You are now anonymous on the leaderboard'
            : 'You are now visible on the leaderboard',
        );
      },
      onError: (err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        toast.error(message);
      },
    });
  }, [toggleMutation]);

  const isPending = toggleMutation.isPending || isLoadingStatus;

  return (
    <div className="flex items-center gap-3">
      <span
        className={cn(
          'text-sm font-medium',
          isAnonymous ? 'text-gray-500' : 'text-green-600',
        )}
      >
        {isLoadingStatus ? '...' : isAnonymous ? 'You are anonymous' : 'You are visible'}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={handleToggle}
        disabled={isPending}
        className={cn(
          'gap-2',
          isAnonymous
            ? 'border-gray-300 text-gray-600'
            : 'border-blue-300 text-blue-600',
        )}
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isAnonymous ? (
          <EyeOff className="h-4 w-4" />
        ) : (
          <Eye className="h-4 w-4" />
        )}
        {isAnonymous ? 'Go Visible' : 'Go Anonymous'}
      </Button>
    </div>
  );
};

export default AnonymousToggle;
