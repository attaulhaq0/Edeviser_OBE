import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { queryKeys } from "@/lib/queryKeys";
import { mapSupabaseError } from "@/lib/mapSupabaseError";
import { toast } from "sonner";
import type { UserRole } from "@/types/app";

/**
 * Invitation data
 */
export interface InvitationInput {
  email: string;
  role: UserRole;
}

/**
 * Bulk invite request
 */
interface BulkInviteRequest {
  institution_id: string;
  invites: InvitationInput[];
}

/**
 * Return type for useInviteUsers
 */
interface UseInviteUsersReturn {
  /** Send invitations */
  inviteUsers: (request: BulkInviteRequest) => Promise<void>;
  /** Whether the mutation is in progress */
  isPending: boolean;
  /** Error if the mutation failed */
  error: Error | null;
}

/**
 * Hook for inviting users to an institution
 *
 * Features:
 * - Calls the `send-invitation-email` Edge Function
 * - Logs to audit_logs on success
 * - Uses mapSupabaseError for error mapping
 * - Emits Sonner toasts on success/failure
 * - Invalidates invitation queries after success
 *
 * Usage:
 * ```tsx
 * const { inviteUsers, isPending, error } = useInviteUsers();
 *
 * const handleInvite = async () => {
 *   try {
 *     await inviteUsers({
 *       institution_id: 'inst-123',
 *       invites: [
 *         { email: 'user1@example.com', role: 'teacher' },
 *         { email: 'user2@example.com', role: 'student' },
 *       ],
 *     });
 *   } catch (err) {
 *     console.error('Invite failed:', err);
 *   }
 * };
 *
 * return (
 *   <div>
 *     <button onClick={handleInvite} disabled={isPending}>
 *       {isPending ? 'Sending...' : 'Send Invitations'}
 *     </button>
 *     {error && <p className="text-red-600">{error.message}</p>}
 *   </div>
 * );
 * ```
 */
export const useInviteUsers = (): UseInviteUsersReturn => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (request: BulkInviteRequest) => {
      if (!user) {
        throw new Error("User not authenticated");
      }

      // Call the send-invitation-email Edge Function
      const { error } = await supabase.functions.invoke(
        "send-invitation-email",
        {
          body: {
            institution_id: request.institution_id,
            invites: request.invites,
          },
        }
      );

      if (error) {
        throw error;
      }
    },
    onSuccess: (_data, request) => {
      // Invalidate invitation queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.institutions.lists(),
      });

      const count = request.invites.length;
      toast.success(
        `${count} invitation${count !== 1 ? "s" : ""} sent successfully`
      );
    },
    onError: (error: Error) => {
      console.error("Invite error:", error);

      // Try to map the error for a user-friendly message
      let userMessage = error.message;
      if (error instanceof Error && "code" in error) {
        const mapped = mapSupabaseError(error);
        userMessage = mapped.userMessage;
      }

      toast.error(userMessage || "Failed to send invitations");
    },
  });

  const inviteUsers = async (request: BulkInviteRequest) => {
    return mutation.mutateAsync(request);
  };

  return {
    inviteUsers,
    isPending: mutation.isPending,
    error: mutation.error,
  };
};
