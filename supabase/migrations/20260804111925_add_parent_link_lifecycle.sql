-- Parent-link lifecycle metadata. Existing verified relationships are
-- preserved and explicitly backfilled before the institution constraint.

ALTER TABLE public.parent_student_links
  ADD COLUMN IF NOT EXISTS institution_id uuid REFERENCES public.institutions(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS invited_email citext,
  ADD COLUMN IF NOT EXISTS invitation_id uuid REFERENCES public.invitations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS revoked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz,
  ADD COLUMN IF NOT EXISTS relationship_label text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- A pending invitation has no Auth user yet; the exact parent_id is attached
-- atomically by finalize_invitation_acceptance().
ALTER TABLE public.parent_student_links
  ALTER COLUMN parent_id DROP NOT NULL;

DO $$
DECLARE
  mismatch_count integer;
BEGIN
  SELECT count(*) INTO mismatch_count
  FROM public.parent_student_links l
  JOIN public.profiles parent_profile ON parent_profile.id = l.parent_id
  JOIN public.profiles student_profile ON student_profile.id = l.student_id
  WHERE parent_profile.institution_id <> student_profile.institution_id;
  IF mismatch_count > 0 THEN
    RAISE EXCEPTION 'parent_student_links contains % cross-institution row(s)', mismatch_count;
  END IF;
END
$$;

UPDATE public.parent_student_links l
SET institution_id = student_profile.institution_id,
    status = CASE WHEN l.verified THEN 'verified' ELSE 'pending' END,
    invited_email = COALESCE(l.invited_email, parent_profile.email::citext),
    verified_at = CASE WHEN l.verified THEN COALESCE(l.verified_at, l.created_at) ELSE l.verified_at END,
    updated_at = now()
FROM public.profiles parent_profile,
     public.profiles student_profile
WHERE parent_profile.id = l.parent_id
  AND student_profile.id = l.student_id
  AND l.institution_id IS NULL;

ALTER TABLE public.parent_student_links
  ALTER COLUMN institution_id SET NOT NULL;

DO $$
DECLARE
  old_relationship_constraint text;
BEGIN
  SELECT c.conname INTO old_relationship_constraint
  FROM pg_constraint c
  WHERE c.conrelid = 'public.parent_student_links'::regclass
    AND c.contype = 'c'
    AND pg_get_constraintdef(c.oid) ILIKE '%relationship%IN%';
  IF old_relationship_constraint IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.parent_student_links DROP CONSTRAINT %I', old_relationship_constraint);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'parent_student_links_relationship_check'
      AND conrelid = 'public.parent_student_links'::regclass
  ) THEN
    ALTER TABLE public.parent_student_links
      ADD CONSTRAINT parent_student_links_relationship_check
      CHECK (relationship IN ('parent', 'guardian', 'mother', 'father', 'other'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'parent_student_links_status_check'
      AND conrelid = 'public.parent_student_links'::regclass
  ) THEN
    ALTER TABLE public.parent_student_links
      ADD CONSTRAINT parent_student_links_status_check
      CHECK (status IN ('pending', 'verified', 'rejected', 'revoked'));
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS parent_student_links_institution_status_idx
  ON public.parent_student_links (institution_id, status);
CREATE INDEX IF NOT EXISTS parent_student_links_invitation_idx
  ON public.parent_student_links (invitation_id)
  WHERE invitation_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS parent_student_links_invitation_unique
  ON public.parent_student_links (invitation_id)
  WHERE invitation_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.enforce_parent_link_same_institution()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  parent_institution uuid;
  student_institution uuid;
BEGIN
  SELECT institution_id INTO parent_institution FROM public.profiles WHERE id = NEW.parent_id;
  SELECT institution_id INTO student_institution FROM public.profiles WHERE id = NEW.student_id;
  IF student_institution IS NULL OR NEW.institution_id <> student_institution
     OR (NEW.parent_id IS NOT NULL AND (parent_institution IS NULL OR parent_institution <> student_institution)) THEN
    RAISE EXCEPTION 'cross-institution parent link is not permitted' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_parent_link_same_institution() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_parent_link_same_institution() TO postgres, service_role;

DROP TRIGGER IF EXISTS parent_student_links_same_institution ON public.parent_student_links;
CREATE TRIGGER parent_student_links_same_institution
  BEFORE INSERT OR UPDATE OF parent_id, student_id, institution_id
  ON public.parent_student_links
  FOR EACH ROW EXECUTE FUNCTION public.enforce_parent_link_same_institution();

CREATE OR REPLACE FUNCTION public.sync_parent_link_legacy_verified()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.status = 'verified' OR NEW.verified = true THEN
    NEW.status := 'verified';
    NEW.verified := true;
    NEW.verified_at := COALESCE(NEW.verified_at, now());
  ELSE
    NEW.verified := false;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_parent_link_legacy_verified() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sync_parent_link_legacy_verified() TO postgres, service_role;

DROP TRIGGER IF EXISTS parent_student_links_sync_legacy_verified ON public.parent_student_links;
CREATE TRIGGER parent_student_links_sync_legacy_verified
  BEFORE INSERT OR UPDATE ON public.parent_student_links
  FOR EACH ROW EXECUTE FUNCTION public.sync_parent_link_legacy_verified();
