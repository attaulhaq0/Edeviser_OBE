-- ============================================================================
-- Migration: Move pg_net extension from public to extensions schema
-- ============================================================================
-- Defect 6: pg_net was created in the public schema by default, exposing its
-- internal functions (net.http_request_queue, etc.) via the PostgREST API.
-- Moving it to the extensions schema removes this attack surface.
--
-- Safe because no custom triggers or functions in this project use pg_net
-- directly (confirmed in Supabase Audit Report, Section 3).
-- ============================================================================

DROP EXTENSION IF EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;
