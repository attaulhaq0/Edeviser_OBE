import { Sparkles, Clock, Star, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ONBOARDING_XP } from '@/lib/onboardingConstants';
import type { WizardStepProps } from './OnboardingWizard';

// ── Component ────────────────────────────────────────────────────────

export const WelcomeStep = ({ isDay1, onComplete }: WizardStepProps) => {
  const timeEstimate = isDay1 ? 'Under 3 minutes' : '10–15 minutes';
  const totalXP = isDay1
    ? ONBOARDING_XP.personality + ONBOARDING_XP.self_efficacy + ONBOARDING_XP.complete
    : ONBOARDING_XP.personality +
      ONBOARDING_XP.learning_style +
      ONBOARDING_XP.self_efficacy +
      ONBOARDING_XP.study_strategy +
      ONBOARDING_XP.complete;

  return (
    <div className="flex flex-col items-center text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-blue-600"
      >
        <Sparkles className="h-10 w-10 text-white" />
      </motion.div>

      <h1 className="text-2xl font-bold tracking-tight text-gray-900">
        Welcome to Edeviser! 👋
      </h1>
      <p className="mt-2 max-w-md text-sm text-gray-500">
        {isDay1
          ? "Let's get to know you with a few quick questions so we can personalize your learning experience."
          : 'Complete your full profile to unlock personalized learning paths, AI recommendations, and more.'}
      </p>

      {/* Info cards */}
      <div className="mt-8 grid w-full max-w-sm gap-3">
        <Card className="flex flex-row items-center gap-3 border-0 bg-blue-50 p-4 shadow-none">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100">
            <Clock className="h-5 w-5 text-blue-600" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-gray-900">{timeEstimate}</p>
            <p className="text-xs text-gray-500">
              {isDay1 ? 'Just 7 quick questions' : 'Full personality, learning style & baseline tests'}
            </p>
          </div>
        </Card>

        <Card className="flex flex-row items-center gap-3 border-0 bg-amber-50 p-4 shadow-none">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100">
            <Star className="h-5 w-5 text-amber-600" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-gray-900">Earn up to {totalXP} XP</p>
            <p className="text-xs text-gray-500">
              Start your gamification journey from day one
            </p>
          </div>
        </Card>
      </div>

      {/* What we'll cover */}
      <div className="mt-8 w-full max-w-sm text-left">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
          What we&apos;ll cover
        </p>
        <ul className="mt-3 space-y-2">
          <StepPreview label="Personality traits" description="Understand how you learn and work" />
          <StepPreview label="Self-efficacy" description="Your confidence across academic areas" />
          {!isDay1 && (
            <>
              <StepPreview label="Learning style" description="Discover your VARK preferences" />
              <StepPreview label="Study strategies" description="Identify your study habits" />
              <StepPreview label="Baseline tests" description="Measure your starting knowledge" />
            </>
          )}
        </ul>
      </div>

      <Badge className="mt-6 bg-green-100 text-green-700 hover:bg-green-100">
        Your data stays private — only you can see your profile
      </Badge>

      <Button
        onClick={onComplete}
        className="mt-8 gap-2 bg-gradient-to-r from-teal-500 to-blue-600 px-8 active:scale-95"
      >
        Let&apos;s Go
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
};

// ── Sub-component ────────────────────────────────────────────────────

const StepPreview = ({ label, description }: { label: string; description: string }) => (
  <li className="flex items-start gap-2">
    <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-gradient-to-r from-teal-500 to-blue-600" />
    <div>
      <p className="text-sm font-medium text-gray-900">{label}</p>
      <p className="text-xs text-gray-500">{description}</p>
    </div>
  </li>
);

export default WelcomeStep;
