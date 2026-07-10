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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Loader2, Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
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
      <Card className="w-full overflow-hidden rounded-[2rem] border-0 bg-white/95 shadow-2xl ring-1 ring-white/20 backdrop-blur-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold tracking-tight text-gray-900">
            {t("resetPassword.title")}
          </CardTitle>
          <CardDescription className="text-gray-500">
            {isSubmitted
              ? t("resetPassword.successMessage")
              : t("resetPassword.subtitle")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isSubmitted ? (
            <div className="space-y-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-50">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <p className="text-sm text-gray-600">
                {t("resetPassword.successMessage")}
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-sm font-medium text-[#14b8a6] transition-colors hover:text-[#0d9488]"
              >
                <ArrowLeft className="h-4 w-4" />
                {t("resetPassword.backToLogin")}
              </Link>
            </div>
          ) : (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 font-medium">
                        {t("resetPassword.emailLabel")}
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#14b8a6]" />
                          <Input
                            type="email"
                            placeholder="you@institution.edu"
                            className="ps-10 h-11 rounded-xl border-gray-200 bg-gray-50/50 transition-all focus:border-[#14b8a6] focus:bg-white focus:ring-[#14b8a6]/20"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  disabled={isPending}
                  className="h-12 w-full transform rounded-xl bg-gradient-to-r from-[#14b8a6] to-[#3b82f6] font-bold text-white shadow-lg shadow-blue-500/20 transition-all duration-300 hover:-translate-y-0.5 hover:from-[#0d9488] hover:to-[#2563eb] hover:shadow-blue-500/40"
                >
                  {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  {t("resetPassword.submitButton")}
                </Button>
                <div className="text-center">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-2 text-sm font-medium text-[#14b8a6] transition-colors hover:text-[#0d9488]"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    {t("resetPassword.backToLogin")}
                  </Link>
                </div>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </AuthShell>
  );
};

export default ResetPasswordPage;
