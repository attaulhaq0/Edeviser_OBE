import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
<<<<<<< Updated upstream
import { Link, useNavigate } from "react-router-dom";
import { loginSchema, type LoginFormData } from "@/lib/schemas/auth";
import { signUpSchema, type SignUpFormData } from "@/lib/schemas/signUp";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";
import {
  Loader2,
  User,
  Users,
  GraduationCap,
  Shield,
  Mail,
  Lock,
  UserCircle,
  CheckCircle2,
} from "lucide-react";
=======
import { loginSchema, type LoginFormData } from "@/lib/schemas/auth";
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
import {
  Loader2,
  Mail,
  Lock,
  GraduationCap,
  Target,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";
>>>>>>> Stashed changes

// ---------------------------------------------------------------------------
// Demo credentials for the Quick Demo Access section.
// Passwords live in .env for the E2E / seeded accounts; the UI only needs the
// emails and role labels.
// ---------------------------------------------------------------------------
const DEMO_ACCOUNTS = {
  admin: { email: "admin@demo.com" },
  coordinator: { email: "coordinator@demo.com" },
  teacher: { email: "teacher@demo.com" },
  student: { email: "student@demo.com" },
} as const;

type DemoRole = keyof typeof DEMO_ACCOUNTS;

const DEMO_PASSWORD = "Edeviser2026!";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const getRoleIcon = (role: string) => {
  switch (role) {
    case "admin":
      return <Shield className="w-4 h-4" />;
    case "coordinator":
      return <Users className="w-4 h-4" />;
    case "teacher":
      return <GraduationCap className="w-4 h-4" />;
    default:
      return <User className="w-4 h-4" />;
  }
};

const getRoleBadgeColor = (role: string) => {
  switch (role) {
    case "admin":
      return "text-red-600 bg-red-50 border-red-200";
    case "coordinator":
      return "text-purple-600 bg-purple-50 border-purple-200";
    case "teacher":
      return "text-blue-600 bg-blue-50 border-blue-200";
    case "student":
      return "text-emerald-600 bg-emerald-50 border-emerald-200";
    default:
      return "text-gray-600 bg-gray-50 border-gray-200";
  }
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
const LoginPage = () => {
  const { t } = useTranslation("auth");
<<<<<<< Updated upstream
  const { signIn, signUp } = useAuth();
=======
  const { signIn } = useAuth();
>>>>>>> Stashed changes
  const navigate = useNavigate();

  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const signUpForm = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      requestedRole: "student",
    },
  });

  const selectedRole = signUpForm.watch("requestedRole");

  // -------------------------------------------------------------------
  // handlers
  // -------------------------------------------------------------------
  const handleLogin = async (data: LoginFormData) => {
    setError(null);
    setSuccess(null);
    setIsPending(true);

    try {
      const result = await signIn(data.email, data.password);
      if (!result.success) {
        setError(result.error ?? t("login.defaultError"));
        return;
      }
      setSuccess(t("login.successMessage"));
      if (result.redirectTo) {
        navigate(result.redirectTo, { replace: true });
      }
    } catch {
      setError(t("login.genericError"));
    } finally {
      setIsPending(false);
    }
  };

  const handleSignUp = async (data: SignUpFormData) => {
    setError(null);
    setSuccess(null);
    setIsPending(true);

    try {
      const fullName = `${data.firstName} ${data.lastName}`.trim();
      const result = await signUp({
        email: data.email,
        password: data.password,
        fullName,
        username: data.username,
        requestedRole: data.requestedRole,
      });

      if (!result.success) {
        setError(result.error ?? t("signup.defaultError"));
        return;
      }

      if (result.requiresVerification) {
        setSuccess(t("signup.verificationSent"));
        signUpForm.reset();
        return;
      }

      setSuccess(t("signup.successMessage"));
      if (result.redirectTo) {
        navigate(result.redirectTo, { replace: true });
      }
    } catch {
      setError(t("signup.genericError"));
    } finally {
      setIsPending(false);
    }
  };

  const handleDemoLogin = async (role: DemoRole) => {
    setError(null);
    setSuccess(null);
    setIsPending(true);

    try {
      const { email } = DEMO_ACCOUNTS[role];
      const result = await signIn(email, DEMO_PASSWORD);
      if (!result.success) {
        setError(result.error ?? t("login.demoError"));
        return;
      }
      setSuccess(t("login.demoSuccess", { role }));
      if (result.redirectTo) {
        navigate(result.redirectTo, { replace: true });
      }
    } catch {
      setError(t("login.genericError"));
    } finally {
      setIsPending(false);
    }
  };

  // -------------------------------------------------------------------
  // render
  // -------------------------------------------------------------------
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
<<<<<<< Updated upstream

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
            <Tabs defaultValue="login" className="w-full">
              {/* Tab triggers */}
              <div className="px-6 pt-6">
                <TabsList className="grid w-full grid-cols-2 bg-gray-100/80 rounded-full p-1 h-12">
                  <TabsTrigger
                    value="login"
                    className="rounded-full data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#14b8a6] data-[state=active]:to-[#3b82f6] data-[state=active]:text-white transition-all duration-300 font-medium"
                  >
                    {t("tabs.login")}
                  </TabsTrigger>
                  <TabsTrigger
                    value="register"
                    className="rounded-full data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#14b8a6] data-[state=active]:to-[#3b82f6] data-[state=active]:text-white transition-all duration-300 font-medium"
                  >
                    {t("tabs.register")}
                  </TabsTrigger>
                </TabsList>
=======
      {/* Left panel — branding */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 text-white"
        style={{
          background:
            "linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #312e81 100%)",
        }}
      >
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold tracking-tight">Edeviser</span>
          </div>
          <p className="text-sm text-white/60">
            Outcome-Based Education Platform
          </p>
        </div>

        <div className="space-y-8">
          <h2 className="text-3xl font-bold leading-tight">
            Empowering educators.
            <br />
            Engaging students.
            <br />
            Elevating outcomes.
          </h2>
          <div className="space-y-4">
            {[
              {
                icon: Target,
                text: "OBE curriculum mapping with ILO → PLO → CLO alignment",
              },
              {
                icon: TrendingUp,
                text: "Real-time attainment tracking and analytics",
              },
              {
                icon: Sparkles,
                text: "AI-powered insights and gamified learning",
              },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-teal-300" />
                </div>
                <p className="text-sm text-white/80">{text}</p>
>>>>>>> Stashed changes
              </div>

<<<<<<< Updated upstream
              {/* Login tab */}
              <TabsContent value="login" className="space-y-4 p-6 pt-4">
                <div className="text-center space-y-1 mb-4">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {t("login.welcomeTitle")}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {t("login.welcomeSubtitle")}
                  </p>
                </div>

                <form
                  onSubmit={loginForm.handleSubmit(handleLogin)}
                  className="space-y-4"
                  noValidate
                >
                  <div className="space-y-2">
                    <Label
                      htmlFor="login-email"
                      className="text-gray-700 font-medium ms-1 flex items-center gap-2"
                    >
                      <Mail className="w-4 h-4 text-[#14b8a6]" />
                      {t("login.emailLabel")}
                    </Label>
                    <Input
                      id="login-email"
                      type="email"
                      autoComplete="email"
                      placeholder={t("login.emailPlaceholder")}
                      className="rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:border-[#14b8a6] focus:ring-[#14b8a6]/20 transition-all h-11 ps-4"
                      aria-invalid={!!loginForm.formState.errors.email}
                      {...loginForm.register("email")}
                    />
                    {loginForm.formState.errors.email && (
                      <p className="text-xs text-red-600 ms-1">
                        {loginForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label
                        htmlFor="login-password"
                        className="text-gray-700 font-medium ms-1 flex items-center gap-2"
                      >
                        <Lock className="w-4 h-4 text-[#14b8a6]" />
                        {t("login.passwordLabel")}
                      </Label>
                      <Link
                        to="/reset-password"
                        className="text-xs font-medium text-[#14b8a6] hover:text-[#0d9488] transition-colors"
                      >
                        {t("login.forgotPassword")}
                      </Link>
                    </div>
                    <Input
                      id="login-password"
                      type="password"
                      autoComplete="current-password"
                      placeholder={t("login.passwordPlaceholder")}
                      className="rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:border-[#14b8a6] focus:ring-[#14b8a6]/20 transition-all h-11 ps-4"
                      aria-invalid={!!loginForm.formState.errors.password}
                      {...loginForm.register("password")}
                    />
                    {loginForm.formState.errors.password && (
                      <p className="text-xs text-red-600 ms-1">
                        {loginForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>

=======
        <p className="text-xs text-white/40">
          © 2026 Edeviser. All rights reserved.
        </p>
      </div>

      {/* Right panel — login form */}
      <div className="flex flex-1 items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-gray-900">
              Edeviser
            </span>
          </div>

          <Card className="bg-white border border-slate-200 shadow-lg rounded-2xl">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl font-bold tracking-tight text-gray-900">
                {t("login.welcomeTitle")}
              </CardTitle>
              <CardDescription className="text-gray-500">
                {t("login.welcomeSubtitle")}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-5"
                >
                  {error && (
                    <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-600 flex items-center gap-2">
                      <div className="h-4 w-4 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                        <span className="text-red-500 text-xs font-bold">
                          !
                        </span>
                      </div>
                      {error}
                    </div>
                  )}
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-700 font-medium">
                          {t("login.emailLabel")}
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                              type="email"
                              placeholder={t("login.emailPlaceholder")}
                              className="ps-10 h-11 border-slate-300 focus:border-blue-500"
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
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel className="text-gray-700 font-medium">
                            {t("login.passwordLabel")}
                          </FormLabel>
                          <Link
                            to="/reset-password"
                            className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                          >
                            {t("login.forgotPassword")}
                          </Link>
                        </div>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                              type="password"
                              placeholder={t("login.passwordPlaceholder")}
                              className="ps-10 h-11 border-slate-300 focus:border-blue-500"
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
>>>>>>> Stashed changes
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-[#14b8a6] to-[#3b82f6] hover:from-[#0d9488] hover:to-[#2563eb] text-white font-bold h-12 rounded-xl shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transition-all duration-300 transform hover:-translate-y-0.5"
                    disabled={isPending}
                  >
                    {isPending && (
<<<<<<< Updated upstream
                      <Loader2 className="w-4 h-4 animate-spin me-2" />
=======
                      <Loader2 className="h-4 w-4 animate-spin me-2" />
>>>>>>> Stashed changes
                    )}
                    {t("login.submitButton")}
                  </Button>
                </form>

                {/* Quick Demo Access */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <span className="text-xs font-bold text-gray-500 flex items-center gap-1">
                      <span className="text-amber-500">⚡</span>
                      {t("login.demoLabel")}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.keys(DEMO_ACCOUNTS) as DemoRole[]).map((role) => (
                      <Button
                        key={role}
                        type="button"
                        variant="ghost"
                        className="h-9 rounded-full border border-gray-200 bg-transparent hover:border-[#14b8a6] hover:bg-[#14b8a6]/5 hover:text-[#14b8a6] transition-all duration-300 text-gray-600 font-medium text-xs capitalize shadow-sm"
                        onClick={() => handleDemoLogin(role)}
                        disabled={isPending}
                      >
                        {getRoleIcon(role)}
                        <span className="ms-2">{t(`roles.${role}`)}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* Register tab */}
              <TabsContent value="register" className="space-y-4 p-6 pt-4">
                <div className="text-center space-y-1 mb-4">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {t("signup.title")}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {t("signup.subtitle")}
                  </p>
                </div>

                <form
                  onSubmit={signUpForm.handleSubmit(handleSignUp)}
                  className="space-y-3"
                  noValidate
                >
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label
                        htmlFor="signup-firstName"
                        className="flex items-center gap-2 ms-1"
                      >
                        <UserCircle className="w-3.5 h-3.5 text-[#14b8a6]" />
                        {t("signup.firstName")}
                      </Label>
                      <Input
                        id="signup-firstName"
                        autoComplete="given-name"
                        placeholder={t("signup.firstNamePlaceholder")}
                        className="rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:border-[#14b8a6] focus:ring-[#14b8a6]/20 transition-all h-10 ps-4"
                        aria-invalid={!!signUpForm.formState.errors.firstName}
                        {...signUpForm.register("firstName")}
                      />
                      {signUpForm.formState.errors.firstName && (
                        <p className="text-xs text-red-600 ms-1">
                          {signUpForm.formState.errors.firstName.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label
                        htmlFor="signup-lastName"
                        className="flex items-center gap-2 ms-1"
                      >
                        <UserCircle className="w-3.5 h-3.5 text-[#14b8a6]" />
                        {t("signup.lastName")}
                      </Label>
                      <Input
                        id="signup-lastName"
                        autoComplete="family-name"
                        placeholder={t("signup.lastNamePlaceholder")}
                        className="rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:border-[#14b8a6] focus:ring-[#14b8a6]/20 transition-all h-10 ps-4"
                        aria-invalid={!!signUpForm.formState.errors.lastName}
                        {...signUpForm.register("lastName")}
                      />
                      {signUpForm.formState.errors.lastName && (
                        <p className="text-xs text-red-600 ms-1">
                          {signUpForm.formState.errors.lastName.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label
                      htmlFor="signup-username"
                      className="flex items-center gap-2 ms-1"
                    >
                      <User className="w-3.5 h-3.5 text-[#14b8a6]" />
                      {t("signup.username")}
                    </Label>
                    <Input
                      id="signup-username"
                      autoComplete="username"
                      placeholder={t("signup.usernamePlaceholder")}
                      className="rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:border-[#14b8a6] focus:ring-[#14b8a6]/20 transition-all h-10 ps-4"
                      aria-invalid={!!signUpForm.formState.errors.username}
                      {...signUpForm.register("username")}
                    />
                    {signUpForm.formState.errors.username && (
                      <p className="text-xs text-red-600 ms-1">
                        {signUpForm.formState.errors.username.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label
                      htmlFor="signup-email"
                      className="flex items-center gap-2 ms-1"
                    >
                      <Mail className="w-3.5 h-3.5 text-[#14b8a6]" />
                      {t("signup.email")}
                    </Label>
                    <Input
                      id="signup-email"
                      type="email"
                      autoComplete="email"
                      placeholder={t("signup.emailPlaceholder")}
                      className="rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:border-[#14b8a6] focus:ring-[#14b8a6]/20 transition-all h-10 ps-4"
                      aria-invalid={!!signUpForm.formState.errors.email}
                      {...signUpForm.register("email")}
                    />
                    {signUpForm.formState.errors.email && (
                      <p className="text-xs text-red-600 ms-1">
                        {signUpForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label
                        htmlFor="signup-password"
                        className="flex items-center gap-2 ms-1"
                      >
                        <Lock className="w-3.5 h-3.5 text-[#14b8a6]" />
                        {t("signup.password")}
                      </Label>
                      <Input
                        id="signup-password"
                        type="password"
                        autoComplete="new-password"
                        placeholder={t("signup.passwordPlaceholder")}
                        className="rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:border-[#14b8a6] focus:ring-[#14b8a6]/20 transition-all h-10 ps-4"
                        aria-invalid={!!signUpForm.formState.errors.password}
                        {...signUpForm.register("password")}
                      />
                      {signUpForm.formState.errors.password && (
                        <p className="text-xs text-red-600 ms-1">
                          {signUpForm.formState.errors.password.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label
                        htmlFor="signup-confirmPassword"
                        className="flex items-center gap-2 ms-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#14b8a6]" />
                        {t("signup.confirmPassword")}
                      </Label>
                      <Input
                        id="signup-confirmPassword"
                        type="password"
                        autoComplete="new-password"
                        placeholder={t("signup.confirmPasswordPlaceholder")}
                        className="rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white focus:border-[#14b8a6] focus:ring-[#14b8a6]/20 transition-all h-10 ps-4"
                        aria-invalid={
                          !!signUpForm.formState.errors.confirmPassword
                        }
                        {...signUpForm.register("confirmPassword")}
                      />
                      {signUpForm.formState.errors.confirmPassword && (
                        <p className="text-xs text-red-600 ms-1">
                          {signUpForm.formState.errors.confirmPassword.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label
                      htmlFor="signup-role"
                      className="flex items-center gap-2 ms-1"
                    >
                      <Users className="w-3.5 h-3.5 text-[#14b8a6]" />
                      {t("signup.role")} <span className="text-red-500">*</span>
                    </Label>
                    <select
                      id="signup-role"
                      aria-label={t("signup.role")}
                      className={`w-full h-10 px-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-[#14b8a6] appearance-none transition-colors ${
                        selectedRole
                          ? getRoleBadgeColor(selectedRole)
                          : "border-gray-200 bg-gray-50/50 text-gray-500"
                      }`}
                      {...signUpForm.register("requestedRole")}
                    >
                      <option
                        value="student"
                        className="text-emerald-600 font-medium"
                      >
                        {t("signup.roleStudent")}
                      </option>
                      <option
                        value="teacher"
                        className="text-blue-600 font-medium"
                      >
                        {t("signup.roleTeacher")}
                      </option>
                      <option
                        value="coordinator"
                        className="text-purple-600 font-medium"
                      >
                        {t("signup.roleCoordinator")}
                      </option>
                      <option
                        value="admin"
                        className="text-red-600 font-medium"
                      >
                        {t("signup.roleAdmin")}
                      </option>
                    </select>
                    <p className="text-[10px] text-gray-500 ms-1">
                      {t("signup.roleHint")}
                    </p>
                  </div>

                  <Button
                    type="submit"
                    className="w-full mt-2 bg-gradient-to-r from-[#14b8a6] to-[#3b82f6] hover:from-[#0d9488] hover:to-[#2563eb] text-white font-bold h-11 rounded-xl shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transition-all duration-300 transform hover:-translate-y-0.5"
                    disabled={isPending}
                  >
                    {isPending && (
                      <Loader2 className="w-4 h-4 animate-spin me-2" />
                    )}
                    {t("signup.submitButton")}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </Card>

          {/* Error / success messages */}
          {error && (
            <Alert
              variant="destructive"
              className="bg-red-50 border-red-200 text-red-800 rounded-xl"
            >
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="bg-green-50 border-green-200 text-green-800 rounded-xl">
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
