import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';

export const useActivateDeadlineExtension = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ purchaseId, assignmentId, studentId }: { purchaseId: string; assignmentId: string; studentId: string }) => {
      const { data: assignment, error: aErr } = await supabase
        .from('assignments')
        .select('due_date, title, course_id, courses(teacher_id)')
        .eq('id', assignmentId)
        .single() as unknown as { data: { due_date: string; title: string; course_id: string; courses: { teacher_id: string | null } | null } | null; error: { message: string } | null };
      if (aErr) throw aErr;
      if (!assignment) throw new Error('Assignment not found');

      const originalDeadline = new Date(assignment.due_date);
      if (originalDeadline < new Date()) throw new Error('Assignment deadline has already passed');

      const extendedDeadline = new Date(originalDeadline.getTime() + 24 * 60 * 60 * 1000);

      const { data, error } = await (supabase.from('deadline_extensions') as unknown as {
        insert: (v: unknown) => { select: () => { single: () => Promise<{ data: { id: string; student_id: string; assignment_id: string } | null; error: { message: string } | null }> } }
      }).insert({
        student_id: studentId,
        assignment_id: assignmentId,
        purchase_id: purchaseId,
        original_deadline: originalDeadline.toISOString(),
        extended_deadline: extendedDeadline.toISOString(),
      }).select().single();
      if (error) throw error;
      if (!data) throw new Error('Failed to create deadline extension');

      await supabase.from('xp_purchases').update({ status: 'consumed', consumed_at: new Date().toISOString() }).eq('id', purchaseId);

      // ── Notify teacher about deadline extension (Requirement 9.3) ──
      const teacherId = assignment.courses?.teacher_id;
      if (teacherId) {
        const { data: studentProfile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', studentId)
          .maybeSingle();

        const studentName = studentProfile?.full_name ?? 'A student';
        const assignmentTitle = assignment.title ?? 'an assignment';

        await supabase.from('notifications').insert({
          user_id: teacherId,
          type: 'deadline_extension',
          title: 'Deadline Extension Activated',
          body: `${studentName} activated a 24-hour deadline extension on "${assignmentTitle}". New deadline: ${extendedDeadline.toLocaleDateString()}.`,
          is_read: false,
          metadata: {
            student_id: studentId,
            assignment_id: assignmentId,
            extension_id: data.id,
            original_deadline: originalDeadline.toISOString(),
            extended_deadline: extendedDeadline.toISOString(),
          },
        });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.marketplace.all });
    },
  });
};

export const useRevokeDeadlineExtension = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ extensionId, revokedBy }: { extensionId: string; revokedBy: string }) => {
      const { error } = await supabase
        .from('deadline_extensions')
        .update({ revoked: true, revoked_by: revokedBy })
        .eq('id', extensionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.marketplace.all });
    },
  });
};
