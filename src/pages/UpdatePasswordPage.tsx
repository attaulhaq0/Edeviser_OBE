import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import {
  updatePasswordSchema,
  type UpdatePasswordFormData,
} from "@/lib/schemas/auth";
import { supabase } from "@/lib/supabase";
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
import { Loader2, Lock, ArrowLeft, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";

const UpdatePasswordPage = () => {
  const { t } = useTranslation("auth");
  const [isUpdated, setIsUpdated] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const form = useForm<UpdatePasswordFormData>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const onSubmit = async (data: UpdatePasswordFormData) => {
    setIsPending(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: data.password,
      });
      if (error) throw error;
      setIsUpdated(true);
      toast.success(t("updatePassword.successMessage"));
    } catch (err: unknown) {
      console.error("[UpdatePasswordPage] Password update failed:", err);
      const message =
        err instanceof Error
          ? err.message
          : t("errors.generic", { ns: "common" });
      toast.error(message);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 relative">
      <div className="absolute top-4 end-4 z-10">
        <LanguageSwitcher />
      </div>
      <Card className="bg-white border-0 shadow-md rounded-xl w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold tracking-tight">
            {isUpdated
              ? t("updatePassword.successMessage")
              : t("updatePassword.title")}
          </CardTitle>
          <CardDescription>
            {isUpdated
              ? t("updatePassword.successMessage")
              : t("updatePassword.subtitle", {
                  defaultValue: "Enter your new password below",
                })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isUpdated ? (
            <div className="space-y-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-50">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <p className="text-sm text-gray-600">
                {t("updatePassword.loginPrompt", {
                  defaultValue: "You can now log in with your new password.",
                })}
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                <ArrowLeft className="h-4 w-4" />
                {t("updatePassword.goToLogin", { defaultValue: "Go to login" })}
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
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("updatePassword.newPasswordLabel")}
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            type="password"
                            placeholder={t(
                              "updatePassword.passwordPlaceholder",
                              "Minimum 8 characters"
                            )}
                            className="ps-9"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("updatePassword.confirmPasswordLabel")}
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            type="password"
                            placeholder={t(
                              "updatePassword.confirmPlaceholder",
                              "Re-enter your password"
                            )}
                            className="ps-9"
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
                  className="w-full bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95"
                >
                  {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  {t("updatePassword.submitButton")}
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UpdatePasswordPage;
