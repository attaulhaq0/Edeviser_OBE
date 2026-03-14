import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Shimmer from '@/components/shared/Shimmer';
import GoalSuggestionPanel from '@/components/shared/GoalSuggestionPanel';
import SmartGoalForm from '@/components/shared/SmartGoalForm';
import { useAuth } from '@/hooks/useAuth';
import {
  useStarterWeekSessions,
  useUpdateSessionStatus,
} from '@/hooks/useStarterWeekPlan';
import {
  useGoalSuggestions,
  useAcceptGoal,
  useDismissGoal,
  useGenerateGoalSuggestions,
} from '@/hooks/useGoalSuggestions';
import { useCourses } from '@/hooks/useCourses';
import {
  CalendarDays,
  Clock,
  CheckCircle,
  Play,
  X,
  Pencil,
  BookOpen,
  FlaskConical,
  RotateCcw,
  Compass,
  Sparkles,
  ArrowLeft,
  Target,
} from 'lucide-react';
import { format, startOfWeek, differenceInDays } from 'date-fns';
import { useState } from 'react';
import type { StarterWeekSession, SessionStatus } from '@/hooks/useStarterWeekPlan';
import type { GoalDifficulty } from '@/lib/goalTemplates';
import { toast } from 'sonner';

// ── Session type icons ──────────────────────────────────────────────────────

const SESSION_TYPE_ICONS: Record<string, typeof BookOpen> = {
  reading: BookOpen,
  practice: FlaskConical,
  review: RotateCcw,
  exploration: Compass,
};

const SESSION_TYPE_COLORS: Record<string, string> = {
  reading: 'bg-blue-50 text-blue-600',
  practice: 'bg-green-50 text-green-600',
  review: 'bg-amber-50 text-amber-600',
  exploration: 'bg-purple-50 text-purple-600',
};

const STATUS_BADGES: Record<SessionStatus, { label: string; classes: string }> = {
  suggested: { label: 'Suggested', classes: 'bg-slate-100 text-slate-600' },
  accepted: { label: 'Accepted', classes: 'bg-blue-100 text-blue-700' },
  modified: { label: 'Modified', classes: 'bg-amber-100 text-amber-700' },
  dismissed: { label: 'Dismissed', classes: 'bg-gray-100 text-gray-500' },
  completed: { label: 'Completed', classes: 'bg-green-100 text-green-700' },
};

// ── Session Card ────────────────────────────────────────────────────────────

const SessionCard = ({
  session,
  onStatusChange,
  isPending,
}: {
  session: StarterWeekSession;
  onStatusChange: (id: string, status: SessionStatus) => void;
  isPending: boolean;
}) => {
  const Icon = SESSION_TYPE_ICONS[session.session_type] ?? BookOpen;
  const colorClass = SESSION_TYPE_COLORS[session.session_type] ?? 'bg-slate-50 text-slate-600';
  const statusConfig = STATUS_BADGES[session.status];
  const isActionable = session.status === 'suggested' || session.status === 'accepted';

  return (
    <Card className="bg-white border-0 shadow-sm rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${colorClass}`}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 capitalize">
              {session.session_type} Session
            </p>
            <p className="text-xs text-gray-500 truncate">{session.description}</p>
          </div>
        </div>
        <Badge variant="outline" className={`text-[10px] shrink-0 ${statusConfig.classes}`}>
          {statusConfig.label}
        </Badge>
      </div>

      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <CalendarDays className="h-3 w-3" />
          {format(new Date(session.suggested_date), 'EEE, MMM d')}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {session.duration_minutes} min
        </span>
        <span className="capitalize">{session.suggested_time_slot}</span>
      </div>

      {session.status === 'suggested' && (
        <Badge className="bg-blue-50 text-blue-600 border-blue-200 text-[10px]">
          <Sparkles className="h-3 w-3 mr-1" />
          AI Suggested
        </Badge>
      )}

      {isActionable && (
        <div className="flex items-center gap-2 pt-1">
          {session.status === 'suggested' && (
            <Button
              size="sm"
              onClick={() => onStatusChange(session.id, 'accepted')}
              disabled={isPending}
              className="bg-gradient-to-r from-teal-500 to-blue-600 text-white text-xs font-semibold active:scale-95"
            >
              <CheckCircle className="h-3 w-3" />
              Accept
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => onStatusChange(session.id, 'completed')}
            disabled={isPending}
            className="text-xs"
          >
            <Play className="h-3 w-3" />
            Mark Complete
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onStatusChange(session.id, 'dismissed')}
            disabled={isPending}
            className="text-xs text-gray-400"
          >
            <X className="h-3 w-3" />
            Dismiss
          </Button>
        </div>
      )}

      {session.status === 'completed' && (
        <div className="flex items-center gap-1 text-xs text-green-600">
          <CheckCircle className="h-3 w-3" />
          Completed — +15 XP earned
        </div>
      )}
    </Card>
  );
};

// ── Main Page ───────────────────────────────────────────────────────────────

const StarterWeekPlanPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const studentId = user?.id ?? '';

  const { data: sessions, isLoading } = useStarterWeekSessions(studentId);
  const updateStatus = useUpdateSessionStatus();

  // Goal suggestions
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const { data: goalSuggestions = [], isLoading: goalsLoading } = useGoalSuggestions(studentId, weekStart);
  const acceptGoal = useAcceptGoal();
  const dismissGoal = useDismissGoal();
  const generateGoals = useGenerateGoalSuggestions();
  const { data: coursesData } = useCourses();
  const [showSmartForm, setShowSmartForm] = useState(false);

  const handleStatusChange = (id: string, status: SessionStatus) => {
    updateStatus.mutate(
      { id, studentId, status },
      {
        onSuccess: () => {
          if (status === 'completed') toast.success('Session completed! +15 XP');
          else if (status === 'accepted') toast.success('Session accepted');
        },
        onError: (err) => toast.error(err.message),
      },
    );
  };

  const handleGenerateGoals = () => {
    generateGoals.mutate(
      { student_id: studentId, week_start: weekStart },
      {
        onSuccess: () => toast.success('Goal suggestions generated'),
        onError: (err) => toast.error(err.message),
      },
    );
  };

  // Post-week summary
  const isPostWeek = (() => {
    if (!sessions || sessions.length === 0) return false;
    const firstDate = sessions[0]?.suggested_date;
    if (!firstDate) return false;
    return differenceInDays(new Date(), new Date(firstDate)) >= 7;
  })();

  const completedCount = sessions?.filter((s) => s.status === 'completed').length ?? 0;
  const totalCount = sessions?.length ?? 0;
  const completedMinutes = sessions
    ?.filter((s) => s.status === 'completed')
    .reduce((sum, s) => sum + s.duration_minutes, 0) ?? 0;

  const courseOptions = (coursesData?.data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/student/dashboard')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">
          {isPostWeek ? 'Starter Week Summary' : 'Your Starter Week Plan'}
        </h1>
      </div>

      {/* Post-week summary */}
      {isPostWeek && (
        <Card className="bg-white border-0 shadow-md rounded-xl p-6 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">Sessions</p>
              <p className="text-2xl font-black">{completedCount}/{totalCount}</p>
            </div>
            <div>
              <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">Completion</p>
              <p className="text-2xl font-black">
                {totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}%
              </p>
            </div>
            <div>
              <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">Study Time</p>
              <p className="text-2xl font-black">{completedMinutes}m</p>
            </div>
            <div>
              <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">XP Earned</p>
              <p className="text-2xl font-black text-amber-600">{completedCount * 15}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Sessions */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Shimmer key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {(sessions ?? []).map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              onStatusChange={handleStatusChange}
              isPending={updateStatus.isPending}
            />
          ))}
          {(sessions ?? []).length === 0 && (
            <Card className="bg-white border-0 shadow-md rounded-xl p-8 text-center">
              <p className="text-sm text-gray-500">No starter week sessions generated yet.</p>
            </Card>
          )}
        </div>
      )}

      {/* Goal Suggestions Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-bold tracking-tight">Weekly Goals</h2>
          </div>
          {goalSuggestions.length === 0 && (
            <Button
              size="sm"
              onClick={handleGenerateGoals}
              disabled={generateGoals.isPending}
              className="bg-gradient-to-r from-teal-500 to-blue-600 text-white text-xs font-semibold active:scale-95"
            >
              <Sparkles className="h-3 w-3" />
              {generateGoals.isPending ? 'Generating...' : 'Get Suggestions'}
            </Button>
          )}
        </div>

        <GoalSuggestionPanel
          suggestions={goalSuggestions.map((g) => ({
            id: g.id,
            goal_text: g.goal_text,
            difficulty: g.difficulty as GoalDifficulty,
            cohort_completion_rate: g.cohort_completion_rate,
            status: g.status,
          }))}
          onAccept={(id) =>
            acceptGoal.mutate(
              { id, studentId, weekStart },
              { onSuccess: () => toast.success('Goal accepted') },
            )
          }
          onEdit={() => {
            setShowSmartForm(true);
          }}
          onDismiss={(id) =>
            dismissGoal.mutate(
              { id, studentId, weekStart },
              { onSuccess: () => toast.success('Goal dismissed') },
            )
          }
          isLoading={goalsLoading || generateGoals.isPending}
        />

        {/* SMART Goal Form */}
        {showSmartForm && (
          <SmartGoalForm
            courses={courseOptions}
            onSubmit={(data) => {
              toast.success('Goal created: ' + data.composedText.slice(0, 60) + '...');
              setShowSmartForm(false);
            }}
          />
        )}

        {!showSmartForm && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSmartForm(true)}
            className="text-xs"
          >
            <Pencil className="h-3 w-3" />
            Create Custom Goal (SMART Template)
          </Button>
        )}
      </div>
    </div>
  );
};

export default StarterWeekPlanPage;
