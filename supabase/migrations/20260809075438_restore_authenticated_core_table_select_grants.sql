-- Restore the minimum table-level read capability required by the authenticated
-- five-role application surface.  These grants do not authorize rows: every
-- table below remains protected by its existing RLS policies.
GRANT SELECT ON TABLE
  public.profiles,
  public.institutions,
  public.departments,
  public.programs,
  public.semesters,
  public.courses,
  public.course_sections,
  public.student_courses,
  public.assignments,
  public.journal_entries,
  public.parent_student_links,
  public.academic_calendar_events,
  public.learning_outcomes,
  public.outcome_mappings,
  public.outcome_attainment,
  public.submissions,
  public.grades,
  public.notifications,
  public.student_gamification
TO authenticated;
