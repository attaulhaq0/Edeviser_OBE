import { useReducer, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import {
  updatePasswordSchema,
  type UpdatePasswordFormData,
} from "@/lib/schemas/auth";
import {
  passwordVisibilityReducer,
  initialPasswordVisibilityState,
  isFieldRevealed,
} from "@/lib/passwordVisibility";
import { supabase } from "@/lib/supabase";
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
import { toast } from "sonner";
import { Link } from "react-router-dom";
import AuthShell from "@/components/shared/AuthShell";

const UpdatePasswordPage = () => {
  const { t } = useTranslation("auth");
  const [isUpdated, setIsUpdated] = useState(false);
  const [isPending, setIsPending] = useState(false);
  // R5.5: at most one password field revealed at a time. Reuse the pure
  // mutual-exclusion reducer (src/lib/passwordVisibility.ts) instead of two
  // independent booleans, so revealing one field masks the other.
  const [visibility, dispatchVisibility] = useReducer(
    passwordVisibilityReducer,
    initialPasswordVisibilityState
  );
  const showPassword = isFieldRevealed(visibility, "new-password");
  const showConfirm = isFieldRevealed(visibility, "confirm-password");
  const toggleField = (id: string, revealed: boolean) =>
    dispatchVisibility({ type: revealed ? "hide" : "reveal", id });

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
    <AuthShell>
      <div className="mb-5">
        <h1 className="text-lg font-black tracking-tight text-slate-900">
          {isUpdated
            ? t("updatePassword.successMessage")
            : t("updatePassword.title")}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {isUpdated
            ? t("updatePassword.loginPrompt", {
                defaultValue: "You can now log in with your new password.",
              })
            : t("updatePassword.subtitle", {
                defaultValue: "Enter your new password below",
              })}
        </p>
      </div>

      {isUpdated ? (
        <div className="space-y-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-50">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
          </div>
          <p className="text-sm text-slate-600">
            {t("updatePassword.loginPrompt", {
              defaultValue: "You can now log in with your new password.",
            })}
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-sm font-bold text-blue-600 hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("updatePassword.goToLogin", { defaultValue: "Go to login" })}
          </Link>
        </div>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="mb-1.5 block text-xs font-bold text-slate-600">
                    {t("updatePassword.newPasswordLabel")}
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        className="fld pe-12"
                        placeholder={t(
                          "updatePassword.passwordPlaceholder",
                          "Minimum 8 characters"
                        )}
                        {...field}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          toggleField("new-password", showPassword)
                        }
                        className="absolute end-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? t("password.hide") : t("password.show")}
                      </button>
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
                  <FormLabel className="mb-1.5 block text-xs font-bold text-slate-600">
                    {t("updatePassword.confirmPasswordLabel")}
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <input
                        type={showConfirm ? "text" : "password"}
                        autoComplete="new-password"
                        className="fld pe-12"
                        placeholder={t(
                          "updatePassword.confirmPlaceholder",
                          "Re-enter your password"
                        )}
                        {...field}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          toggleField("confirm-password", showConfirm)
                        }
                        className="absolute end-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 hover:text-gray-600"
                      >
                        {showConfirm ? t("password.hide") : t("password.show")}
                      </button>
                    </div>
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
              {t("updatePassword.submitButton")}
            </Button>
          </form>
        </Form>
      )}
    </AuthShell>
  );
};

export default UpdatePasswordPage;
