-- Task 112.1: Graduate Attribute database migration
-- Creates graduate_attributes and graduate_attribute_mappings tables with RLS

-- 1. Create graduate_attributes table
CREATE TABLE IF NOT EXISTS graduate_attributes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  code text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(institution_id, code)
);

-- 2. Create graduate_attribute_mappings table
CREATE TABLE IF NOT EXISTS graduate_attribute_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  graduate_attribute_id uuid NOT NULL REFERENCES graduate_attributes(id) ON DELETE CASCADE,
  ilo_id uuid NOT NULL REFERENCES learning_outcomes(id) ON DELETE CASCADE,
  weight numeric NOT NULL DEFAULT 1.0 CHECK (weight >= 0 AND weight <= 1.0),
  UNIQUE(graduate_attribute_id, ilo_id)
);

-- 3. Enable RLS
ALTER TABLE graduate_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE graduate_attribute_mappings ENABLE ROW LEVEL SECURITY;

-- 4. RLS policies for graduate_attributes
DROP POLICY IF EXISTS "admin_all_graduate_attributes" ON graduate_attributes;
CREATE POLICY "admin_all_graduate_attributes" ON graduate_attributes
  FOR ALL TO authenticated
  USING ((select auth_user_role()) = 'admin' AND institution_id = (select auth_institution_id()));

DROP POLICY IF EXISTS "role_select_graduate_attributes" ON graduate_attributes;
CREATE POLICY "role_select_graduate_attributes" ON graduate_attributes
  FOR SELECT TO authenticated
  USING (institution_id = (select auth_institution_id()));

-- 5. RLS policies for graduate_attribute_mappings
DROP POLICY IF EXISTS "admin_all_ga_mappings" ON graduate_attribute_mappings;
CREATE POLICY "admin_all_ga_mappings" ON graduate_attribute_mappings
  FOR ALL TO authenticated
  USING (
    (select auth_user_role()) = 'admin'
    AND graduate_attribute_id IN (
      SELECT id FROM graduate_attributes WHERE institution_id = (select auth_institution_id())
    )
  );

DROP POLICY IF EXISTS "role_select_ga_mappings" ON graduate_attribute_mappings;
CREATE POLICY "role_select_ga_mappings" ON graduate_attribute_mappings
  FOR SELECT TO authenticated
  USING (
    graduate_attribute_id IN (
      SELECT id FROM graduate_attributes WHERE institution_id = (select auth_institution_id())
    )
  );

-- 6. Updated_at trigger
CREATE OR REPLACE FUNCTION update_graduate_attributes_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_graduate_attributes_updated_at
  BEFORE UPDATE ON graduate_attributes
  FOR EACH ROW
  EXECUTE FUNCTION update_graduate_attributes_updated_at();
