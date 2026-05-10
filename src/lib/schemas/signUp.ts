import { z } from "zod";

/**
 * Self-registration schema for the public /signup flow.
 *
 * Scalability note (design.md ADR-12):
 *   • default role on self-signup is always 'student' (the schema still
 *     captures a requested role for display/analytics, but `handle_new_user()`
 *     forces role='student' for self-signup without an invitation token)
 *   • non-student onboarding flows through `/accept-invite/:token` which uses
 *     a separate schema in `src/lib/schemas/invitation.ts`
 */

const PASSWORD_MIN = 8;
const USERNAME_RE = /^[a-zA-Z0-9_.-]{3,32}$/;

export const signUpSchema = z
  .object({
    firstName: z
      .string()
      .trim()
      .min(1, "First name is required")
      .max(60, "First name is too long"),
    lastName: z
      .string()
      .trim()
      .min(1, "Last name is required")
      .max(60, "Last name is too long"),
    username: z
      .string()
      .trim()
      .regex(
        USERNAME_RE,
        "Username must be 3-32 chars, letters/numbers/._- only"
      ),
    email: z.email("Invalid email address"),
    password: z
      .string()
      .min(
        PASSWORD_MIN,
        `Password must be at least ${PASSWORD_MIN} characters`
      ),
    confirmPassword: z.string().min(1, "Please confirm your password"),
    // Self-signup can ONLY create a student account. The handle_new_user()
    // trigger already forces role='student' server-side; restricting the
    // client schema prevents the UI from advertising impossible choices and
    // stops the literal string "admin"/"coordinator"/"teacher" from ever
    // reaching metadata.role (where it would only be ignored anyway).
    // Non-student onboarding flows through /accept-invite/:token.
    requestedRole: z.literal("student"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type SignUpFormData = z.infer<typeof signUpSchema>;
