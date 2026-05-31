// =============================================================================
// AssessmentIntro — Benefit-oriented framing panel shown before an assessment
// body (R17). Communicates the assessment's benefits and estimated time before
// any responses are requested, and exposes an explicit "begin" action. The
// consuming step keeps its assessment body gated until the student begins, so
// the benefit + estimated time are always displayed first (R17.2a).
// =============================================================================

import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { Clock, Check, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Mascot from "@/components/shared/Mascot";
import { useGatedMotion } from "@/lib/motionGate";
import type { AssessmentIntroContent } from "@/lib/assessmentIntro";

export interface AssessmentIntroProps {
  /** Lead icon for the assessment (matches the step's body header icon). */
  icon: LucideIcon;
  /** Resolved, localized framing content (title, description, time, benefits). */
  content: AssessmentIntroContent;
  /** Label for the begin/start button. */
  beginLabel: string;
  /** Invoked when the student chooses to begin the assessment. */
  onBegin: () => void;
}

const AssessmentIntro = ({
  icon: Icon,
  content,
  beginLabel,
  onBegin,
}: AssessmentIntroProps) => {
  // R31.2/R31.2a — suppress the icon's entrance animation when the user prefers
  // reduced motion (render it already settled) while leaving any in-flight
  // animation to complete naturally; gating lives in JS, not only CSS (R31.3).
  const motionGate = useGatedMotion();

  return (
    <div className="flex flex-col items-center text-center">
      <motion.div
        initial={motionGate.enter(
          { scale: 0.8, opacity: 0 },
          { scale: 1, opacity: 1 }
        )}
        animate={{ scale: 1, opacity: 1 }}
        transition={motionGate.transition({ duration: 0.3, ease: "easeOut" })}
        className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-blue-600"
      >
        <Icon className="h-8 w-8 text-white" />
      </motion.div>

      <h2 className="text-xl font-bold tracking-tight text-gray-900">
        {content.title}
      </h2>
      <p className="mt-2 max-w-md text-sm text-gray-500">
        {content.description}
      </p>

      {/* Mascot coaching at the assessment-intro moment (R35.1). Renders nothing
          when mascot guidance is disabled or inactive (R35.4, R35.5). */}
      <Mascot moment="assessmentIntro" className="mt-6 w-full max-w-sm" />

      {/* Estimated time (R17.2) */}
      <Card className="mt-6 flex w-full max-w-sm flex-row items-center gap-3 border-0 bg-blue-50 p-4 shadow-none">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100">
          <Clock className="h-5 w-5 text-blue-600" />
        </div>
        <p className="text-start text-sm font-semibold text-gray-900">
          {content.estimatedTime}
        </p>
      </Card>

      {/* Concrete benefits (R17.3) */}
      <ul className="mt-6 w-full max-w-sm space-y-3 text-start">
        {content.benefits.map((benefit) => (
          <li key={benefit} className="flex items-start gap-3">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-100">
              <Check className="h-3 w-3 text-green-600" />
            </span>
            <span className="text-sm font-medium text-gray-700">{benefit}</span>
          </li>
        ))}
      </ul>

      <Button
        onClick={onBegin}
        className="mt-8 gap-2 bg-gradient-to-r from-teal-500 to-blue-600 px-8 active:scale-95"
      >
        {beginLabel}
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default AssessmentIntro;
