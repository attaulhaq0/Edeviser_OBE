// =============================================================================
// LearningPlanCard — Gradient-bordered card for AI tutor learning plan updates
// Displays study time recommendation, material links, and planner session count
// with accept/modify/dismiss actions.
// =============================================================================

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  Calendar,
  Check,
  Clock,
  FileText,
  Pencil,
  X,
} from "lucide-react";
import type { LearningPlanUpdate } from "@/lib/tutorSchemas";

// ─── Types ───────────────────────────────────────────────────────────────────

interface LearningPlanCardProps {
  planUpdate: LearningPlanUpdate;
  onRespond: (
    planUpdateId: string,
    response: "accepted" | "modified" | "dismissed",
    modifications?: string
  ) => void;
  isResponding?: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

const LearningPlanCard = ({
  planUpdate,
  onRespond,
  isResponding = false,
}: LearningPlanCardProps) => {
  const [showModifyInput, setShowModifyInput] = useState(false);
  const [modifications, setModifications] = useState("");
  const [responded, setResponded] = useState(false);

  const handleAccept = () => {
    setResponded(true);
    onRespond(planUpdate.id, "accepted");
  };

  const handleDismiss = () => {
    setResponded(true);
    onRespond(planUpdate.id, "dismissed");
  };

  const handleModifySubmit = () => {
    if (!modifications.trim()) return;
    setResponded(true);
    onRespond(planUpdate.id, "modified", modifications.trim());
  };

  return (
    <div
      className="rounded-xl p-[2px]"
      style={{
        background: "linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)",
      }}
    >
      <Card className="bg-white border-0 rounded-xl overflow-hidden shadow-none">
        {/* Header */}
        <div className="px-4 py-3 bg-slate-50 flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-teal-600" />
          <span className="text-sm font-semibold text-slate-800">
            Learning Plan Suggestion
          </span>
          <span className="ms-auto text-xs text-slate-500">
            Based on {planUpdate.interaction_count} interactions
          </span>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {/* CLO context */}
          <p className="text-xs font-bold tracking-wide uppercase text-teal-700">
            {planUpdate.clo_title}
          </p>

          {/* Study time recommendation */}
          <div className="flex items-start gap-2">
            <Clock className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
            <p className="text-sm font-medium text-slate-700">
              {planUpdate.study_time_recommendation}
            </p>
          </div>

          {/* Recommended materials (up to 3) */}
          {planUpdate.recommended_materials.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Recommended Materials
              </p>
              {planUpdate.recommended_materials
                .slice(0, 3)
                .map((material, idx) => (
                  <div
                    key={material.chunk_id || idx}
                    className="flex items-center gap-2 text-sm text-slate-600"
                  >
                    <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{material.source_filename}</span>
                  </div>
                ))}
            </div>
          )}

          {/* Planner sessions */}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-500 shrink-0" />
            <p className="text-sm font-medium text-slate-700">
              {planUpdate.suggested_planner_sessions} planner{" "}
              {planUpdate.suggested_planner_sessions === 1
                ? "session"
                : "sessions"}
              /week suggested
            </p>
          </div>

          {/* Modify input */}
          {showModifyInput && !responded && (
            <div className="flex items-center gap-2 pt-1">
              <Input
                value={modifications}
                onChange={(e) => setModifications(e.target.value)}
                placeholder="Describe your modifications..."
                className="text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleModifySubmit();
                }}
              />
              <Button
                size="sm"
                onClick={handleModifySubmit}
                disabled={!modifications.trim() || isResponding}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Send
              </Button>
            </div>
          )}

          {/* Action buttons */}
          {!responded && (
            <div className="flex items-center gap-2 pt-1">
              <Button
                size="sm"
                onClick={handleAccept}
                disabled={isResponding}
                className={cn(
                  "bg-green-600 hover:bg-green-700 text-white active:scale-95 transition-transform duration-100"
                )}
              >
                <Check className="h-4 w-4" />
                Accept
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowModifyInput(!showModifyInput)}
                disabled={isResponding}
                className="text-blue-600 border-blue-200 hover:bg-blue-50"
              >
                <Pencil className="h-4 w-4" />
                Modify
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleDismiss}
                disabled={isResponding}
                className="text-slate-500 border-slate-200 hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
                Dismiss
              </Button>
            </div>
          )}

          {/* Responded state */}
          {responded && (
            <p className="text-xs text-slate-400 italic pt-1">
              Response recorded. Thank you!
            </p>
          )}
        </div>
      </Card>
    </div>
  );
};

export default LearningPlanCard;
