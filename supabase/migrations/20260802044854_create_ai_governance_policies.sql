create table if not exists public.ai_governance_policies (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  action_key text not null check (action_key in (
    'showInsights',
    'suggestAction',
    'scheduleReviews',
    'reorderPlan',
    'sendStudentNudge',
    'draftTeacherFeedback',
    'generateEvidencePack',
    'sendParentCommunication',
    'assignGrade',
    'publishContent'
  )),
  level text not null check (level in ('A0', 'A1', 'A2', 'A3')),
  hard_cap text check (hard_cap is null or hard_cap in ('A0', 'A1', 'A2', 'A3')),
  sensitive boolean not null default false,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (institution_id, action_key),
  check (hard_cap is null or hard_cap <> 'A3' or level = 'A3')
);

alter table public.ai_governance_policies enable row level security;

revoke all on table public.ai_governance_policies from anon;
grant select, insert, update on table public.ai_governance_policies to authenticated;

drop policy if exists "ai_governance_admin_select" on public.ai_governance_policies;
create policy "ai_governance_admin_select"
on public.ai_governance_policies
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'
      and p.institution_id = ai_governance_policies.institution_id
      and p.is_active = true
  )
);

drop policy if exists "ai_governance_admin_insert" on public.ai_governance_policies;
create policy "ai_governance_admin_insert"
on public.ai_governance_policies
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'
      and p.institution_id = ai_governance_policies.institution_id
      and p.is_active = true
  )
  and (updated_by is null or updated_by = (select auth.uid()))
);

drop policy if exists "ai_governance_admin_update" on public.ai_governance_policies;
create policy "ai_governance_admin_update"
on public.ai_governance_policies
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'
      and p.institution_id = ai_governance_policies.institution_id
      and p.is_active = true
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'
      and p.institution_id = ai_governance_policies.institution_id
      and p.is_active = true
  )
  and (updated_by is null or updated_by = (select auth.uid()))
);
