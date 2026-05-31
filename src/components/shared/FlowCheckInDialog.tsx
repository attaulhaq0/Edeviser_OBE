// =============================================================================
// FlowCheckInDialog — Pomodoro break check-in: in_the_zone / stuck / too_easy.
// Saves response via useSaveFlowCheckIn, then shows conditional follow-up:
//   • "Stuck"    → AI Tutor link (/student/tutor)
//   • "Too easy" → Bloom's level-up suggestion
//   • "In zone"  → Encouragement message
// =============================================================================

import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, HelpCircle, Zap, ChevronUp, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSaveFlowCheckIn } from "@/hooks/useFlowCheckIns";
import type { FlowResponse } from "@/types/planner";

// ─── Props ──────────────────────────────────────────────────────────────────

interface FlowCheckInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  intervalNumber: number;
  onComplete?: (response: FlowResponse) => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

const FlowCheckInDialog = ({
  open,
  onOpenChange,
  sessionId,
  intervalNumber,
  onComplete,
}: FlowCheckInDialogProps) => {
  const [selected, setSelected] = useState<FlowResponse | null>(null);
  const saveCheckIn = useSaveFlowCheckIn();

  const handleRespond = (response: FlowResponse) => {
    setSelected(response);
    saveCheckIn.mutate(
      {
        sessionId,
        intervalNumber,
        response,
      },
      {
        onSuccess: () => {
          onComplete?.(response);
        },
      }
    );
  };

  const handleDismiss = () => {
    setSelected(null);
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setSelected(null);
        }
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-md" aria-label="Flow check-in">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-teal-500" />
            Quick Check-In
          </DialogTitle>
          <DialogDescription>
            Interval {intervalNumber} done — how did that feel?
          </DialogDescription>
        </DialogHeader>

        {/* Response buttons — shown when no selection yet */}
        {!selected && (
          <div
            className="grid grid-cols-1 gap-3 sm:grid-cols-3"
            role="group"
            aria-label="Flow state options"
          >
            <Button
              variant="outline"
              className={cn(
                "flex h-auto flex-col items-center gap-2 py-4",
                "border-green-200 hover:bg-green-50 hover:border-green-400 hover:text-green-700"
              )}
              onClick={() => handleRespond("in_the_zone")}
              disabled={saveCheckIn.isPending}
              aria-label="In the zone"
            >
              <Sparkles className="h-6 w-6 text-green-600" />
              <span className="text-xs font-medium">In the zone</span>
            </Button>

            <Button
              variant="outline"
              className={cn(
                "flex h-auto flex-col items-center gap-2 py-4",
                "border-amber-200 hover:bg-amber-50 hover:border-amber-400 hover:text-amber-700"
              )}
              onClick={() => handleRespond("stuck")}
              disabled={saveCheckIn.isPending}
              aria-label="Stuck"
            >
              <HelpCircle className="h-6 w-6 text-amber-600" />
              <span className="text-xs font-medium">Stuck</span>
            </Button>

            <Button
              variant="outline"
              className={cn(
                "flex h-auto flex-col items-center gap-2 py-4",
                "border-blue-200 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700"
              )}
              onClick={() => handleRespond("too_easy")}
              disabled={saveCheckIn.isPending}
              aria-label="Too easy"
            >
              <Zap className="h-6 w-6 text-blue-600" />
              <span className="text-xs font-medium">Too easy</span>
            </Button>
          </div>
        )}

        {/* Loading indicator while saving */}
        {saveCheckIn.isPending && (
          <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
            <Loader2 className="h-3 w-3 animate-spin" />
            Saving…
          </div>
        )}

        {/* Conditional follow-up: "In the zone" */}
        {selected === "in_the_zone" && (
          <div className="rounded-lg bg-green-50 p-4">
            <p className="text-sm font-medium text-green-900">
              Great flow! Keep it up — we'll check back next break.
            </p>
          </div>
        )}

        {/* Conditional follow-up: "Stuck" → AI Tutor link */}
        {selected === "stuck" && (
          <div className="rounded-lg bg-amber-50 p-4">
            <p className="text-sm font-medium text-amber-900">
              Stuck happens — want a hand?
            </p>
            <p className="mt-1 text-xs text-amber-800">
              The AI Tutor can walk you through the concept step by step.
            </p>
            <Link to="/student/tutor">
              <Button
                className="mt-3 gap-2 bg-gradient-to-r from-amber-500 to-orange-600 active:scale-95"
                size="sm"
              >
                <HelpCircle className="h-4 w-4" />
                Open AI Tutor
              </Button>
            </Link>
          </div>
        )}

        {/* Conditional follow-up: "Too easy" → Bloom's suggestion */}
        {selected === "too_easy" && (
          <div className="rounded-lg bg-blue-50 p-4">
            <p className="text-sm font-medium text-blue-900">
              Ready for more challenge?
            </p>
            <p className="mt-1 text-xs text-blue-800 flex items-center gap-1">
              <ChevronUp className="h-3 w-3" />
              Try moving up a Bloom's level — go from <em>
                Understanding
              </em> → <em>Applying</em> or <em>Analyzing</em>. Explain the why,
              or apply the concept to a new scenario.
            </p>
          </div>
        )}

        {/* Dismiss / Continue button */}
        <div className="flex justify-end">
          <Button
            variant="ghost"
            onClick={handleDismiss}
            size="sm"
            className="gap-2"
            aria-label={selected ? "Continue to break" : "Dismiss check-in"}
          >
            {!selected && <X className="h-4 w-4" />}
            {selected ? "Continue" : "Dismiss"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FlowCheckInDialog;
export type { FlowCheckInDialogProps };
