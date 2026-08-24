# ADR 0001 — Row Level Security on Every Table

**Status:** Accepted · **Date:** 2026-01 · **Deciders:** Engineering Lead, Security

## Context

Edeviser is multi-tenant by institution (single Supabase project). Student records,
grades, evidence, XP, and accreditation data must be isolated per institution and per role
without trusting application-layer checks alone.

## Decision

Every table in `public` has RLS enabled with policy coverage. No table ships without
policies; service-role access is limited to Edge Functions and crons. Auth never trusts a
client-supplied role — roles resolve from the database profile.

## Consequences

- Verified live: ~140 tables, 100% RLS-enabled (`list_tables`, project `cdlgtbvxlxjpcddjazzx`).
- pgTAP RLS suite (`npm run test:rls`) guards policy behavior.
- New tables MUST enable RLS + policies in the same migration; agents should reject any
  migration creating a table without RLS.
