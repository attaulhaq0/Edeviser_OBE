-- QA Round 2026-09-02 (V1/V2 defense-in-depth): the grade-scale partition and
-- meaningful-content guards shipped client-side (PRs #306/#307) and in the
-- agent write-tools, but the database still accepted garbage from any
-- non-UI write path. These DB-level guards mirror the exact frontend rules:
--   - grade_scales must form a contiguous, non-overlapping partition of
--     [0,100] (boundary-touch; E1.11 semantics), or be absent/legacy-null.
--   - outcome titles must carry real content (letters/digits), matching
--     meaningfulText in src/lib/schemas/ilo.ts.

CREATE OR REPLACE FUNCTION public.validate_grade_scale_partition(scales jsonb)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  r record;
  prev_max double precision := NULL;
  first_min double precision := NULL;
  n int := 0;
BEGIN
  -- Absent or non-array values are not enforced at the DB level (legacy rows).
  IF scales IS NULL OR jsonb_typeof(scales) <> 'array' THEN
    RETURN true;
  END IF;
  IF jsonb_array_length(scales) = 0 THEN
    RETURN false; -- an empty partition classifies nothing
  END IF;

  FOR r IN
    SELECT
      (b->>'min_percent')::double precision AS min_percent,
      (b->>'max_percent')::double precision AS max_percent
    FROM jsonb_array_elements(scales) AS b
    ORDER BY (b->>'min_percent')::double precision
  LOOP
    n := n + 1;
    IF r.min_percent IS NULL OR r.max_percent IS NULL
       OR r.min_percent < 0 OR r.max_percent > 100
       OR r.min_percent > r.max_percent THEN
      RETURN false;
    END IF;
    IF first_min IS NULL THEN
      first_min := r.min_percent;
    ELSE
      IF r.min_percent < prev_max THEN
        RETURN false; -- overlap
      END IF;
      IF r.min_percent > prev_max THEN
        RETURN false; -- gap
      END IF;
    END IF;
    prev_max := r.max_percent;
  END LOOP;

  IF first_min > 0 THEN RETURN false; END IF;
  IF prev_max < 100 THEN RETURN false; END IF;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_grade_scale_partition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.grade_scales IS NOT NULL
     AND NOT public.validate_grade_scale_partition(NEW.grade_scales) THEN
    RAISE EXCEPTION
      'grade_scales must form a contiguous, non-overlapping partition of 0-100 (adjacent bands must share their boundary)'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_grade_scale_partition ON public.institution_settings;
CREATE TRIGGER trg_grade_scale_partition
BEFORE INSERT OR UPDATE OF grade_scales ON public.institution_settings
FOR EACH ROW EXECUTE FUNCTION public.enforce_grade_scale_partition();

-- Meaningful-content guards (mirror of meaningfulText: must contain a letter
-- or digit; whitespace/punctuation-only is rejected).
ALTER TABLE public.learning_outcomes
  DROP CONSTRAINT IF EXISTS learning_outcomes_title_meaningful;
ALTER TABLE public.learning_outcomes
  ADD CONSTRAINT learning_outcomes_title_meaningful
  CHECK (btrim(title) <> '' AND title ~ '[[:alnum:]]');

ALTER TABLE public.sub_clos
  DROP CONSTRAINT IF EXISTS sub_clos_title_meaningful;
ALTER TABLE public.sub_clos
  ADD CONSTRAINT sub_clos_title_meaningful
  CHECK (btrim(title) <> '' AND title ~ '[[:alnum:]]');