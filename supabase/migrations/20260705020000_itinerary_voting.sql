-- Itinerary link field + lightweight heart voting, matching the existing
-- lodging/restaurant voting pattern exactly.

alter table public.itinerary_items add column link text;

create table public.itinerary_votes (
  itinerary_item_id uuid not null references public.itinerary_items (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  trip_id uuid not null references public.trips (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (itinerary_item_id, user_id)
);

alter table public.itinerary_votes enable row level security;

create policy "itinerary_votes_select" on public.itinerary_votes for select
  using (public.is_trip_member(trip_id));
create policy "itinerary_votes_insert" on public.itinerary_votes for insert
  with check (
    user_id = auth.uid()
    and public.is_trip_member(trip_id)
    and trip_id = (select i.trip_id from public.itinerary_items i where i.id = itinerary_item_id)
  );
create policy "itinerary_votes_delete" on public.itinerary_votes for delete
  using (user_id = auth.uid());

alter publication supabase_realtime add table public.itinerary_votes;
