import { ArrowRight, GraduationCap } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { getDisplayFirstName } from "@/lib/displayName";
import { useGatedMotion } from "@/lib/motionGate";
import { ONBOARDING_XP } from "@/lib/onboardingConstants";
import type { WizardStepProps } from "./OnboardingWizard";

// ── Component ────────────────────────────────────────────────────────

export const WelcomeStep = ({ isDay1, onComplete }: WizardStepProps) => {
  const { t } = useTranslation("student");
  const { profile } = useAuth();
  const motionGate = useGatedMotion();
  const firstName =
    getDisplayFirstName(profile?.full_name) ??
    t("onboarding.welcome.fallbackName");
  const totalXP = isDay1
    ? ONBOARDING_XP.personality +
      ONBOARDING_XP.self_efficacy +
      ONBOARDING_XP.complete
    : ONBOARDING_XP.personality +
      ONBOARDING_XP.learning_style +
      ONBOARDING_XP.self_efficacy +
      ONBOARDING_XP.study_strategy +
      ONBOARDING_XP.complete;

  return (
    <div className="mx-auto flex w-full max-w-[380px] flex-col items-center text-center">
      <motion.div
        initial={motionGate.enter(
          { scale: 0.8, opacity: 0 },
          { scale: 1, opacity: 1 }
        )}
        animate={{ scale: 1, opacity: 1 }}
        transition={motionGate.transition({
          duration: 0.4,
          ease: "easeOut",
        })}
        className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-[linear-gradient(93.65deg,#14b8a6_5.37%,#0382bd_78.89%)] shadow-lg shadow-cyan-900/15"
      >
        <GraduationCap className="h-10 w-10 text-white" aria-hidden="true" />
      </motion.div>

      <h1 className="text-2xl font-bold tracking-tight text-gray-900">
        {t("onboarding.welcome.greeting", { name: firstName })}
      </h1>
      <p className="mt-2 max-w-sm text-sm leading-6 text-gray-500">
        {isDay1
          ? t("onboarding.welcome.day1Description")
          : t("onboarding.welcome.fullDescription")}
      </p>

      <div className="mt-7 grid w-full gap-2.5">
        <BenefitCard
          emoji="🎯"
          tone="amber"
          title={t("onboarding.welcome.benefits.xpTitle", {
            amount: totalXP,
          })}
          description={t("onboarding.welcome.benefits.xpDescription")}
        />
        <BenefitCard
          emoji="⚡"
          tone="blue"
          title={t("onboarding.welcome.benefits.tapTitle")}
          description={
            isDay1
              ? t("onboarding.welcome.benefits.tapDay1Description")
              : t("onboarding.welcome.benefits.tapFullDescription")
          }
        />
        <BenefitCard
          emoji="🔒"
          tone="green"
          title={t("onboarding.welcome.benefits.privateTitle")}
          description={t("onboarding.welcome.benefits.privateDescription")}
        />
      </div>

      <Button
        onClick={onComplete}
        variant="tactile"
        className="mt-7 h-12 w-full gap-2 rounded-xl text-sm font-semibold shadow-lg shadow-cyan-900/15"
      >
        {t("onboarding.welcome.cta")}
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
};

// ── Sub-component ────────────────────────────────────────────────────

interface BenefitCardProps {
  emoji: string;
  tone: "amber" | "blue" | "green";
  title: string;
  description: string;
}

const BENEFIT_TONES: Record<BenefitCardProps["tone"], string> = {
  amber: "bg-amber-100",
  blue: "bg-blue-100",
  green: "bg-green-100",
};

const BenefitCard = ({ emoji, tone, title, description }: BenefitCardProps) => (
  <Card className="flex flex-row items-center gap-3 rounded-xl border border-white/60 bg-white/80 p-3.5 shadow-sm backdrop-blur">
    <div
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg ${BENEFIT_TONES[tone]}`}
      aria-hidden="true"
    >
      {emoji}
    </div>
    <div className="text-start">
      <p className="text-sm font-semibold text-gray-900">{title}</p>
      <p className="text-xs text-gray-500">{description}</p>
    </div>
  </Card>
);

export default WelcomeStep;
