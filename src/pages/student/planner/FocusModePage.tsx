import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { useAuth } from '@/hooks/useAuth';
import { useFocusTimer } from '@/hooks/useFocusTimer';
import { useUpdateStudySession } from '@/hooks/useStudySessions';
import { useFullSessionCompletion } from '@/hooks/useSessionCompletion';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useSaveSessionIntent, useSuggestedIntents, useSessionIntentForSession } from '@/hooks/useSessionIntent';
import { useSaveFlowCheckIn } from '@/hooks/useFlowCheckIns';
import { offlineQueue } from '@/lib/offlineQueue';
import { calculateSessionXP, calculateActualDuration, countWords } from '@/lib/plannerUtils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Target } from 'lucide-react';
import FocusTimer from '@/components/shared/FocusTimer';
import SessionIntentDialog from '@/components/shared/SessionIntentDialog';
import FlowCheckInDialog from '@/components/shared/FlowCheckInDialog';
import SessionCompletionForm from '@/components/shared/SessionCompletionForm';
import OfflineIndicator from '@/components/shared/OfflineIndicator';
import Shimmer from '@/components/shared/Shimmer';
import { toast } from 'sonner';
import type { StudySession, FlowResponse } from '@/types/planner';
import type { SessionCompletionData } from '@/components/shared/SessionCompletionForm';
import { restoreTimerState } from '@/lib/timerPersistence';

// Register offline queue handlers for Focus Mode API calls
offlineQueue.registerHandler('update_session', async (payload: unknown) => {
  const p = payload as Record<string, unknown>;
  const { error } = await supabase
    .from('study_sessions')
    .update({
      status: p.status,
      actual_start_at: p.actual_start_at,
      actual_end_at: p.actual_end_at,
      actual_duration_minutes: p.actual_duration_minutes,
      satisfaction_rating: p.satisfaction_rating,
    })
    .eq('id', p.id as string);
  if (error) throw error;
});

offlineQueue.registerHandler('award_xp', async (payload: unknown) => {
  const { error } = await supabase.functions.invoke('award-xp', {
    body: payload as Record<string, unknown>,
  });
  if (error) throw error;
});

offlineQueue.registerHandler('check_badges', async (payload: unknown) => {
  const { error } = await supabase.functions.invoke('check-badges', {
    body: payload as Record<string, unknown>,
  });
  if (error) throw error;
});

offlineQueue.registerHandler('auto_mark_habit', async (payload: unknown) => {
  const p = payload as Record<string, unknown>;
  const { error } = await supabase
    .from('habit_logs')
    .upsert(
      { student_id: p.student_id, habit_type: p.habit_type, date: p.date },
      { onConflict: 'student_id,habit_type,date' },
    );
  if (error) throw error;
});

offlineQueue.registerHandler('save_reflection', async (payload: unknown) => {
  const p = payload as Record<string, unknown>;
  const { error } = await supabase
    .from('session_reflections')
    .insert({
      session_id: p.session_id,
      student_id: p.student_id,
      content: p.content,
      word_count: p.word_count,
    });
  if (error) throw error;
});

const FocusModePage = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const updateSession = useUpdateStudySession();
  const fullCompletion = useFullSessionCompletion();
  const [showCompletionForm, setShowCompletionForm] = useState(false);
  const [completedDuration, setCompletedDuration] = useState(0);
  const { isOnline, wasOffline, resetWasOffline } = useNetworkStatus();
  const completedDurationRef = useRef(0);

  // Session Intent state
  const [showIntentDialog, setShowIntentDialog] = useState(false);
  const [intentSubmitted, setIntentSubmitted] = useState(false);
  const saveIntent = useSaveSessionIntent();
  const { data: existingIntent } = useSessionIntentForSession(sessionId ?? '');

  // Flow Check-In state
  const [showFlowCheckIn, setShowFlowCheckIn] = useState(false);
  const [flowCheckInInterval, setFlowCheckInInterval] = useState(1);
  const saveFlowCheckIn = useSaveFlowCheckIn();
  const lastBreakIntervalRef = useRef(0);

  // Initialize offline queue flush-on-reconnect and clean up on unmount
  useEffect(() => {
    const cleanup = offlineQueue.init();
    return cleanup;
  }, []);

  // Show toast when coming back online
  useEffect(() => {
    if (isOnline && wasOffline) {
      const pending = offlineQueue.size();
      if (pending > 0) {
        toast.success(`Back online — syncing ${pending} pending action${pending > 1 ? 's' : ''}…`);
      } else {
        toast.success('Back online');
      }
      resetWasOffline();
    }
  }, [isOnline, wasOffline, resetWasOffline]);

  // Fetch session data
  const { data: session, isLoading } = useQuery({
    queryKey: queryKeys.studySessions.detail(sessionId ?? ''),
    queryFn: async (): Promise<StudySession> => {
      const { data, error } = await supabase
        .from('study_sessions')
        .select('*, courses(name)')
        .eq('id', sessionId!)
        .single();
      if (error) throw error;
      return {
        id: data.id as string,
        studentId: data.student_id as string,
        courseId: data.course_id as string,
        courseName: (data.courses as unknown as Record<string, unknown> | null)?.name as string | undefined,
        title: data.title as string,
        description: data.description as string | null,
        plannedDate: data.planned_date as string,
        plannedStartTime: data.planned_start_time as string,
        plannedDurationMinutes: data.planned_duration_minutes as number,
        actualStartAt: data.actual_start_at as string | null,
        actualEndAt: data.actual_end_at as string | null,
        actualDurationMinutes: data.actual_duration_minutes as number | null,
        timerMode: data.timer_mode as 'pomodoro' | 'custom',
        status: data.status as 'planned' | 'in_progress' | 'completed' | 'cancelled',
        satisfactionRating: data.satisfaction_rating as number | null,
        cloIds: data.clo_ids as string[] | null,
        createdAt: data.created_at as string,
      };
    },
    enabled: !!sessionId,
  });

  // Fetch suggested intents for the session intent dialog
  const { data: suggestedIntents } = useSuggestedIntents(
    sessionId ?? '',
    session?.courseId ?? '',
  );

  // Handle session intent submission
  const handleIntentSubmit = useCallback(
    (concept: string, successCriterion: string, isAutoSuggested: boolean) => {
      if (!sessionId) return;
      saveIntent.mutate(
        { sessionId, concept, successCriterion, isAutoSuggested },
        {
          onSuccess: () => {
            setIntentSubmitted(true);
            setShowIntentDialog(false);
          },
        },
      );
    },
    [sessionId, saveIntent],
  );

  const handleIntentSkip = useCallback(() => {
    setIntentSubmitted(true);
    setShowIntentDialog(false);
  }, []);

  // Handle flow check-in response
  const handleFlowRespond = useCallback(
    (response: FlowResponse) => {
      if (!sessionId) return;
      saveFlowCheckIn.mutate({
        sessionId,
        intervalNumber: flowCheckInInterval,
        response,
      });
      setShowFlowCheckIn(false);
    },
    [sessionId, flowCheckInInterval, saveFlowCheckIn],
  );

  const handleFlowDismiss = useCallback(() => {
    setShowFlowCheckIn(false);
  }, []);

  // Callback for when a Pomodoro break starts — show FlowCheckInDialog
  const handleBreakStart = useCallback(() => {
    const nextInterval = lastBreakIntervalRef.current + 1;
    lastBreakIntervalRef.current = nextInterval;
    setFlowCheckInInterval(nextInterval);
    setShowFlowCheckIn(true);
  }, []);

  const handleComplete = useCallback(() => {
    if (!session || !user) return;

    // Compute actual duration from persisted timer state
    const saved = restoreTimerState();
    const actualDuration = saved
      ? calculateActualDuration(saved.startedAt, Date.now(), saved.totalPausedMs)
      : 0;

    completedDurationRef.current = actualDuration;
    setCompletedDuration(actualDuration);
    setShowCompletionForm(true);
  }, [session, user]);

  /** Handle full form submission with evidence, reflection, and XP */
  const handleFormSubmit = useCallback(
    async (data: SessionCompletionData) => {
      if (!session || !user) return;

      const actualDuration = completedDurationRef.current;
      const hasEvidence = data.evidenceFiles.length > 0;
      const hasReflection = data.reflectionContent !== null && countWords(data.reflectionContent) >= 30;

      if (isOnline) {
        // Online: use the full completion mutation
        fullCompletion.mutate({
          sessionId: session.id,
          actualDurationMinutes: actualDuration,
          notes: data.notes,
          satisfactionRating: data.satisfactionRating,
          reflectionContent: data.reflectionContent,
          evidenceFiles: data.evidenceFiles,
        }, {
          onSuccess: () => {
            navigate('/student/planner');
          },
        });
      } else {
        // Offline: queue all API calls for later sync
        // Note: evidence file uploads cannot be queued offline (File objects don't serialize)
        // Queue session update
        offlineQueue.enqueue('update_session', {
          id: session.id,
          status: 'completed',
          actual_end_at: new Date().toISOString(),
          actual_duration_minutes: actualDuration,
          satisfaction_rating: data.satisfactionRating ?? null,
        });

        // Queue XP award (calculate without evidence since files can't be queued)
        const sessionXP = calculateSessionXP(actualDuration, false);
        if (sessionXP > 0) {
          offlineQueue.enqueue('award_xp', {
            student_id: user.id,
            xp_amount: sessionXP,
            source: 'study_session',
            reference_id: `study_session:${session.id}`,
            note: `Study session completed (${actualDuration} min)`,
          });
        }

        // Queue badge check
        offlineQueue.enqueue('check_badges', {
          student_id: user.id,
          trigger: 'study_session',
        });

        // Queue auto-mark Read habit if >= 15 min
        if (actualDuration >= 15) {
          offlineQueue.enqueue('auto_mark_habit', {
            student_id: user.id,
            habit_type: 'read',
            date: new Date().toISOString().split('T')[0],
          });
        }

        // Queue reflection if provided and >= 30 words
        if (hasReflection && data.reflectionContent) {
          const wordCount = countWords(data.reflectionContent);
          offlineQueue.enqueue('save_reflection', {
            session_id: session.id,
            student_id: user.id,
            content: data.reflectionContent,
            word_count: wordCount,
          });

          offlineQueue.enqueue('award_xp', {
            student_id: user.id,
            xp_amount: 10,
            source: 'session_reflection',
            reference_id: `session_reflection:${session.id}`,
            note: 'Session reflection completed',
          });
        }

        // Show offline toast with total XP
        const reflectionXP = hasReflection ? 10 : 0;
        const totalXP = sessionXP + reflectionXP;
        if (totalXP > 0) {
          toast.success(`Session complete! +${totalXP} XP — data will sync when back online.`);
        } else {
          toast.success('Session complete! Data will sync when back online.');
        }

        if (hasEvidence) {
          toast.info('Evidence files will need to be re-uploaded when back online.');
        }

        navigate('/student/planner');
      }
    },
    [session, user, isOnline, fullCompletion, navigate],
  );

  /** Handle Skip: just update session status and navigate back */
  const handleSkip = useCallback(() => {
    if (!session || !user) return;

    const actualDuration = completedDurationRef.current;

    if (isOnline) {
      // Update session with minimal data (no evidence, no reflection)
      const sessionUpdatePayload = {
        id: session.id,
        status: 'completed' as const,
        actual_end_at: new Date().toISOString(),
        actual_duration_minutes: actualDuration,
      };
      updateSession.mutate(sessionUpdatePayload);

      // Award session XP (no evidence bonus)
      const xpAmount = calculateSessionXP(actualDuration, false);
      if (xpAmount > 0) {
        supabase.functions.invoke('award-xp', {
          body: {
            student_id: user.id,
            xp_amount: xpAmount,
            source: 'study_session',
            reference_id: `study_session:${session.id}`,
            note: `Study session completed: ${actualDuration} min`,
          },
        }).catch(() => { /* non-blocking */ });
        toast.success(`Session complete! +${xpAmount} XP`);
      } else {
        toast.success('Session complete!');
      }

      // Check badges (non-blocking)
      supabase.functions.invoke('check-badges', {
        body: { student_id: user.id, trigger: 'study_session' },
      }).catch(() => { /* non-blocking */ });

      // Auto-mark Read habit if >= 15 min (non-blocking)
      if (actualDuration >= 15) {
        const today = new Date().toISOString().split('T')[0];
        supabase
          .from('habit_logs')
          .upsert(
            { student_id: user.id, habit_type: 'read', date: today },
            { onConflict: 'student_id,habit_type,date' },
          )
          .then(() => { /* success */ }, () => { /* non-blocking */ });
      }
    } else {
      // Offline: queue minimal completion
      offlineQueue.enqueue('update_session', {
        id: session.id,
        status: 'completed',
        actual_end_at: new Date().toISOString(),
        actual_duration_minutes: actualDuration,
      });

      const xpAmount = calculateSessionXP(actualDuration, false);
      if (xpAmount > 0) {
        offlineQueue.enqueue('award_xp', {
          student_id: user.id,
          xp_amount: xpAmount,
          source: 'study_session',
          reference_id: `study_session:${session.id}`,
          note: `Study session completed: ${actualDuration} min`,
        });
      }

      offlineQueue.enqueue('check_badges', {
        student_id: user.id,
        trigger: 'study_session',
      });

      if (actualDuration >= 15) {
        offlineQueue.enqueue('auto_mark_habit', {
          student_id: user.id,
          habit_type: 'read',
          date: new Date().toISOString().split('T')[0],
        });
      }

      toast.success('Session complete! Data will sync when back online.');
    }

    navigate('/student/planner');
  }, [session, user, updateSession, isOnline, navigate]);

  const timer = useFocusTimer({
    sessionId: sessionId ?? '',
    mode: session?.timerMode ?? 'pomodoro',
    durationMinutes: session?.plannedDurationMinutes ?? 25,
    onComplete: handleComplete,
    onBreakStart: handleBreakStart,
  });

  // For custom sessions ≥50 min, show flow check-in at midpoint
  const customMidpointShownRef = useRef(false);
  useEffect(() => {
    if (
      session?.timerMode === 'custom' &&
      session.plannedDurationMinutes >= 50 &&
      !customMidpointShownRef.current &&
      timer.timerState === 'running'
    ) {
      const midpointMs = (session.plannedDurationMinutes * 60 * 1000) / 2;
      if (timer.elapsedMs >= midpointMs) {
        customMidpointShownRef.current = true;
        const nextInterval = lastBreakIntervalRef.current + 1;
        lastBreakIntervalRef.current = nextInterval;
        setFlowCheckInInterval(nextInterval);
        setShowFlowCheckIn(true);
      }
    }
  }, [session, timer.timerState, timer.elapsedMs]);

  // Mark session as in_progress when timer starts
  const handleStart = useCallback(() => {
    // If intent hasn't been submitted yet and no existing intent, show the dialog first
    if (!intentSubmitted && !existingIntent) {
      setShowIntentDialog(true);
      return;
    }

    if (session && session.status === 'planned') {
      const startPayload = {
        id: session.id,
        status: 'in_progress' as const,
        actual_start_at: new Date().toISOString(),
      };

      if (isOnline) {
        updateSession.mutate(startPayload);
      } else {
        offlineQueue.enqueue('update_session', startPayload);
      }
    }
    timer.start();
  }, [session, updateSession, timer, isOnline, intentSubmitted, existingIntent]);

  // Auto-start timer after intent dialog is submitted or skipped
  useEffect(() => {
    if (intentSubmitted && timer.timerState === 'idle' && session) {
      if (session.status === 'planned') {
        const startPayload = {
          id: session.id,
          status: 'in_progress' as const,
          actual_start_at: new Date().toISOString(),
        };
        if (isOnline) {
          updateSession.mutate(startPayload);
        } else {
          offlineQueue.enqueue('update_session', startPayload);
        }
      }
      timer.start();
    }
  }, [intentSubmitted, timer, session, updateSession, isOnline]);

  if (isLoading || !session) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Shimmer className="h-64 w-64 rounded-full" />
      </div>
    );
  }

  // Show SessionCompletionForm after timer completes
  if (showCompletionForm) {
    return (
      <div className="min-h-[80vh] flex flex-col">
        {/* Minimal nav */}
        <div className="flex items-center justify-between mb-8">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => navigate('/student/planner')}
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          {!isOnline && <OfflineIndicator queueSize={offlineQueue.size()} />}
        </div>

        {/* Completion form */}
        <div className="flex-1 flex items-center justify-center py-6">
          <SessionCompletionForm
            session={session}
            actualDurationMinutes={completedDuration}
            onSubmit={handleFormSubmit}
            onSkip={handleSkip}
            isSubmitting={fullCompletion.isPending}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex flex-col">
      {/* Minimal nav */}
      <div className="flex items-center justify-between mb-8">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => navigate('/student/planner')}
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        {!isOnline && <OfflineIndicator queueSize={offlineQueue.size()} />}
      </div>

      {/* Timer */}
      <Card className="bg-white border-0 shadow-lg rounded-2xl p-8 flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-6 w-full">
          <FocusTimer
            display={timer.display}
            remainingMs={timer.remainingMs}
            timerState={timer.timerState}
            mode={session.timerMode}
            pomodoroInterval={timer.pomodoroInterval}
            pomodoroIntervalType={timer.pomodoroIntervalType}
            sessionTitle={session.title}
            courseName={session.courseName}
            onStart={handleStart}
            onPause={timer.pause}
            onResume={timer.resume}
            onEnd={timer.end}
            onSkipBreak={timer.skipBreak}
          />

          {/* Display session intent alongside timer */}
          {(existingIntent || intentSubmitted) && existingIntent && (
            <div className="w-full max-w-md mx-auto mt-4 p-3 rounded-lg bg-blue-50 border border-blue-200">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">
                <Target className="h-3.5 w-3.5" /> Session Intent
              </div>
              <p className="text-sm font-medium text-gray-800">{existingIntent.concept}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Success: {existingIntent.successCriterion}
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Session Intent Dialog — shown before starting timer */}
      <SessionIntentDialog
        open={showIntentDialog}
        onOpenChange={setShowIntentDialog}
        suggestedIntents={suggestedIntents ?? []}
        onSubmit={handleIntentSubmit}
        onSkip={handleIntentSkip}
        isSubmitting={saveIntent.isPending}
      />

      {/* Flow Check-In Dialog — shown at Pomodoro breaks and custom midpoint */}
      <FlowCheckInDialog
        open={showFlowCheckIn}
        onOpenChange={setShowFlowCheckIn}
        sessionId={sessionId ?? ''}
        intervalNumber={flowCheckInInterval}
        cloId={session.cloIds?.[0] ?? null}
        onRespond={handleFlowRespond}
        onDismiss={handleFlowDismiss}
      />
    </div>
  );
};

export default FocusModePage;
