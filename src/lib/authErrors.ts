/** Convert Auth/trigger failures into safe, user-facing onboarding messages. */
export const mapSignupError = (
  message: string | null | undefined,
  context?: { joinMode?: "open" | "invite_only" | "domain_restricted" }
): string => {
  const normalized = (message ?? "").toLowerCase();

  if (normalized.includes("already registered") || normalized.includes("already exists")) {
    return "An account already exists for this email. Try signing in instead.";
  }
  if (normalized.includes("domain") || normalized.includes("email domain")) {
    return "This email address is not allowed for the selected institution.";
  }
  if (normalized.includes("invitation") || context?.joinMode === "invite_only") {
    return "This institution requires an invitation to create an account.";
  }
  if (normalized.includes("institution") || normalized.includes("tenant")) {
    return "Select a valid institution before creating your account.";
  }
  if (normalized.includes("database error saving new user")) {
    return "Sign up is temporarily unavailable. Please try again shortly.";
  }

  return "We could not create your account. Please check your details and try again.";
};
