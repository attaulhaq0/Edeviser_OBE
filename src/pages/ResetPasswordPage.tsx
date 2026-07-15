import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import {
  resetPasswordSchema,
  type ResetPasswordFormData,
} from "@/lib/schemas/auth";
import { useAuth } from "@/hooks/useAuth";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/design-system";
import { Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import AuthShell from "@/components/shared/AuthShell";

const ResetPasswordPage = () => {
  const { t } = useTranslation("auth");
  const { resetPassword } = useAuth();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    setIsPending(true);
    try {
      await resetPassword(data.email);
      setIsSubmitted(true);
    } catch {
      // Show generic success message even on error to prevent email enumeration
      setIsSubmitted(true);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <AuthShell>
      <div className="mb-5">
        <h1 className="text-lg font-black tracking-tight text-slate-900">
          {t("resetPassword.title")}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {isSubmitted
            ? t("resetPassword.successMessage")
            : t("resetPassword.subtitle")}
        </p>
      </div>

      {isSubmitted ? (
        <div className="space-y-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-50">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
          </div>
          <p className="text-sm text-slate-600">
            {t("resetPassword.successMessage")}
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-sm font-bold text-blue-600 hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("resetPassword.backToLogin")}
          </Link>
        </div>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="mb-1.5 block text-xs font-bold text-slate-600">
                    {t("resetPassword.emailLabel")}
                  </FormLabel>
                  <FormControl>
                    <input
                      type="email"
                      className="fld"
                      placeholder="you@institution.edu"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              variant="tactile"
              disabled={isPending}
              className="h-12 w-full"
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("resetPassword.submitButton")}
            </Button>
            <div className="text-center">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-sm font-bold text-blue-600 hover:underline"
              >
                <ArrowLeft className="h-4 w-4" />
                {t("resetPassword.backToLogin")}
              </Link>
            </div>
          </form>
        </Form>
      )}
    </AuthShell>
  );
};

export default ResetPasswordPage;
