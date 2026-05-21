// =============================================================================
// TeacherHandoffPage — Teacher handoff dashboard
// Task 18.5
// =============================================================================

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import Shimmer from "@/components/shared/Shimmer";
import GradientCardHeader from "@/components/shared/GradientCardHeader";
import { InlineNoData } from "@/components/shared/EmptyState";
import { useAuth } from "@/hooks/useAuth";
import { useCourses } from "@/hooks/useCourses";
import {
  useTeacherHandoffs,
  useRespondToHandoff,
} from "@/hooks/useTeacherHandoffs";
import { useTutorAnalytics } from "@/hooks/useTutorAnalytics";
import {
  Handshake,
  MessageSquareWarning,
  ShieldAlert,
  Users,
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import type { TeacherHandoffRequest } from "@/lib/tutorSchemas";

// ─── Trigger Reason Badge ────────────────────────────────────────────────────

const REASON_LABELS: Record<string, string> = {
  low_rag_confidence: "Low Confidence",
  repeated_question: "Repeated Question",
  low_satisfaction: "Low Satisfaction",
};

const REASON_COLORS: Record<string, string> = {
  low_rag_confidence: "bg-amber-100 text-amber-700",
  repeated_question: "bg-blue-100 text-blue-700",
  low_satisfaction: "bg-red-100 text-red-700",
};

const TriggerReasonBadge = ({ reason }: { reason: string }) => (
  <Badge
    variant="secondary"
    className={`text-xs font-bold ${
      REASON_COLORS[reason] ?? "bg-gray-100 text-gray-700"
    }`}
  >
    {REASON_LABELS[reason] ?? reason}
  </Badge>
);

const StatusBadge = ({ status }: { status: string }) => {
  if (status === "pending") {
    return (
      <Badge
        variant="secondary"
        className="bg-yellow-100 text-yellow-700 text-xs font-bold"
      >
        <Clock className="h-3 w-3 me-1" /> Pending
      </Badge>
    );
  }
  if (status === "resolved") {
    return (
      <Badge
        variant="secondary"
        className="bg-green-100 text-green-700 text-xs font-bold"
      >
        <CheckCircle2 className="h-3 w-3 me-1" /> Resolved
      </Badge>
    );
  }
  return (
    <Badge
      variant="secondary"
      className="bg-gray-100 text-gray-500 text-xs font-bold"
    >
      <XCircle className="h-3 w-3 me-1" /> Dismissed
    </Badge>
  );
};

// ─── TeacherHandoffPage ─────────────────────────────────────────────────────

const TeacherHandoffPage = () => {
  const { user } = useAuth();
  const { data: paginatedCourses, isLoading: coursesLoading } = useCourses();
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [respondDialogOpen, setRespondDialogOpen] = useState(false);
  const [selectedHandoff, setSelectedHandoff] =
    useState<TeacherHandoffRequest | null>(null);
  const [responseText, setResponseText] = useState("");

  const teacherCourses = useMemo(
    () =>
      (paginatedCourses?.data ?? []).filter((c) => c.teacher_id === user?.id),
    [paginatedCourses, user?.id]
  );

  const effectiveCourseId =
    selectedCourseId ||
    (teacherCourses.length > 0 ? teacherCourses[0]!.id : "");

  const { data: handoffs, isLoading: handoffsLoading } =
    useTeacherHandoffs(effectiveCourseId);
  const { data: analytics, isLoading: analyticsLoading } =
    useTutorAnalytics(effectiveCourseId);
  const respondMutation = useRespondToHandoff();

  const pendingHandoffs = useMemo(
    () => (handoffs ?? []).filter((h) => h.status === "pending"),
    [handoffs]
  );

  const isLoading = coursesLoading || handoffsLoading || analyticsLoading;

  // ── 18.5.2: Most-asked questions (anonymized from common_topics) ──────
  const mostAskedQuestions = analytics?.common_topics?.slice(0, 10) ?? [];

  // ── 18.5.3: Low-confidence topics (CLOs with low RAG scores) ──────────
  const lowConfidenceTopics = useMemo(() => {
    // Derive from top_questioned_clos — those with high conversation counts
    // indicate areas where students need more help
    return (analytics?.top_questioned_clos ?? [])
      .filter((clo) => clo.conversation_count >= 3)
      .slice(0, 8);
  }, [analytics?.top_questioned_clos]);

  // ── 18.5.4: High AI dependency students (anonymized) ──────────────────
  // This section shows aggregate data — individual student data is anonymized
  const highDependencyCount = useMemo(() => {
    // Derive from handoff data — students with multiple handoff requests
    const studentCounts = new Map<string, number>();
    for (const h of handoffs ?? []) {
      studentCounts.set(
        h.student_id,
        (studentCounts.get(h.student_id) ?? 0) + 1
      );
    }
    return [...studentCounts.values()].filter((count) => count >= 2).length;
  }, [handoffs]);

  const handleRespond = (handoff: TeacherHandoffRequest) => {
    setSelectedHandoff(handoff);
    setResponseText("");
    setRespondDialogOpen(true);
  };

  const handleDismiss = (handoff: TeacherHandoffRequest) => {
    respondMutation.mutate(
      {
        handoff_id: handoff.id,
        response_message: "Dismissed",
        status: "dismissed",
      },
      {
        onSuccess: () => toast.success("Handoff dismissed"),
        onError: (err) => toast.error(err.message),
      }
    );
  };

  const handleSubmitResponse = () => {
    if (!selectedHandoff || !responseText.trim()) return;
    respondMutation.mutate(
      { handoff_id: selectedHandoff.id, response_message: responseText },
      {
        onSuccess: () => {
          toast.success("Response sent to student");
          setRespondDialogOpen(false);
          setSelectedHandoff(null);
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">AI Tutor Handoffs</h1>
      </div>

      {/* Course Selector */}
      {coursesLoading ? (
        <Shimmer className="h-9 w-56" />
      ) : teacherCourses.length > 1 ? (
        <Select value={effectiveCourseId} onValueChange={setSelectedCourseId}>
          <SelectTrigger className="w-56 bg-white">
            <SelectValue placeholder="Select course" />
          </SelectTrigger>
          <SelectContent>
            {teacherCourses.map((course) => (
              <SelectItem key={course.id} value={course.id}>
                {course.code} — {course.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}

      {/* 18.5.1: Pending Handoff Requests */}
      <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden gap-0 py-0">
        <GradientCardHeader icon={Handshake} title="Pending Handoff Requests" />
        <div className="p-6">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Shimmer key={i} className="h-24 rounded-lg" />
              ))}
            </div>
          ) : pendingHandoffs.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-sm text-gray-500">
              No pending handoff requests.
            </div>
          ) : (
            <div className="space-y-3">
              {pendingHandoffs.map((handoff) => (
                <div
                  key={handoff.id}
                  className="border border-slate-200 rounded-lg p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TriggerReasonBadge reason={handoff.trigger_reason} />
                      <StatusBadge status={handoff.status} />
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(handoff.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 line-clamp-3">
                    {handoff.conversation_summary}
                  </p>
                  {handoff.suggested_intervention && (
                    <p className="text-xs text-gray-500 italic">
                      Suggested: {handoff.suggested_intervention}
                    </p>
                  )}
                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      size="sm"
                      onClick={() => handleRespond(handoff)}
                      className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95"
                    >
                      Respond
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDismiss(handoff)}
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Bottom Grid: Most-Asked Questions + Low-Confidence Topics + High AI Dependency */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 18.5.2: Most-Asked Questions (anonymized) */}
        <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden gap-0 py-0">
          <GradientCardHeader
            icon={MessageSquareWarning}
            title="Most-Asked Questions"
          />
          <div className="p-6">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Shimmer key={i} className="h-8 rounded-lg" />
                ))}
              </div>
            ) : mostAskedQuestions.length === 0 ? (
              <InlineNoData className="h-32" />
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {mostAskedQuestions.map((topic, idx) => (
                  <div
                    key={topic.topic}
                    className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs font-bold text-gray-400 w-5 shrink-0 text-end">
                        {idx + 1}
                      </span>
                      <span className="text-sm font-medium truncate">
                        {topic.topic}
                      </span>
                    </div>
                    <span className="text-sm font-black text-blue-600 shrink-0 ms-3">
                      {topic.frequency}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* 18.5.3: Low-Confidence Topics */}
        <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden gap-0 py-0">
          <GradientCardHeader
            icon={ShieldAlert}
            title="Low-Confidence Topics"
          />
          <div className="p-6">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Shimmer key={i} className="h-8 rounded-lg" />
                ))}
              </div>
            ) : lowConfidenceTopics.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-sm text-gray-500">
                No low-confidence topics detected.
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {lowConfidenceTopics.map((clo) => (
                  <div
                    key={clo.clo_id}
                    className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
                  >
                    <span className="text-sm font-medium truncate">
                      {clo.clo_title}
                    </span>
                    <Badge
                      variant="secondary"
                      className="bg-amber-100 text-amber-700 text-xs"
                    >
                      {clo.conversation_count} queries
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* 18.5.4: High AI Dependency Students (anonymized) */}
        <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden gap-0 py-0">
          <GradientCardHeader icon={Users} title="High AI Dependency" />
          <div className="p-6">
            {isLoading ? (
              <Shimmer className="h-32 rounded-lg" />
            ) : (
              <div className="flex flex-col items-center justify-center h-32 text-center">
                <p className="text-3xl font-black text-amber-600">
                  {highDependencyCount}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  student{highDependencyCount !== 1 ? "s" : ""} with multiple
                  handoff requests
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  Student identities are anonymized unless consent is given.
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Respond Dialog */}
      <Dialog open={respondDialogOpen} onOpenChange={setRespondDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Respond to Handoff Request</DialogTitle>
          </DialogHeader>
          {selectedHandoff && (
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-lg p-3 text-sm text-gray-700">
                <p className="font-semibold mb-1">Conversation Summary:</p>
                <p>{selectedHandoff.conversation_summary}</p>
              </div>
              {selectedHandoff.suggested_intervention && (
                <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-700">
                  <p className="font-semibold mb-1">Suggested Intervention:</p>
                  <p>{selectedHandoff.suggested_intervention}</p>
                </div>
              )}
              <Textarea
                placeholder="Type your response to the student..."
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                rows={4}
                maxLength={2000}
              />
              <p className="text-xs text-gray-400 text-end">
                {responseText.length}/2000
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRespondDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!responseText.trim() || respondMutation.isPending}
              onClick={handleSubmitResponse}
              className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95"
            >
              {respondMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Send Response
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeacherHandoffPage;
