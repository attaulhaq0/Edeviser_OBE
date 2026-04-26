import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { UserRound, AlertTriangle, X } from 'lucide-react';

interface TeacherHandoffCardProps {
  reason: string;
  message: string;
  onAccept: (consent: boolean) => void;
  onDismiss: () => void;
}

/**
 * In-conversation handoff suggestion card.
 * Shows when the AI tutor detects low effectiveness and suggests
 * connecting the student with their teacher.
 *
 * Requirement 30: Teacher Handoff Mechanism
 */
const TeacherHandoffCard = ({ reason, message, onAccept, onDismiss }: TeacherHandoffCardProps) => {
  const [consentChecked, setConsentChecked] = useState(false);

  return (
    <Card className="border-0 shadow-md rounded-xl overflow-hidden my-3 bg-amber-50/50 border-l-4 border-l-amber-400">
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start gap-2">
          <div className="p-1.5 rounded-lg bg-amber-100">
            <UserRound className="h-4 w-4 text-amber-700" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-gray-900">Connect with Your Teacher</p>
            <p className="text-xs text-gray-500 mt-0.5">{message}</p>
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

        {/* Reason */}
        <div className="flex items-start gap-2 bg-white/60 rounded-lg p-2.5">
          <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
          <p className="text-xs text-gray-600">{reason}</p>
        </div>

        {/* Consent Checkbox */}
        <div className="flex items-start gap-2">
          <Checkbox
            id="handoff-consent"
            checked={consentChecked}
            onCheckedChange={(checked) => setConsentChecked(checked === true)}
            className="mt-0.5"
          />
          <label htmlFor="handoff-consent" className="text-xs text-gray-600 cursor-pointer">
            I agree to share a summary of this conversation with my teacher
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => onAccept(consentChecked)}
            disabled={!consentChecked}
            className="bg-gradient-to-r from-teal-500 to-blue-600 text-white text-xs font-semibold active:scale-95 disabled:opacity-50"
          >
            <UserRound className="h-3.5 w-3.5" />
            Connect with Teacher
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onDismiss}
            className="text-xs font-semibold text-gray-400 hover:text-gray-600"
          >
            Not Now
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default TeacherHandoffCard;
