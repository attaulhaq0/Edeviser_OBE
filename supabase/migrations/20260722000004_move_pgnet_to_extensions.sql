-- =============================================================================
-- Migration: Move pg_net from public schema to extensions schema
-- =============================================================================
-- pg_net in the public schema exposes its internal functions via the PostgREST
-- API, creating an unnecessary attack surface. Moving it to the extensions
-- schema prevents this exposure.
--
-- Safe because no custom triggers use pg_net (confirmed in audit Section 3).
-- =============================================================================

-- Move pg_net to extensions schema for security
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net' AND extnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
    ALTER EXTENSION pg_net SET SCHEMA extensions;
  END IF;
END $$;
