-- Bounded invitation/delivery schema. This is additive: the legacy raw token
-- remains until every caller has moved to the hashed-token contract.

ALTER TABLE public.invitations
  ADD COLUMN IF NOT EXISTS token_hash text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS accepted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS send_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS idempotency_key text,
  ADD COLUMN IF NOT EXISTS student_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS relationship text,
  ADD COLUMN IF NOT EXISTS relationship_label text;

-- Preserve the legacy column for historical compatibility, but new rows must
-- not be forced to store a raw bearer token.
ALTER TABLE public.invitations
  ALTER COLUMN token DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'invitations_status_check'
      AND conrelid = 'public.invitations'::regclass
  ) THEN
    ALTER TABLE public.invitations
      ADD CONSTRAINT invitations_status_check
      CHECK (status IN ('pending', 'accepted', 'revoked', 'expired'));
  END IF;
END
$$;

UPDATE public.invitations
SET status = CASE
  WHEN used_at IS NOT NULL THEN 'accepted'
  WHEN expires_at <= now() THEN 'expired'
  ELSE 'pending'
END
WHERE status IS NULL OR status = 'pending';

CREATE UNIQUE INDEX IF NOT EXISTS invitations_token_hash_unique
  ON public.invitations (token_hash)
  WHERE token_hash IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS invitations_idempotency_unique
  ON public.invitations (institution_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS invitations_status_expiry_idx
  ON public.invitations (institution_id, status, expires_at);

CREATE TABLE IF NOT EXISTS public.email_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  recipient_email citext NOT NULL,
  email_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  provider text NOT NULL DEFAULT 'resend',
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'sent', 'failed', 'cancelled', 'delivered', 'bounced', 'complained')),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  idempotency_key text NOT NULL,
  provider_message_id text,
  last_error_code text,
  last_error_message text,
  failed_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, idempotency_key)
);

CREATE INDEX IF NOT EXISTS email_deliveries_institution_status_idx
  ON public.email_deliveries (institution_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS email_deliveries_entity_idx
  ON public.email_deliveries (entity_type, entity_id);

ALTER TABLE public.email_deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.email_deliveries FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.email_deliveries TO service_role;

CREATE TABLE IF NOT EXISTS public.email_delivery_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id uuid REFERENCES public.email_deliveries(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'resend',
  provider_event_id text,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_event_id)
);

CREATE INDEX IF NOT EXISTS email_delivery_events_delivery_idx
  ON public.email_delivery_events (delivery_id, occurred_at DESC);

ALTER TABLE public.email_delivery_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.email_delivery_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.email_delivery_events TO service_role;
