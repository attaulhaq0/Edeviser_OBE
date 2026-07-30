import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { differenceInDays, addDays, format } from "date-fns";
import { PCard, SectionHeader } from "@/design-system";
import { useAuth } from "@/hooks/useAuth";
import { useStudentProfile } from "@/hooks/useStudentProfile";
import { REASSESSMENT_COOLDOWN_DAYS } from "@/lib/onboardingConstants";

interface CooldownStatus {
  canRetake: boolean;
  daysSinceLast: number;
  daysRemaining: number;
  nextEligibleDate: Date | null;
  lastAssessmentDate: Date | null;
}

const computeCooldownStatus = (
  completedAt: string | null | undefined
): CooldownStatus => {
  if (!completedAt) {
    return {
      canRetake: true,
      daysSinceLast: 0,
      daysRemaining: 0,
      nextEligibleDate: null,
      lastAssessmentDate: null,
    };
  }

  const lastDate = new Date(completedAt);
  const now = new Date();
  const daysSinceLast = differenceInDays(now, lastDate);
  const daysRemaining = Math.max(0, REASSESSMENT_COOLDOWN_DAYS - daysSinceLast);
  const nextEligibleDate =
    daysRemaining > 0 ? addDays(lastDate, REASSESSMENT_COOLDOWN_DAYS) : null;

  return {
    canRetake: daysSinceLast >= REASSESSMENT_COOLDOWN_DAYS,
    daysSinceLast,
    daysRemaining,
    nextEligibleDate,
    lastAssessmentDate: lastDate,
  };
};

const ASSESSMENT_SECTIONS = [
  {
    id: "personality",
    label: "Personality Assessment",
    description: "Big Five personality traits (25 questions)",
    icon: "🧠",
  },
  {
    id: "self_efficacy",
    label: "Self-Efficacy Scale",
    description: "Academic confidence levels (6 items)",
    icon: "💪",
  },
  {
    id: "learning_style",
    label: "Learning Style",
    description: "VARK learning preferences (16 questions)",
    icon: "📚",
  },
  {
    id: "study_strategy",
    label: "Study Strategies",
    description: "Study habits inventory (8 items)",
    icon: "📝",
  },
] as const;

const ReassessmentPage = () => {
  const { user } = useAuth();
  const { data: profile, isLoading } = useStudentProfile(user?.id ?? "");
  const navigate = useNavigate();

  const cooldown = useMemo(
    () => computeCooldownStatus(profile?.completed_at),
    [profile?.completed_at]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Retake Assessments
        </h1>
        <Badge variant="outline" className="text-xs">
          Version {profile?.assessment_version ?? 1}
        </Badge>
      </div>

      {/* Cooldown Status Card */}
      <PCard>
        <div className="p-6">
          <SectionHeader icon={Clock} title="Cooldown Status" />
          {cooldown.canRetake ? (
            <div className="mt-4 flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-bold text-slate-900">
                  You are eligible to retake assessments
                </p>
                {cooldown.lastAssessmentDate && (
                  <p className="mt-1 text-xs text-slate-500">
                    Last assessment:{" "}
                    {format(cooldown.lastAssessmentDate, "MMM d, yyyy")} (
                    {cooldown.daysSinceLast} days ago)
                  </p>
                )}
                {!cooldown.lastAssessmentDate && (
                  <p className="mt-1 text-xs text-slate-500">
                    No previous assessment found.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="mt-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-bold text-slate-900">
                  Cooldown period active
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  You can retake assessments once every{" "}
                  {REASSESSMENT_COOLDOWN_DAYS} days.
                </p>
                <div className="mt-3 flex items-center gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                      Days Remaining
                    </p>
                    <p className="text-2xl font-black text-amber-600">
                      {cooldown.daysRemaining}
                    </p>
                  </div>
                  {cooldown.nextEligibleDate && (
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                        Next Eligible
                      </p>
                      <p className="text-sm font-bold text-slate-900">
                        {format(cooldown.nextEligibleDate, "MMM d, yyyy")}
                      </p>
                    </div>
                  )}
                </div>
                {/* Cooldown progress bar */}
                <div className="mt-3">
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-300"
                      style={{
                        width: `${
                          ((REASSESSMENT_COOLDOWN_DAYS -
                            cooldown.daysRemaining) /
                            REASSESSMENT_COOLDOWN_DAYS) *
                          100
                        }%`,
                      }}
                      role="progressbar"
                      aria-valuenow={
                        REASSESSMENT_COOLDOWN_DAYS - cooldown.daysRemaining
                      }
                      aria-valuemin={0}
                      aria-valuemax={REASSESSMENT_COOLDOWN_DAYS}
                      aria-label={`Cooldown progress: ${cooldown.daysRemaining} days remaining`}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </PCard>

      {/* Assessment Sections */}
      <PCard>
        <div className="p-6">
          <SectionHeader icon={RefreshCw} title="Assessment Sections" />
          <div className="space-y-4">
            <p className="text-xs text-slate-500">
              Re-assessment creates a new profile version with updated scores.
              Your previous results are preserved for comparison. Re-assessment
              does not award additional onboarding XP.
            </p>
            <div className="space-y-3">
              {ASSESSMENT_SECTIONS.map((section) => (
                <div
                  key={section.id}
                  className="flex items-center gap-3 rounded-[14px] bg-slate-50 p-3"
                >
                  <span className="text-lg" aria-hidden="true">
                    {section.icon}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-900">
                      {section.label}
                    </p>
                    <p className="text-xs text-slate-500">
                      {section.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="pt-2">
              <Button
                disabled={!cooldown.canRetake}
                onClick={() => navigate("/student/onboarding/complete-profile")}
                variant="tactile"
                className="w-full"
              >
                <RefreshCw className="h-4 w-4" />
                {cooldown.canRetake
                  ? "Start Re-Assessment"
                  : `Available in ${cooldown.daysRemaining} days`}
              </Button>
            </div>
          </div>
        </div>
      </PCard>
    </div>
  );
};

export default ReassessmentPage;
