create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reported_user_id uuid,
  message_id uuid,
  space_id uuid,
  reason text,
  created_at timestamptz default now()
);
create table if not exists public.blocked_users (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null,
  created_at timestamptz default now(),
  primary key (blocker_id, blocked_id)
);
alter table public.reports enable row level security;
alter table public.blocked_users enable row level security;
drop policy if exists "reports insert own" on public.reports;
create policy "reports insert own" on public.reports for insert to authenticated with check (reporter_id = auth.uid());
drop policy if exists "reports admin read" on public.reports;
create policy "reports admin read" on public.reports for select to authenticated using (auth.uid() = '95827d6e-d632-4807-bb8e-90c693998120');
drop policy if exists "blocks own" on public.blocked_users;
create policy "blocks own" on public.blocked_users for all to authenticated using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());
