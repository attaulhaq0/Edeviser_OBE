-- Add nullable course color identifier (R9.3, R9.4)
-- Hex color string (#RRGGBB) used as a visual identifier on student course cards.
-- Nullable so existing courses keep working; client falls back to a deterministic palette when null.
-- Existing row-level courses RLS policies (courses_institution_read / courses_coordinator_write /
-- courses_admin_write) cover this new column automatically, since Postgres RLS is row-scoped, not
-- column-scoped. No new policy is required.
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS color text
  CONSTRAINT courses_color_hex_chk CHECK (color IS NULL OR color ~ '^#[0-9A-Fa-f]{6}$');

COMMENT ON COLUMN public.courses.color IS 'Optional hex color (#RRGGBB) used as a visual identifier on student course cards. Null falls back to a deterministic client palette.';;
