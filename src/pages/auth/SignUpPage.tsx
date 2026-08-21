import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { signUpSchema, type SignUpFormData } from "@/lib/schemas/signUpSchema";
import { useAuth } from "@/hooks/useAuth";
import { useInstitutionBrowse } from "@/hooks/useInstitutionBrowse";
import { Button } from "@/design-system";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import AuthShell from "@/components/shared/AuthShell";

type SignUpStep = "institution" | "account";

const SignUpPage = () => {
  const { t } = useTranslation("auth");
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const { data: institutions, isLoading: institutionsLoading, error: institutionsError } =
    useInstitutionBrowse();

  const [step, setStep] = useState<SignUpStep>("institution");
  const [selectedInstitution, setSelectedInstitution] = useState<string | null>(
    null
  );
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const form = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      fullName: "",
      institutionId: "",
    },
  });

  // Get the selected institution details
  const currentInstitution = institutions?.find(
    (i) => i.id === selectedInstitution
  );

  const resolvedStep = currentInstitution ? step : "institution";

  // Determine if signup is allowed based on join_mode
  const canSignUp =
    currentInstitution?.join_mode === "open" ||
    currentInstitution?.join_mode === "domain_restricted";

  const handleInstitutionSelect = (institutionId: string) => {
    const institution = institutions?.find((item) => item.id === institutionId);
    if (!institution || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(institution.id)) {
      setSelectedInstitution(null);
      form.setValue("institutionId", "");
      setStep("institution");
      return;
    }
    setSelectedInstitution(institution.id);
    form.setValue("institutionId", institution.id, { shouldValidate: true });
    setStep("account");
  };

  const onSubmit = async (data: SignUpFormData) => {
    if (!currentInstitution || data.institutionId !== currentInstitution.id) {
      setError(t("signup.selectInstitution"));
      return;
    }

    if (currentInstitution.join_mode === "invite_only") {
      setError(t("signup.inviteOnlyWarning"));
      return;
    }

    setError(null);
    setIsPending(true);

    try {
      const result = await signUp({
        email: data.email,
        password: data.password,
        fullName: data.fullName,
        institutionId: data.institutionId,
        requestedRole: "student",
      });

      if (!result.success) {
        setError(result.error ?? t("signup.defaultError"));
        return;
      }

      if (result.requiresVerification) {
        toast.success(t("signup.verificationSent"));
        navigate("/login");
        return;
      }

      toast.success(t("signup.successMessage"));
      if (result.redirectTo) {
        navigate(result.redirectTo, { replace: true });
      }
    } catch (err) {
      setError(t("signup.genericError"));
      console.error("Signup error:", err);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <AuthShell>
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-lg font-black tracking-tight text-slate-900">
          {resolvedStep === "institution"
            ? t("signup.chooseInstitution")
            : t("signup.createAccount")}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {step === "institution"
            ? t("signup.institutionSubtitle")
            : t("signup.accountSubtitle")}
        </p>
      </div>

      {/* Step 1: Institution Selection */}
      {resolvedStep === "institution" && (
        <div className="space-y-4">
          {institutionsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            </div>
          ) : institutionsError ? (
            <Alert variant="destructive">
              <AlertDescription>{t("signup.noInstitutionsAvailable")}</AlertDescription>
            </Alert>
          ) : institutions && institutions.length > 0 ? (
            <div className="space-y-2">
              <label className="mb-1.5 block text-xs font-bold text-slate-600">
                {t("signup.selectInstitution")}
              </label>
              <Select
                value={selectedInstitution || ""}
                onValueChange={handleInstitutionSelect}
              >
                <SelectTrigger className="h-11 rounded-xl border-slate-200">
                  <SelectValue placeholder={t("signup.selectInstitution")} />
                </SelectTrigger>
                <SelectContent>
                  {institutions.map((institution) => (
                    <SelectItem key={institution.id} value={institution.id}>
                      <div className="flex items-center gap-2">
                        {institution.logo_url && (
                          <img
                            src={institution.logo_url}
                            alt={institution.name}
                            className="h-4 w-4 object-contain"
                          />
                        )}
                        <span>{institution.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <Alert variant="destructive">
              <AlertDescription>
                {t("signup.noInstitutionsAvailable")}
              </AlertDescription>
            </Alert>
          )}

          {/* Join mode info */}
          {currentInstitution && (
            <Alert className="border-blue-200 bg-blue-50 text-blue-800">
              <AlertDescription>
                {currentInstitution.join_mode === "open" &&
                  t("signup.joinModeOpen")}
                {currentInstitution.join_mode === "invite_only" &&
                  t("signup.joinModeInviteOnly")}
                {currentInstitution.join_mode === "domain_restricted" &&
                  t("signup.joinModeDomainRestricted", { domains: "" })}
              </AlertDescription>
            </Alert>
          )}

          {/* Invite-only warning */}
          {currentInstitution?.join_mode === "invite_only" && (
            <Alert variant="destructive">
              <AlertDescription>
                {t("signup.inviteOnlyWarning")}
              </AlertDescription>
            </Alert>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="h-11 flex-1 rounded-xl"
              onClick={() => navigate("/login")}
            >
              {t("signup.backToLogin")}
            </Button>
            <Button
              type="button"
              variant="tactile"
              className="h-11 flex-1"
              disabled={!canSignUp || !currentInstitution}
              onClick={() => {
                if (currentInstitution) setStep("account");
              }}
            >
              {t("signup.continue")}
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Account Form */}
      {resolvedStep === "account" && currentInstitution && (
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
            noValidate
          >
            {/* Institution display */}
            <div className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 p-3">
              {currentInstitution.logo_url && (
                <img
                  src={currentInstitution.logo_url}
                  alt={currentInstitution.name}
                  className="h-5 w-5 object-contain"
                />
              )}
              <span className="text-sm font-medium text-blue-900">
                {currentInstitution.name}
              </span>
            </div>

            {/* Full Name */}
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="mb-1.5 block text-xs font-bold text-slate-600">
                    {t("signup.fullName")}
                  </FormLabel>
                  <FormControl>
                    <input
                      className="fld"
                      placeholder={t("signup.fullNamePlaceholder")}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Email */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="mb-1.5 block text-xs font-bold text-slate-600">
                    {t("signup.email")}
                  </FormLabel>
                  <FormControl>
                    <input
                      type="email"
                      className="fld"
                      placeholder={t("signup.emailPlaceholder")}
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
                    {t("signup.password")}
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        className="fld pe-12"
                        placeholder={t("signup.passwordPlaceholder")}
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
                    {t("signup.confirmPassword")}
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <input
                        type={showConfirm ? "text" : "password"}
                        autoComplete="new-password"
                        className="fld pe-12"
                        placeholder={t("signup.confirmPasswordPlaceholder")}
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

            {/* Email verification info for open mode */}
            {currentInstitution.join_mode === "open" && (
              <Alert className="border-amber-200 bg-amber-50 text-amber-800">
                <AlertDescription className="text-sm">
                  {t("signup.emailVerificationRequired")}
                </AlertDescription>
              </Alert>
            )}

            {/* Action buttons */}
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="h-11 flex-1 rounded-xl"
                onClick={() => {
                  setStep("institution");
                  setSelectedInstitution(null);
                  form.reset();
                }}
              >
                {t("signup.back")}
              </Button>
              <Button
                type="submit"
                variant="tactile"
                className="h-11 flex-1"
                disabled={isPending}
              >
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("signup.createAccount")}
              </Button>
            </div>
          </form>
        </Form>
      )}

      {/* Error message */}
      {error && (
        <Alert
          variant="destructive"
          className="mt-4 rounded-xl border-red-200 bg-red-50 text-red-800"
        >
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Back to login link */}
      <p className="mt-5 text-center text-sm text-slate-500">
        {t("signup.haveAccount")}{" "}
        <button
          type="button"
          onClick={() => navigate("/login")}
          className="font-bold text-blue-600 hover:underline"
        >
          {t("signup.signIn")}
        </button>
      </p>
    </AuthShell>
  );
};

export default SignUpPage;
