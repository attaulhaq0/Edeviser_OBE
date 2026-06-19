import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { loginSchema, type LoginFormData } from "@/lib/schemas/auth";
import { signUpSchema, type SignUpFormData } from "@/lib/schemas/signUp";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/shared/PasswordInput";
import { PasswordVisibilityGroup } from "@/components/shared/PasswordVisibilityGroup";
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

// ---------------------------------------------------------------------------
// Noor International demo profiles — LOCAL HOST ONLY.
// Rendered only when `import.meta.env.DEV` is true (i.e. `vite` dev server),
// so the block is dead-code-eliminated from production builds. One real seeded
// account per role; the student/parent pair is linked (Aarav Sharma) so the
// cross-role data tells a coherent story during an investor walkthrough.
// ---------------------------------------------------------------------------
const NOOR_DEMO_ACCOUNTS = [
  { role: "admin", email: "principal@noor-international.test", label: "Admin" },
  {
    role: "coordinator",
    email: "curriculum@noor-international.test",
    label: "Coordinator",
  },
  {
    role: "teacher",
    email: "okonkwo@noor-international.test",
    label: "Teacher",
  },
  {
    role: "student",
    email: "student01@noor-international.test",
    label: "Student",
  },
  {
    role: "parent",
    email: "parent01@noor-international.test",
    label: "Parent",
  },
] as const;

const NOOR_DEMO_PASSWORD = "DemoQatar2026!";
const SHOW_NOOR_PANEL = import.meta.env.DEV;

// Demo password is sourced from Vite env so the literal never ships in the
// production client bundle. `VITE_DEMO_PASSWORD` should only be set for
// local / staging builds that ship with seeded demo accounts. When unset,
// the Quick Demo Access panel is hidden entirely (see SHOW_DEMO_PANEL).
const DEMO_PASSWORD = import.meta.env.VITE_DEMO_PASSWORD ?? "";
const SHOW_DEMO_PANEL = DEMO_PASSWORD.length > 0;

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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
const LoginPage = () => {
  const { t } = useTranslation("auth");
  const { signIn, signUp } = useAuth();
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

  const handleNoorDemoLogin = async (email: string, role: string) => {
    setError(null);
    setSuccess(null);
    setIsPending(true);

    try {
      const result = await signIn(email, NOOR_DEMO_PASSWORD);
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
              </div>

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
                    <PasswordInput
                      id="login-password"
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

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-[#14b8a6] to-[#3b82f6] hover:from-[#0d9488] hover:to-[#2563eb] text-white font-bold h-12 rounded-xl shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transition-all duration-300 transform hover:-translate-y-0.5"
                    disabled={isPending}
                  >
                    {isPending && (
                      <Loader2 className="w-4 h-4 animate-spin me-2" />
                    )}
                    {t("login.submitButton")}
                  </Button>
                </form>

                {/* Create account link */}
                <div className="text-center pt-4 border-t border-gray-100">
                  <p className="text-sm text-gray-600">
                    {t("login.noAccount")}{" "}
                    <Link
                      to="/signup"
                      className="font-medium text-[#14b8a6] hover:text-[#0d9488] transition-colors"
                    >
                      {t("login.createAccount")}
                    </Link>
                  </p>
                </div>

                {/* Quick Demo Access — only rendered when VITE_DEMO_PASSWORD
                    is set (local / staging). Production builds leave the env
                    var empty so the panel disappears entirely. */}
                {SHOW_DEMO_PANEL && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <span className="text-xs font-bold text-gray-500 flex items-center gap-1">
                        <span className="text-amber-500">⚡</span>
                        {t("login.demoLabel")}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {(Object.keys(DEMO_ACCOUNTS) as DemoRole[]).map(
                        (role) => (
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
                        )
                      )}
                    </div>
                  </div>
                )}

                {/* Noor International demo profiles — LOCAL HOST ONLY.
                    Separate from the generic Quick Demo Access panel above.
                    Hidden in production via import.meta.env.DEV. */}
                {SHOW_NOOR_PANEL && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <span className="text-xs font-bold text-gray-500 flex items-center gap-1">
                        <span className="text-blue-500">🏫</span>
                        Quick Login
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {NOOR_DEMO_ACCOUNTS.map((acct) => (
                        <Button
                          key={acct.role}
                          type="button"
                          variant="ghost"
                          className="h-9 rounded-full border border-blue-200 bg-transparent hover:border-[#3b82f6] hover:bg-[#3b82f6]/5 hover:text-[#3b82f6] transition-all duration-300 text-gray-600 font-medium text-xs capitalize shadow-sm"
                          onClick={() =>
                            handleNoorDemoLogin(acct.email, acct.role)
                          }
                          disabled={isPending}
                        >
                          {getRoleIcon(acct.role)}
                          <span className="ms-2">{acct.label}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
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
                    <PasswordVisibilityGroup>
                      <div className="space-y-1">
                        <Label
                          htmlFor="signup-password"
                          className="flex items-center gap-2 ms-1"
                        >
                          <Lock className="w-3.5 h-3.5 text-[#14b8a6]" />
                          {t("signup.password")}
                        </Label>
                        <PasswordInput
                          id="signup-password"
                          groupId="signup-password"
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
                        <PasswordInput
                          id="signup-confirmPassword"
                          groupId="signup-confirmPassword"
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
                            {
                              signUpForm.formState.errors.confirmPassword
                                .message
                            }
                          </p>
                        )}
                      </div>
                    </PasswordVisibilityGroup>
                  </div>

                  {/* Self-registration always provisions a STUDENT account.
                      The server `handle_new_user` trigger forces role='student'
                      for self-signup (no invitation_id) regardless of any
                      requested role, so we no longer expose a role picker that
                      the backend would silently ignore — that was misleading
                      (a user could pick "Admin" and quietly get a student
                      account). Staff roles are granted via invitation
                      (/accept-invite). Mirrors SignUpPage.tsx. The form's
                      requestedRole default stays "student", so the submit
                      payload is unchanged. (Production Bug Fixes — Req 5) */}
                  <div className="space-y-1">
                    <Label className="flex items-center gap-2 ms-1">
                      <Users className="w-3.5 h-3.5 text-[#14b8a6]" />
                      {t("signup.role")}
                    </Label>
                    <div className="flex items-center gap-2 w-full h-10 px-3 rounded-xl border border-gray-200 bg-gray-50/50 text-sm font-medium text-gray-700">
                      <GraduationCap className="w-4 h-4 text-[#14b8a6]" />
                      {t("roles.student")}
                    </div>
                    <p className="text-xs text-gray-500 ms-1">
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
