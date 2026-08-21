# Types Regeneration (adapted from Kiro steering/types-regeneration.md)

- `src/types/database.ts` is auto-generated from the live Supabase schema — do NOT edit it manually.
- After any migration or schema change, regenerate the types from the live schema.
- Regeneration command (Supabase CLI):
  `npx supabase gen types typescript --project-id <project-ref> --schema public > src/types/database.ts`
- Commit the regenerated `src/types/database.ts` alongside the migration that changed the schema.
- Keep the generated file in sync with the deployed schema to avoid type drift.