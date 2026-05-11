// =============================================================================
// AdminOnboardingWizard — Guided setup wizard for first-time admins
// Steps: Create ILOs → Create Programs → Invite Coordinators → Invite Teachers
// =============================================================================

import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Target,
  BookOpen,
  UserPlus,
  Users,
  CheckCircle2,
  ChevronRight,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCompleteOnboarding } from "@/hooks/useOnboarding";
import { toast } from "sonner";

// ── Types ────────────────────────────────────────────────────────────────────

interface WizardStep {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  route: string;
  isCompleted: boolean;
}

interface AdminOnboardingWizardProps {
  hasILOs: boolean;
  hasPrograms: boolean;
  hasCoordinators: boolean;
  hasTeachers: boolean;
  onDismiss?: () => void;
}

// ── Component ────────────────────────────────────────────────────────────────

const AdminOnboardingWizard = ({
  hasILOs,
  hasPrograms,
  hasCoordinators,
  hasTeachers,
  onDismiss,
}: AdminOnboardingWizardProps) => {
  const navigate = useNavigate();
  const completeOnboarding = useCompleteOnboarding();
  const [dismissed, setDismissed] = useState(false);

  const steps: WizardStep[] = useMemo(
    () => [
      {
        id: "ilos",
        title: "Create ILOs",
        description: "Define your institution's learning outcomes",
        icon: Target,
        route: "/admin/outcomes",
        isCompleted: hasILOs,
      },
      {
        id: "programs",
        title: "Create Programs",
        description: "Set up academic programs for your institution",
        icon: BookOpen,
        route: "/admin/programs",
        isCompleted: hasPrograms,
      },
      {
        id: "coordinators",
        title: "Invite Coordinators",
        description: "Add coordinators to manage programs",
        icon: UserPlus,
        route: "/admin/users",
        isCompleted: hasCoordinators,
      },
      {
        id: "teachers",
        title: "Invite Teachers",
        description: "Add teachers to manage courses",
        icon: Users,
        route: "/admin/users",
        isCompleted: hasTeachers,
      },
    ],
    [hasILOs, hasPrograms, hasCoordinators, hasTeachers]
  );

  const completedCount = steps.filter((s) => s.isCompleted).length;
  const allCompleted = completedCount === steps.length;
  const progress = (completedCount / steps.length) * 100;

  const handleStepClick = (route: string) => {
    navigate(route);
  };

  const handleComplete = () => {
    completeOnboarding.mutate(undefined, {
      onSuccess: () => {
        toast.success("Onboarding complete! Welcome to Edeviser.");
        setDismissed(true);
        onDismiss?.();
      },
      onError: (err) => toast.error(err?.message ?? "An error occurred"),
    });
  };

  if (dismissed) return null;

  return (
    <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
      <div
        className="px-6 py-4 flex items-center gap-2"
        style={{
          background:
            "linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)",
        }}
      >
        <CheckCircle2 className="h-5 w-5 text-white" />
        <h2 className="text-lg font-bold tracking-tight text-white">
          Setup Wizard
        </h2>
        <span className="ml-auto text-sm font-medium text-white/80">
          {completedCount}/{steps.length}
        </span>
      </div>
      <div className="p-6 space-y-4">
        {/* Progress bar */}
        <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-teal-500 to-blue-600"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>

        {/* Steps */}
        <AnimatePresence mode="sync">
          <div className="space-y-2">
            {steps.map((step, index) => (
              <motion.button
                key={step.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleStepClick(step.route)}
                className="flex items-center gap-3 w-full text-start rounded-lg px-3 py-3 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center justify-center h-8 w-8 rounded-full shrink-0">
                  {step.isCompleted ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-slate-300 flex items-center justify-center">
                      <span className="text-xs font-bold text-slate-400">
                        {index + 1}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{step.title}</p>
                  <p className="text-xs text-gray-500">{step.description}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
              </motion.button>
            ))}
          </div>
        </AnimatePresence>

        {/* Complete button */}
        {allCompleted && (
          <Button
            onClick={handleComplete}
            disabled={completeOnboarding.isPending}
            className="w-full bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95"
          >
            {completeOnboarding.isPending && (
              <Loader2 className="h-4 w-4 animate-spin me-2" />
            )}
            Complete Setup
          </Button>
        )}
      </div>
    </Card>
  );
};

export default AdminOnboardingWizard;
