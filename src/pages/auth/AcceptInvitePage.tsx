import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";
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
  Lock,
  User,
  Building2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

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
          .single();

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
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-[#1e293b] via-[#0f172a] to-[#020617]">
      {/* Doodle pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: "url('/doodle-background.jpg')",
          backgroundSize: "1200px",
          backgroundRepeat: "repeat",
          filter: "invert(1)",
        }}
      />

      {/* Language switcher in top-end corner */}
      <div className="absolute top-4 end-4 z-20">
        <LanguageSwitcher />
      </div>

      {/* Main container */}
      <div className="relative min-h-screen flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6 -mt-10">
          {/* Logo */}
          <div className="text-center space-y-2">
            <div className="flex justify-center items-center w-full">
              <img
                src="/edeviser-logo-final.png"
                alt="Edeviser"
                className="h-32 w-auto object-contain drop-shadow-2xl"
              />
            </div>
            <p className="text-xl font-medium text-blue-400 tracking-wide drop-shadow-md">
              {t("brand.tagline")}
            </p>
          </div>

          {/* Auth card */}
          <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-xl rounded-[2rem] overflow-hidden relative z-10 ring-1 ring-white/20">
            <div className="p-6 space-y-6">
              {/* Header */}
              <div className="text-center space-y-1">
                <h2 className="text-2xl font-bold text-gray-900">
                  {t("acceptInvite.title")}
                </h2>
                <p className="text-sm text-gray-500">
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
                  className="bg-red-50 border-red-200 text-red-800 rounded-xl"
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
                    <div className="space-y-3 p-4 rounded-lg bg-blue-50 border border-blue-200">
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
                          <p className="text-sm font-semibold text-blue-900 capitalize">
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
                          <FormLabel className="flex items-center gap-2 ms-1">
                            <User className="w-4 h-4 text-[#14b8a6]" />
                            {t("acceptInvite.fullName")}
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder={t(
                                "acceptInvite.fullNamePlaceholder"
                              )}
                              className="rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:border-[#14b8a6] focus:ring-[#14b8a6]/20 transition-all h-11 ps-4"
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
                          <FormLabel className="flex items-center gap-2 ms-1">
                            <Lock className="w-4 h-4 text-[#14b8a6]" />
                            {t("acceptInvite.password")}
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder={t(
                                "acceptInvite.passwordPlaceholder"
                              )}
                              className="rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:border-[#14b8a6] focus:ring-[#14b8a6]/20 transition-all h-11 ps-4"
                              {...field}
                            />
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
                          <FormLabel className="flex items-center gap-2 ms-1">
                            <Lock className="w-4 h-4 text-[#14b8a6]" />
                            {t("acceptInvite.confirmPassword")}
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder={t(
                                "acceptInvite.confirmPasswordPlaceholder"
                              )}
                              className="rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:border-[#14b8a6] focus:ring-[#14b8a6]/20 transition-all h-11 ps-4"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Submit button */}
                    <Button
                      type="submit"
                      className="w-full h-11 rounded-xl bg-gradient-to-r from-[#14b8a6] to-[#3b82f6] hover:from-[#0d9488] hover:to-[#2563eb] text-white font-bold mt-4"
                      disabled={isPending}
                    >
                      {isPending && (
                        <Loader2 className="w-4 h-4 animate-spin me-2" />
                      )}
                      {t("acceptInvite.acceptButton")}
                    </Button>
                  </form>
                </Form>
              ) : null}

              {/* Back to login link */}
              {!isLoading && (
                <div className="text-center pt-2">
                  <p className="text-sm text-gray-600">
                    {t("acceptInvite.haveAccount")}{" "}
                    <button
                      type="button"
                      onClick={() => navigate("/login")}
                      className="font-medium text-[#14b8a6] hover:text-[#0d9488] transition-colors"
                    >
                      {t("acceptInvite.signIn")}
                    </button>
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AcceptInvitePage;
