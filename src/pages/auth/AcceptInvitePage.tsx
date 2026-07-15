import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/design-system";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Loader2,
  Mail,
  User,
  Building2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import AuthShell from "@/components/shared/AuthShell";

interface InvitationData {
  id: string;
  email: string;
  role: string;
  institution_id: string;
  institution_name?: string;
}

const acceptInviteSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
    fullName: z
      .string()
      .min(2, "Full name must be at least 2 characters")
      .max(100, "Full name must be less than 100 characters"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type AcceptInviteFormData = z.infer<typeof acceptInviteSchema>;

const AcceptInvitePage = () => {
  const { t } = useTranslation("auth");
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { signUp } = useAuth();

  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const form = useForm<AcceptInviteFormData>({
    resolver: zodResolver(acceptInviteSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
      fullName: "",
    },
  });

  // Fetch invitation by token on mount
  useEffect(() => {
    const fetchInvitation = async () => {
      if (!token) {
        setError(t("acceptInvite.invalidToken"));
        setIsLoading(false);
        return;
      }

      try {
        const { data, error: rpcError } = await supabase.rpc(
          "get_invitation_by_token",
          {
            p_token: token,
          }
        );

        if (rpcError || !data) {
          setError(t("acceptInvite.tokenExpiredOrInvalid"));
          setIsLoading(false);
          return;
        }

        // The RPC returns an array; take the first element
        const inviteRow = Array.isArray(data) ? data[0] : data;
        if (!inviteRow) {
          setError(t("acceptInvite.tokenExpiredOrInvalid"));
          setIsLoading(false);
          return;
        }

        // Fetch institution name for display
        const { data: institution } = await supabase
          .from("institutions")
          .select("name")
          .eq("id", String(inviteRow.institution_id))
          .maybeSingle();

        setInvitation({
          id: String(inviteRow.id),
          email: String(inviteRow.email),
          role: String(inviteRow.role),
          institution_id: String(inviteRow.institution_id),
          institution_name: institution?.name,
        });
      } catch (err) {
        console.error("Error fetching invitation:", err);
        setError(t("acceptInvite.fetchError"));
      } finally {
        setIsLoading(false);
      }
    };

    fetchInvitation();
  }, [token, t]);

  const onSubmit = async (formData: AcceptInviteFormData) => {
    if (!invitation) {
      setError(t("acceptInvite.noInvitation"));
      return;
    }

    setError(null);
    setIsPending(true);

    try {
      // Sign up with the invited role
      const result = await signUp({
        email: invitation.email,
        password: formData.password,
        fullName: formData.fullName,
        institutionId: invitation.institution_id,
        requestedRole: invitation.role as
          | "admin"
          | "coordinator"
          | "teacher"
          | "student"
          | "parent",
      });

      if (!result.success) {
        setError(result.error ?? t("acceptInvite.signupError"));
        return;
      }

      // Mark invitation as used
      try {
        await supabase.rpc("consume_invitation", { p_token: token || "" });
      } catch (err) {
        console.error("Error consuming invitation:", err);
        // Don't fail the flow if consumption fails
      }

      toast.success(t("acceptInvite.successMessage"));

      if (result.requiresVerification) {
        navigate("/login");
        return;
      }

      if (result.redirectTo) {
        navigate(result.redirectTo, { replace: true });
      }
    } catch (err) {
      console.error("Accept invite error:", err);
      setError(t("acceptInvite.genericError"));
    } finally {
      setIsPending(false);
    }
  };

  return (
    <AuthShell>
      <div className="mb-5">
        <h1 className="text-lg font-black tracking-tight text-slate-900">
          {t("acceptInvite.title")}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {t("acceptInvite.subtitle")}
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        </div>
      ) : error ? (
        <Alert
          variant="destructive"
          className="rounded-xl border-red-200 bg-red-50 text-red-800"
        >
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : invitation ? (
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
            noValidate
          >
            {/* Invitation details */}
            <div className="space-y-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="text-xs font-medium text-blue-600">
                    {t("acceptInvite.email")}
                  </p>
                  <p className="text-sm font-semibold text-blue-900">
                    {invitation.email}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="text-xs font-medium text-blue-600">
                    {t("acceptInvite.institution")}
                  </p>
                  <p className="text-sm font-semibold text-blue-900">
                    {invitation.institution_name || "Loading..."}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="text-xs font-medium text-blue-600">
                    {t("acceptInvite.role")}
                  </p>
                  <p className="text-sm font-semibold capitalize text-blue-900">
                    {t(`roles.${invitation.role}`)}
                  </p>
                </div>
              </div>
            </div>

            {/* Full Name */}
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="mb-1.5 block text-xs font-bold text-slate-600">
                    {t("acceptInvite.fullName")}
                  </FormLabel>
                  <FormControl>
                    <input
                      className="fld"
                      placeholder={t("acceptInvite.fullNamePlaceholder")}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Password */}
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="mb-1.5 block text-xs font-bold text-slate-600">
                    {t("acceptInvite.password")}
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        className="fld pe-12"
                        placeholder={t("acceptInvite.passwordPlaceholder")}
                        {...field}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
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

            {/* Confirm Password */}
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="mb-1.5 block text-xs font-bold text-slate-600">
                    {t("acceptInvite.confirmPassword")}
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <input
                        type={showConfirm ? "text" : "password"}
                        autoComplete="new-password"
                        className="fld pe-12"
                        placeholder={t(
                          "acceptInvite.confirmPasswordPlaceholder"
                        )}
                        {...field}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm((v) => !v)}
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
              className="mt-4 h-11 w-full"
              disabled={isPending}
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("acceptInvite.acceptButton")}
            </Button>
          </form>
        </Form>
      ) : null}

      {/* Back to login link */}
      {!isLoading && (
        <p className="mt-5 text-center text-sm text-slate-500">
          {t("acceptInvite.haveAccount")}{" "}
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="font-bold text-blue-600 hover:underline"
          >
            {t("acceptInvite.signIn")}
          </button>
        </p>
      )}
    </AuthShell>
  );
};

export default AcceptInvitePage;
