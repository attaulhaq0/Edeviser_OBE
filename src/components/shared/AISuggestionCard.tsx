// =============================================================================
// AISuggestionCard — AI module suggestion card with CLO gap info & feedback
// =============================================================================

import { Sparkles, TrendingDown, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import AIFeedbackThumbs from "@/components/shared/AIFeedbackThumbs";
import type { FeedbackValue } from "@/components/shared/AIFeedbackThumbs";

// ─── Types ───────────────────────────────────────────────────────────────────

interface AISuggestionCardProps {
  id: string;
  suggestionText: string;
  weakCLOTitle: string;
  weakCLOAttainment: number;
  socialProofText: string | null;
  feedback: FeedbackValue;
  onFeedback: (
    id: string,
    feedback: "thumbs_up" | "thumbs_down"
  ) => Promise<void>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getAttainmentColor = (percent: number) => {
  if (percent >= 70)
    return { bg: "bg-blue-50", text: "text-blue-600", label: "Satisfactory" };
  if (percent >= 50)
    return { bg: "bg-yellow-50", text: "text-yellow-600", label: "Developing" };
  return { bg: "bg-red-50", text: "text-red-600", label: "Not Yet" };
};

// ─── Component ───────────────────────────────────────────────────────────────

const AISuggestionCard = ({
  id,
  suggestionText,
  weakCLOTitle,
  weakCLOAttainment,
  socialProofText,
  feedback,
  onFeedback,
}: AISuggestionCardProps) => {
  const attainment = getAttainmentColor(weakCLOAttainment);

  const handleFeedback = async (value: "thumbs_up" | "thumbs_down") => {
    await onFeedback(id, value);
  };

  return (
    <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
      {/* Gradient header */}
      <div
        className="px-4 py-3 flex items-center gap-2"
        style={{
          background:
            "linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)",
        }}
      >
        <Sparkles className="h-4 w-4 text-white" />
        <span className="text-sm font-bold tracking-tight text-white">
          AI Suggestion
        </span>
      </div>

      <div className="p-4 space-y-3">
        {/* Suggestion text */}
        <p className="text-sm font-medium text-gray-800 leading-relaxed">
          {suggestionText}
        </p>

        {/* CLO gap info */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            <TrendingDown className="h-3.5 w-3.5 text-gray-400" />
            <span
              className="text-xs text-gray-500 truncate max-w-[200px]"
              title={weakCLOTitle}
            >
              {weakCLOTitle}
            </span>
          </div>
          <Badge
            variant="outline"
            className={`text-xs font-bold ${attainment.bg} ${attainment.text} border-0`}
          >
            {Math.round(weakCLOAttainment)}% — {attainment.label}
          </Badge>
        </div>

        {/* Social proof */}
        {socialProofText && (
          <div className="flex items-start gap-1.5 bg-slate-50 rounded-lg p-2.5">
            <Users className="h-3.5 w-3.5 text-teal-500 mt-0.5 shrink-0" />
            <p className="text-xs text-gray-600 leading-relaxed">
              {socialProofText}
            </p>
          </div>
        )}

        {/* Feedback row */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-100">
          <span className="text-[10px] font-black tracking-widest uppercase text-gray-400">
            Was this helpful?
          </span>
          <AIFeedbackThumbs
            feedbackId={id}
            currentFeedback={feedback}
            onFeedback={handleFeedback}
          />
        </div>
      </div>
    </Card>
  );
};

export default AISuggestionCard;
export type { AISuggestionCardProps };
