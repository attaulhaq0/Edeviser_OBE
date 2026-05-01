-- Task 114.1: Competency Framework database migration
-- Creates competency_frameworks, competency_items, competency_outcome_mappings with RLS

-- 1. Create competency_frameworks table
CREATE TABLE IF NOT EXISTS competency_frameworks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  name text NOT NULL,
  version text NOT NULL,
  source text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(institution_id, name, version)
);

-- 2. Create competency_items table (self-referencing hierarchy)
CREATE TABLE IF NOT EXISTS competency_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_id uuid NOT NULL REFERENCES competency_frameworks(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES competency_items(id) ON DELETE CASCADE,
  level text NOT NULL CHECK (level IN ('domain', 'competency', 'indicator')),
  code text NOT NULL,
  title text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  UNIQUE(framework_id, code)
);

-- 3. Create competency_outcome_mappings table
CREATE TABLE IF NOT EXISTS competency_outcome_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competency_item_id uuid NOT NULL REFERENCES competency_items(id) ON DELETE CASCADE,
  outcome_id uuid NOT NULL REFERENCES learning_outcomes(id) ON DELETE CASCADE,
  UNIQUE(competency_item_id, outcome_id)
);

-- 4. Enable RLS
ALTER TABLE competency_frameworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE competency_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE competency_outcome_mappings ENABLE ROW LEVEL SECURITY;

-- 5. RLS policies for competency_frameworks
CREATE POLICY "admin_all_competency_frameworks" ON competency_frameworks
  FOR ALL TO authenticated
  USING ((select auth_user_role()) = 'admin' AND institution_id = (select auth_institution_id()));

CREATE POLICY "role_select_competency_frameworks" ON competency_frameworks
  FOR SELECT TO authenticated
  USING (institution_id = (select auth_institution_id()));

-- 6. RLS policies for competency_items
CREATE POLICY "admin_all_competency_items" ON competency_items
  FOR ALL TO authenticated
  USING (
    (select auth_user_role()) = 'admin'
    AND framework_id IN (
      SELECT id FROM competency_frameworks WHERE institution_id = (select auth_institution_id())
    )
  );

CREATE POLICY "role_select_competency_items" ON competency_items
  FOR SELECT TO authenticated
  USING (
    framework_id IN (
      SELECT id FROM competency_frameworks WHERE institution_id = (select auth_institution_id())
    )
  );

-- 7. RLS policies for competency_outcome_mappings
CREATE POLICY "admin_all_competency_outcome_mappings" ON competency_outcome_mappings
  FOR ALL TO authenticated
  USING (
    (select auth_user_role()) = 'admin'
    AND competency_item_id IN (
      SELECT ci.id FROM competency_items ci
      JOIN competency_frameworks cf ON ci.framework_id = cf.id
      WHERE cf.institution_id = (select auth_institution_id())
    )
  );

CREATE POLICY "role_select_competency_outcome_mappings" ON competency_outcome_mappings
  FOR SELECT TO authenticated
  USING (
    competency_item_id IN (
      SELECT ci.id FROM competency_items ci
      JOIN competency_frameworks cf ON ci.framework_id = cf.id
      WHERE cf.institution_id = (select auth_institution_id())
    )
  );
