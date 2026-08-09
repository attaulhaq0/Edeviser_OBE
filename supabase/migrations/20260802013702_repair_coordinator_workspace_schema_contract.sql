CREATE OR REPLACE FUNCTION public.get_coordinator_workspace()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := auth.uid();
  v_inst_id uuid;
  v_role text;
  v_target numeric := 80;
  v_result jsonb;
begin
  if v_uid is null then
    raise exception 'insufficient_privilege: Authentication required' using errcode = '42501';
  end if;

  select institution_id, role into v_inst_id, v_role
  from public.profiles
  where id = v_uid and is_active = true and role in ('coordinator', 'admin');

  if v_inst_id is null then
    raise exception 'insufficient_privilege: Coordinator or Admin role required' using errcode = '42501';
  end if;

  with assigned_programs as (
    select p.id, p.name
    from public.programs p
    where p.institution_id = v_inst_id
      and (v_role = 'admin' or p.coordinator_id = v_uid)
  ),
  assigned_courses as (
    select c.id, c.program_id
    from public.courses c
    join assigned_programs p on p.id = c.program_id
    where c.is_active = true
  ),
  plos as (
    select lo.id, lo.title, ap.name program_name
    from public.learning_outcomes lo
    join assigned_programs ap on ap.id = lo.program_id
    where lo.type = 'PLO'
  ),
  plo_attainment as (
    select p.id, p.title, p.program_name,
      round(avg(oa.attainment_percent), 1) attainment,
      count(oa.id)::int evidence_count
    from plos p
    left join public.outcome_attainment oa
      on oa.outcome_id = p.id
     and oa.scope in ('program', 'course', 'institution')
    group by p.id, p.title, p.program_name
  ),
  mappings as (
    select distinct source_outcome_id outcome_id from public.outcome_mappings
    union
    select distinct target_outcome_id outcome_id from public.outcome_mappings
  ),
  coverage as (
    select count(*) filter (where lo.type = 'CLO')::int total_clos,
      count(*) filter (where lo.type = 'CLO' and m.outcome_id is not null)::int mapped_clos
    from public.learning_outcomes lo
    join assigned_courses ac on ac.id = lo.course_id
    left join mappings m on m.outcome_id = lo.id
  ),
  cqi as (
    select count(*)::int total,
      count(*) filter (where cq.status = 'planned')::int planned,
      count(*) filter (where cq.status = 'in_progress')::int in_progress,
      count(*) filter (where cq.status = 'evaluated')::int evaluated,
      count(*) filter (where cq.status in ('completed', 'evaluated'))::int closed
    from public.cqi_action_plans cq
    join assigned_programs ap on ap.id = cq.program_id
  ),
  compliance as (
    select count(*)::int courses,
      count(*) filter (where exists (
        select 1 from public.learning_outcomes lo
        where lo.course_id = ac.id and lo.type = 'CLO'
      ))::int courses_with_clo
    from assigned_courses ac
  ),
  accreditation as (
    select
      (select count(*)::int from public.program_accreditations pa join assigned_programs ap on ap.id = pa.program_id) configurations,
      (select count(*)::int from public.accreditation_approvals s
        where s.program_id in (select id from assigned_programs)
          and s.status = 'done') approved_stages,
      (select count(*)::int from public.accreditation_approvals s
        where s.program_id in (select id from assigned_programs)
          and s.status not in ('done', 'completed')) pending_stages,
      (select count(*)::int from public.accreditation_report_jobs j
        where j.program_id in (select id from assigned_programs)) report_jobs,
      (select count(*)::int from public.accreditation_generated_reports r
        where r.program_id in (select id from assigned_programs)) generated_reports
  )
  select jsonb_build_object(
    'assignedPrograms', (select count(*)::int from assigned_programs),
    'courseCount', (select count(*)::int from assigned_courses),
    'ploCount', (select count(*)::int from plos),
    'targetAttainment', v_target,
    'belowTargetCount', (select count(*)::int from plo_attainment where attainment is null or attainment < v_target),
    'ploAttainment', coalesce((select jsonb_agg(jsonb_build_object(
      'id', id, 'title', title, 'program', program_name,
      'attainment', attainment, 'evidenceCount', evidence_count,
      'belowTarget', attainment is null or attainment < v_target
    ) order by title) from plo_attainment), '[]'::jsonb),
    'coverage', jsonb_build_object(
      'totalClos', (select total_clos from coverage),
      'mappedClos', (select mapped_clos from coverage),
      'coveragePercent', case when (select total_clos from coverage) > 0
        then round(((select mapped_clos from coverage)::numeric / (select total_clos from coverage)) * 100)
        else 0 end,
      'status', case
        when (select total_clos from coverage) = 0 then 'insufficientEvidence'
        when (select mapped_clos from coverage) = (select total_clos from coverage) then 'complete'
        else 'gaps' end
    ),
    'cqi', (select jsonb_build_object(
      'planned', planned, 'inProgress', in_progress, 'evaluated', evaluated,
      'total', total, 'closed', closed
    ) from cqi),
    'accreditation', (select jsonb_build_object(
      'configurations', configurations, 'approvedStages', approved_stages,
      'pendingStages', pending_stages, 'reportJobs', report_jobs,
      'generatedReports', generated_reports
    ) from accreditation),
    'teacherCompliance', jsonb_build_object(
      'courses', (select courses from compliance),
      'coursesWithClo', (select courses_with_clo from compliance),
      'percent', case when (select courses from compliance) > 0
        then round(((select courses_with_clo from compliance)::numeric / (select courses from compliance)) * 100)
        else 0 end
    ),
    'calculatedAt', now()
  ) into v_result;

  return v_result;
end;
$function$
;
REVOKE ALL ON FUNCTION public.get_coordinator_workspace() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_coordinator_workspace() TO authenticated;
