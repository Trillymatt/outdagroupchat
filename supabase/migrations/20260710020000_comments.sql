-- Threaded discussion on trip items. `target_type` + `target_id` is a
-- polymorphic reference (no FK) to the lodging option / restaurant /
-- itinerary item / flight suggestion being discussed.

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  user_id uuid not null references public.profiles (id),
  target_type text not null check (target_type in ('lodging', 'restaurant', 'itinerary', 'flight_suggestion')),
  target_id uuid not null,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index comments_trip_target_idx on public.comments (trip_id, target_type, target_id);

alter table public.comments enable row level security;

create policy "comments_select" on public.comments for select
  using (public.is_trip_member(trip_id));
create policy "comments_insert" on public.comments for insert
  with check (public.is_trip_member(trip_id) and user_id = auth.uid());
create policy "comments_delete" on public.comments for delete
  using (user_id = auth.uid());

alter publication supabase_realtime add table public.comments;
