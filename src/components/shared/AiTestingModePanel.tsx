import { useTranslation } from "react-i18next";
import { Play, Square, Zap, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PCard } from "@/design-system";
import { AdminCardHeader } from "@/design-system";
import {
  useAiTestingStatus,
  useActivateAiTesting,
  useDeactivateAiTesting,
} from "@/hooks/useAiTestingMode";

const AiTestingModePanel = () => {
  useTranslation("common");
  const { data: status, isLoading } = useAiTestingStatus();
  const activate = useActivateAiTesting();
  const deactivate = useDeactivateAiTesting();

  const handleActivate = () =>
    activate.mutate(undefined, {
      onSuccess: (r) =>
        toast.success(
          `AI testing activated for ${r.durationHours}h (max $${r.maxCostUsd}/day)`
        ),
      onError: (err) => toast.error(err.message),
    });

  const handleDeactivate = () =>
    deactivate.mutate(undefined, {
      onSuccess: () => toast.success("AI testing deactivated"),
      onError: (err) => toast.error(err.message),
    });

  const active = status?.active ?? false;
  const minutesLeft = status?.minutesRemaining ?? 0;

  if (isLoading)
    return (
      <PCard className="space-y-3">
        <AdminCardHeader icon={Zap} title="AI Testing Mode" />
        <p className="text-sm text-muted-foreground">Checking status...</p>
      </PCard>
    );

  return (
    <PCard className="space-y-3">
      <AdminCardHeader icon={Zap} title="AI Testing Mode" />
      <p className="text-sm text-muted-foreground">
        Background AI agents only run during active testing sessions. On-demand
        AI (Tutor, Quiz Gen) is always available.
      </p>
      {active ? (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 p-3 dark:border-green-800 dark:bg-green-950">
          <Zap className="h-5 w-5 text-green-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-green-800 dark:text-green-200">
              Testing Active - {minutesLeft} min remaining
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDeactivate}
            disabled={deactivate.isPending}
          >
            <Square className="me-1 h-3 w-3" />
            Stop
          </Button>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 rounded-lg border border-amber-200 p-3 dark:border-amber-800 dark:bg-amber-950">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Dormant - no background AI cost
              </p>
            </div>
          </div>
          <Button
            variant="tactile"
            onClick={handleActivate}
            disabled={activate.isPending}
            className="w-full"
          >
            {activate.isPending ? (
              <>...</>
            ) : (
              <>
                <Play className="me-2 h-4 w-4" />
                Start 2-Hour AI Testing Session
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground">
            Activates for 2h � $0.10 max � Auto-expires
          </p>
        </>
      )}
    </PCard>
  );
};

export default AiTestingModePanel;
