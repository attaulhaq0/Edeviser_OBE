// Task 87.4: Terms of Service acceptance dialog
// Shown when profile.tos_accepted_at is null — blocks usage until accepted

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface ToSAcceptanceDialogProps {
  open: boolean;
  userId: string;
  onAccepted: () => void;
}

const ToSAcceptanceDialog = ({ open, userId, onAccepted }: ToSAcceptanceDialogProps) => {
  const [checked, setChecked] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const handleAccept = async () => {
    if (!checked) return;
    setIsPending(true);

    const { error } = await supabase
      .from('profiles')
      .update({ tos_accepted_at: new Date().toISOString() })
      .eq('id', userId);

    setIsPending(false);

    if (error) {
      toast.error('Failed to accept Terms of Service. Please try again.');
      console.error('[ToSAcceptanceDialog]', error.message);
      return;
    }

    toast.success('Terms of Service accepted');
    onAccepted();
  };

  return (
    <Dialog open={open}>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Terms of Service</DialogTitle>
          <DialogDescription>
            Please review and accept our Terms of Service and Privacy Policy to continue
            using the platform.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-start gap-3 py-2">
          <Checkbox
            id="tos-checkbox"
            checked={checked}
            onCheckedChange={(v) => setChecked(v === true)}
          />
          <label htmlFor="tos-checkbox" className="text-sm text-gray-700 leading-snug cursor-pointer">
            I have read and agree to the{' '}
            <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
              Privacy Policy
            </a>
            .
          </label>
        </div>

        <DialogFooter>
          <Button
            onClick={handleAccept}
            disabled={!checked || isPending}
            className="bg-gradient-to-r from-teal-500 to-blue-600 text-white active:scale-95"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Accept
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ToSAcceptanceDialog;
