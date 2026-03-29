// =============================================================================
// WelcomeTour — Role-specific welcome tour for Coordinator, Teacher, Student
// Highlights key features with a step-through overlay
// =============================================================================

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  X,
  Loader2,
  Target,
  Grid3X3,
  BookOpen,
  ClipboardList,
  TableProperties,
  CheckSquare,
  Sparkles,
  Flame,
  Trophy,
  TrendingUp,
  Award,
  type LucideIcon,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCompleteOnboarding } from '@/hooks/useOnboarding';
import { toast } from 'sonner';
import type { UserRole } from '@/types/app';

// ── Types ────────────────────────────────────────────────────────────────────

interface TourStep {
  title: string;
  content: string;
  icon: LucideIcon;
}

interface WelcomeTourProps {
  userRole: Exclude<UserRole, 'admin' | 'parent'>;
  onComplete: () => void;
}

// ── Tour Steps by Role ───────────────────────────────────────────────────────

const COORDINATOR_STEPS: TourStep[] = [
  {
    title: 'Program Management',
    content: 'Manage your academic programs, assign courses, and track program-level outcomes from your dashboard.',
    icon: BookOpen,
  },
  {
    title: 'PLO Mapping',
    content: 'Create Program Learning Outcomes and map them to ILOs with weighted relationships for accreditation compliance.',
    icon: Target,
  },
  {
    title: 'Curriculum Matrix',
    content: 'View the PLO × Course matrix to identify coverage gaps and monitor CLO attainment across your program.',
    icon: Grid3X3,
  },
];

const TEACHER_STEPS: TourStep[] = [
  {
    title: 'Course Setup',
    content: 'Set up your courses, manage enrolled students, and organize course materials and modules.',
    icon: BookOpen,
  },
  {
    title: 'CLO Creation',
    content: 'Create Course Learning Outcomes tagged with Bloom\'s Taxonomy levels and map them to PLOs.',
    icon: Target,
  },
  {
    title: 'Rubric Builder',
    content: 'Build rubrics with criteria and performance levels linked to CLOs for standardized grading.',
    icon: TableProperties,
  },
  {
    title: 'Grading Queue',
    content: 'Grade submissions using rubrics. Evidence is auto-generated and attainment rolls up through the outcome chain.',
    icon: CheckSquare,
  },
];

const STUDENT_STEPS: TourStep[] = [
  {
    title: 'Earn XP',
    content: 'Earn experience points by logging in, submitting assignments, writing journal entries, and reading course materials.',
    icon: Sparkles,
  },
  {
    title: 'Build Streaks',
    content: 'Log in daily to build your streak. Hit milestones at 7, 14, 30, and 60 days for bonus XP and badges.',
    icon: Flame,
  },
  {
    title: 'Daily Habits',
    content: 'Complete 4 daily habits — Login, Submit, Journal, and Read — to earn a Perfect Day bonus of 50 XP.',
    icon: ClipboardList,
  },
  {
    title: 'Learning Path',
    content: 'Follow your personalized learning path ordered by Bloom\'s Taxonomy levels, unlocking higher-level assignments as you progress.',
    icon: TrendingUp,
  },
  {
    title: 'Collect Badges',
    content: 'Earn badges for achievements like streak milestones, perfect rubric scores, and hidden mystery badges. Welcome aboard! 🎉',
    icon: Award,
  },
];

const STEPS_MAP: Record<string, TourStep[]> = {
  coordinator: COORDINATOR_STEPS,
  teacher: TEACHER_STEPS,
  student: STUDENT_STEPS,
};

// ── Component ────────────────────────────────────────────────────────────────

const WelcomeTour = ({ userRole, onComplete }: WelcomeTourProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const completeOnboarding = useCompleteOnboarding();

  const steps = STEPS_MAP[userRole] ?? [];
  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;
  const isFirst = currentStep === 0;

  const goNext = useCallback(() => {
    if (!isLast) {
      setDirection(1);
      setCurrentStep((prev) => prev + 1);
    }
  }, [isLast]);

  const goBack = useCallback(() => {
    if (!isFirst) {
      setDirection(-1);
      setCurrentStep((prev) => prev - 1);
    }
  }, [isFirst]);

  const handleFinish = useCallback(() => {
    completeOnboarding.mutate(undefined, {
      onSuccess: () => {
        if (userRole === 'student') {
          toast.success('Welcome Bonus: +50 XP! 🎉');
        } else {
          toast.success('Welcome to Edeviser!');
        }
        onComplete();
      },
      onError: (err) => toast.error(err.message),
    });
  }, [completeOnboarding, onComplete, userRole]);

  const handleSkip = useCallback(() => {
    completeOnboarding.mutate(undefined, {
      onSuccess: () => onComplete(),
      onError: (err) => toast.error(err.message),
    });
  }, [completeOnboarding, onComplete]);

  if (!step || steps.length === 0) return null;

  const Icon = step.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <Card className="bg-white border-0 shadow-lg rounded-xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #312e81 100%)' }}
        >
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-white" />
            <h2 className="text-lg font-bold tracking-tight text-white">Welcome Tour</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSkip}
            className="text-white/70 hover:text-white hover:bg-white/10 h-8 w-8 p-0"
            aria-label="Close tour"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Step content */}
        <div className="p-6">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              initial={{ opacity: 0, x: direction * 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -30 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-50">
                  <Icon className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-bold">{step.title}</h3>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">{step.content}</p>
            </motion.div>
          </AnimatePresence>

          {/* Progress dots */}
          <div className="flex items-center justify-center gap-1.5 mt-6" role="list" aria-label="Tour progress">
            {steps.map((_, i) => (
              <div
                key={i}
                role="listitem"
                aria-current={i === currentStep ? 'step' : undefined}
                className={`h-1.5 rounded-full transition-all duration-200 ${
                  i === currentStep ? 'w-6 bg-blue-600' : 'w-1.5 bg-slate-200'
                }`}
              >
                <span className="sr-only">Step {i + 1} of {steps.length}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={goBack}
            disabled={isFirst}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>

          {isLast ? (
            <Button
              onClick={handleFinish}
              disabled={completeOnboarding.isPending}
              className="gap-1 bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95"
            >
              {completeOnboarding.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {userRole === 'student' ? 'Claim 50 XP Bonus' : 'Get Started'}
            </Button>
          ) : (
            <Button
              onClick={goNext}
              className="gap-1 bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};

export default WelcomeTour;
