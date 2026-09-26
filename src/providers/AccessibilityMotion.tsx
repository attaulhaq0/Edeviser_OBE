import type { ReactNode } from "react";
import { MotionConfig } from "framer-motion";
import { useAccessibilityPreferenceControls } from "@/hooks/useAccessibilityPreferences";

/** An explicit reduction can add to, never switch off, the platform preference. */
export const AccessibilityMotion = ({ children }: { children: ReactNode }) => {
  const { effective } = useAccessibilityPreferenceControls();
  return <MotionConfig reducedMotion={effective.reduced_animations ? "always" : "user"}>{children}</MotionConfig>;
};
