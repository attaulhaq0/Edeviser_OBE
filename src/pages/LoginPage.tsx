import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { loginSchema, type LoginFormData } from "@/lib/schemas/auth";
import { signUpSchema, type SignUpFormData } from "@/lib/schemas/signUp";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Button, Alert, AlertDescription, Checkbox } from "@/design-system";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";
import AuthBrandPanel from "@/components/shared/AuthBrandPanel";
import {
  Loader2,
  User,
  Users,
  GraduationCap,
  Shield,
  ArrowRight,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Send,
  Sparkles,
} from "lucide-react";
import foxiSmiling from "@/design-system/mascot/assets/characters/foxi/foxi-smiling.png";

// ---------------------------------------------------------------------------
// Noor International demo profiles — LOCAL HOST ONLY.
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

const SHOW_NOOR_PANEL = import.meta.env.DEV || import.meta.env.MODE === "test";
const DEMO_PASSWORD =
  (import.meta.env.VITE_DEMO_PASSWORD ?? "").length > 0
    ? import.meta.env.VITE_DEMO_PASSWORD!
    : "CedarHarbor1745!";
const SHOW_DEMO_PANEL = DEMO_PASSWORD.length > 0;
const NOOR_DEMO_PASSWORD = DEMO_PASSWORD;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const getRoleIcon = (role: string) => {
  switch (role) {
    case "admin":
      return <Shield className="h-4 w-4 text-blue-600" />;
    case "coordinator":
      return <Users className="h-4 w-4 text-cyan-600" />;
    case "teacher":
      return <GraduationCap className="h-4 w-4 text-teal-600" />;
    case "parent":
      return <Users className="h-4 w-4 text-indigo-600" />;
    default:
      return <User className="h-4 w-4 text-sky-600" />;
  }
};

const STRENGTH_STEPS = [
  { width: "0%", color: "#eef2f6", key: "strengthHint" },
  { width: "30%", color: "#ef4444", key: "strengthWeak" },
  { width: "55%", color: "#f59e0b", key: "strengthFair" },
  { width: "80%", color: "#3b82f6", key: "strengthGood" },
  { width: "100%", color: "#22c55e", key: "strengthStrong" },
] as const;

const scorePassword = (value: string): number => {
  let score = 0;
  if (value.length >= 8) score += 1;
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;
  return Math.min(score, 4);
};

type AuthTab = "login" | "register";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
const LoginPage = () => {
  const { t } = useTranslation("auth");
  const { signIn, signOut, signUp } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<AuthTab>("login");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showLoginPw, setShowLoginPw] = useState(false);
  const [showSignupPw, setShowSignupPw] = useState(false);
  const [showSignupConfirm, setShowSignupConfirm] = useState(false);

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

  const signupPassword = signUpForm.watch("password") ?? "";
  const strength =
    STRENGTH_STEPS[scorePassword(signupPassword)] ?? STRENGTH_STEPS[0];

  // Handlers
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

  const handleNoorDemoLogin = async (email: string, role: string) => {
    setError(null);
    setSuccess(null);
    setIsPending(true);

    try {
      // 1. Sign out previous test user session to prevent stale cache
      await signOut();

      // 2. Perform real Supabase authentication
      const result = await signIn(email, NOOR_DEMO_PASSWORD);
      if (!result.success) {
        setError(
          result.error ??
            t("login.demoError", "Failed to sign into demo account.")
        );
        setIsPending(false);
        return;
      }

      setSuccess(
        t("login.successRedirect", "Signed in successfully. Redirecting...")
      );

      // 3. Explicit role dashboard routing
      const roleRoutes: Record<string, string> = {
        admin: "/admin/dashboard",
        coordinator: "/coordinator/dashboard",
        teacher: "/teacher/dashboard",
        parent: "/parent/dashboard",
        student: "/student/dashboard",
      };

      const targetRoute =
        result.redirectTo || roleRoutes[role] || `/${role}/dashboard`;
      navigate(targetRoute, { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("login.genericError");
      setError(msg);
    } finally {
      setIsPending(false);
    }
  };

  const handleMagicLink = async () => {
    const valid = await loginForm.trigger("email");
    if (!valid) return;

    setError(null);
    setSuccess(null);
    setIsPending(true);
    try {
      const email = loginForm.getValues("email");
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/login` },
      });
      if (otpError) {
        setError(t("sso.magicLinkError"));
        return;
      }
      setSuccess(t("sso.magicLinkSent"));
    } catch {
      setError(t("sso.magicLinkError"));
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="auth-page relative grid min-h-[100dvh] w-full grid-cols-1 bg-[#f3f6fc] overflow-x-clip lg:grid-cols-[1.35fr_1fr]">
      {/* ── BRAND / VALUE PANEL (LEFT) ─────────────────────────────────── */}
      <div className="order-2 lg:order-1 h-full">
        <AuthBrandPanel />
      </div>

      {/* ── AUTHENTICATION FORM PANEL (RIGHT) ──────────────────────────── */}
      <div className="relative order-1 lg:order-2 flex flex-col justify-between px-6 py-8 sm:px-10 lg:px-12 lg:py-10">
        {/* TOP RIGHT: LANGUAGE SWITCHER */}
        <div className="flex justify-end w-full mb-6">
          <LanguageSwitcher />
        </div>

        {/* CENTER AUTH CARD */}
        <div className="mx-auto w-full max-w-[500px] my-auto">
          <div className="rounded-3xl border border-slate-100/90 bg-white p-7 sm:p-9 shadow-[0_20px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl">
            {/* TABS: LOGIN / REGISTER */}
            <div className="mb-7 flex border-b border-slate-100">
              <button
                type="button"
                className={`flex-1 pb-3 text-center text-base transition-all ${
                  activeTab === "login"
                    ? "border-b-2 border-blue-600 font-extrabold text-blue-600"
                    : "font-semibold text-slate-400 hover:text-slate-600"
                }`}
                onClick={() => setActiveTab("login")}
              >
                {t("tabs.login", "Login")}
              </button>
              <button
                type="button"
                className={`flex-1 pb-3 text-center text-base transition-all ${
                  activeTab === "register"
                    ? "border-b-2 border-blue-600 font-extrabold text-blue-600"
                    : "font-semibold text-slate-400 hover:text-slate-600"
                }`}
                onClick={() => setActiveTab("register")}
              >
                {t("tabs.register", "Register")}
              </button>
            </div>

            {/* ── LOGIN FORM ───────────────────────────────────────────── */}
            {activeTab === "login" && (
              <form
                onSubmit={loginForm.handleSubmit(handleLogin)}
                noValidate
                className="space-y-4"
              >
                {/* Email Field */}
                <div>
                  <label
                    htmlFor="login-email"
                    className="mb-1.5 block text-xs font-bold text-slate-700"
                  >
                    {t("login.emailLabel", "Email Address")}
                  </label>
                  <div className="relative">
                    <Mail className="absolute start-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      id="login-email"
                      type="email"
                      autoComplete="email"
                      className="fld !ps-10 ps-10 h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                      placeholder="you@school.edu"
                      aria-invalid={!!loginForm.formState.errors.email}
                      {...loginForm.register("email")}
                    />
                  </div>
                  {loginForm.formState.errors.email && (
                    <p className="mt-1 text-xs text-red-600">
                      {loginForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                {/* Password Field */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="login-password"
                      className="block text-xs font-bold text-slate-700"
                    >
                      {t("login.passwordLabel", "Password")}
                    </label>
                    <Link
                      to="/reset-password"
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                    >
                      {t("login.forgotPassword", "Forgot password?")}
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute start-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      id="login-password"
                      type={showLoginPw ? "text" : "password"}
                      autoComplete="current-password"
                      className="fld !ps-10 !pe-11 ps-10 pe-11 h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500/20"
                      placeholder="••••••••"
                      aria-invalid={!!loginForm.formState.errors.password}
                      {...loginForm.register("password")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPw((v) => !v)}
                      className="absolute end-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showLoginPw ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {loginForm.formState.errors.password && (
                    <p className="mt-1 text-xs text-red-600">
                      {loginForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                {/* Keep Me Signed In Checkbox */}
                <div className="pt-1">
                  <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600">
                    <Checkbox defaultChecked className="h-4 w-4 rounded-md" />
                    {t("login.keepSignedIn", "Keep me signed in")}
                  </label>
                </div>

                {/* Primary Gradient Sign In Button */}
                <Button
                  type="submit"
                  className="mt-2 h-12 w-full text-white font-extrabold text-sm shadow-md transition-all duration-300 hover:opacity-95 border-0 rounded-xl flex items-center justify-center gap-2"
                  style={{
                    background:
                      "linear-gradient(90deg, #1d4ed8 0%, #0284c7 50%, #0d9488 100%)",
                  }}
                  disabled={isPending}
                >
                  {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>{t("login.submitButton", "Sign In")}</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>

                {/* Divider */}
                <div className="relative my-4 flex items-center justify-center">
                  <div className="w-full border-t border-slate-200" />
                  <span className="absolute bg-white px-3 text-xs text-slate-400">
                    or
                  </span>
                </div>

                {/* Magic Link Button */}
                <button
                  type="button"
                  onClick={handleMagicLink}
                  disabled={isPending}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white font-semibold text-xs text-blue-600 hover:bg-slate-50 transition-colors shadow-2xs"
                >
                  <Send className="h-4 w-4 text-blue-600" />
                  <span>
                    {t("sso.magicLink", "Email me a magic link instead")}
                  </span>
                </button>

                {/* Create Account Link */}
                <p className="pt-2 text-center text-xs text-slate-500">
                  Don&apos;t have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setActiveTab("register")}
                    className="font-bold text-blue-600 hover:underline"
                  >
                    Create one
                  </button>
                </p>
              </form>
            )}

            {/* ── REGISTER FORM ────────────────────────────────────────── */}
            {activeTab === "register" && (
              <form
                onSubmit={signUpForm.handleSubmit(handleSignUp)}
                noValidate
                className="space-y-3"
              >
                {/* Role selection */}
                <p className="mb-1.5 text-xs font-bold text-slate-700">
                  {t("signup.role", "Account Type")}
                </p>
                <div className="mb-3 grid grid-cols-5 gap-1.5">
                  {[
                    { id: "admin", label: "Admin", icon: Shield },
                    { id: "coordinator", label: "Coordinator", icon: Users },
                    { id: "teacher", label: "Teacher", icon: GraduationCap },
                    { id: "student", label: "Student", icon: User },
                    { id: "parent", label: "Parent", icon: Users },
                  ].map((roleItem) => {
                    const RoleIcon = roleItem.icon;
                    const isSelected =
                      (signUpForm.watch("requestedRole") ?? "student") ===
                      roleItem.id;
                    return (
                      <button
                        key={roleItem.id}
                        type="button"
                        onClick={() =>
                          signUpForm.setValue(
                            "requestedRole",
                            roleItem.id as SignUpFormData["requestedRole"]
                          )
                        }
                        className={`flex flex-col items-center justify-center gap-1 rounded-xl border p-2 text-center transition-all ${
                          isSelected
                            ? "border-blue-500 bg-blue-50/80 font-extrabold text-blue-700 shadow-xs"
                            : "border-slate-200 bg-slate-50/50 font-semibold text-slate-600 hover:border-blue-300 hover:bg-blue-50/30"
                        }`}
                      >
                        <RoleIcon
                          className={`h-4 w-4 ${
                            isSelected ? "text-blue-600" : "text-slate-400"
                          }`}
                        />
                        <span className="text-[10px] leading-none">
                          {t(`roles.${roleItem.id}`, roleItem.label)}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* First Name & Last Name */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="signup-firstName"
                      className="mb-1 block text-xs font-bold text-slate-700"
                    >
                      {t("signup.firstName", "First Name")}
                    </label>
                    <input
                      id="signup-firstName"
                      autoComplete="given-name"
                      className="fld h-10 border-slate-200"
                      placeholder={t("signup.firstNamePlaceholder", "First")}
                      {...signUpForm.register("firstName")}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="signup-lastName"
                      className="mb-1 block text-xs font-bold text-slate-700"
                    >
                      {t("signup.lastName", "Last Name")}
                    </label>
                    <input
                      id="signup-lastName"
                      autoComplete="family-name"
                      className="fld h-10 border-slate-200"
                      placeholder={t("signup.lastNamePlaceholder", "Last")}
                      {...signUpForm.register("lastName")}
                    />
                  </div>
                </div>

                {/* Username */}
                <div>
                  <label
                    htmlFor="signup-username"
                    className="mb-1 block text-xs font-bold text-slate-700"
                  >
                    {t("signup.username", "Username")}
                  </label>
                  <input
                    id="signup-username"
                    autoComplete="username"
                    className="fld h-10 border-slate-200"
                    placeholder={t("signup.usernamePlaceholder", "username")}
                    {...signUpForm.register("username")}
                  />
                </div>

                {/* Email */}
                <div>
                  <label
                    htmlFor="signup-email"
                    className="mb-1 block text-xs font-bold text-slate-700"
                  >
                    {t("signup.email", "Email Address")}
                  </label>
                  <input
                    id="signup-email"
                    type="email"
                    autoComplete="email"
                    className="fld h-10 border-slate-200"
                    placeholder={t("signup.emailPlaceholder", "you@school.edu")}
                    {...signUpForm.register("email")}
                  />
                </div>

                {/* Password & Strength */}
                <div>
                  <label
                    htmlFor="signup-password"
                    className="mb-1 block text-xs font-bold text-slate-700"
                  >
                    {t("signup.password", "Password")}
                  </label>
                  <div className="relative">
                    <input
                      id="signup-password"
                      type={showSignupPw ? "text" : "password"}
                      autoComplete="new-password"
                      className="fld h-10 pe-10 border-slate-200"
                      placeholder={t("signup.passwordPlaceholder", "••••••••")}
                      {...signUpForm.register("password")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignupPw((v) => !v)}
                      className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400"
                    >
                      {showSignupPw ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {/* Strength Bar */}
                  <div className="auth-strength mt-1.5">
                    <div
                      style={{
                        width: strength.width,
                        background: strength.color,
                      }}
                    />
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label
                    htmlFor="signup-confirmPassword"
                    className="mb-1 block text-xs font-bold text-slate-700"
                  >
                    {t("signup.confirmPassword", "Confirm Password")}
                  </label>
                  <div className="relative">
                    <input
                      id="signup-confirmPassword"
                      type={showSignupConfirm ? "text" : "password"}
                      autoComplete="new-password"
                      className="fld h-10 pe-10 border-slate-200"
                      placeholder={t(
                        "signup.confirmPasswordPlaceholder",
                        "••••••••"
                      )}
                      {...signUpForm.register("confirmPassword")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignupConfirm((v) => !v)}
                      className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400"
                    >
                      {showSignupConfirm ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Submit Register */}
                <Button
                  type="submit"
                  className="mt-3 h-11 w-full text-white font-extrabold text-sm border-0 rounded-xl flex items-center justify-center gap-2"
                  style={{
                    background:
                      "linear-gradient(90deg, #1d4ed8 0%, #0284c7 50%, #0d9488 100%)",
                  }}
                  disabled={isPending}
                >
                  {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>{t("signup.submitButton", "Create Account")}</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>

                <p className="mt-2 text-center text-xs text-slate-400 font-medium">
                  {t("signup.roleHint")}
                </p>

                <p className="pt-1 text-center text-xs text-slate-500">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setActiveTab("login")}
                    className="font-bold text-blue-600 hover:underline"
                  >
                    Sign In
                  </button>
                </p>
              </form>
            )}

            {/* ERROR & SUCCESS MESSAGES */}
            {error && (
              <Alert
                variant="destructive"
                className="mt-4 rounded-xl border-red-200 bg-red-50 text-red-800"
              >
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {success && (
              <Alert className="mt-4 rounded-xl border-green-200 bg-green-50 text-green-800">
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            {/* QUICK DEMO LOGIN SECTION */}
            {activeTab === "login" && (SHOW_DEMO_PANEL || SHOW_NOOR_PANEL) && (
              <div className="mt-6 border-t border-slate-100 pt-5">
                <div className="mb-3 flex items-center justify-center gap-1.5 text-xs font-bold text-slate-500">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                  <span>Quick Demo Login</span>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {NOOR_DEMO_ACCOUNTS.map((acct) => (
                    <button
                      key={acct.role}
                      type="button"
                      data-testid={`quick-login-${acct.role}`}
                      className="flex h-10 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 text-xs font-extrabold text-slate-700 shadow-2xs hover:border-blue-400 hover:bg-blue-50/60 hover:text-blue-700 transition-all disabled:opacity-50"
                      onClick={() => handleNoorDemoLogin(acct.email, acct.role)}
                      disabled={isPending}
                    >
                      {getRoleIcon(acct.role)}
                      <span>{acct.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM PAGE FOOTER */}
        <div className="mt-6 flex items-center justify-between text-xs text-slate-400 font-medium">
          <div className="mx-auto flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 text-slate-400" />
            <span>Secure. Private. Built for education.</span>
          </div>

          <div className="fixed bottom-4 end-4 hidden sm:block">
            <img
              src={foxiSmiling}
              alt="Mascot Badge"
              className="h-10 w-10 object-contain drop-shadow-md transition-transform hover:scale-110"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
