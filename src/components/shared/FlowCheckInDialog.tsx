import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Zap, HelpCircle, TrendingUp, X } from 'lucide-react';
import type { FlowResponse } from '@/types/planner';

export interface FlowCheckInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  intervalNumber: number;
  cloId: string | null;
  onRespond: (response: FlowResponse) => void;
  onDismiss: () => void;
}

const FlowCheckInDialog = ({
  open,
  onOpenChange,
  intervalNumber,
  cloId,
  onRespond,
  onDismiss,
}: FlowCheckInDialogProps) => {
  const handleRespond = (response: FlowResponse) => {
    onRespond(response);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center">How's it going?</DialogTitle>
          <DialogDescription className="text-center">
            Pomodoro {Math.ceil(intervalNumber / 2)} break — quick check-in
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-12 text-sm font-medium hover:bg-green-50 hover:border-green-200 hover:text-green-700"
            onClick={() => handleRespond('in_the_zone')}
          >
            <Zap className="h-5 w-5 text-green-500" />
            In the zone — keep going!
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-12 text-sm font-medium hover:bg-amber-50 hover:border-amber-200 hover:text-amber-700"
            onClick={() => handleRespond('stuck')}
          >
            <HelpCircle className="h-5 w-5 text-amber-500" />
            Stuck — need help
            {cloId && (
              <span className="ms-auto text-xs text-gray-400">→ AI Tutor</span>
            )}
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-12 text-sm font-medium hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700"
            onClick={() => handleRespond('too_easy')}
          >
            <TrendingUp className="h-5 w-5 text-blue-500" />
            Too easy — challenge me
          </Button>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="w-full text-gray-400 hover:text-gray-600"
          onClick={() => {
            onDismiss();
            onOpenChange(false);
          }}
        >
          <X className="h-4 w-4" /> Dismiss
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default FlowCheckInDialog;
