import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  UserRound,
  MessageSquare,
  AlertTriangle,
  Target,
  Shield,
  Loader2,
  Send,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { usePendingHandoffs, useRespondToHandoff } from '@/hooks/useTeacherHandoffs';
import { useCourses } from '@/hooks/useCourses';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

// ─── Trigger Reason Labels ──────────────────────────────────────────────────

const triggerReasonLabels: Record<string, { label: string; color: string }> = {
  low_rag_confidence: { label: 'Low Material Coverage', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  repeated_question: { label: 'Repeated Question', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  low_satisfaction: { label: 'Low Satisfaction', color: 'bg-red-50 text-red-700 border-red-200' },
};

// ─── Handoff Request Card ───────────────────────────────────────────────────

interface HandoffCardProps {
  handoff: {
    id: string;
    conversation_summary: string;
    suggested_intervention: string;
    trigger_reason: string;
    status: string;
    created_at: string;
  };
  onRespond: (handoffId: string, message: string) => void;
  isResponding: boolean;
}

const HandoffCard = ({ handoff, onRespond, isResponding }: HandoffCardProps) => {
  const [responseMessage, setResponseMessage] = useState('');
  const [showResponse, setShowResponse] = useState(false);

  const triggerInfo = triggerReasonLabels[handoff.trigger_reason] ?? {
    label: handoff.trigger_reason,
    color: 'bg-gray-50 text-gray-700 border-gray-200',
  };

  return (
    <Card className="bg-white border-0 shadow-sm rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Badge className={`text-xs ${triggerInfo.color}`}>
            {triggerInfo.label}
          </Badge>
          <span className="text-xs text-gray-400">
            {formatDistanceToNow(new Date(handoff.created_at), { addSuffix: true })}
          </span>
        </div>
        {handoff.status === 'pending' && (
          <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
            <Clock className="h-3 w-3 me-1" />
            Pending
          </Badge>
        )}
        {handoff.status === 'resolved' && (
          <Badge className="bg-green-50 text-green-700 border-green-200 text-xs">
            <CheckCircle2 className="h-3 w-3 me-1" />
            Resolved
          </Badge>
        )}
      </div>

      <div className="space-y-2">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Conversation Summary</p>
          <p className="text-sm text-gray-700 mt-1">{handoff.conversation_summary}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Suggested Intervention</p>
          <p className="text-sm text-gray-700 mt-1">{handoff.suggested_intervention}</p>
        </div>
      </div>

      {handoff.status === 'pending' && !showResponse && (
        <Button
          size="sm"
          onClick={() => setShowResponse(true)}
          className="bg-gradient-to-r from-teal-500 to-blue-600 text-white text-xs font-semibold active:scale-95"
        >
          <Send className="h-3.5 w-3.5" />
          Respond
        </Button>
      )}

      {showResponse && (
        <div className="space-y-2">
          <Input
            placeholder="Type your response to the student..."
            value={responseMessage}
            onChange={(e) => setResponseMessage(e.target.value)}
            className="text-sm"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => {
                if (responseMessage.trim()) {
                  onRespond(handoff.id, responseMessage.trim());
                  setResponseMessage('');
                  setShowResponse(false);
                }
              }}
              disabled={!responseMessage.trim() || isResponding}
              className="bg-gradient-to-r from-teal-500 to-blue-600 text-white text-xs font-semibold active:scale-95"
            >
              {isResponding && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Send Response
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowResponse(false)}
              className="text-xs"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};

// ─── Main Page ──────────────────────────────────────────────────────────────

const TeacherHandoffPage = () => {
  const { user } = useAuth();
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');

  const { data: courses = [] } = useCourses();
  const teacherCourses = courses.filter(
    (c) => 'teacher_id' in c && (c as Record<string, unknown>).teacher_id === user?.id,
  );

  const { data: handoffs, isLoading } = usePendingHandoffs(selectedCourseId || undefined);
  const respondMutation = useRespondToHandoff();

  const handleRespond = (handoffId: string, message: string) => {
    respondMutation.mutate(
      { handoff_id: handoffId, response_message: message },
      {
        onSuccess: () => toast.success('Response sent to student'),
        onError: (err) => toast.error(err.message),
      },
    );
  };

  const pendingHandoffs = (handoffs ?? []).filter((h) => h.status === 'pending');

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">AI Tutor Handoffs</h1>
        <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="All courses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Courses</SelectItem>
            {teacherCourses.map((course) => (
              <SelectItem key={course.id} value={course.id}>
                {course.name ?? course.id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : (
        <>
          {/* 18.5.1: Pending Handoff Requests */}
          <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
            <div
              className="px-6 py-4 flex items-center gap-2"
              style={{ background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)' }}
            >
              <UserRound className="h-5 w-5 text-white" />
              <h2 className="text-lg font-bold tracking-tight text-white">
                Pending Requests ({pendingHandoffs.length})
              </h2>
            </div>
            <div className="p-6 space-y-4">
              {pendingHandoffs.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="h-10 w-10 text-green-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No pending handoff requests</p>
                </div>
              ) : (
                pendingHandoffs.map((h) => (
                  <HandoffCard
                    key={h.id}
                    handoff={h}
                    onRespond={handleRespond}
                    isResponding={respondMutation.isPending}
                  />
                ))
              )}
            </div>
          </Card>

          {/* 18.5.2: Most-Asked Questions (anonymized) */}
          <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
            <div
              className="px-6 py-4 flex items-center gap-2"
              style={{ background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)' }}
            >
              <MessageSquare className="h-5 w-5 text-white" />
              <h2 className="text-lg font-bold tracking-tight text-white">Most-Asked Questions</h2>
            </div>
            <div className="p-6">
              {(handoffs ?? []).length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  No data available yet. Questions will appear as students use the AI tutor.
                </p>
              ) : (
                <div className="space-y-2">
                  {/* Extract unique topics from conversation summaries */}
                  {[...new Set((handoffs ?? []).map((h) => h.conversation_summary.slice(0, 100)))]
                    .slice(0, 5)
                    .map((summary, idx) => (
                      <div key={idx} className="flex items-start gap-2 py-2 border-b border-slate-100 last:border-0">
                        <MessageSquare className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                        <p className="text-sm text-gray-700">{summary}...</p>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </Card>

          {/* 18.5.3: Low-Confidence Topics */}
          <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
            <div
              className="px-6 py-4 flex items-center gap-2"
              style={{ background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)' }}
            >
              <AlertTriangle className="h-5 w-5 text-white" />
              <h2 className="text-lg font-bold tracking-tight text-white">Low-Confidence Topics</h2>
            </div>
            <div className="p-6">
              {(() => {
                const lowConfidenceHandoffs = (handoffs ?? []).filter(
                  (h) => h.trigger_reason === 'low_rag_confidence',
                );
                if (lowConfidenceHandoffs.length === 0) {
                  return (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No low-confidence topics detected. Your course materials have good coverage.
                    </p>
                  );
                }
                return (
                  <div className="space-y-2">
                    {lowConfidenceHandoffs.slice(0, 5).map((h) => (
                      <div key={h.id} className="flex items-start gap-2 py-2 border-b border-slate-100 last:border-0">
                        <Target className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm text-gray-700">{h.suggested_intervention}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            Consider uploading additional materials for this topic.
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </Card>

          {/* 18.5.4: High AI Dependency Students */}
          <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
            <div
              className="px-6 py-4 flex items-center gap-2"
              style={{ background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)' }}
            >
              <Shield className="h-5 w-5 text-white" />
              <h2 className="text-lg font-bold tracking-tight text-white">High AI Dependency</h2>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-500 text-center py-4">
                Students with Independence Score below 30% will appear here.
                This data is anonymized unless the student has granted consent.
              </p>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

export default TeacherHandoffPage;
