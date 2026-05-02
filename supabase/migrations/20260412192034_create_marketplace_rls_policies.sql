-- ═══ marketplace_items RLS ═══
CREATE POLICY "students_select_active_items" ON marketplace_items
  FOR SELECT TO authenticated
  USING (is_active = true AND institution_id = (SELECT institution_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "admin_all_items" ON marketplace_items
  FOR ALL TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    AND institution_id = (SELECT institution_id FROM profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    AND institution_id = (SELECT institution_id FROM profiles WHERE id = auth.uid())
  );

-- ═══ xp_purchases RLS ═══
CREATE POLICY "student_select_own_purchases" ON xp_purchases
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY "student_insert_own_purchases" ON xp_purchases
  FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "student_update_own_purchases" ON xp_purchases
  FOR UPDATE TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY "admin_select_institution_purchases" ON xp_purchases
  FOR SELECT TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    AND student_id IN (
      SELECT id FROM profiles WHERE institution_id = (SELECT institution_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "parent_select_linked_purchases" ON xp_purchases
  FOR SELECT TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'parent'
    AND student_id IN (
      SELECT student_id FROM parent_student_links WHERE parent_id = auth.uid() AND verified = true
    )
  );

-- ═══ student_equipped_items RLS ═══
CREATE POLICY "student_manage_own_equipped" ON student_equipped_items
  FOR ALL TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

-- ═══ sale_events RLS ═══
CREATE POLICY "authenticated_select_sale_events" ON sale_events
  FOR SELECT TO authenticated
  USING (institution_id = (SELECT institution_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "admin_manage_sale_events" ON sale_events
  FOR ALL TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    AND institution_id = (SELECT institution_id FROM profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    AND institution_id = (SELECT institution_id FROM profiles WHERE id = auth.uid())
  );

-- ═══ sale_event_items RLS ═══
CREATE POLICY "authenticated_select_sale_event_items" ON sale_event_items
  FOR SELECT TO authenticated
  USING (
    sale_event_id IN (
      SELECT id FROM sale_events WHERE institution_id = (SELECT institution_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "admin_manage_sale_event_items" ON sale_event_items
  FOR ALL TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    AND sale_event_id IN (
      SELECT id FROM sale_events WHERE institution_id = (SELECT institution_id FROM profiles WHERE id = auth.uid())
    )
  )
  WITH CHECK (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    AND sale_event_id IN (
      SELECT id FROM sale_events WHERE institution_id = (SELECT institution_id FROM profiles WHERE id = auth.uid())
    )
  );

-- ═══ student_active_boosts RLS ═══
CREATE POLICY "student_select_own_boosts" ON student_active_boosts
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());

-- ═══ deadline_extensions RLS ═══
CREATE POLICY "student_select_own_extensions" ON deadline_extensions
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY "teacher_select_course_extensions" ON deadline_extensions
  FOR SELECT TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'teacher'
    AND assignment_id IN (
      SELECT a.id FROM assignments a
      JOIN courses c ON c.id = a.course_id
      WHERE c.teacher_id = auth.uid()
    )
  );

CREATE POLICY "admin_select_institution_extensions" ON deadline_extensions
  FOR SELECT TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    AND student_id IN (
      SELECT id FROM profiles WHERE institution_id = (SELECT institution_id FROM profiles WHERE id = auth.uid())
    )
  );;
