-- L2-1 Fix Step 1: Vault provisioning is an operational secret-management step.
--
-- This historical migration previously embedded a live service-role JWT. That
-- credential is intentionally not represented in source or migration history.
-- Provision the runtime key with scripts/provision-vault-secret.ts after the
-- project has been configured, then verify the secret name/UUID out of band.
--
-- Fresh replays must remain safe when the operational secret is absent. The
-- downstream attainment trigger fails closed and emits a safe warning until
-- the secret is provisioned.
DO $$
BEGIN
  RAISE NOTICE 'service_role_key Vault provisioning is operational; no credential is stored by this migration';
END
$$;
