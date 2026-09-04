import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { loginSchema, type LoginFormData } from "@/lib/schemas/auth";
import { signUpSchema, type SignUpFormData } from "@/lib/schemas/signUp";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import {
  Alert,
  AlertDescription,
  Button,
  Checkbox,
  Input,
  Label,
} from "@/design-system";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";
import {
  BrandLogo,
  FeedbackLoop,
  FeatureTimeline,
  HeroCopy,
  MascotScene,
} from "@/features/auth/landing/AuthLandingVisuals";
import {
  AUTH_LANDING_COPY,
  type AuthLandingLanguage,
} from "@/features/auth/landing/content";
import "@/features/auth/landing/AuthLanding.css";
import {
  Loader2,
  User,
  Users,
  GraduationCap,
  Shield,
  ArrowRight,
  ArrowLeft,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Send,
  Sparkles,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Noor International demo profiles — LOCAL HOST ONLY.
// ---------------------------------------------------------------------------
const NOOR_DEMO_ACCOUNTS = [
  { role: "admin", email: "principal@noor-international.edu", label: "Admin" },
  {
    role: "coordinator",
    email: "curriculum@noor-international.edu",
    label: "Coordinator",
  },
  {
    role: "teacher",
    email: "okonkwo@noor-international.edu",
    label: "Teacher",
  },
  {
    role: "student",
    email: "student01@noor-international.edu",
    label: "Student",
  },
  {
    role: "parent",
    email: "parent01@noor-international.edu",
    label: "Parent",
  },
] as const;

const IS_LOCAL_AUTH_HOST =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1");

const NOOR_DEMO_PASSWORD = import.meta.env.VITE_DEMO_PASSWORD?.trim() ?? "";

const SHOW_LOCAL_QUICK_LOGIN =
  IS_LOCAL_AUTH_HOST && NOOR_DEMO_PASSWORD.length > 0;

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
  const { t, i18n } = useTranslation("auth");
  const { signIn, signOut, signUp } = useAuth();
  const queryClient = useQueryClient();
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
  const language: AuthLandingLanguage =
    (i18n.resolvedLanguage ?? i18n.language).split("-")[0] === "ar"
      ? "ar"
      : "en";
  const landingCopy = AUTH_LANDING_COPY[language];

  useEffect(() => {
    document.documentElement.lang = landingCopy.lang;
    document.documentElement.dir = landingCopy.dir;
  }, [landingCopy.dir, landingCopy.lang]);

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
      // 1. Flush cached TanStack Query state & sign out previous test user session
      queryClient.clear();
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

      // 3. Refresh session & verify authenticated user identity
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.user) {
        await signOut();
        setError(
          t(
            "login.sessionError",
            "Unable to establish secure authenticated session."
          )
        );
        setIsPending(false);
        return;
      }

      const userId = session.user.id;

      // 4. Verify profile in Supabase (institution, role match, active status, user ID match)
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, role, institution_id, status")
        .eq("id", userId)
        .single();

      if (profileError || !profile) {
        await signOut();
        setError(
          t(
            "login.profileNotFound",
            "Noor International profile not found for this account in Supabase."
          )
        );
        setIsPending(false);
        return;
      }

      if (profile.id !== userId) {
        await signOut();
        setError(
          t(
            "login.identityMismatch",
            "Authenticated user ID does not match profile ID."
          )
        );
        setIsPending(false);
        return;
      }

      if (profile.role !== role) {
        await signOut();
        setError(
          t(
            "login.roleMismatch",
            `Account role (${profile.role}) does not match requested Quick Login role (${role}).`
          )
        );
        setIsPending(false);
        return;
      }

      if (profile.status === "inactive") {
        await signOut();
        setError(
          t("login.accountInactive", "Account is inactive. Access denied.")
        );
        setIsPending(false);
        return;
      }

      // 5. Role-specific Supabase verifications
      if (role === "parent") {
        const { count, error: parentLinkErr } = await supabase
          .from("parent_student_links")
          .select("*", { count: "exact", head: true })
          .eq("parent_id", userId)
          .eq("verified", true);

        if (parentLinkErr || (count ?? 0) === 0) {
          await signOut();
          setError(
            t(
              "login.noVerifiedChild",
              "Parent account has no verified Noor child links in Supabase."
            )
          );
          setIsPending(false);
          return;
        }
      } else if (role === "teacher") {
        const { count, error: teacherCourseErr } = await supabase
          .from("courses")
          .select("*", { count: "exact", head: true })
          .eq("teacher_id", userId);

        if (teacherCourseErr || (count ?? 0) === 0) {
          await signOut();
          setError(
            t(
              "login.noAssignedCourses",
              "Teacher account has no assigned Noor courses or sections in Supabase."
            )
          );
          setIsPending(false);
          return;
        }
      } else if (role === "coordinator") {
        const { count, error: coordProgErr } = await supabase
          .from("programs")
          .select("*", { count: "exact", head: true })
          .eq("coordinator_id", userId);

        if (coordProgErr || (count ?? 0) === 0) {
          await signOut();
          setError(
            t(
              "login.noProgramAccess",
              "Coordinator account has no authorized Noor program access in Supabase."
            )
          );
          setIsPending(false);
          return;
        }
      } else if (role === "admin") {
        if (!profile.institution_id) {
          await signOut();
          setError(
            t(
              "login.noInstitutionAccess",
              "Admin account does not belong to Noor International School."
            )
          );
          setIsPending(false);
          return;
        }
      }

      setSuccess(
        t("login.successRedirect", "Signed in successfully. Redirecting...")
      );

      // 6. Explicit role dashboard routing
      const roleRoutes: Record<string, string> = {
        admin: "/admin/dashboard",
        coordinator: "/coordinator/dashboard",
        teacher: "/teacher/dashboard",
        parent: "/parent/dashboard",
        student: "/student/dashboard",
      };

      const targetRoute = roleRoutes[role] || `/${role}/dashboard`;
      navigate(targetRoute, { replace: true });
    } catch (err: unknown) {
      await signOut();
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
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
          shouldCreateUser: false,
        },
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

  const DirectionArrow = language === "ar" ? ArrowLeft : ArrowRight;

  return (
    <div className="auth-landing" dir={landingCopy.dir} lang={landingCopy.lang}>
      <header className="auth-landing-header">
        <BrandLogo language={language} />
        <div className="auth-language-control">
          <LanguageSwitcher />
        </div>
      </header>

      <div className="auth-landing-main">
        <div className="auth-copy-column">
          <HeroCopy language={language} />
          <FeatureTimeline language={language} />
        </div>

        <div className="auth-visual-column">
          <FeedbackLoop language={language} />
          <MascotScene language={language} />
        </div>

        <section className="auth-form-column" aria-label={t("login.title")}>
          <div className="auth-card">
            <div className="auth-card-inner">
              <div
                className="auth-tabs"
                role="group"
                aria-label="Authentication"
              >
                <Button
                  type="button"
                  variant="ghost"
                  className="auth-tab-button"
                  data-active={activeTab === "login"}
                  aria-pressed={activeTab === "login"}
                  onClick={() => setActiveTab("login")}
                >
                  {t("tabs.login", "Login")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="auth-tab-button"
                  data-active={activeTab === "register"}
                  aria-pressed={activeTab === "register"}
                  onClick={() => setActiveTab("register")}
                >
                  {t("tabs.register", "Register")}
                </Button>
              </div>

              {activeTab === "login" && (
                <form
                  className="auth-form"
                  onSubmit={loginForm.handleSubmit(handleLogin)}
                  noValidate
                >
                  <div className="auth-field-group">
                    <Label className="auth-field-label" htmlFor="login-email">
                      {t("login.emailLabel", "Email Address")}
                    </Label>
                    <div className="auth-input-wrap">
                      <Mail className="auth-field-icon" aria-hidden="true" />
                      <Input
                        id="login-email"
                        type="email"
                        autoComplete="email"
                        className="auth-field-input"
                        placeholder="you@school.edu"
                        aria-invalid={Boolean(loginForm.formState.errors.email)}
                        aria-describedby={
                          loginForm.formState.errors.email
                            ? "login-email-error"
                            : undefined
                        }
                        {...loginForm.register("email")}
                      />
                    </div>
                    {loginForm.formState.errors.email && (
                      <p className="auth-field-error" id="login-email-error">
                        {loginForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  <div className="auth-field-group">
                    <div className="auth-label-row">
                      <Label
                        className="auth-field-label"
                        htmlFor="login-password"
                      >
                        {t("login.passwordLabel", "Password")}
                      </Label>
                      <Link className="auth-forgot-link" to="/reset-password">
                        {t("login.forgotPassword", "Forgot password?")}
                      </Link>
                    </div>
                    <div className="auth-input-wrap">
                      <Lock className="auth-field-icon" aria-hidden="true" />
                      <Input
                        id="login-password"
                        type={showLoginPw ? "text" : "password"}
                        autoComplete="current-password"
                        className="auth-field-input"
                        placeholder="••••••••"
                        aria-invalid={Boolean(
                          loginForm.formState.errors.password
                        )}
                        aria-describedby={
                          loginForm.formState.errors.password
                            ? "login-password-error"
                            : undefined
                        }
                        {...loginForm.register("password")}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="auth-password-toggle"
                        aria-label={t(
                          showLoginPw ? "password.hide" : "password.show"
                        )}
                        onClick={() => setShowLoginPw((visible) => !visible)}
                      >
                        {showLoginPw ? <EyeOff /> : <Eye />}
                      </Button>
                    </div>
                    {loginForm.formState.errors.password && (
                      <p className="auth-field-error" id="login-password-error">
                        {loginForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>

                  <label className="auth-remember">
                    <Checkbox
                      defaultChecked
                      aria-label={t("login.keepSignedIn")}
                    />
                    <span>{t("login.keepSignedIn", "Keep me signed in")}</span>
                  </label>

                  <Button
                    type="submit"
                    className="auth-primary-button"
                    disabled={isPending}
                  >
                    {isPending && <Loader2 className="animate-spin" />}
                    <span>{t("login.submitButton", "Sign In")}</span>
                    <DirectionArrow aria-hidden="true" />
                  </Button>

                  <div className="auth-divider">
                    {language === "ar" ? "أو" : "or"}
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="auth-secondary-button"
                    disabled={isPending}
                    onClick={handleMagicLink}
                  >
                    <Send aria-hidden="true" />
                    <span>{t("sso.magicLink")}</span>
                  </Button>

                  <p className="auth-account-prompt">
                    {t("login.noAccount")}{" "}
                    <button
                      type="button"
                      onClick={() => setActiveTab("register")}
                    >
                      {t("login.createAccount")}
                    </button>
                  </p>
                </form>
              )}

              {activeTab === "register" && (
                <form
                  className="auth-form auth-signup-form"
                  onSubmit={signUpForm.handleSubmit(handleSignUp)}
                  noValidate
                >
                  <Label className="auth-field-label">
                    {t("signup.role", "Account Type")}
                  </Label>
                  <div className="auth-student-role">
                    <User aria-hidden="true" />
                    <span>{t("roles.student", "Student")}</span>
                  </div>

                  <div className="auth-signup-grid">
                    <div className="auth-field-group">
                      <Label
                        className="auth-field-label"
                        htmlFor="signup-firstName"
                      >
                        {t("signup.firstName")}
                      </Label>
                      <Input
                        id="signup-firstName"
                        autoComplete="given-name"
                        className="auth-field-input ps-3! pe-3!"
                        placeholder={t("signup.firstNamePlaceholder", "First")}
                        aria-invalid={Boolean(
                          signUpForm.formState.errors.firstName
                        )}
                        {...signUpForm.register("firstName")}
                      />
                      {signUpForm.formState.errors.firstName && (
                        <p className="auth-field-error">
                          {signUpForm.formState.errors.firstName.message}
                        </p>
                      )}
                    </div>
                    <div className="auth-field-group">
                      <Label
                        className="auth-field-label"
                        htmlFor="signup-lastName"
                      >
                        {t("signup.lastName")}
                      </Label>
                      <Input
                        id="signup-lastName"
                        autoComplete="family-name"
                        className="auth-field-input ps-3! pe-3!"
                        placeholder={t("signup.lastNamePlaceholder", "Last")}
                        aria-invalid={Boolean(
                          signUpForm.formState.errors.lastName
                        )}
                        {...signUpForm.register("lastName")}
                      />
                    </div>
                  </div>

                  <div className="auth-field-group">
                    <Label
                      className="auth-field-label"
                      htmlFor="signup-username"
                    >
                      {t("signup.username")}
                    </Label>
                    <Input
                      id="signup-username"
                      autoComplete="username"
                      className="auth-field-input ps-3! pe-3!"
                      placeholder={t("signup.usernamePlaceholder", "Username")}
                      aria-invalid={Boolean(
                        signUpForm.formState.errors.username
                      )}
                      {...signUpForm.register("username")}
                    />
                  </div>

                  <div className="auth-field-group">
                    <Label className="auth-field-label" htmlFor="signup-email">
                      {t("signup.email")}
                    </Label>
                    <Input
                      id="signup-email"
                      type="email"
                      autoComplete="email"
                      className="auth-field-input ps-3! pe-3!"
                      placeholder={t(
                        "signup.emailPlaceholder",
                        "you@school.edu"
                      )}
                      aria-invalid={Boolean(signUpForm.formState.errors.email)}
                      {...signUpForm.register("email")}
                    />
                  </div>

                  <div className="auth-field-group">
                    <Label
                      className="auth-field-label"
                      htmlFor="signup-password"
                    >
                      {t("signup.password")}
                    </Label>
                    <div className="auth-input-wrap">
                      <Input
                        id="signup-password"
                        type={showSignupPw ? "text" : "password"}
                        autoComplete="new-password"
                        className="auth-field-input ps-3!"
                        placeholder={t(
                          "signup.passwordPlaceholder",
                          "••••••••"
                        )}
                        aria-invalid={Boolean(
                          signUpForm.formState.errors.password
                        )}
                        {...signUpForm.register("password")}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="auth-password-toggle"
                        aria-label={t(
                          showSignupPw ? "password.hide" : "password.show"
                        )}
                        onClick={() => setShowSignupPw((visible) => !visible)}
                      >
                        {showSignupPw ? <EyeOff /> : <Eye />}
                      </Button>
                    </div>
                    <div className="auth-strength-meter" aria-hidden="true">
                      <div
                        style={{
                          width: strength.width,
                          background: strength.color,
                        }}
                      />
                    </div>
                  </div>

                  <div className="auth-field-group">
                    <Label
                      className="auth-field-label"
                      htmlFor="signup-confirmPassword"
                    >
                      {t("signup.confirmPassword")}
                    </Label>
                    <div className="auth-input-wrap">
                      <Input
                        id="signup-confirmPassword"
                        type={showSignupConfirm ? "text" : "password"}
                        autoComplete="new-password"
                        className="auth-field-input ps-3!"
                        placeholder={t(
                          "signup.confirmPasswordPlaceholder",
                          "••••••••"
                        )}
                        aria-invalid={Boolean(
                          signUpForm.formState.errors.confirmPassword
                        )}
                        {...signUpForm.register("confirmPassword")}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="auth-password-toggle"
                        aria-label={t(
                          showSignupConfirm ? "password.hide" : "password.show"
                        )}
                        onClick={() =>
                          setShowSignupConfirm((visible) => !visible)
                        }
                      >
                        {showSignupConfirm ? <EyeOff /> : <Eye />}
                      </Button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="auth-primary-button"
                    disabled={isPending}
                  >
                    {isPending && <Loader2 className="animate-spin" />}
                    <span>{t("signup.submitButton")}</span>
                    <DirectionArrow aria-hidden="true" />
                  </Button>

                  <p className="auth-role-hint">{t("signup.roleHint")}</p>
                  <p className="auth-account-prompt">
                    {language === "ar"
                      ? "لديك حساب بالفعل؟"
                      : "Already have an account?"}{" "}
                    <button type="button" onClick={() => setActiveTab("login")}>
                      {t("login.submitButton")}
                    </button>
                  </p>
                </form>
              )}

              {error && (
                <Alert variant="destructive" className="auth-alert">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              {success && (
                <Alert className="auth-alert border-emerald-200 bg-emerald-50 text-emerald-800">
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}

              {activeTab === "login" && SHOW_LOCAL_QUICK_LOGIN && (
                <div className="auth-demo-panel">
                  <div className="auth-demo-title">
                    <Sparkles aria-hidden="true" />
                    <span>{landingCopy.demoTitle}</span>
                  </div>
                  <div className="auth-demo-grid">
                    {NOOR_DEMO_ACCOUNTS.map((account) => (
                      <Button
                        key={account.role}
                        type="button"
                        variant="outline"
                        className="auth-demo-button"
                        data-testid={`quick-login-${account.role}`}
                        disabled={isPending}
                        onClick={() =>
                          handleNoorDemoLogin(account.email, account.role)
                        }
                      >
                        {getRoleIcon(account.role)}
                        <span>
                          {language === "ar"
                            ? t(`roles.${account.role}`)
                            : account.label}
                        </span>
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <footer className="auth-security-footer">
            <Lock aria-hidden="true" />
            <span>{landingCopy.footer}</span>
          </footer>
        </section>
      </div>
    </div>
  );
};

export default LoginPage;
