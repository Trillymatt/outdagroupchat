-- One row per (trip, member) — lets a short "what do you want out of this
-- trip" quiz be captured per person and aggregated across the group later,
-- rather than a single shared answer per trip.
create table public.trip_preferences (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (trip_id, user_id)
);

alter table public.trip_preferences enable row level security;

-- Trip-wide visibility (same ethos as votes/flights: anyone on the trip sees
-- everyone's answers), self-scoped writes.
create policy "trip_preferences_select" on public.trip_preferences for select
  using (public.is_trip_member(trip_id));
create policy "trip_preferences_insert" on public.trip_preferences for insert
  with check (user_id = auth.uid() and public.is_trip_member(trip_id));
-- WITH CHECK is required (not just USING) even though only user_id=auth.uid()
-- rows are ever visible to update — without it, a client could UPDATE its own
-- row's trip_id to an arbitrary trip it's not a member of. Explicit here
-- rather than relying on USING-as-WITH-CHECK fallback, to make the intent
-- clear.
create policy "trip_preferences_update" on public.trip_preferences for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.is_trip_member(trip_id));

-- Table-level (not column-scoped) UPDATE grant: the client writes via
-- upsert() (INSERT ... ON CONFLICT DO UPDATE), and Postgres requires
-- table-level UPDATE privilege for that statement form even when only
-- specific columns appear in the SET clause — column-scoped grants (the
-- pattern used elsewhere in this codebase for plain UPDATE statements) are
-- silently insufficient here and fail with a permission-denied error that
-- upsert()'s typical `const { data } = await ...` call site won't surface.
grant update on public.trip_preferences to authenticated;

alter publication supabase_realtime add table public.trip_preferences;
