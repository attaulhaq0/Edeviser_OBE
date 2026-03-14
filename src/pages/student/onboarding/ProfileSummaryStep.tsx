import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Loader2, AlertTriangle, Eye, Headphones, BookOpen, Hand, Layers, Shield, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts';
import { useStudentProfile } from '@/hooks/useStudentProfile';
import { BIG_FIVE_LABELS, VARK_DESCRIPTIONS } from '@/lib/onboardingConstants';
import type { BigFiveTraits, VARKProfile, SelfEfficacyProfile } from '@/lib/scoreCalculator';
import type { WizardStepProps } from './OnboardingWizard';

// ── Types ────────────────────────────────────────────────────────────

interface ProfileSummaryStepProps extends WizardStepProps {
  onConfirm: () => Promise<void>;
  isProcessing: boolean;
  skippedSections: string[];
}

// ── VARK Icon Map ────────────────────────────────────────────────────

const VARK_ICONS: Record<string, React.ReactNode> = {
  visual: <Eye className="h-5 w-5" />,
  auditory: <Headphones className="h-5 w-5" />,
  read_write: <BookOpen className="h-5 w-5" />,
  kinesthetic: <Hand className="h-5 w-5" />,
  multimodal: <Layers className="h-5 w-5" />,
};

// ── Radar Chart Data ─────────────────────────────────────────────────

const buildRadarData = (traits: BigFiveTraits | null) => {
  if (!traits) return [];
  return Object.entries(traits).map(([key, value]) => ({
    trait: (BIG_FIVE_LABELS as Record<string, string>)[key] ?? key,
    score: value,
    fullMark: 100,
  }));
};

// ── Self-Efficacy Labels ─────────────────────────────────────────────

const EFFICACY_LABELS: Record<string, string> = {
  overall: 'Overall',
  general_academic: 'General Academic',
  course_specific: 'Course-Specific',
  self_regulated_learning: 'Self-Regulated Learning',
};

// ── Component ────────────────────────────────────────────────────────

export const ProfileSummaryStep = ({
  isDay1,
  studentId,
  onConfirm,
  isProcessing,
  skippedSections,
}: ProfileSummaryStepProps) => {
  const { data: profile } = useStudentProfile(studentId);

  const personalitySkipped = skippedSections.includes('personality');
  const learningStyleSkipped = skippedSections.includes('learning_style') || isDay1;
  const selfEfficacySkipped = skippedSections.includes('self_efficacy');
  const studyStrategySkipped = skippedSections.includes('study_strategy') || isDay1;

  const radarData = useMemo(
    () => buildRadarData(profile?.personality_traits ?? null),
    [profile?.personality_traits],
  );

  const varkProfile = profile?.learning_style as VARKProfile | null;
  const selfEfficacy = profile?.self_efficacy as SelfEfficacyProfile | null;

  return (
    <div className="flex flex-col items-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-blue-600"
      >
        <CheckCircle className="h-7 w-7 text-white" />
      </motion.div>

      <h2 className="text-lg font-bold tracking-tight text-gray-900">
        {isDay1 ? 'Your Preliminary Profile' : 'Your Profile Summary'}
      </h2>
      <p className="mt-1 max-w-md text-center text-sm text-gray-500">
        {isDay1
          ? "Here's a quick snapshot based on your Day 1 responses. You'll complete the rest over the next two weeks."
          : 'Review your assessment results below. You can retake assessments later from your settings.'}
      </p>

      <div className="mt-6 w-full max-w-md space-y-4">
        {/* Big Five Personality Radar */}
        {personalitySkipped ? (
          <SkippedSection label="Personality Traits" />
        ) : (
          <Card className="border-0 bg-white p-4 shadow-md rounded-xl">
            <h3 className="mb-2 text-sm font-bold text-gray-900">Personality Traits</h3>
            {isDay1 && (
              <p className="mb-2 text-xs text-gray-500">
                Preliminary results — based on 3 of 25 questions
              </p>
            )}
            {radarData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="trait" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar
                    name="Score"
                    dataKey="score"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-4 text-center text-xs text-gray-400">No data available</p>
            )}
          </Card>
        )}

        {/* Self-Efficacy */}
        {selfEfficacySkipped ? (
          <SkippedSection label="Self-Efficacy" />
        ) : (
          <Card className="border-0 bg-white p-4 shadow-md rounded-xl">
            <div className="mb-3 flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-600" />
              <h3 className="text-sm font-bold text-gray-900">Self-Efficacy</h3>
            </div>
            {isDay1 && (
              <p className="mb-2 text-xs text-gray-500">
                Preliminary results — based on 2 of 6 items
              </p>
            )}
            {selfEfficacy ? (
              <div className="space-y-2">
                {Object.entries(selfEfficacy).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">
                      {EFFICACY_LABELS[key] ?? key}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-blue-500"
                          style={{ width: `${value}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-gray-700">{value}%</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-2 text-center text-xs text-gray-400">No data available</p>
            )}
          </Card>
        )}

        {/* VARK Learning Style — self-awareness only */}
        {learningStyleSkipped ? (
          <SkippedSection label="Learning Style (VARK)" note="Available via micro-assessments" />
        ) : varkProfile ? (
          <Card className="border-0 bg-white p-4 shadow-md rounded-xl">
            <div className="mb-2 flex items-center gap-2">
              {VARK_ICONS[varkProfile.dominant_style]}
              <h3 className="text-sm font-bold text-gray-900">
                {VARK_DESCRIPTIONS[varkProfile.dominant_style]?.label ?? 'Learning Style'}
              </h3>
            </div>
            <p className="mb-3 text-xs text-gray-500">
              {VARK_DESCRIPTIONS[varkProfile.dominant_style]?.description}
            </p>
            <Card className="flex flex-row items-start gap-2 border-0 bg-amber-50 p-2.5 shadow-none">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
              <p className="text-[11px] text-amber-800">
                For reflection only — not used for content matching.
              </p>
            </Card>
          </Card>
        ) : null}

        {/* Study Strategies */}
        {studyStrategySkipped && (
          <SkippedSection label="Study Strategies" note="Available via micro-assessments" />
        )}
      </div>

      {/* Confirm button */}
      <Button
        onClick={onConfirm}
        disabled={isProcessing}
        className="mt-8 gap-2 bg-gradient-to-r from-teal-500 to-blue-600 px-8 active:scale-95"
      >
        {isProcessing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <CheckCircle className="h-4 w-4" />
            {isDay1 ? 'Complete & Go to Dashboard' : 'Confirm & Continue'}
          </>
        )}
      </Button>

      {isDay1 && (
        <p className="mt-3 max-w-sm text-center text-xs text-gray-400">
          You&apos;ll complete the remaining assessments through short daily micro-assessments over
          the next two weeks.
        </p>
      )}
    </div>
  );
};

// ── Sub-component ────────────────────────────────────────────────────

const SkippedSection = ({ label, note }: { label: string; note?: string }) => (
  <Card className="border-0 bg-slate-50 p-4 shadow-none rounded-xl">
    <div className="flex items-center gap-2">
      <BarChart3 className="h-4 w-4 text-gray-400" />
      <h3 className="text-sm font-medium text-gray-500">{label}</h3>
      <Badge variant="outline" className="ml-auto text-[10px]">
        Skipped
      </Badge>
    </div>
    {note && <p className="mt-1 text-xs text-gray-400">{note}</p>}
  </Card>
);

export default ProfileSummaryStep;
