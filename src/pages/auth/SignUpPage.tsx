import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { signUpSchema, type SignUpFormData } from "@/lib/schemas/signUpSchema";
import { useAuth } from "@/hooks/useAuth";
import { useInstitutionBrowse } from "@/hooks/useInstitutionBrowse";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";
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
import { Loader2, Mail, Lock, User } from "lucide-react";
import { toast } from "sonner";

type SignUpStep = "institution" | "account";

const SignUpPage = () => {
  const { t } = useTranslation("auth");
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const { data: institutions, isLoading: institutionsLoading } =
    useInstitutionBrowse();

  const [step, setStep] = useState<SignUpStep>("institution");
  const [selectedInstitution, setSelectedInstitution] = useState<string | null>(
    null
  );
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // Determine if signup is allowed based on join_mode
  const canSignUp =
    currentInstitution?.join_mode === "open" ||
    currentInstitution?.join_mode === "domain_restricted";

  const handleInstitutionSelect = (institutionId: string) => {
    setSelectedInstitution(institutionId);
    form.setValue("institutionId", institutionId);
    setStep("account");
  };

  const onSubmit = async (data: SignUpFormData) => {
    if (!currentInstitution) {
      setError(t("signup.selectInstitution"));
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
                  {step === "institution"
                    ? t("signup.chooseInstitution")
                    : t("signup.createAccount")}
                </h2>
                <p className="text-sm text-gray-500">
                  {step === "institution"
                    ? t("signup.institutionSubtitle")
                    : t("signup.accountSubtitle")}
                </p>
              </div>

              {/* Step 1: Institution Selection */}
              {step === "institution" && (
                <div className="space-y-4">
                  {institutionsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                    </div>
                  ) : institutions && institutions.length > 0 ? (
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-gray-700">
                        {t("signup.selectInstitution")}
                      </label>
                      <Select
                        value={selectedInstitution || ""}
                        onValueChange={handleInstitutionSelect}
                      >
                        <SelectTrigger className="rounded-xl border-gray-200 bg-gray-50/50 h-11">
                          <SelectValue
                            placeholder={t("signup.selectInstitution")}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {institutions.map((institution) => (
                            <SelectItem
                              key={institution.id}
                              value={institution.id}
                            >
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
                    <Alert className="bg-blue-50 border-blue-200 text-blue-800">
                      <AlertDescription>
                        {currentInstitution.join_mode === "open" &&
                          t("signup.joinModeOpen")}
                        {currentInstitution.join_mode === "invite_only" &&
                          t("signup.joinModeInviteOnly")}
                        {currentInstitution.join_mode === "domain_restricted" &&
                          t("signup.joinModeDomainRestricted", {
                            domains: "",
                          })}
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
                      className="flex-1 h-11 rounded-xl"
                      onClick={() => navigate("/login")}
                    >
                      {t("signup.backToLogin")}
                    </Button>
                    <Button
                      type="button"
                      className="flex-1 h-11 rounded-xl bg-gradient-to-r from-[#14b8a6] to-[#3b82f6] hover:from-[#0d9488] hover:to-[#2563eb] text-white font-bold"
                      disabled={!canSignUp || !currentInstitution}
                    >
                      {t("signup.continue")}
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 2: Account Form */}
              {step === "account" && currentInstitution && (
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-4"
                    noValidate
                  >
                    {/* Institution display */}
                    <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 flex items-center gap-2">
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
                          <FormLabel className="flex items-center gap-2 ms-1">
                            <User className="w-4 h-4 text-[#14b8a6]" />
                            {t("signup.fullName")}
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder={t("signup.fullNamePlaceholder")}
                              className="rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:border-[#14b8a6] focus:ring-[#14b8a6]/20 transition-all h-11 ps-4"
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
                          <FormLabel className="flex items-center gap-2 ms-1">
                            <Mail className="w-4 h-4 text-[#14b8a6]" />
                            {t("signup.email")}
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder={t("signup.emailPlaceholder")}
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
                            {t("signup.password")}
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder={t("signup.passwordPlaceholder")}
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
                            {t("signup.confirmPassword")}
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder={t(
                                "signup.confirmPasswordPlaceholder"
                              )}
                              className="rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:border-[#14b8a6] focus:ring-[#14b8a6]/20 transition-all h-11 ps-4"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Email verification info for open mode */}
                    {currentInstitution.join_mode === "open" && (
                      <Alert className="bg-amber-50 border-amber-200 text-amber-800">
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
                        className="flex-1 h-11 rounded-xl"
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
                        className="flex-1 h-11 rounded-xl bg-gradient-to-r from-[#14b8a6] to-[#3b82f6] hover:from-[#0d9488] hover:to-[#2563eb] text-white font-bold"
                        disabled={isPending}
                      >
                        {isPending && (
                          <Loader2 className="w-4 h-4 animate-spin me-2" />
                        )}
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
                  className="bg-red-50 border-red-200 text-red-800 rounded-xl"
                >
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Back to login link */}
              <div className="text-center pt-2">
                <p className="text-sm text-gray-600">
                  {t("signup.haveAccount")}{" "}
                  <button
                    type="button"
                    onClick={() => navigate("/login")}
                    className="font-medium text-[#14b8a6] hover:text-[#0d9488] transition-colors"
                  >
                    {t("signup.signIn")}
                  </button>
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SignUpPage;
