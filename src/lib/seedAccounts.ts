// Seed/demo account classification for analytics tagging.
//
// Canonical registry: docs/specs/continuous-verification/seed-accounts-registry.md
// (live-verified against Supabase auth.users). Classification is by EMAIL DOMAIN
// (with institution-ID fallback) — never by hardcoded user IDs, and seed emails are
// intentionally legitimate-looking, so domain lists here are the only source of truth.

/** Email domains owned exclusively by seeded QA/demo accounts. */
export const SEED_EMAIL_DOMAINS = [
  "demo.com",
  "noor-international.edu",
] as const;

/** Institution IDs that exist purely as QA/demo tenants. */
export const SEED_INSTITUTION_IDS = [
  // "QA Demo" institution used by the universal @demo.com personas.
  "00000000-0000-0000-0000-000000000001",
  // Noor International School seed cohort (students/parents/teachers/coordinators).
  "4de6a0a2-758b-47f3-ab7e-984bb974d88b",
] as const;

export type AnalyticsAccountType = "seed" | "real";

const SEED_DOMAIN_SET: ReadonlySet<string> = new Set(SEED_EMAIL_DOMAINS);
const SEED_INSTITUTION_SET: ReadonlySet<string> = new Set(SEED_INSTITUTION_IDS);

export const getEmailDomain = (
  email: string | null | undefined
): string | null => {
  if (!email) return null;
  const at = email.lastIndexOf("@");
  if (at < 0 || at === email.length - 1) return null;
  return email.slice(at + 1).toLowerCase();
};

/**
 * True when the account belongs to the locked QA/demo population. Used ONLY for
 * analytics person properties (PostHog `account_type` / test-account filtering);
 * it must never gate product behavior or authorization.
 */
export const isSeedAccount = (
  email?: string | null,
  institutionId?: string | null
): boolean => {
  const domain = getEmailDomain(email);
  if (domain && SEED_DOMAIN_SET.has(domain)) return true;
  if (institutionId && SEED_INSTITUTION_SET.has(institutionId)) return true;
  return false;
};
