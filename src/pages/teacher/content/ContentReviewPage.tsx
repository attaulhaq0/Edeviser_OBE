/**
 * Task 21.7: Content Review Page — Teacher review queue for student content
 */
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useCourses } from '@/hooks/useCourses';
import {
  useContentReviewQueue,
  useReviewStudentContent,
  type StudentContent,
} from '@/hooks/useStudentContent';
import GradientCardHeader from '@/components/shared/GradientCardHeader';
import { FileCheck, BookOpen, HelpCircle, Video, FileText, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const CONTENT_TYPE_ICONS: Record<string, typeof FileText> = {
  study_plan: BookOpen,
  quiz_question: HelpCircle,
  explanation_video: Video,
};

const CONTENT_TYPE_LABELS: Record<string, string> = {
  study_plan: 'Study Plan',
  quiz_question: 'Quiz Question',
  explanation_video: 'Explanation Video',
};

interface ReviewCardProps {
  content: StudentContent;
  onReview: (contentId: string, status: 'approved' | 'rejected', feedback?: string) => void;
  isPending: boolean;
}

const ReviewCard = ({ content, onReview, isPending }: ReviewCardProps) => {
  const [feedback, setFeedback] = useState('');
  const Icon = CONTENT_TYPE_ICONS[content.content_type] ?? FileText;

  return (
    <Card className="bg-white border-0 shadow-sm rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-lg bg-blue-50 shrink-0">
            <Icon className="h-4 w-4 text-blue-600" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold tracking-tight truncate">{content.title}</h3>
            <p className="text-xs text-gray-500">
              {CONTENT_TYPE_LABELS[content.content_type]} · Submitted {format(new Date(content.created_at), 'MMM d, yyyy')}
            </p>
          </div>
        </div>
        <Badge className="bg-yellow-100 text-yellow-700 text-xs shrink-0">Pending</Badge>
      </div>

      {/* Content preview */}
      {content.content_data && (
        <div className="bg-slate-50 rounded-lg p-3 text-xs text-gray-600 max-h-32 overflow-y-auto">
          <pre className="whitespace-pre-wrap font-sans">
            {JSON.stringify(content.content_data, null, 2)}
          </pre>
        </div>
      )}

      {/* Feedback input */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-gray-600">Feedback (optional)</Label>
        <Textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Provide feedback for the student..."
          rows={2}
          className="text-sm"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => onReview(content.id, 'approved', feedback || undefined)}
          disabled={isPending}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white active:scale-95"
        >
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
          Approve
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onReview(content.id, 'rejected', feedback || undefined)}
          disabled={isPending}
          className="flex-1 border-red-200 text-red-600 hover:bg-red-50 active:scale-95"
        >
          {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
          Reject
        </Button>
      </div>
    </Card>
  );
};

const ContentReviewPage = () => {
  const { user } = useAuth();
  const { data: courses } = useCourses();
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const { data: reviewQueue, isLoading } = useContentReviewQueue(selectedCourseId || undefined);
  const reviewMutation = useReviewStudentContent();

  const handleReview = (contentId: string, status: 'approved' | 'rejected', feedback?: string) => {
    if (!user?.id) return;
    reviewMutation.mutate(
      { content_id: contentId, status, feedback, reviewer_id: user.id },
      {
        onSuccess: () => toast.success(`Content ${status}`),
        onError: (err) => toast.error(err.message),
      },
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <FileCheck className="h-6 w-6 text-blue-600" />
        <h1 className="text-2xl font-bold tracking-tight">Content Review</h1>
      </div>

      {/* Course selector */}
      <div className="max-w-xs">
        <Label className="text-sm font-medium text-gray-600 mb-1 block">Course</Label>
        <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
          <SelectTrigger className="bg-white">
            <SelectValue placeholder="Select a course" />
          </SelectTrigger>
          <SelectContent>
            {(courses?.data ?? []).map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Review Queue */}
      <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
        <GradientCardHeader icon={FileCheck} title="Pending Reviews" />
        <div className="p-4">
          {!selectedCourseId ? (
            <p className="text-sm text-gray-500 text-center py-8">Select a course to view pending content.</p>
          ) : isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-32 rounded-xl animate-shimmer" />
              ))}
            </div>
          ) : !reviewQueue || reviewQueue.length === 0 ? (
            <div className="py-12 text-center">
              <FileCheck className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No pending content to review.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reviewQueue.map((content) => (
                <ReviewCard
                  key={content.id}
                  content={content}
                  onReview={handleReview}
                  isPending={reviewMutation.isPending}
                />
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default ContentReviewPage;
