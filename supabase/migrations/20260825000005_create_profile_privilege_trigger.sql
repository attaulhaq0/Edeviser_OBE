-- Establish the canonical profile privilege trigger after the Production head.
DROP TRIGGER IF EXISTS profiles_protect_privilege_fields ON public.profiles;

CREATE TRIGGER profiles_protect_privilege_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_privilege_mutation();

-- The SECURITY DEFINER helper is trigger-only and must not be a public API.
REVOKE EXECUTE ON FUNCTION public.prevent_profile_privilege_mutation() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.prevent_profile_privilege_mutation() FROM anon;
REVOKE EXECUTE ON FUNCTION public.prevent_profile_privilege_mutation() FROM authenticated;
