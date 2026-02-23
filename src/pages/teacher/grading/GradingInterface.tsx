import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Check,
  Clock,
  ExternalLink,
  FileText,
  Loader2,
  User,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import Shimmer from '@/components/shared/Shimmer';

import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { cn } from '@/lib/utils';
import { logActivity } from '@/lib/activityLogger';
import { useSubmission } from '@/hooks/useSubmissions';
import { useRubric } from '@/hooks/useRubrics';
import type { RubricCriterion } from '@/hooks/useRubrics';
import { useGrade, useCreateGrade } from '@/hooks/useGrades';
import { useAuth } from '@/providers/AuthProvider';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as unknown as { from: (table: string) => any };

// ─── Types ──────────────────────────────────────────────────────────────────

interface CellSelection {
  levelIndex: number;
  points: number;
}

interface AssignmentForRubric {
  id: string;
  title: string;
  total_marks: number;
  rubric_id: string;
}

// ─── Local hook: fetch assignment to get rubric_id ──────────────────────────

const useAssignmentForRubric = (assignmentId?: string) => {
  return useQuery({
    queryKey: queryKeys.assignments.detail(assignmentId ?? ''),
    queryFn: async (): Promise<AssignmentForRubric | null> => {
      const { data, error } = await db
        .from('assignments')
        .select('id, title, total_marks, rubric_id')
        .eq('id', assignmentId!)
        .maybeSingle();
      if (error) throw error;
      return data as AssignmentForRubric | null;
    },
    enabled: !!assignmentId,
  });
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function getScoreColor(percent: number): string {
  if (percent >= 85) return 'text-green-600';
  if (percent >= 70) return 'text-blue-600';
  if (percent >= 50) return 'text-yellow-600';
  return 'text-red-600';
}

function getAttainmentLabel(percent: number): string {
  if (percent >= 85) return 'Excellent';
  if (percent >= 70) return 'Satisfactory';
  if (percent >= 50) return 'Developing';
  return 'Not Yet';
}

function getAttainmentBadgeStyle(percent: number): string {
  if (percent >= 85) return 'bg-green-50 text-green-600 border-green-200';
  if (percent >= 70) return 'bg-blue-50 text-blue-600 border-blue-200';
  if (percent >= 50) return 'bg-yellow-50 text-yellow-600 border-yellow-200';
  return 'bg-red-50 text-red-600 border-red-200';
}


// ─── Sub-components ─────────────────────────────────────────────────────────

interface SubmissionInfoPanelProps {
  submission: NonNullable<ReturnType<typeof useSubmission>['data']>;
  assignment: AssignmentForRubric | null | undefined;
}

const SubmissionInfoPanel = ({ submission, assignment }: SubmissionInfoPanelProps) => (
  <Card className="bg-white border-0 shadow-md rounded-xl p-6 space-y-5 h-fit">
    <div
      className="rounded-lg p-4"
      style={{
        background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)',
      }}
    >
      <h2 className="text-sm font-bold text-white">Submission Details</h2>
    </div>

    {/* Student */}
    <div className="space-y-1">
      <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">Student</p>
      <div className="flex items-center gap-2">
        <User className="h-4 w-4 text-gray-400" />
        <span className="text-sm font-medium">
          {submission.profiles?.full_name ?? 'Unknown'}
        </span>
      </div>
      <p className="text-xs text-gray-500 pl-6">
        {submission.profiles?.email ?? ''}
      </p>
    </div>

    {/* Assignment */}
    <div className="space-y-1">
      <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">Assignment</p>
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-gray-400" />
        <span className="text-sm font-medium">
          {assignment?.title ?? submission.assignments?.title ?? 'Unknown'}
        </span>
      </div>
      <p className="text-xs text-gray-500 pl-6">
        Total Marks: {assignment?.total_marks ?? submission.assignments?.total_marks ?? 0}
      </p>
    </div>

    {/* Submitted At */}
    <div className="space-y-1">
      <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">Submitted</p>
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-gray-400" />
        <span className="text-sm">
          {format(new Date(submission.created_at), 'MMM d, yyyy h:mm a')}
        </span>
      </div>
    </div>

    {/* Late indicator */}
    {submission.is_late && (
      <Badge className="bg-red-100 text-red-700 border-red-200" variant="outline">
        Late Submission
      </Badge>
    )}

    {/* File link */}
    {submission.file_url && (
      <Button variant="outline" size="sm" className="w-full" asChild>
        <a href={submission.file_url} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="h-4 w-4" />
          View Submission File
        </a>
      </Button>
    )}
  </Card>
);

// ─── Rubric Grid ────────────────────────────────────────────────────────────

interface RubricGridProps {
  criteria: RubricCriterion[];
  selections: Map<string, CellSelection>;
  onCellSelect: (criterionId: string, levelIndex: number, points: number) => void;
  isReadOnly: boolean;
}

const RubricGrid = ({ criteria, selections, onCellSelect, isReadOnly }: RubricGridProps) => {
  const levelLabels = useMemo(() => {
    if (criteria.length === 0) return [];
    const first = criteria[0];
    return first ? first.levels.map((l) => l.label) : [];
  }, [criteria]);

  return (
    <Card className="bg-white border-0 shadow-md rounded-xl p-6 space-y-4">
      <h2 className="text-lg font-bold tracking-tight">Rubric Assessment</h2>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="text-left text-xs font-bold text-gray-500 uppercase tracking-wider p-3 w-40">
                Criteria
              </th>
              {levelLabels.map((label) => (
                <th
                  key={label}
                  className="text-center text-xs font-bold text-gray-500 uppercase tracking-wider p-3"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {criteria.map((criterion) => (
              <tr key={criterion.id} className="border-t border-slate-100">
                <td className="p-3 align-top">
                  <span className="text-sm font-semibold">{criterion.criterion_name}</span>
                </td>
                {criterion.levels.map((level, levelIdx) => {
                  const isSelected = selections.get(criterion.id)?.levelIndex === levelIdx;
                  return (
                    <td key={levelIdx} className="p-2 align-top">
                      <button
                        type="button"
                        onClick={() => onCellSelect(criterion.id, levelIdx, level.points)}
                        disabled={isReadOnly}
                        aria-pressed={isSelected}
                        aria-label={`${criterion.criterion_name}: ${level.label} — ${level.points} points`}
                        className={cn(
                          'w-full rounded-lg border-2 p-3 text-left transition-all focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1',
                          isSelected
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-slate-200 bg-white',
                          !isReadOnly && !isSelected && 'hover:bg-slate-50 hover:border-slate-300',
                          isReadOnly && 'cursor-default',
                        )}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <Badge className="bg-blue-100 text-blue-700 text-xs" variant="outline">
                            {level.points} pts
                          </Badge>
                          {isSelected && <Check className="h-4 w-4 text-blue-600" />}
                        </div>
                        <p className="text-xs text-gray-600 leading-relaxed">
                          {level.description}
                        </p>
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};


// ─── Main Component ─────────────────────────────────────────────────────────

const GradingInterface = () => {
  const { submissionId } = useParams<{ submissionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // ── Data fetching ───────────────────────────────────────────────────────
  const { data: submission, isLoading: submissionLoading } = useSubmission(submissionId);
  const assignmentId = submission?.assignment_id;
  const { data: assignment, isLoading: assignmentLoading } = useAssignmentForRubric(assignmentId);
  const { data: rubric, isLoading: rubricLoading } = useRubric(assignment?.rubric_id ?? undefined);
  const { data: existingGrade, isLoading: gradeLoading } = useGrade(submissionId);
  const createGrade = useCreateGrade();

  // ── Local state ─────────────────────────────────────────────────────────
  const [selections, setSelections] = useState<Map<string, CellSelection>>(new Map());
  const [feedback, setFeedback] = useState('');

  const isReadOnly = !!existingGrade;
  const isLoading = submissionLoading || assignmentLoading || rubricLoading || gradeLoading;

  // ── Activity logging: grading_start on mount ────────────────────────────
  useEffect(() => {
    if (submissionId && user?.id && !isReadOnly) {
      logActivity({
        student_id: user.id,
        event_type: 'grading_start',
        metadata: { submission_id: submissionId },
      });
    }
  }, [submissionId, user?.id, isReadOnly]);

  // ── Pre-populate selections from existing grade ─────────────────────────
  const readOnlySelections = useMemo(() => {
    if (!existingGrade) return new Map<string, CellSelection>();
    const map = new Map<string, CellSelection>();
    for (const sel of existingGrade.rubric_selections) {
      map.set(sel.criterion_id, { levelIndex: sel.level_index, points: sel.points });
    }
    return map;
  }, [existingGrade]);

  const activeSelections = isReadOnly ? readOnlySelections : selections;

  // ── Score calculation ───────────────────────────────────────────────────
  const totalScore = useMemo(() => {
    let sum = 0;
    for (const sel of activeSelections.values()) sum += sel.points;
    return sum;
  }, [activeSelections]);

  const totalMarks = assignment?.total_marks ?? 0;
  const scorePercent = totalMarks > 0 ? Math.round((totalScore / totalMarks) * 100) : 0;

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleCellSelect = (criterionId: string, levelIndex: number, points: number) => {
    if (isReadOnly) return;
    setSelections((prev) => {
      const next = new Map(prev);
      const current = next.get(criterionId);
      if (current?.levelIndex === levelIndex) {
        next.delete(criterionId);
      } else {
        next.set(criterionId, { levelIndex, points });
      }
      return next;
    });
  };

  const handleSubmitGrade = () => {
    if (!submissionId || !user?.id || !rubric) return;

    const criteriaCount = rubric.criteria.length;
    if (selections.size < criteriaCount) {
      toast.error(`Please select a level for all ${criteriaCount} criteria`);
      return;
    }

    const rubricSelections = Array.from(selections.entries()).map(([criterionId, sel]) => ({
      criterion_id: criterionId,
      level_index: sel.levelIndex,
      points: sel.points,
    }));

    createGrade.mutate(
      {
        submission_id: submissionId,
        rubric_selections: rubricSelections,
        total_score: totalScore,
        score_percent: scorePercent,
        overall_feedback: feedback || undefined,
        graded_by: user.id,
      },
      {
        onSuccess: () => {
          // Log grading_end activity (fire-and-forget)
          // Note: Evidence Generator Edge Function (Task 17) is triggered
          // automatically via a database trigger on the grades table.
          logActivity({
            student_id: user.id,
            event_type: 'grading_end',
            metadata: {
              submission_id: submissionId,
              total_score: totalScore,
              score_percent: scorePercent,
            },
          });
          toast.success('Grade submitted successfully');
          navigate('/teacher/grading');
        },
        onError: (err) => toast.error(err.message),
      },
    );
  };

  // ── Loading state ───────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Shimmer className="h-8 w-48 rounded-lg" />
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Shimmer className="h-64 rounded-xl" />
          <Shimmer className="h-96 rounded-xl lg:col-span-3" />
        </div>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate('/teacher/grading')}>
          <ArrowLeft className="h-4 w-4" /> Back to Queue
        </Button>
        <Card className="bg-white border-0 shadow-md rounded-xl p-6">
          <p className="text-gray-500">Submission not found.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/teacher/grading')}>
          <ArrowLeft className="h-4 w-4" /> Back to Queue
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">
          {isReadOnly ? 'Grade Review' : 'Grade Submission'}
        </h1>
        {isReadOnly && (
          <Badge className="bg-green-100 text-green-700 border-green-200" variant="outline">
            Graded
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Panel */}
        <SubmissionInfoPanel submission={submission} assignment={assignment} />

        {/* Main Panel */}
        <div className="lg:col-span-3 space-y-6">
          {rubric ? (
            <RubricGrid
              criteria={rubric.criteria}
              selections={activeSelections}
              onCellSelect={handleCellSelect}
              isReadOnly={isReadOnly}
            />
          ) : (
            <Card className="bg-white border-0 shadow-md rounded-xl p-6">
              <p className="text-gray-500">No rubric linked to this assignment.</p>
            </Card>
          )}

          {/* Score Summary */}
          <Card className="bg-white border-0 shadow-md rounded-xl p-6">
            <div className="flex items-center gap-8">
              <div>
                <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">
                  Total Score
                </p>
                <p className="text-2xl font-black mt-1">
                  {totalScore} / {totalMarks}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">
                  Percentage
                </p>
                <p className={cn('text-2xl font-black mt-1', getScoreColor(scorePercent))}>
                  {scorePercent}%
                </p>
              </div>
              <div>
                <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">
                  Attainment
                </p>
                <Badge
                  className={cn('mt-1 text-xs font-bold', getAttainmentBadgeStyle(scorePercent))}
                  variant="outline"
                >
                  {getAttainmentLabel(scorePercent)}
                </Badge>
              </div>
            </div>
          </Card>

          {/* Feedback */}
          <Card className="bg-white border-0 shadow-md rounded-xl p-6 space-y-4">
            <label className="text-sm font-semibold" htmlFor="overall-feedback">
              Overall Feedback
            </label>
            {isReadOnly ? (
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {existingGrade?.overall_feedback || 'No feedback provided.'}
              </p>
            ) : (
              <Textarea
                id="overall-feedback"
                placeholder="Provide overall feedback for the student..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={4}
              />
            )}
          </Card>

          {/* Actions */}
          {!isReadOnly && (
            <div className="flex items-center gap-4">
              <Button
                onClick={handleSubmitGrade}
                disabled={createGrade.isPending || selections.size === 0}
                className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95"
              >
                {createGrade.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Submit Grade
              </Button>
              <Button variant="outline" onClick={() => navigate('/teacher/grading')}>
                Cancel
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GradingInterface;