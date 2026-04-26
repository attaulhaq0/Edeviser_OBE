import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { calculateSessionXP, countWords, generateReviewDates } from '@/lib/plannerUtils';

interface CompleteSessionInput {
  sessionId: string;
  actualDurationMinutes: number;
  notes?: string;
  satisfactionRating?: number;
  hasEvidence: boolean;
}

interface FullCompletionInput {
  sessionId: string;
  actualDurationMinutes: number;
  notes: string | null;
  satisfactionRating: number | null;
  reflectionContent: string | null;
  evidenceFiles: File[];
}

interface FullCompletionResult {
  totalXP: number;
  sessionXP: number;
  reflectionXP: number;
}

export const useCompleteSession = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CompleteSessionInput) => {
      const { sessionId, actualDurationMinutes, satisfactionRating, hasEvidence } = input;

      // Update session status
      const { error: updateErr } = await supabase
        .from('study_sessions')
        .update({
          status: 'completed',
          actual_end_at: new Date().toISOString(),
          actual_duration_minutes: actualDurationMinutes,
          satisfaction_rating: satisfactionRating ?? null,
        })
        .eq('id', sessionId);
      if (updateErr) throw updateErr;

      // Calculate and award XP
      const xpAmount = calculateSessionXP(actualDurationMinutes, hasEvidence);
      if (xpAmount > 0) {
        await supabase.functions.invoke('award-xp', {
          body: {
            student_id: user!.id,
            xp_amount: xpAmount,
            source: 'study_session',
            reference_id: `study_session:${sessionId}`,
            note: `Study session completed (${actualDurationMinutes} min)`,
          },
        });
      }

      // Check badges
      await supabase.functions.invoke('check-badges', {
        body: {
          student_id: user!.id,
          trigger: 'study_session',
        },
      });

      // Auto-mark Read habit if session >= 15 min
      if (actualDurationMinutes >= 15) {
        const today = new Date().toISOString().split('T')[0];
        await supabase
          .from('habit_logs')
          .upsert(
            { student_id: user!.id, habit_type: 'read', date: today },
            { onConflict: 'student_id,habit_type,date' },
          );
      }

      return { xpAmount };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.studySessions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.weeklyPlanner.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.studentGamification.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.habitLogs.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.badges.all });
      if (result.xpAmount > 0) {
        toast.success(`Session completed! +${result.xpAmount} XP`);
      } else {
        toast.success('Session completed');
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });
};

/**
 * Full session completion mutation that orchestrates the entire flow:
 * 1. Update study_sessions (status, actual_end_at, actual_duration_minutes, satisfaction_rating, notes)
 * 2. Upload evidence files to Supabase Storage + insert session_evidence records
 * 3. Calculate XP via calculateSessionXP(actualDuration, hasEvidence)
 * 4. Award XP via award-xp Edge Function with source 'study_session'
 * 5. Check badges via check-badges Edge Function with trigger 'study_session'
 * 6. Auto-mark "Read" habit if session >= 15 min
 * 7. Save reflection + award 10 XP if reflection content >= 30 words
 * 8. Return total XP earned for toast display
 */
export const useFullSessionCompletion = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: FullCompletionInput): Promise<FullCompletionResult> => {
      const {
        sessionId,
        actualDurationMinutes,
        notes,
        satisfactionRating,
        reflectionContent,
        evidenceFiles,
      } = input;
      const studentId = user!.id;
      let reflectionXP = 0;

      // Step 1: Update session status
      const { error: updateErr } = await supabase
        .from('study_sessions')
        .update({
          status: 'completed',
          actual_end_at: new Date().toISOString(),
          actual_duration_minutes: actualDurationMinutes,
          satisfaction_rating: satisfactionRating ?? null,
        })
        .eq('id', sessionId);
      if (updateErr) throw updateErr;

      // Step 2: Upload evidence files + insert evidence records
      const hasEvidence = evidenceFiles.length > 0;
      if (hasEvidence) {
        const evidenceRecords: Array<Record<string, unknown>> = [];

        for (const file of evidenceFiles) {
          const filePath = `${studentId}/${sessionId}/${Date.now()}_${file.name}`;
          const { error: uploadErr } = await supabase.storage
            .from('session-evidence')
            .upload(filePath, file);
          if (uploadErr) throw uploadErr;

          const { data: urlData } = supabase.storage
            .from('session-evidence')
            .getPublicUrl(filePath);

          evidenceRecords.push({
            session_id: sessionId,
            student_id: studentId,
            file_url: urlData.publicUrl,
            file_name: file.name,
            file_size_bytes: file.size,
            mime_type: file.type,
            notes: notes ?? null,
          });
        }

        if (evidenceRecords.length > 0) {
          const { error: insertErr } = await supabase
            .from('session_evidence')
            .insert(evidenceRecords);
          if (insertErr) throw insertErr;
        }
      }

      // Step 3 & 4: Calculate and award session XP
      const sessionXP = calculateSessionXP(actualDurationMinutes, hasEvidence);
      if (sessionXP > 0) {
        await supabase.functions.invoke('award-xp', {
          body: {
            student_id: studentId,
            xp_amount: sessionXP,
            source: 'study_session',
            reference_id: `study_session:${sessionId}`,
            note: `Study session completed (${actualDurationMinutes} min)${hasEvidence ? ' with evidence' : ''}`,
          },
        });
      }

      // Step 5: Check badges
      await supabase.functions.invoke('check-badges', {
        body: {
          student_id: studentId,
          trigger: 'study_session',
        },
      });

      // Step 6: Auto-mark Read habit if session >= 15 min
      if (actualDurationMinutes >= 15) {
        const today = new Date().toISOString().split('T')[0];
        await supabase
          .from('habit_logs')
          .upsert(
            { student_id: studentId, habit_type: 'read', date: today },
            { onConflict: 'student_id,habit_type,date' },
          );
      }

      // Step 7: Save reflection + award XP if content >= 30 words
      if (reflectionContent && countWords(reflectionContent) >= 30) {
        const wordCount = countWords(reflectionContent);
        const { error: reflectionErr } = await supabase
          .from('session_reflections')
          .insert({
            session_id: sessionId,
            student_id: studentId,
            content: reflectionContent,
            word_count: wordCount,
          });
        if (reflectionErr) throw reflectionErr;

        reflectionXP = 10;
        await supabase.functions.invoke('award-xp', {
          body: {
            student_id: studentId,
            xp_amount: reflectionXP,
            source: 'session_reflection',
            reference_id: `session_reflection:${sessionId}`,
            note: 'Session reflection completed',
          },
        });
      }

      // Step 8: Create review schedules for CLO-linked sessions (spaced repetition)
      // Fetch the session to get clo_ids and course_id
      const { data: sessionData } = await supabase
        .from('study_sessions')
        .select('clo_ids, course_id, planned_date')
        .eq('id', sessionId)
        .single();

      if (sessionData) {
        const cloIds = sessionData.clo_ids as string[] | null;
        const courseId = sessionData.course_id as string;
        const sessionDate = sessionData.planned_date as string;

        if (cloIds && cloIds.length > 0) {
          const reviewRecords: Array<Record<string, unknown>> = [];
          for (const cloId of cloIds) {
            const reviewDates = generateReviewDates(sessionDate);
            for (const { reviewDate, intervalDays } of reviewDates) {
              reviewRecords.push({
                student_id: studentId,
                clo_id: cloId,
                course_id: courseId,
                source_session_id: sessionId,
                review_date: reviewDate,
                interval_days: intervalDays,
              });
            }
          }

          if (reviewRecords.length > 0) {
            // ON CONFLICT DO NOTHING — prevent duplicate scheduling
            await supabase
              .from('review_schedules')
              .upsert(reviewRecords, {
                onConflict: 'student_id,clo_id,review_date,interval_days',
                ignoreDuplicates: true,
              });
          }
        }
      }

      // Step 9: Return total XP for toast
      return {
        totalXP: sessionXP + reflectionXP,
        sessionXP,
        reflectionXP,
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.studySessions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.weeklyPlanner.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.studentGamification.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.habitLogs.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.badges.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.sessionEvidence.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.sessionReflections.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.reviewSchedules.all });

      if (result.totalXP > 0) {
        const parts: string[] = [];
        if (result.sessionXP > 0) parts.push(`${result.sessionXP} session`);
        if (result.reflectionXP > 0) parts.push(`${result.reflectionXP} reflection`);
        toast.success(`Session complete! +${result.totalXP} XP (${parts.join(' + ')})`);
      } else {
        toast.success('Session completed');
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });
};
