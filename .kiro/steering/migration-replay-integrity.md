# Migration Replay Integrity (Supabase Preview must always pass)

The **Supabase Preview** PR check (Supabase Branching) spins up a fresh, empty preview
database and **replays every file in `supabase/migrations/` from scratch, in filename
order**. It is a required, non-ignorable gate. A green Supabase Preview is the proof that
the migration history can rebuild the database cleanly — which is what a new environment,
a disaster-recovery restore, or a branch deploy actually does.

**Never ignore, skip, silence, or merge around a failing Supabase Preview.** If it is red,
the migration chain is broken even when production looks healthy.

## The #1 cause of a red Supabase Preview: out-of-order function references (42883)

Production is built up incrementally, so a function always exists by the time something
references it. A from-scratch replay is different: if an **earlier** migration does any of

- `ALTER FUNCTION foo() ...`
- `REVOKE EXECUTE ON FUNCTION foo() ...`
- `GRANT EXECUTE ON FUNCTION foo() ...`
- `COMMENT ON FUNCTION foo() ...`
- `CREATE TRIGGER ... EXECUTE FUNCTION foo()`

on a function `foo()` that is only **CREATEd by a later** migration, the replay aborts with
`ERROR: function ... does not exist (SQLSTATE 42883)` and every migration after it never
runs. Production is unaffected (it already has `foo()`), so this hides until a clean replay.

## The rule

1. **A function must be CREATEd (in an earlier-or-equal migration) before any migration
   ALTERs/REVOKEs/GRANTs/COMMENTs it or attaches a trigger that EXECUTEs it.**
2. Prefer to **harden a function at its CREATE site** (e.g. bake `SET search_path = ''`
   and `public.`-qualification into the `CREATE OR REPLACE FUNCTION` that is the _last_
   definition in replay order) rather than a later bare `ALTER FUNCTION`.
3. If a too-early statement genuinely cannot be moved, **guard it** so it is a no-op when
   the function does not yet exist on a fresh replay (and applies normally on production
   where it does):

   ```sql
   DO $$ BEGIN
     IF to_regprocedure('public.foo(uuid, integer)') IS NOT NULL THEN
       EXECUTE 'REVOKE EXECUTE ON FUNCTION public.foo(uuid, integer) FROM anon';
     END IF;
   END $$;
   ```

4. `DROP FUNCTION IF EXISTS foo();` is always safe (it is guarded by `IF EXISTS`).
5. The same ordering rule applies to tables/types/policies: never reference an object in a
   migration earlier than the one that creates it.

## Enforcement (catch it before the Supabase Preview does)

- **Local / pre-push:** run `npm run db:check-replay` (`scripts/check-migration-replay-order.mjs`).
  It statically flags any too-early function reference. Exit 0 = safe to push.
- **CI:** the `SQL Migration Lint` job runs the same checker on every PR
  (`.github/workflows/ci.yml`), and the Vitest guard
  `scripts/audit/__tests__/migration-replay-order.test.ts` runs in the test suite.
- These run **before** the Supabase Preview, so a 42883 ordering bug fails fast in your own
  CI with an exact file:line, instead of as an opaque red Supabase Preview check.

## When the Supabase Preview is red

1. Read the preview's migration log — find the first `42883` (or other) abort and the
   migration file + statement that caused it.
2. Reproduce locally: `npm run db:check-replay` (for the function-ordering class) and, if
   needed, `npx supabase db diff --linked` (note: the Docker replay can hang at
   "Initialising schema…" on some Windows hosts — the static checker is the fast oracle).
3. Fix per the rule above (harden at CREATE site, or guard the statement). Re-run
   `npm run db:check-replay` until CLEAN, then push — the Supabase Preview re-runs on the
   new commit.
4. Do **not** mark the check as ignored/neutral or merge with it red.
