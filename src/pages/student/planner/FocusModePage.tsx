// =============================================================================
// FocusModePage — Full-screen focus page composing: FocusTimer,
// SessionCompletionForm (shown on complete), minimal navigation
// Route: /student/focus/:sessionId
// =============================================================================

import { useState, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import FocusTimer from "@/components/shared/FocusTimer";
import SessionCompletionForm from "@/components/shared/SessionCompletionForm";
import Shimmer from "@/components/shared/Shimmer";
import { useFocusTimer } from "@/hooks/useFocusTimer";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import type { StudySession } from "@/types/planner";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

// ─── Session Fetch ───────────────────────────────────────────────────────────

function useStudySession(sessionId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.studySessions.detail(sessionId ?? ""),
    queryFn: async (): Promise<StudySession | null> => {
      if (!sessionId) return null;
      const { data, error } = await supabase
        .from("study_sessions")
        .select("*")
        .eq("id", sessionId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;

      return {
        id: data.id as string,
        studentId: data.student_id as string,
        courseId: data.course_id as string,
        title: data.title as string,
        description: (data.description as string) ?? null,
        plannedDate: data.planned_date as string,
        plannedStartTime: data.planned_start_time as string,
        plannedDurationMinutes: data.planned_duration_minutes as number,
        actualStartAt: (data.actual_start_at as string) ?? null,
        actualEndAt: (data.actual_end_at as string) ?? null,
        actualDurationMinutes: (data.actual_duration_minutes as number) ?? null,
        timerMode: data.timer_mode as StudySession["timerMode"],
        status: data.status as StudySession["status"],
        satisfactionRating: (data.satisfaction_rating as number) ?? null,
        cloIds: (data.clo_ids as string[]) ?? null,
        createdAt: data.created_at as string,
      };
    },
    enabled: !!sessionId,
  });
}

// ─── Main Page ───────────────────────────────────────────────────────────────

const FocusModePage = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  useAuth(); // Ensure user is authenticated

  // ─── Fetch session data ──────────────────────────────────────────────────
  const {
    data: session,
    isLoading: sessionLoading,
    isError: sessionError,
  } = useStudySession(sessionId);

  // ─── Timer hook ──────────────────────────────────────────────────────────
  const timer = useFocusTimer({
    sessionId: sessionId ?? "",
    mode: session?.timerMode ?? "pomodoro",
    durationMinutes: session?.plannedDurationMinutes ?? 25,
    onComplete: () => {
      // Timer completed — handled by FocusTimer component
    },
  });

  // ─── Completion state ────────────────────────────────────────────────────
  const [showCompletion, setShowCompletion] = useState(false);

  const handleTimerComplete = useCallback(() => {
    setShowCompletion(true);
  }, []);

  const handleTimerEnd = useCallback(() => {
    setShowCompletion(true);
  }, []);

  const handleCompletionSubmit = useCallback(() => {
    toast.success("Session saved!");
    navigate("/student/planner");
  }, [navigate]);

  const handleBack = useCallback(() => {
    navigate("/student/planner");
  }, [navigate]);

  // ─── CLO titles (placeholder — would come from a CLO query) ──────────────
  const sessionCloIds = session?.cloIds;
  const cloTitles = useMemo(() => {
    if (!sessionCloIds || sessionCloIds.length === 0) return [];
    return sessionCloIds.map((_, i) => `CLO ${i + 1}`);
  }, [sessionCloIds]);

  // ─── Loading ─────────────────────────────────────────────────────────────
  if (sessionLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6">
        <Shimmer className="h-56 w-56 rounded-full" />
        <Shimmer className="mt-6 h-10 w-48 rounded-lg" />
      </div>
    );
  }

  // ─── Error / Not Found ───────────────────────────────────────────────────
  if (sessionError || !session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6">
        <p className="text-sm text-red-500 mb-4">
          {sessionError
            ? "Failed to load session. Please try again."
            : "Session not found."}
        </p>
        <Button variant="outline" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 me-2" />
          Back to Planner
        </Button>
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* Minimal Navigation */}
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-sm text-gray-600"
          onClick={handleBack}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <span className="text-sm font-medium text-gray-500">Focus Mode</span>
        <div className="w-16" /> {/* Spacer for centering */}
      </header>

      {/* Main Content */}
      <main className="flex flex-1 flex-col items-center justify-center p-6">
        {showCompletion ? (
          <SessionCompletionForm
            session={session}
            actualDurationMinutes={timer.actualDurationMinutes}
            onComplete={handleCompletionSubmit}
          />
        ) : (
          <FocusTimer
            timer={timer}
            session={session}
            cloTitles={cloTitles}
            onComplete={handleTimerComplete}
            onEnd={handleTimerEnd}
          />
        )}
      </main>
    </div>
  );
};

export default FocusModePage;
