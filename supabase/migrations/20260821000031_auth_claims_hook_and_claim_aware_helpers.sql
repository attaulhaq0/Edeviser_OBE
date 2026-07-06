-- =============================================================================
-- Claim-aware auth helpers + Custom Access Token Hook (Option J, Phase 2 / "C")
-- =============================================================================
--
-- GOAL: remove the per-request `profiles` SELECT that ~68% of RLS policies incur
-- today (they call auth_user_role()/auth_institution_id(), which each run
--   SELECT ... FROM public.profiles WHERE id = auth.uid()
-- on every policy evaluation). The scalable fix is to carry role + institution
-- as signed JWT claims and read them from the token instead of the table.
--
-- This migration wires that up WITHOUT a risky 243-policy rewrite and WITHOUT
-- changing behavior until explicitly activated:
--
--   1. `custom_access_token_hook(event jsonb)` — a Postgres Auth Hook that, when
--      ENABLED, injects `app_metadata.institution_id` and `app_metadata.user_role`
--      into every issued JWT (at sign-in and token refresh). It is created here
--      but is INERT until enabled in Dashboard → Authentication → Hooks (Postgres
--      function). Creating it changes nothing on its own.
--
--   2. `auth_institution_id()` / `auth_user_role()` become CLAIM-AWARE WITH A
--      `profiles` FALLBACK (a centralized dual-read):
--        - claim present  -> return it, ZERO table access (the scale win)
--        - claim absent    -> fall back to the existing profiles lookup (today's
--          behavior, byte-for-byte identical result)
--      Because the claim is absent until the hook is enabled, this is a no-op
--      change on merge; the moment the hook is enabled and tokens refresh, all
--      243 policies stop touching `profiles` at once — no per-policy migration.
--
-- SECURITY: claims are set server-side by the hook and are part of the signed
-- JWT (tamper-proof). RLS remains the source of truth. The only operational
-- caveat is staleness — a role/institution change is not reflected until the
-- user's token refreshes; activation must pair with a force-refresh on such
-- changes (documented in the PR, handled at activation time, not here).
--
-- Replay-safe: profiles, auth.jwt(), auth.uid() and the two helpers already
-- exist from earlier migrations; this only CREATE OR REPLACEs bodies and adds a
-- new function + grants. No too-early references.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Custom Access Token Hook — inert until enabled in the Dashboard.
-- ---------------------------------------------------------------------------
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  claims jsonb;
  v_institution uuid;
  v_role text;
begin
  select p.institution_id, p.role::text
    into v_institution, v_role
  from public.profiles p
  where p.id = (event ->> 'user_id')::uuid;

  claims := event -> 'claims';

  if claims -> 'app_metadata' is null then
    claims := jsonb_set(claims, '{app_metadata}', '{}'::jsonb);
  end if;

  if v_institution is not null then
    claims := jsonb_set(
      claims, '{app_metadata, institution_id}', to_jsonb(v_institution)
    );
  end if;

  if v_role is not null then
    claims := jsonb_set(claims, '{app_metadata, user_role}', to_jsonb(v_role));
  end if;

  event := jsonb_set(event, '{claims}', claims);
  return event;
end;
$$;

-- GoTrue calls the hook as `supabase_auth_admin`; grant it exactly what it needs
-- and deny everyone else (the hook must never be callable from the data API).
grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb) from authenticated, anon, public;

-- The hook reads profiles at token-mint time; profiles has RLS enabled, so the
-- auth admin needs both the grant and a permissive read policy for its role.
grant select on table public.profiles to supabase_auth_admin;

drop policy if exists "auth_admin_read_profiles_for_token_hook" on public.profiles;
create policy "auth_admin_read_profiles_for_token_hook" on public.profiles
  for select to supabase_auth_admin
  using (true);

-- ---------------------------------------------------------------------------
-- 2. Claim-aware helpers with profiles fallback (centralized dual-read).
--    Signatures/attributes are preserved exactly (sql STABLE SECURITY DEFINER
--    SET search_path TO 'public'); only the body changes.
-- ---------------------------------------------------------------------------
create or replace function public.auth_institution_id()
returns uuid
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce(
    -- Prefer the signed JWT claim (zero table access) when present...
    nullif(auth.jwt() -> 'app_metadata' ->> 'institution_id', '')::uuid,
    -- ...otherwise fall back to today's lookup (identical result).
    (select p.institution_id from public.profiles p where p.id = auth.uid())
  );
$$;

create or replace function public.auth_user_role()
returns text
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce(
    nullif(auth.jwt() -> 'app_metadata' ->> 'user_role', ''),
    (select p.role::text from public.profiles p where p.id = auth.uid())
  );
$$;
