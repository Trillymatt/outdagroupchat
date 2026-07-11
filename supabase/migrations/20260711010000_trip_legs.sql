-- Multi-city trips: an optional ordered set of legs (cities), each with its
-- own date range and cover image. A trip with no legs behaves exactly as
-- before. Itinerary days are grouped under whichever leg's date range
-- contains them (computed in the app, not stored) — legs don't touch
-- lodging, food, flights, or budget, which stay trip-wide.
create table public.trip_legs (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  city text not null,
  start_date date not null,
  end_date date not null,
  cover_image text,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  constraint trip_legs_date_order check (end_date >= start_date)
);

create index trip_legs_trip_idx on public.trip_legs (trip_id, start_date);

alter table public.trip_legs enable row level security;

-- Legs are trip metadata, not a votable/ownable proposal — same "anyone on
-- the trip can edit" policy as the trip's own name/destination/dates.
create policy "trip_legs_select" on public.trip_legs for select
  using (public.is_trip_member(trip_id));
create policy "trip_legs_insert" on public.trip_legs for insert
  with check (public.is_trip_member(trip_id) and created_by = auth.uid());
create policy "trip_legs_update" on public.trip_legs for update
  using (public.is_trip_member(trip_id))
  with check (public.is_trip_member(trip_id));
create policy "trip_legs_delete" on public.trip_legs for delete
  using (public.is_trip_member(trip_id));

alter publication supabase_realtime add table public.trip_legs;

-- select/insert/delete are covered by the default privilege
-- 20260710070000_grant_table_privileges.sql set up for role postgres; update
-- is column-scoped here to keep trip_id/created_by/created_at immutable,
-- matching every other trip-scoped table's grants.
grant update (city, start_date, end_date, cover_image) on public.trip_legs to authenticated;
