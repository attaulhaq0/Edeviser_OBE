-- Follow-up to advisor_hardening_fk_indexes_and_executer_revokes: the index DO block
-- joined pg_attribute.attrelid to the constraint OID instead of the table relation OID,
-- so idx_cols resolved NULL for every FK and no index was created. This migration
-- re-runs the corrected, idempotent index creation.

DO $$
DECLARE
  fk record;
  idx_cols text;
  idx_name text;
BEGIN
  FOR fk IN
    SELECT con.oid AS conoid, con.conrelid AS relid, c.relname AS table_name, con.conkey
    FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND con.contype = 'f'
      AND NOT EXISTS (
        SELECT 1
        FROM pg_index i
        WHERE i.indrelid = con.conrelid
          AND (SELECT array_agg(v::int2 ORDER BY ord)
               FROM unnest(string_to_array(i.indkey::text, ' ')) WITH ORDINALITY AS t(v, ord))
              @> (SELECT array_agg(DISTINCT v::int2)
                  FROM unnest(string_to_array(translate(con.conkey::text, '{}', ''), ',')) AS t(v))
      )
  LOOP
    SELECT string_agg(att.attname, ', ' ORDER BY k.ord)
      INTO idx_cols
      FROM unnest(string_to_array(translate(fk.conkey::text, '{}', ''), ',')) WITH ORDINALITY AS k(attnum_str, ord)
      JOIN pg_attribute att
        ON att.attrelid = fk.relid AND att.attnum = k.attnum_str::int2;

    IF idx_cols IS NULL THEN
      CONTINUE;
    END IF;

    idx_name := 'idx_' || fk.table_name || '_' || replace(idx_cols, ', ', '_');
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (%s)', idx_name, fk.table_name, idx_cols);
  END LOOP;
END
$$;