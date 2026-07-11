-- Per-trip activity feed. Rows are append-only event summaries ("Alex added
-- a lodging option", ...) written alongside the actions themselves.

create table public.activity_events (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  user_id uuid references public.profiles (id),
  event_type text not null,
  summary text not null,
  created_at timestamptz not null default now()
);

create index activity_events_trip_created_idx on public.activity_events (trip_id, created_at desc);

alter table public.activity_events enable row level security;

create policy "activity_events_select" on public.activity_events for select
  using (public.is_trip_member(trip_id));
create policy "activity_events_insert" on public.activity_events for insert
  with check (public.is_trip_member(trip_id) and user_id = auth.uid());

alter publication supabase_realtime add table public.activity_events;
