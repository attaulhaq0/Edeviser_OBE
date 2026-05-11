import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { X, MailWarning } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";

/**
 * EmailVerificationBanner (ADR-14)
 *
 * Renders an amber banner when `profile.status === 'pending_verification'`.
 * Dismissible per-session (state resets on page reload).
 */
const EmailVerificationBanner = () => {
  const { t } = useTranslation("common");
  const { user, profile } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [isSending, setIsSending] = useState(false);

  if (dismissed || profile?.status !== "pending_verification") {
    return null;
  }

  const handleResend = async () => {
    if (!user?.email) return;

    setIsSending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: user.email,
      });

      if (error) {
        console.error(
          "[EmailVerificationBanner] Resend failed:",
          error.message
        );
        toast.error(t("emailVerification.resendError"));
      } else {
        toast.success(t("emailVerification.resendSuccess"));
      }
    } catch (err) {
      console.error("[EmailVerificationBanner] Unexpected error:", err);
      toast.error(t("emailVerification.resendError"));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div
      role="alert"
      className="flex items-center gap-3 bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-amber-800"
    >
      <MailWarning
        className="h-4 w-4 shrink-0 text-amber-600"
        aria-hidden="true"
      />
      <p className="flex-1 text-sm font-medium">
        {t("emailVerification.banner")}
      </p>
      <Button
        variant="outline"
        size="sm"
        disabled={isSending}
        onClick={handleResend}
        className="shrink-0 border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 hover:text-amber-900 text-xs h-7 px-2"
      >
        {t("emailVerification.resend")}
      </Button>
      <button
        type="button"
        aria-label={t("emailVerification.dismiss")}
        onClick={() => setDismissed(true)}
        className="shrink-0 rounded p-0.5 text-amber-600 hover:bg-amber-100 hover:text-amber-800 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

export default EmailVerificationBanner;
