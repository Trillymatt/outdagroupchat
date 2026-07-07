-- Shared flight suggestion board — separate from the personal per-user
-- `flights` tracker. Populated by the live flight-search feature ("suggest
-- to group") and voted on the same way lodging options are.

create table public.flight_suggestions (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  airline text,
  flight_number text,
  price numeric(10, 2),
  departure_airport text,
  arrival_airport text,
  departure_time timestamptz,
  arrival_time timestamptz,
  nonstop boolean not null default false,
  booking_link text,
  notes text,
  status text not null default 'proposed' check (status in ('proposed', 'booked')),
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger flight_suggestions_set_updated_at
  before update on public.flight_suggestions
  for each row execute procedure public.set_updated_at();

create table public.flight_suggestion_votes (
  flight_suggestion_id uuid not null references public.flight_suggestions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  trip_id uuid not null references public.trips (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (flight_suggestion_id, user_id)
);

alter table public.flight_suggestions enable row level security;
alter table public.flight_suggestion_votes enable row level security;

create policy "flight_suggestions_select" on public.flight_suggestions for select
  using (public.is_trip_member(trip_id));
create policy "flight_suggestions_insert" on public.flight_suggestions for insert
  with check (public.is_trip_member(trip_id) and created_by = auth.uid());
create policy "flight_suggestions_update" on public.flight_suggestions for update
  using (
    created_by = auth.uid()
    or public.is_trip_owner(trip_id)
    or public.can_edit_category(trip_id, 'flights')
  );
create policy "flight_suggestions_delete" on public.flight_suggestions for delete
  using (
    created_by = auth.uid()
    or public.is_trip_owner(trip_id)
    or public.can_edit_category(trip_id, 'flights')
  );

create policy "flight_suggestion_votes_select" on public.flight_suggestion_votes for select
  using (public.is_trip_member(trip_id));
create policy "flight_suggestion_votes_insert" on public.flight_suggestion_votes for insert
  with check (
    user_id = auth.uid()
    and public.is_trip_member(trip_id)
    and trip_id = (select f.trip_id from public.flight_suggestions f where f.id = flight_suggestion_id)
  );
create policy "flight_suggestion_votes_delete" on public.flight_suggestion_votes for delete
  using (user_id = auth.uid());

alter publication supabase_realtime add table public.flight_suggestions, public.flight_suggestion_votes;
