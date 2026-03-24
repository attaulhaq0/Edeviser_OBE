import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Check, Pencil, Loader2, ClipboardCheck } from 'lucide-react';
import { toast } from 'sonner';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';

import GradientCardHeader from '@/components/shared/GradientCardHeader';
import ExplanationConfidenceBadge from '@/components/shared/ExplanationConfidenceBadge';
import DifficultyBadge from '@/components/shared/DifficultyBadge';
import Shimmer from '@/components/shared/Shimmer';
import EmptyState from '@/components/shared/EmptyState';

import {
  useExplanationReviewQueue,
  useApproveExplanation,
  useEditExplanation,
} from '@/hooks/useExplanationConfidence';
import type { ReviewQueueItem } from '@/hooks/useExplanationConfidence';
import { useAuth } from '@/hooks/useAuth';

// ─── Bloom's level helpers ──────────────────────────────────────────────────

const BLOOM_LABELS: Record<number, string> = {
  1: 'Remember',
  2: 'Understand',
  3: 'Apply',
  4: 'Analyze',
  5: 'Evaluate',
  6: 'Create',
};

const BLOOM_COLORS: Record<number, string> = {
  1: 'bg-purple-500 text-white',
  2: 'bg-blue-500 text-white',
  3: 'bg-green-500 text-white',
  4: 'bg-yellow-500 text-gray-900',
  5: 'bg-orange-500 text-white',
  6: 'bg-red-500 text-white',
};


// ─── Explanation Review Card ────────────────────────────────────────────────

interface ExplanationReviewCardProps {
  item: ReviewQueueItem;
  onApprove: (item: ReviewQueueItem) => void;
  onSaveEdit: (item: ReviewQueueItem, editedText: string) => void;
  isApproving: boolean;
  isSaving: boolean;
}

const ExplanationReviewCard = ({
  item,
  onApprove,
  onSaveEdit,
  isApproving,
  isSaving,
}: ExplanationReviewCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(item.explanation ?? '');

  const analytics = item.question_analytics;
  const successRate = analytics?.success_rate;
  const totalAttempts = analytics?.total_attempts ?? 0;

  const handleSave = () => {
    if (!editText.trim()) {
      toast.error('Explanation cannot be empty');
      return;
    }
    onSaveEdit(item, editText.trim());
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditText(item.explanation ?? '');
    setIsEditing(false);
  };

  return (
    <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
      <div className="p-4 space-y-3">
        {/* Question text */}
        <p className="text-sm font-medium text-gray-900 leading-relaxed">
          {item.question_text}
        </p>

        {/* Badges row */}
        <div className="flex items-center gap-2 flex-wrap">
          <DifficultyBadge difficulty={item.difficulty_rating} />
          <Badge
            className={`${BLOOM_COLORS[item.bloom_level] ?? ''} text-xs font-bold tracking-wide uppercase border-transparent`}
          >
            {BLOOM_LABELS[item.bloom_level] ?? `Level ${item.bloom_level}`}
          </Badge>
          <ExplanationConfidenceBadge
            confidence={item.explanation_confidence}
            isVerified={false}
          />
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4">
          <div>
            <p className="text-[10px] font-black tracking-widest uppercase text-gray-400">
              Success Rate
            </p>
            <p className="text-sm font-bold text-gray-900">
              {successRate !== null && successRate !== undefined
                ? `${(successRate * 100).toFixed(0)}%`
                : '—'}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-black tracking-widest uppercase text-gray-400">
              Total Attempts
            </p>
            <p className="text-sm font-bold text-gray-900">{totalAttempts}</p>
          </div>
        </div>

        {/* Current AI explanation */}
        {!isEditing && (
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-[10px] font-black tracking-widest uppercase text-gray-400 mb-1">
              AI Explanation
            </p>
            <p className="text-xs text-gray-600 leading-relaxed">
              {item.explanation ?? 'No explanation available.'}
            </p>
          </div>
        )}

        {/* Edit textarea */}
        {isEditing && (
          <div className="space-y-2">
            <p className="text-[10px] font-black tracking-widest uppercase text-gray-400">
              Edit Explanation
            </p>
            <Textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={4}
              className="text-sm"
              placeholder="Enter the corrected explanation..."
            />
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                disabled={isSaving}
                onClick={handleSave}
                className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95 transition-transform"
              >
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Action buttons */}
        {!isEditing && (
          <div className="flex items-center gap-2 pt-1">
            <Button
              size="sm"
              variant="outline"
              disabled={isApproving || !item.explanation}
              onClick={() => onApprove(item)}
              className="text-green-700 border-green-300 hover:bg-green-50"
            >
              {isApproving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsEditing(true)}
              className="text-blue-700 border-blue-300 hover:bg-blue-50"
            >
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};

// ─── Page Component ─────────────────────────────────────────────────────────

const ExplanationReviewPage = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const { user, institutionId } = useAuth();
  const { data: queue, isLoading } = useExplanationReviewQueue(courseId ?? '');
  const approveMutation = useApproveExplanation();
  const editMutation = useEditExplanation();

  const handleApprove = (item: ReviewQueueItem) => {
    if (!user?.id || !institutionId || !item.explanation) return;

    approveMutation.mutate(
      {
        institution_id: institutionId,
        question_id: item.id,
        explanation_text: item.explanation,
        verified_by: user.id,
      },
      {
        onSuccess: () => toast.success('Explanation approved'),
        onError: (err) => toast.error(err.message),
      },
    );
  };

  const handleSaveEdit = (item: ReviewQueueItem, editedText: string) => {
    if (!user?.id || !institutionId) return;

    editMutation.mutate(
      {
        institution_id: institutionId,
        question_id: item.id,
        explanation_text: editedText,
        verified_by: user.id,
      },
      {
        onSuccess: () => toast.success('Explanation updated'),
        onError: (err) => toast.error(err.message),
      },
    );
  };

  // ─── Loading state ──────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Shimmer className="h-10 w-64" />
        <Shimmer className="h-48" />
        <Shimmer className="h-48" />
      </div>
    );
  }

  const items = queue ?? [];

  // ─── Empty state ────────────────────────────────────────────────────────

  if (items.length === 0) {
    return (
      <div className="space-y-6">
        <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
          <GradientCardHeader icon={ClipboardCheck} title="Review Explanations" />
          <div className="p-6">
            <EmptyState
              title="No explanations to review"
              description="Frequently-missed questions with AI explanations needing review will appear here."
            />
          </div>
        </Card>
      </div>
    );
  }

  // ─── Main render ────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header card */}
      <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
        <GradientCardHeader icon={ClipboardCheck} title="Review Explanations">
          <span className="text-xs text-white/70 font-medium">
            {items.length} question{items.length !== 1 ? 's' : ''} to review
          </span>
        </GradientCardHeader>
      </Card>

      {/* Question cards */}
      {items.map((item) => (
        <ExplanationReviewCard
          key={item.id}
          item={item}
          onApprove={handleApprove}
          onSaveEdit={handleSaveEdit}
          isApproving={approveMutation.isPending}
          isSaving={editMutation.isPending}
        />
      ))}
    </div>
  );
};

export default ExplanationReviewPage;
