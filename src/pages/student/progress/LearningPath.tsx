import { motion, AnimatePresence } from 'framer-motion';
import { Lock, CheckCircle2, Circle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLearningPath } from '@/hooks/useLearningPath';
import type { LearningPathNode } from '@/hooks/useLearningPath';
import type { BloomsLevel } from '@/lib/schemas/clo';
import { cn } from '@/lib/utils';

// ─── Bloom's level display config (per design system) ───────────────────────

const BLOOMS_PILL: Record<BloomsLevel, { bg: string; text: string; label: string }> = {
  remembering: { bg: 'bg-purple-500', text: 'text-white', label: 'Remember' },
  understanding: { bg: 'bg-blue-500', text: 'text-white', label: 'Understand' },
  applying: { bg: 'bg-green-500', text: 'text-white', label: 'Apply' },
  analyzing: { bg: 'bg-yellow-500', text: 'text-gray-900', label: 'Analyze' },
  evaluating: { bg: 'bg-orange-500', text: 'text-white', label: 'Evaluate' },
  creating: { bg: 'bg-red-500', text: 'text-white', label: 'Create' },
};

// ─── Node status icon ───────────────────────────────────────────────────────

const StatusIcon = ({ status }: { status: LearningPathNode['status'] }) => {
  switch (status) {
    case 'locked':
      return <Lock className="h-5 w-5 text-gray-400" aria-hidden="true" />;
    case 'graded':
      return <CheckCircle2 className="h-5 w-5 text-green-500" aria-hidden="true" />;
    case 'submitted':
      return <Circle className="h-5 w-5 text-blue-500 fill-blue-100" aria-hidden="true" />;
    case 'available':
      return (
        <span className="relative flex h-5 w-5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
          <Circle className="relative h-5 w-5 text-blue-500" aria-hidden="true" />
        </span>
      );
  }
};

// ─── Single path node ───────────────────────────────────────────────────────

const PathNode = ({ node, isLast }: { node: LearningPathNode; isLast: boolean }) => {
  const pill = BLOOMS_PILL[node.blooms_level];
  const isLocked = node.status === 'locked';
  const isCompleted = node.status === 'graded';

  return (
    <div className="relative flex gap-4" role="listitem">
      {/* Timeline connector */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2',
            isLocked && 'border-gray-300 bg-gray-100',
            isCompleted && 'border-green-500 bg-green-50',
            node.status === 'available' && 'border-blue-500 bg-blue-50',
            node.status === 'submitted' && 'border-blue-400 bg-blue-50',
          )}
        >
          <StatusIcon status={node.status} />
        </div>
        {!isLast && (
          <div
            className={cn(
              'w-0.5 flex-1 min-h-[2rem]',
              isCompleted ? 'bg-green-300' : 'bg-gray-200',
            )}
          />
        )}
      </div>

      {/* Node card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="flex-1 pb-6"
      >
        <Card
          className={cn(
            'bg-white border shadow-md rounded-xl p-4 transition-all',
            isLocked && 'opacity-60 border-gray-200',
            isCompleted && 'border-green-300',
            node.status === 'available' && 'border-blue-300',
            node.status === 'submitted' && 'border-blue-200',
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h3
                  className={cn(
                    'text-sm font-semibold truncate',
                    isLocked && 'text-gray-400',
                  )}
                >
                  {node.title}
                </h3>
                <Badge
                  className={cn(
                    'text-xs font-bold tracking-wide uppercase shrink-0',
                    pill.bg,
                    pill.text,
                  )}
                >
                  {pill.label}
                </Badge>
              </div>

              {/* Attainment bar */}
              {node.attainment_percent !== null && !isLocked && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Attainment</span>
                    <span className="font-medium">{node.attainment_percent}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-gray-100">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        node.attainment_percent >= 85 && 'bg-green-500',
                        node.attainment_percent >= 70 && node.attainment_percent < 85 && 'bg-blue-500',
                        node.attainment_percent >= 50 && node.attainment_percent < 70 && 'bg-yellow-500',
                        node.attainment_percent < 50 && 'bg-red-500',
                      )}
                      style={{ width: `${Math.min(node.attainment_percent, 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Locked prerequisite tooltip */}
              {isLocked && node.prerequisite && (
                <p className="text-xs text-gray-400 italic" data-testid="prerequisite-tooltip">
                  Complete {node.prerequisite.clo_title} at {node.prerequisite.required_attainment}% to unlock
                </p>
              )}

              {/* Status label */}
              <span
                className={cn(
                  'inline-block text-xs font-medium',
                  node.status === 'graded' && 'text-green-600',
                  node.status === 'submitted' && 'text-blue-600',
                  node.status === 'available' && 'text-blue-500',
                  node.status === 'locked' && 'text-gray-400',
                )}
              >
                {node.status === 'graded' && 'Completed'}
                {node.status === 'submitted' && 'Submitted'}
                {node.status === 'available' && 'Available'}
                {node.status === 'locked' && 'Locked'}
              </span>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

// ─── LearningPath component ─────────────────────────────────────────────────

export interface LearningPathProps {
  courseId: string;
  studentId: string;
}

const LearningPath = ({ courseId, studentId }: LearningPathProps) => {
  const { data: nodes, isLoading } = useLearningPath(courseId, studentId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-4">
            <div className="h-10 w-10 rounded-full bg-gray-100 animate-shimmer" />
            <div className="flex-1 h-24 rounded-xl bg-gray-100 animate-shimmer" />
          </div>
        ))}
      </div>
    );
  }

  if (!nodes || nodes.length === 0) {
    return (
      <p className="text-sm text-gray-500 text-center py-8">
        No assignments available for this course yet.
      </p>
    );
  }

  return (
    <div role="list" aria-label="Learning path" className="relative">
      <AnimatePresence>
        {nodes.map((node, index) => (
          <PathNode
            key={node.assignment_id}
            node={node}
            isLast={index === nodes.length - 1}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

export default LearningPath;
