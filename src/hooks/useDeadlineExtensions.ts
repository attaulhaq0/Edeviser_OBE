// =============================================================================
// useDeadlineExtensions — Activate and revoke deadline extension tokens
// =============================================================================

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ActivateExtensionInput {
  purchaseId: string;
  assignmentId: string;
}

// ─── useActivateDeadlineExtension — student activates a deadline extension ───

export const useActivateDeadlineExtension = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: ActivateExtensionInput): Promise<void> => {
      if (!user) throw new Error("Not authenticated");

      // Fetch the assignment's due date and teacher info
      const { data: assignment, error: assignmentError } = await supabase
        .from("assignments")
        .select("due_date, course_id, title")
        .eq("id", input.assignmentId)
        .maybeSingle();

      if (assignmentError) throw assignmentError;
      if (!assignment) throw new Error("Assignment not found");

      const originalDeadline = new Date(assignment.due_date);
      const now = new Date();

      if (now > originalDeadline) {
        throw new Error("Cannot extend a deadline that has already passed.");
      }

      // Extend by 24 hours
      const extendedDeadline = new Date(
        originalDeadline.getTime() + 24 * 60 * 60 * 1000
      );

      // Insert deadline extension record
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: insertError } = await (supabase as any)
        .from("deadline_extensions")
        .insert({
          student_id: user.id,
          assignment_id: input.assignmentId,
          purchase_id: input.purchaseId,
          original_deadline: originalDeadline.toISOString(),
          extended_deadline: extendedDeadline.toISOString(),
        });

      if (insertError) {
        if (insertError.code === "23505") {
          throw new Error("You already have an extension for this assignment.");
        }
        throw insertError;
      }

      // Mark the purchase as consumed
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("xp_purchases")
        .update({ status: "consumed", consumed_at: new Date().toISOString() })
        .eq("id", input.purchaseId);

      // Send teacher notification about the deadline extension
      const courseId = (assignment as Record<string, unknown>)
        .course_id as string;
      const assignmentTitle = (assignment as Record<string, unknown>)
        .title as string;

      // Fetch the course teacher
      const { data: course } = await supabase
        .from("courses")
        .select("teacher_id")
        .eq("id", courseId)
        .maybeSingle();

      if (course) {
        const teacherId = (course as Record<string, unknown>).teacher_id as
          | string
          | null;
        if (teacherId) {
          // Fetch student name for notification
          const { data: studentProfile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", user.id)
            .maybeSingle();

          const studentName =
            ((studentProfile as Record<string, unknown> | null)
              ?.full_name as string) ?? "A student";

          // Insert notification for teacher
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error: notificationError } = await (supabase as any)
            .from("notifications")
            .insert({
              user_id: teacherId,
              type: "deadline_extension",
              title: "Deadline Extension Activated",
              body: `${studentName} used a deadline extension token on "${assignmentTitle}". New deadline: ${extendedDeadline.toLocaleDateString()}.`,
              metadata: {
                student_id: user.id,
                assignment_id: input.assignmentId,
                original_deadline: originalDeadline.toISOString(),
                extended_deadline: extendedDeadline.toISOString(),
              },
            });

          if (notificationError) {
            console.error("Failed to insert notification:", notificationError);
          }
        }
      }
    },
    onSuccess: () => {
      if (user?.id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.marketplace.inventory(user.id),
        });
      }
      queryClient.invalidateQueries({
        queryKey: queryKeys.assignments.lists(),
      });
      toast.success("Deadline extended by 24 hours!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to activate deadline extension");
    },
  });
};

// ─── useRevokeDeadlineExtension — teacher revokes a student's extension ──────

export const useRevokeDeadlineExtension = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (extensionId: string): Promise<void> => {
      if (!user) throw new Error("Not authenticated");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: extension, error: fetchError } = await (supabase as any)
        .from("deadline_extensions")
        .select("id, purchase_id, student_id")
        .eq("id", extensionId)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!extension) throw new Error("Extension not found");

      // Mark extension as revoked
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateError } = await (supabase as any)
        .from("deadline_extensions")
        .update({ revoked: true, revoked_by: user.id })
        .eq("id", extensionId);

      if (updateError) throw updateError;

      // Refund the purchase token
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("xp_purchases")
        .update({ status: "active", consumed_at: null })
        .eq("id", extension.purchase_id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.assignments.lists(),
      });
      toast.success("Deadline extension revoked and token refunded.");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to revoke extension");
    },
  });
};
