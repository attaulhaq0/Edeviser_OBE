
begin;

-- The live database already had these tables when this repair was applied.
-- Keep a clean replay deterministic when the later consolidated migration
-- (20260823000013) is the first local definition of the communication schema.
create table if not exists public.communication_threads (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id),
  course_id uuid references public.courses(id),
  subject text not null,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.communication_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.communication_threads(id) on delete cascade,
  sender_id uuid not null references public.profiles(id),
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.communication_reads (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.communication_messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  read_at timestamptz not null default now(),
  unique(message_id, user_id)
);

drop policy if exists "communication_threads_access" on public.communication_threads;
drop policy if exists "communication_messages_access" on public.communication_messages;
drop policy if exists "communication_reads_access" on public.communication_reads;

drop table if exists public.communication_thread_participants;
create table public.communication_thread_participants (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.communication_threads(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  role varchar(30) not null,
  joined_at timestamptz not null default now(),
  unique (thread_id, user_id)
);
create index communication_thread_participants_thread_idx
  on public.communication_thread_participants(thread_id);
create index communication_thread_participants_user_idx
  on public.communication_thread_participants(user_id);

alter table public.communication_thread_participants enable row level security;

drop function if exists public.auth_user_is_thread_participant(uuid);
create function public.auth_user_is_thread_participant(p_thread_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.communication_thread_participants p
    where p.thread_id = p_thread_id
      and p.user_id = (select auth.uid())
  );
$$;

revoke all on function public.auth_user_is_thread_participant(uuid) from public, anon;
grant execute on function public.auth_user_is_thread_participant(uuid) to authenticated;

create policy "communication_thread_participants_read"
  on public.communication_thread_participants
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1
      from public.communication_threads t
      where t.id = thread_id
        and t.created_by = (select auth.uid())
    )
    or (
      public.auth_user_role() = 'admin'
      and exists (
        select 1
        from public.communication_threads t
        where t.id = thread_id
          and t.institution_id = public.auth_institution_id()
      )
    )
  );

create policy "communication_thread_participants_insert"
  on public.communication_thread_participants
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    or exists (
      select 1
      from public.communication_threads t
      where t.id = thread_id
        and t.created_by = (select auth.uid())
    )
    or (
      public.auth_user_role() = 'admin'
      and exists (
        select 1
        from public.communication_threads t
        where t.id = thread_id
          and t.institution_id = public.auth_institution_id()
      )
    )
  );

create policy "communication_threads_participant_read"
  on public.communication_threads
  for select to authenticated
  using (
    created_by = (select auth.uid())
    or public.auth_user_is_thread_participant(id)
    or (
      public.auth_user_role() = 'admin'
      and institution_id = public.auth_institution_id()
    )
  );

create policy "communication_messages_participant_access"
  on public.communication_messages
  for all to authenticated
  using (
    sender_id = (select auth.uid())
    or public.auth_user_is_thread_participant(thread_id)
    or (
      public.auth_user_role() = 'admin'
      and thread_id in (
        select t.id
        from public.communication_threads t
        where t.institution_id = public.auth_institution_id()
      )
    )
  )
  with check (
    sender_id = (select auth.uid())
    and public.auth_user_is_thread_participant(thread_id)
  );

create policy "communication_reads_participant_access"
  on public.communication_reads
  for all to authenticated
  using (
    user_id = (select auth.uid())
    and public.auth_user_is_thread_participant(
      (select m.thread_id from public.communication_messages m where m.id = message_id)
    )
  )
  with check (
    user_id = (select auth.uid())
    and public.auth_user_is_thread_participant(
      (select m.thread_id from public.communication_messages m where m.id = message_id)
    )
  );

commit;
