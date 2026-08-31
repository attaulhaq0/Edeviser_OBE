import { supabase } from "@/lib/supabase";

/**
 * Resolve the authenticated user's `institution_id` from their profile row.
 *
 * Business logic lives in `src/lib` per project conventions. Used by outcome
 * creation hooks because the RLS INSERT policies on `learning_outcomes`
 * require `institution_id = auth_institution_id()`, and the create forms do
 * not carry the institution.
 *
 * Fail-closed: returns `null` when unauthenticated, on any query error, or
 * when the profile row is missing / has no institution. Callers must refuse
 * the write rather than send a row that can never satisfy RLS.
 */
export const fetchUserInstitutionId = async (): Promise<string | null> => {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("institution_id")
    .eq("id", user.id)
    .maybeSingle();

  if (error) return null;

  const institutionId = data?.institution_id;
  return typeof institutionId === "string" && institutionId.length > 0
    ? institutionId
    : null;
};
