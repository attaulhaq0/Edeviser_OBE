import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Brain,
  Shield,
  BookOpen,
  Layers,
  ClipboardCheck,
  Clock,
  Star,
  ChevronRight,
  CheckCircle,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useProfileCompleteness } from '@/hooks/useProfileCompleteness';
import { useStudentProfile } from '@/hooks/useStudentProfile';
import {
  getRemainingDimensions,
  getEstimatedTimeMinutes,
  getProfileDimensions,
} from '@/lib/profileCompleteness';
import type { ProfileCompletenessInput } from '@/lib/profileCompleteness';
import type { BigFiveTraits, VARKProfile, SelfEfficacyProfile, StudyStrategyProfile } from '@/lib/scoreCalculator';

// ── Dimension metadata ───────────────────────────────────────────────

const DIMENSION_META: Record<string, { label: string; icon: React.ReactNode; description: string }> = {
  personality: {
    label: 'Personality Traits',
    icon: <Brain className="h-5 w-5 text-purple-500" />,
    description: 'Big Five personality assessment — understand how you learn and work',
  },
  self_efficacy: {
    label: 'Self-Efficacy',
    icon: <Shield className="h-5 w-5 text-blue-500" />,
    description: 'Academic confidence across different domains',
  },
  study_strategy: {
    label: 'Study Strategies',
    icon: <BookOpen className="h-5 w-5 text-green-500" />,
    description: 'Time management, elaboration, self-testing, and help-seeking habits',
  },
  learning_style: {
    label: 'Learning Style (VARK)',
    icon: <Layers className="h-5 w-5 text-amber-500" />,
    description: 'Self-awareness exercise — discover your learning preferences',
  },
  baseline: {
    label: 'Baseline Tests',
    icon: <ClipboardCheck className="h-5 w-5 text-red-500" />,
    description: 'Diagnostic tests to measure your starting knowledge per course',
  },
};

// ── Helper: derive completeness input from profile ───────────────────

const deriveCompletenessInput = (
  profile: {
    personality_traits: BigFiveTraits | null;
    learning_style: VARKProfile | null;
    self_efficacy: SelfEfficacyProfile | null;
    study_strategies: StudyStrategyProfile | null;
  } | null,
): ProfileCompletenessInput => {
  if (!profile) {
    return {
      personality_items: 0,
      self_efficacy_items: 0,
      study_strategy_items: 0,
      learning_style_items: 0,
      baseline_courses: 0,
    };
  }

  // Estimate items from profile presence
  const personalityItems = profile.personality_traits
    ? Object.values(profile.personality_traits).filter((v) => v > 0).length > 0
      ? 25
      : 3
    : 0;
  const selfEfficacyItems = profile.self_efficacy
    ? Object.values(profile.self_efficacy).filter((v) => v > 0).length > 0
      ? 6
      : 2
    : 0;
  const studyStrategyItems = profile.study_strategies
    ? Object.values(profile.study_strategies).filter((v) => v > 0).length > 0
      ? 8
      : 0
    : 0;
  const learningStyleItems = profile.learning_style ? 16 : 0;

  return {
    personality_items: personalityItems,
    self_efficacy_items: selfEfficacyItems,
    study_strategy_items: studyStrategyItems,
    learning_style_items: learningStyleItems,
    baseline_courses: 0, // We'd need to check baseline_attainment separately
  };
};

// ── Component ────────────────────────────────────────────────────────

export const CompleteProfilePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const studentId = user?.id ?? '';

  const { data: completenessData } = useProfileCompleteness(studentId);
  const { data: profile } = useStudentProfile(studentId);

  const completenessInput = useMemo(
    () => deriveCompletenessInput(profile ?? null),
    [profile],
  );

  const allDimensions = useMemo(
    () => getProfileDimensions(completenessInput),
    [completenessInput],
  );

  const remaining = useMemo(
    () => getRemainingDimensions(completenessInput),
    [completenessInput],
  );

  const estimatedMinutes = useMemo(
    () => getEstimatedTimeMinutes(remaining),
    [remaining],
  );

  const completeness = completenessData?.profile_completeness ?? 0;

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      {/* Back button */}
      <Button
        variant="ghost"
        onClick={() => navigate('/student')}
        className="mb-4 gap-1 text-gray-500"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Button>

      <h1 className="text-2xl font-bold tracking-tight text-gray-900">
        Complete My Profile
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        Finish your profiling dimensions to unlock full personalization.
      </p>

      {/* Progress bar */}
      <Card className="mt-6 border-0 bg-white p-4 shadow-md rounded-xl">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-900">Profile Completeness</span>
          <span className="text-sm font-bold text-blue-600">{completeness}%</span>
        </div>
        <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-slate-100">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-teal-500 to-blue-600"
            initial={{ width: 0 }}
            animate={{ width: `${completeness}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
        {remaining.length > 0 && (
          <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              ~{estimatedMinutes} min remaining
            </span>
            <span className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 text-amber-500" />
              Earn XP for each section
            </span>
          </div>
        )}
      </Card>

      {/* Dimension list */}
      <div className="mt-6 space-y-3">
        {allDimensions.map((dim) => {
          const meta = DIMENSION_META[dim.dimension];
          if (!meta) return null;
          const isComplete = dim.percentage >= 100;
          const itemsLeft = dim.total - dim.completed;

          return (
            <Card
              key={dim.dimension}
              className={`border-0 p-4 shadow-md rounded-xl transition-colors ${
                isComplete ? 'bg-green-50' : 'bg-white hover:bg-slate-50 cursor-pointer'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                  {meta.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900">{meta.label}</p>
                    {isComplete ? (
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Complete
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">
                        {itemsLeft} item{itemsLeft !== 1 ? 's' : ''} left
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500">{meta.description}</p>
                </div>
                {!isComplete && (
                  <ChevronRight className="h-5 w-5 shrink-0 text-gray-400" />
                )}
              </div>

              {/* Progress bar per dimension */}
              {!isComplete && (
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-blue-500"
                    style={{ width: `${dim.percentage}%` }}
                  />
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {completeness >= 100 && (
        <Card className="mt-6 border-0 bg-gradient-to-r from-teal-500 to-blue-600 p-6 shadow-lg rounded-xl text-center text-white">
          <CheckCircle className="mx-auto h-10 w-10" />
          <h2 className="mt-2 text-lg font-bold">Profile Complete!</h2>
          <p className="mt-1 text-sm text-white/80">
            You&apos;ve completed all profiling dimensions. Your learning experience is fully
            personalized.
          </p>
        </Card>
      )}
    </div>
  );
};

export default CompleteProfilePage;
