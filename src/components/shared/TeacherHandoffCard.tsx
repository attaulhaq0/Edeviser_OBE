// =============================================================================
// TeacherHandoffCard — In-conversation handoff suggestion with consent
// Task 18.3
// =============================================================================

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Handshake, X, Loader2 } from "lucide-react";

interface TeacherHandoffCardProps {
  /** Why the handoff was suggested */
  reason: string;
  /** Human-readable message explaining the suggestion */
  message: string;
  /** Whether the create-handoff mutation is in progress */
  isPending?: boolean;
  /** Called when the student accepts with consent */
  onAccept: () => void;
  /** Called when the student dismisses the suggestion */
  onDismiss: () => void;
}

const REASON_LABELS: Record<string, string> = {
  low_rag_confidence:
    "I'm having trouble finding relevant course materials for this topic.",
  repeated_question:
    "It looks like we've been going back and forth on this topic.",
  low_satisfaction:
    "It seems my responses haven't been as helpful as they could be.",
};

const TeacherHandoffCard = ({
  reason,
  message,
  isPending = false,
  onAccept,
  onDismiss,
}: TeacherHandoffCardProps) => {
  const [consentChecked, setConsentChecked] = useState(false);

  const reasonLabel = REASON_LABELS[reason] ?? message;

  return (
    <Card className="bg-white border border-amber-200 shadow-md rounded-xl overflow-hidden my-3">
      {/* Header */}
      <div className="px-4 py-3 bg-amber-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Handshake className="h-5 w-5 text-amber-600" />
          <span className="text-sm font-bold text-amber-800">
            Connect with Your Teacher?
          </span>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Dismiss handoff suggestion"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        <p className="text-sm text-gray-700">{reasonLabel}</p>
        <p className="text-sm text-gray-600">
          Your teacher may be able to help. Would you like to connect?
        </p>

        {/* Consent checkbox */}
        <div className="flex items-start gap-2">
          <Checkbox
            id="handoff-consent"
            checked={consentChecked}
            onCheckedChange={(checked) => setConsentChecked(checked === true)}
          />
          <Label
            htmlFor="handoff-consent"
            className="text-xs text-gray-600 leading-tight cursor-pointer"
          >
            I agree to share a summary of this conversation with my teacher
          </Label>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          <Button
            size="sm"
            disabled={!consentChecked || isPending}
            onClick={onAccept}
            className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Connect with Teacher
          </Button>
          <Button size="sm" variant="ghost" onClick={onDismiss}>
            No thanks
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default TeacherHandoffCard;
