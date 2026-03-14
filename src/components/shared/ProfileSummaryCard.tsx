import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, AlertTriangle, RefreshCw } from 'lucide-react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts';
import { BIG_FIVE_LABELS, VARK_DESCRIPTIONS } from '@/lib/onboardingConstants';
import type { BigFiveTraits, VARKProfile, SelfEfficacyProfile, StudyStrategyProfile } from '@/lib/scoreCalculator';

export interface ProfileSummaryCardProps {
  personalityTraits: BigFiveTraits | null;
  learningStyle: VARKProfile | null;
  selfEfficacy: SelfEfficacyProfile | null;
  studyStrategies: StudyStrategyProfile | null;
  onRetake?: () => void;
  onCompleteRemaining?: () => void;
  hasSkippedSections?: boolean;
}

const SELF_EFFICACY_LABELS: Record<string, string> = {
  general_academic: 'General Academic',
  course_specific: 'Course-Specific',
  self_regulated_learning: 'Self-Regulated Learning',
};

const STUDY_STRATEGY_LABELS: Record<string, string> = {
  time_management: 'Time Management',
  elaboration: 'Elaboration',
  self_testing: 'Self-Testing',
  help_seeking: 'Help Seeking',
};

const ScoreBar = ({ label, value }: { label: string; value: number }) => (
  <div className="space-y-1">
    <div className="flex items-center justify-between">
      <span className="text-xs font-medium text-gray-600">{label}</span>
      <span className="text-xs font-bold text-gray-900">{value}%</span>
    </div>
    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
      <div
        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300"
        style={{ width: `${value}%` }}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label}: ${value}%`}
      />
    </div>
  </div>
);

const ProfileSummaryCard = ({
  personalityTraits,
  learningStyle,
  selfEfficacy,
  studyStrategies,
  onRetake,
  onCompleteRemaining,
  hasSkippedSections = false,
}: ProfileSummaryCardProps) => {
  const radarData = personalityTraits
    ? Object.entries(BIG_FIVE_LABELS).map(([key, label]) => ({
        trait: label,
        score: personalityTraits[key as keyof BigFiveTraits] ?? 0,
      }))
    : [];

  const varkInfo = learningStyle
    ? VARK_DESCRIPTIONS[learningStyle.dominant_style]
    : null;

  return (
    <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
      <div
        className="px-6 py-4 flex items-center gap-2"
        style={{ background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)' }}
      >
        <User className="h-5 w-5 text-white" />
        <h2 className="text-lg font-bold tracking-tight text-white">My Profile</h2>
      </div>

      <div className="p-6 space-y-6">
        {/* Big Five Radar Chart */}
        {personalityTraits && radarData.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-3">Personality Traits</h3>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
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
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Self-Efficacy */}
        {selfEfficacy && (
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-3">Self-Efficacy</h3>
            <div className="space-y-2">
              {Object.entries(SELF_EFFICACY_LABELS).map(([key, label]) => (
                <ScoreBar
                  key={key}
                  label={label}
                  value={selfEfficacy[key as keyof Omit<SelfEfficacyProfile, 'overall'>] ?? 0}
                />
              ))}
            </div>
          </div>
        )}

        {/* Study Strategies */}
        {studyStrategies && (
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-3">Study Strategies</h3>
            <div className="space-y-2">
              {Object.entries(STUDY_STRATEGY_LABELS).map(([key, label]) => (
                <ScoreBar
                  key={key}
                  label={label}
                  value={studyStrategies[key as keyof StudyStrategyProfile] ?? 0}
                />
              ))}
            </div>
          </div>
        )}

        {/* VARK — Self-Awareness Section */}
        {learningStyle && varkInfo && (
          <div className="rounded-lg bg-amber-50 p-4 space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-gray-900">Self-Awareness</h3>
              <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-700">
                For reflection only
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg" aria-hidden="true">{varkInfo.icon === 'Eye' ? '👁️' : varkInfo.icon === 'Headphones' ? '👂' : varkInfo.icon === 'BookOpen' ? '📖' : varkInfo.icon === 'Hand' ? '🤲' : '🎯'}</span>
              <div>
                <p className="text-sm font-bold text-gray-900">{varkInfo.label}</p>
                <p className="text-xs text-gray-500">{varkInfo.description}</p>
              </div>
            </div>
            <p className="text-[10px] text-amber-600 flex items-start gap-1">
              <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
              Learning style preferences are provided as a self-awareness exercise. They are not used for content adaptation.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2">
          {hasSkippedSections && onCompleteRemaining && (
            <Button
              variant="outline"
              size="sm"
              onClick={onCompleteRemaining}
              className="text-xs"
            >
              Complete Assessment
            </Button>
          )}
          {onRetake && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRetake}
              className="text-xs text-gray-500"
            >
              <RefreshCw className="h-3 w-3" />
              Retake Assessment
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};

export default ProfileSummaryCard;
