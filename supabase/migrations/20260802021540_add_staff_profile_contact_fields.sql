alter table public.profiles
  add column if not exists phone text,
  add column if not exists office_location text,
  add column if not exists office_hours text,
  add column if not exists bio text;
