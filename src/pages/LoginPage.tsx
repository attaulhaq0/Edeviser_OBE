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
  Building2,
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

const SHOW_NOOR_PANEL = import.meta.env.DEV;

// Demo password is sourced from Vite env so the literal never ships in the
// production client bundle — and so a rotated password never has to be
// committed to the repo. `VITE_DEMO_PASSWORD` should only be set for
// local / staging builds that ship with seeded demo accounts. When unset,
// the Quick Demo Access panel is hidden entirely (see SHOW_DEMO_PANEL).
const DEMO_PASSWORD = import.meta.env.VITE_DEMO_PASSWORD ?? "";
const SHOW_DEMO_PANEL = DEMO_PASSWORD.length > 0;

// Noor quick-login uses the same env-sourced password — no hardcoded
// credential in committed source. Panel visibility is still DEV-only
// (SHOW_NOOR_PANEL); when VITE_DEMO_PASSWORD is unset the buttons no-op.
const NOOR_DEMO_PASSWORD = DEMO_PASSWORD;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const getRoleIcon = (role: string) => {
  switch (role) {
    case "admin":
      return <Shield className="h-4 w-4" />;
    case "coordinator":
      return <Users className="h-4 w-4" />;
    case "teacher":
      return <GraduationCap className="h-4 w-4" />;
    default:
      return <User className="h-4 w-4" />;
  }
};

// Password-strength model — mirrors the prototype (`auth.html` strength()).
// Returns the fill width, bar color and the i18n key for the helper line.
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

// Brand-accurate Google mark (kept as illustration per PARITY §B.7).
const GoogleMark = () => (
  <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden="true">
    <path
      fill="#EA4335"
      d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.6 2.4 30.1 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.3 13.2 17.7 9.5 24 9.5z"
    />
    <path
      fill="#4285F4"
      d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.1 5.3-4.6 7l7.1 5.5c4.2-3.9 6.7-9.6 6.7-16z"
    />
    <path
      fill="#FBBC05"
      d="M10.5 28.3c-.5-1.4-.8-2.9-.8-4.3s.3-3 .8-4.3l-7.9-6.1C1 16.9 0 20.3 0 24s1 7.1 2.6 10.4l7.9-6.1z"
    />
    <path
      fill="#34A853"
      d="M24 48c6.1 0 11.3-2 15-5.5l-7.1-5.5c-2 1.3-4.5 2.1-7.9 2.1-6.3 0-11.7-3.7-13.5-9.1l-7.9 6.1C6.5 42.6 14.6 48 24 48z"
    />
  </svg>
);

// Brand-accurate Microsoft mark (kept as illustration per PARITY §B.7).
const MicrosoftMark = () => (
  <svg width="16" height="16" viewBox="0 0 23 23" aria-hidden="true">
    <path fill="#F35325" d="M1 1h10v10H1z" />
    <path fill="#81BC06" d="M12 1h10v10H12z" />
    <path fill="#05A6F0" d="M1 12h10v10H1z" />
    <path fill="#FFBA08" d="M12 12h10v10H12z" />
  </svg>
);

type AuthTab = "login" | "register";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
const LoginPage = () => {
  const { t } = useTranslation("auth");
  const { signIn, signUp } = useAuth();
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
  // scorePassword() returns 0-4 and STRENGTH_STEPS has exactly 5 entries, so the
  // index is always valid; the `?? [0]` fallback satisfies noUncheckedIndexedAccess.
  const strength =
    STRENGTH_STEPS[scorePassword(signupPassword)] ?? STRENGTH_STEPS[0];

  // -------------------------------------------------------------------
  // handlers (auth logic preserved verbatim from the previous screen)
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

  // OAuth + magic-link use the EXISTING supabase client (no new backend
  // schema). If the provider/OTP is not enabled in the Supabase dashboard the
  // call surfaces an in-app error — it never fabricates a session. These are an
  // added auth surface pending provider configuration (see rebuild notes).
  const handleOAuth = async (provider: "google" | "azure") => {
    setError(null);
    setSuccess(null);
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/login` },
      });
      if (oauthError) setError(t("sso.error"));
    } catch {
      setError(t("sso.error"));
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

  // -------------------------------------------------------------------
  // render — prototype `auth.html`: split brand panel + form panel on a
  // light (#f8fafc) canvas. Light + LTR (prototype scope; PARITY §E).
  // -------------------------------------------------------------------
  return (
    <div className="relative grid min-h-[100dvh] grid-cols-1 bg-[#f8fafc] md:grid-cols-[1.1fr_1fr]">
      {/* Language switcher — top-end corner over everything */}
      <div className="absolute end-4 top-4 z-20">
        <LanguageSwitcher />
      </div>

      {/* ── BRAND / VALUE PANEL ─────────────────────────────────────────── */}
      <AuthBrandPanel />

      {/* ── FORM PANEL ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-center px-5 py-[26px] md:p-10">
        <div className="mx-auto w-full max-w-[400px] md:max-w-[380px]">
          {/* Accessible + E2E heading (visually the tabs carry the label). */}
          <h1 className="sr-only">
            {activeTab === "login" ? t("login.title") : t("signup.title")}
          </h1>

          {/* Tabs */}
          <div className="mb-5 flex rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              className="auth-tab"
              data-active={activeTab === "login"}
              onClick={() => setActiveTab("login")}
            >
              {t("tabs.login")}
            </button>
            <button
              type="button"
              className="auth-tab"
              data-active={activeTab === "register"}
              onClick={() => setActiveTab("register")}
            >
              {t("tabs.register")}
            </button>
          </div>

          {/* SSO */}
          <div className="space-y-2.5">
            <button
              type="button"
              className="sso"
              onClick={() => handleOAuth("google")}
              disabled={isPending}
            >
              <GoogleMark />
              {t("sso.google")}
            </button>
            <button
              type="button"
              className="sso"
              onClick={() => handleOAuth("azure")}
              disabled={isPending}
            >
              <MicrosoftMark />
              {t("sso.microsoft")}
            </button>
            <button
              type="button"
              className="sso"
              onClick={() => setError(t("sso.error"))}
              disabled={isPending}
            >
              <Building2 className="h-4 w-4" />
              {t("sso.institution")}
            </button>
          </div>

          {/* Divider */}
          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-[11px] font-medium text-gray-400">
              {t("sso.orWithEmail")}
            </span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          {/* ── SIGN IN FORM ──────────────────────────────────────────── */}
          {activeTab === "login" && (
            <form onSubmit={loginForm.handleSubmit(handleLogin)} noValidate>
              <label
                htmlFor="login-email"
                className="mb-1.5 block text-xs font-bold text-slate-600"
              >
                {t("login.emailLabel")}
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                className="fld"
                placeholder="you@school.edu"
                aria-invalid={!!loginForm.formState.errors.email}
                {...loginForm.register("email")}
              />
              {loginForm.formState.errors.email && (
                <p className="mt-1 text-xs text-red-600">
                  {loginForm.formState.errors.email.message}
                </p>
              )}

              <div className="mt-3 flex items-center justify-between">
                <label
                  htmlFor="login-password"
                  className="block text-xs font-bold text-slate-600"
                >
                  {t("login.passwordLabel")}
                </label>
                <Link
                  to="/reset-password"
                  className="text-[11px] font-bold text-blue-600 hover:underline"
                >
                  {t("login.forgotPassword")}
                </Link>
              </div>
              <div className="relative mt-1.5">
                <input
                  id="login-password"
                  type={showLoginPw ? "text" : "password"}
                  autoComplete="current-password"
                  className="fld pe-12"
                  placeholder="••••••••"
                  aria-invalid={!!loginForm.formState.errors.password}
                  {...loginForm.register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPw((v) => !v)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 hover:text-gray-600"
                >
                  {showLoginPw ? t("password.hide") : t("password.show")}
                </button>
              </div>
              {loginForm.formState.errors.password && (
                <p className="mt-1 text-xs text-red-600">
                  {loginForm.formState.errors.password.message}
                </p>
              )}

              <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs text-gray-600">
                <Checkbox defaultChecked className="h-4 w-4" />
                {t("login.keepSignedIn")}
              </label>

              <Button
                type="submit"
                variant="tactile"
                className="mt-4 h-12 w-full"
                disabled={isPending}
              >
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("login.submitButton")}
                <ArrowRight className="h-4 w-4" />
              </Button>

              <button
                type="button"
                onClick={handleMagicLink}
                disabled={isPending}
                className="mt-2.5 w-full py-2 text-sm font-bold text-blue-600 hover:underline disabled:opacity-60"
              >
                {t("sso.magicLink")}
              </button>
            </form>
          )}

          {/* ── CREATE ACCOUNT FORM ───────────────────────────────────── */}
          {activeTab === "register" && (
            <form onSubmit={signUpForm.handleSubmit(handleSignUp)} noValidate>
              {/* Role segment — self-registration provisions a STUDENT account
                  (the server `handle_new_user` trigger forces role='student'
                  for self-signup). Staff roles are granted by invitation, so
                  Teacher/Parent are shown for parity with the prototype but are
                  not self-selectable (avoids the misleading picker). */}
              <p className="mb-1.5 text-xs font-bold text-slate-600">
                {t("signup.role")}
              </p>
              <div className="mb-3 flex gap-1.5">
                <div className="rseg-b" data-active={true}>
                  <GraduationCap className="mx-auto h-[18px] w-[18px] text-[#0369a1]" />
                  <span className="mt-0.5 block text-[11px] font-bold text-[#0369a1]">
                    {t("roles.student")}
                  </span>
                </div>
                <button type="button" className="rseg-b" disabled>
                  <User className="mx-auto h-[18px] w-[18px] text-slate-500" />
                  <span className="mt-0.5 block text-[11px] font-bold text-slate-600">
                    {t("roles.teacher")}
                  </span>
                </button>
                <button type="button" className="rseg-b" disabled>
                  <Users className="mx-auto h-[18px] w-[18px] text-slate-500" />
                  <span className="mt-0.5 block text-[11px] font-bold text-slate-600">
                    {t("roles.parent")}
                  </span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="signup-firstName"
                    className="mb-1.5 block text-xs font-bold text-slate-600"
                  >
                    {t("signup.firstName")}
                  </label>
                  <input
                    id="signup-firstName"
                    autoComplete="given-name"
                    className="fld"
                    placeholder={t("signup.firstNamePlaceholder")}
                    aria-invalid={!!signUpForm.formState.errors.firstName}
                    {...signUpForm.register("firstName")}
                  />
                </div>
                <div>
                  <label
                    htmlFor="signup-lastName"
                    className="mb-1.5 block text-xs font-bold text-slate-600"
                  >
                    {t("signup.lastName")}
                  </label>
                  <input
                    id="signup-lastName"
                    autoComplete="family-name"
                    className="fld"
                    placeholder={t("signup.lastNamePlaceholder")}
                    aria-invalid={!!signUpForm.formState.errors.lastName}
                    {...signUpForm.register("lastName")}
                  />
                </div>
              </div>
              {(signUpForm.formState.errors.firstName ||
                signUpForm.formState.errors.lastName) && (
                <p className="mt-1 text-xs text-red-600">
                  {signUpForm.formState.errors.firstName?.message ??
                    signUpForm.formState.errors.lastName?.message}
                </p>
              )}

              <label
                htmlFor="signup-username"
                className="mb-1.5 mt-3 block text-xs font-bold text-slate-600"
              >
                {t("signup.username")}
              </label>
              <input
                id="signup-username"
                autoComplete="username"
                className="fld"
                placeholder={t("signup.usernamePlaceholder")}
                aria-invalid={!!signUpForm.formState.errors.username}
                {...signUpForm.register("username")}
              />
              {signUpForm.formState.errors.username && (
                <p className="mt-1 text-xs text-red-600">
                  {signUpForm.formState.errors.username.message}
                </p>
              )}

              <label
                htmlFor="signup-email"
                className="mb-1.5 mt-3 block text-xs font-bold text-slate-600"
              >
                {t("signup.email")}
              </label>
              <input
                id="signup-email"
                type="email"
                autoComplete="email"
                className="fld"
                placeholder={t("signup.emailPlaceholder")}
                aria-invalid={!!signUpForm.formState.errors.email}
                {...signUpForm.register("email")}
              />
              {signUpForm.formState.errors.email && (
                <p className="mt-1 text-xs text-red-600">
                  {signUpForm.formState.errors.email.message}
                </p>
              )}

              <label
                htmlFor="signup-password"
                className="mb-1.5 mt-3 block text-xs font-bold text-slate-600"
              >
                {t("signup.password")}
              </label>
              <div className="relative">
                <input
                  id="signup-password"
                  type={showSignupPw ? "text" : "password"}
                  autoComplete="new-password"
                  className="fld pe-12"
                  placeholder={t("signup.passwordPlaceholder")}
                  aria-invalid={!!signUpForm.formState.errors.password}
                  {...signUpForm.register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowSignupPw((v) => !v)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 hover:text-gray-600"
                >
                  {showSignupPw ? t("password.hide") : t("password.show")}
                </button>
              </div>
              {/* Strength meter (prototype `.strength`) */}
              <div className="auth-strength">
                <div
                  style={{ width: strength.width, background: strength.color }}
                />
              </div>
              <p
                className="mt-1 text-[11px]"
                style={{
                  color:
                    scorePassword(signupPassword) >= 3 ? "#16a34a" : "#94a3b8",
                }}
              >
                {t(`signup.${strength.key}`)}
              </p>
              {signUpForm.formState.errors.password && (
                <p className="mt-1 text-xs text-red-600">
                  {signUpForm.formState.errors.password.message}
                </p>
              )}

              <label
                htmlFor="signup-confirmPassword"
                className="mb-1.5 mt-3 block text-xs font-bold text-slate-600"
              >
                {t("signup.confirmPassword")}
              </label>
              <div className="relative">
                <input
                  id="signup-confirmPassword"
                  type={showSignupConfirm ? "text" : "password"}
                  autoComplete="new-password"
                  className="fld pe-12"
                  placeholder={t("signup.confirmPasswordPlaceholder")}
                  aria-invalid={!!signUpForm.formState.errors.confirmPassword}
                  {...signUpForm.register("confirmPassword")}
                />
                <button
                  type="button"
                  onClick={() => setShowSignupConfirm((v) => !v)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 hover:text-gray-600"
                >
                  {showSignupConfirm ? t("password.hide") : t("password.show")}
                </button>
              </div>
              {signUpForm.formState.errors.confirmPassword && (
                <p className="mt-1 text-xs text-red-600">
                  {signUpForm.formState.errors.confirmPassword.message}
                </p>
              )}

              <Button
                type="submit"
                variant="tactile"
                className="mt-4 h-12 w-full"
                disabled={isPending}
              >
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("signup.submitButton")}
                <ArrowRight className="h-4 w-4" />
              </Button>

              <p className="mt-2.5 text-center text-[11px] text-gray-400">
                {t("signup.roleHint")}
              </p>
            </form>
          )}

          {/* Swap prompt */}
          <p className="mt-5 text-center text-[12px] text-gray-500">
            {activeTab === "login" ? (
              <>
                {t("login.noAccount")}{" "}
                <button
                  type="button"
                  onClick={() => setActiveTab("register")}
                  className="font-bold text-blue-600 hover:underline"
                >
                  {t("login.createAccount")}
                </button>
              </>
            ) : (
              <>
                {t("signup.haveAccount")}{" "}
                <button
                  type="button"
                  onClick={() => setActiveTab("login")}
                  className="font-bold text-blue-600 hover:underline"
                >
                  {t("signup.signIn")}
                </button>
              </>
            )}
          </p>

          {/* Error / success */}
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

          {/* Quick Demo Access — only when VITE_DEMO_PASSWORD is set (local /
              staging). Production leaves the env var empty so this disappears. */}
          {activeTab === "login" && SHOW_DEMO_PANEL && (
            <div className="mt-4 border-t border-gray-100 pt-4">
              <div className="mb-3 flex items-center justify-center gap-2">
                <span className="flex items-center gap-1 text-xs font-bold text-gray-500">
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
                    className="h-9 rounded-full border border-gray-200 text-xs font-medium capitalize text-gray-600 shadow-sm hover:border-[#14b8a6] hover:bg-[#14b8a6]/5 hover:text-[#14b8a6]"
                    onClick={() => handleDemoLogin(role)}
                    disabled={isPending}
                  >
                    {getRoleIcon(role)}
                    <span>{t(`roles.${role}`)}</span>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Noor International demo profiles — LOCAL HOST ONLY (DEV). */}
          {activeTab === "login" && SHOW_NOOR_PANEL && (
            <div className="mt-4 border-t border-gray-100 pt-4">
              <div className="mb-3 flex items-center justify-center gap-2">
                <span className="flex items-center gap-1 text-xs font-bold text-gray-500">
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
                    className="h-9 rounded-full border border-blue-200 text-xs font-medium capitalize text-gray-600 shadow-sm hover:border-[#3b82f6] hover:bg-[#3b82f6]/5 hover:text-[#3b82f6]"
                    onClick={() => handleNoorDemoLogin(acct.email, acct.role)}
                    disabled={isPending}
                  >
                    {getRoleIcon(acct.role)}
                    <span>{acct.label}</span>
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
