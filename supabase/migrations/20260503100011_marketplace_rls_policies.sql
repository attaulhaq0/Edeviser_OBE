-- ============================================================
-- Migration 1.11: RLS policies for all 7 marketplace tables
-- Feature: XP Marketplace & Virtual Economy
-- Uses (select auth.uid()) pattern for InitPlan optimization
-- Uses auth_user_role() / auth_institution_id() helpers
-- ============================================================

-- ══════════════════════════════════════════════════════════════
-- 1. marketplace_items — RLS
-- ══════════════════════════════════════════════════════════════

-- Drop existing policies to replace with optimized versions
DROP POLICY IF EXISTS "students_select_active_items" ON marketplace_items;
DROP POLICY IF EXISTS "admin_all_items" ON marketplace_items;
DROP POLICY IF EXISTS "teacher_select_items" ON marketplace_items;
-- Students: SELECT active items in their institution
CREATE POLICY "mp_items_student_select" ON marketplace_items
  FOR SELECT TO authenticated
  USING (
    (select auth_user_role()) = 'student'
    AND is_active = true
    AND institution_id = (select auth_institution_id())
  );
-- Teachers: SELECT items in their institution
CREATE POLICY "mp_items_teacher_select" ON marketplace_items
  FOR SELECT TO authenticated
  USING (
    (select auth_user_role()) = 'teacher'
    AND institution_id = (select auth_institution_id())
  );
-- Admins: full CRUD within their institution
CREATE POLICY "mp_items_admin_all" ON marketplace_items
  FOR ALL TO authenticated
  USING (
    (select auth_user_role()) = 'admin'
    AND institution_id = (select auth_institution_id())
  )
  WITH CHECK (
    (select auth_user_role()) = 'admin'
    AND institution_id = (select auth_institution_id())
  );
-- ══════════════════════════════════════════════════════════════
-- 2. xp_purchases — RLS (append-only, no DELETE)
-- ══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "student_select_own_purchases" ON xp_purchases;
DROP POLICY IF EXISTS "student_insert_own_purchases" ON xp_purchases;
DROP POLICY IF EXISTS "student_update_own_purchases" ON xp_purchases;
DROP POLICY IF EXISTS "admin_select_institution_purchases" ON xp_purchases;
DROP POLICY IF EXISTS "parent_select_linked_purchases" ON xp_purchases;
-- Students: SELECT own purchases
CREATE POLICY "xp_purchases_student_select" ON xp_purchases
  FOR SELECT TO authenticated
  USING (
    (select auth_user_role()) = 'student'
    AND student_id = (select auth.uid())
  );
-- Students: INSERT for self only
CREATE POLICY "xp_purchases_student_insert" ON xp_purchases
  FOR INSERT TO authenticated
  WITH CHECK (
    (select auth_user_role()) = 'student'
    AND student_id = (select auth.uid())
  );
-- Students: UPDATE own purchases (status transitions only)
CREATE POLICY "xp_purchases_student_update" ON xp_purchases
  FOR UPDATE TO authenticated
  USING (
    (select auth_user_role()) = 'student'
    AND student_id = (select auth.uid())
  );
-- Admins: SELECT all purchases in their institution
CREATE POLICY "xp_purchases_admin_select" ON xp_purchases
  FOR SELECT TO authenticated
  USING (
    (select auth_user_role()) = 'admin'
    AND institution_id = (select auth_institution_id())
  );
-- Parents: SELECT for linked students
CREATE POLICY "xp_purchases_parent_select" ON xp_purchases
  FOR SELECT TO authenticated
  USING (
    (select auth_user_role()) = 'parent'
    AND student_id IN (
      SELECT student_id FROM parent_student_links
      WHERE parent_id = (select auth.uid()) AND verified = true
    )
  );
-- NO DELETE policy — enforced by trigger + absence of DELETE policy

-- ══════════════════════════════════════════════════════════════
-- 3. student_equipped_items — RLS
-- ══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "student_manage_own_equipped" ON student_equipped_items;
-- Students: full CRUD on own equipped items
CREATE POLICY "equipped_student_all" ON student_equipped_items
  FOR ALL TO authenticated
  USING (student_id = (select auth.uid()))
  WITH CHECK (student_id = (select auth.uid()));
-- ══════════════════════════════════════════════════════════════
-- 4. sale_events — RLS
-- ══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "authenticated_select_sale_events" ON sale_events;
DROP POLICY IF EXISTS "admin_manage_sale_events" ON sale_events;
-- Students: SELECT active/scheduled sale events in their institution
CREATE POLICY "sale_events_student_select" ON sale_events
  FOR SELECT TO authenticated
  USING (
    (select auth_user_role()) = 'student'
    AND institution_id = (select auth_institution_id())
  );
-- Admins: full CRUD within their institution
CREATE POLICY "sale_events_admin_all" ON sale_events
  FOR ALL TO authenticated
  USING (
    (select auth_user_role()) = 'admin'
    AND institution_id = (select auth_institution_id())
  )
  WITH CHECK (
    (select auth_user_role()) = 'admin'
    AND institution_id = (select auth_institution_id())
  );
-- ══════════════════════════════════════════════════════════════
-- 5. sale_event_items — RLS
-- ══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "authenticated_select_sale_event_items" ON sale_event_items;
DROP POLICY IF EXISTS "admin_manage_sale_event_items" ON sale_event_items;
-- Students: SELECT sale event items in their institution
CREATE POLICY "sale_event_items_student_select" ON sale_event_items
  FOR SELECT TO authenticated
  USING (
    sale_event_id IN (
      SELECT id FROM sale_events
      WHERE institution_id = (select auth_institution_id())
    )
  );
-- Admins: full CRUD
CREATE POLICY "sale_event_items_admin_all" ON sale_event_items
  FOR ALL TO authenticated
  USING (
    (select auth_user_role()) = 'admin'
    AND sale_event_id IN (
      SELECT id FROM sale_events
      WHERE institution_id = (select auth_institution_id())
    )
  )
  WITH CHECK (
    (select auth_user_role()) = 'admin'
    AND sale_event_id IN (
      SELECT id FROM sale_events
      WHERE institution_id = (select auth_institution_id())
    )
  );
-- ══════════════════════════════════════════════════════════════
-- 6. student_active_boosts — RLS
-- ══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "student_select_own_boosts" ON student_active_boosts;
-- Students: SELECT own active boosts
CREATE POLICY "boosts_student_select" ON student_active_boosts
  FOR SELECT TO authenticated
  USING (student_id = (select auth.uid()));
-- ══════════════════════════════════════════════════════════════
-- 7. deadline_extensions — RLS
-- ══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "student_select_own_extensions" ON deadline_extensions;
DROP POLICY IF EXISTS "teacher_select_course_extensions" ON deadline_extensions;
DROP POLICY IF EXISTS "admin_select_institution_extensions" ON deadline_extensions;
-- Students: SELECT own extensions
CREATE POLICY "extensions_student_select" ON deadline_extensions
  FOR SELECT TO authenticated
  USING (
    (select auth_user_role()) = 'student'
    AND student_id = (select auth.uid())
  );
-- Teachers: SELECT extensions for their course assignments
CREATE POLICY "extensions_teacher_select" ON deadline_extensions
  FOR SELECT TO authenticated
  USING (
    (select auth_user_role()) = 'teacher'
    AND assignment_id IN (
      SELECT a.id FROM assignments a
      JOIN courses c ON c.id = a.course_id
      WHERE c.teacher_id = (select auth.uid())
    )
  );
-- Admins: SELECT all extensions in their institution
CREATE POLICY "extensions_admin_select" ON deadline_extensions
  FOR SELECT TO authenticated
  USING (
    (select auth_user_role()) = 'admin'
    AND student_id IN (
      SELECT id FROM profiles
      WHERE institution_id = (select auth_institution_id())
    )
  );
