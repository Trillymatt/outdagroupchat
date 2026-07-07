-- Free/busy date availability, alongside (not replacing) the existing
-- date-range proposal voting. Presence of a row means that user is free
-- that day — no boolean needed, toggle is insert-if-absent/delete-if-present,
-- same shape as the vote tables.

create table public.trip_date_availability (
  trip_id uuid not null references public.trips (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  date date not null,
  created_at timestamptz not null default now(),
  primary key (trip_id, user_id, date)
);

alter table public.trip_date_availability enable row level security;

create policy "trip_date_availability_select" on public.trip_date_availability for select
  using (public.is_trip_member(trip_id));
create policy "trip_date_availability_insert" on public.trip_date_availability for insert
  with check (public.is_trip_member(trip_id) and user_id = auth.uid());
create policy "trip_date_availability_delete" on public.trip_date_availability for delete
  using (user_id = auth.uid());

alter publication supabase_realtime add table public.trip_date_availability;
