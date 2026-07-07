-- Tandem — initial schema
-- Run this in the Supabase SQL editor, or via `supabase db push` if using the CLI.
--
-- Ordering matters here: `language sql` functions (is_trip_member, is_trip_owner, shares_trip_with)
-- are parsed and validated against the catalog at CREATE time, unlike `language plpgsql` functions
-- which defer validation to first call. So every table they reference must already exist before
-- they're defined — tables first, then the SQL helper functions, then everything that depends on them.

create extension if not exists pgcrypto;

-- =========================================================================
-- PROFILES  (extends auth.users — 1:1, created by trigger on signup)
-- =========================================================================
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  email text not null,
  phone_number text,
  sms_opt_in boolean not null default false,
  avatar_color text not null default '#16A34A',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Public-ish profile data for an auth.users row. Visible to self and anyone who shares a trip.';

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================================================================
-- Auto-create a profile row whenever a new auth.users row appears
-- =========================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, phone_number, sms_opt_in)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email,
    nullif(new.raw_user_meta_data ->> 'phone_number', ''),
    coalesce((new.raw_user_meta_data ->> 'sms_opt_in')::boolean, false)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =========================================================================
-- TRIPS
-- =========================================================================
-- plpgsql defers validation to first call, so this can reference public.trips
-- (used as its invite_code default) before that table exists below.
create or replace function public.gen_invite_code()
returns text
language plpgsql
as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- no O/0/I/1
  code text;
  exists_already boolean;
begin
  loop
    code := '';
    for i in 1..7 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    select exists(select 1 from public.trips t where t.invite_code = code) into exists_already;
    exit when not exists_already;
  end loop;
  return code;
end;
$$;

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  destination text,
  start_date date,
  end_date date,
  dates_locked boolean not null default false,
  cover_image text,
  invite_code text not null unique default public.gen_invite_code(),
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trips_set_updated_at
  before update on public.trips
  for each row execute procedure public.set_updated_at();

-- Proposed date ranges members can vote on before dates are locked
create table public.trip_date_proposals (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  start_date date not null,
  end_date date not null,
  proposed_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

-- trip_id is denormalized (redundant with trip_date_proposals.trip_id) so realtime
-- subscriptions can filter on it directly; enforced to match via the insert policy below.
create table public.trip_date_votes (
  proposal_id uuid not null references public.trip_date_proposals (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  trip_id uuid not null references public.trips (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (proposal_id, user_id)
);

-- =========================================================================
-- TRIP MEMBERS
-- =========================================================================
create table public.trip_members (
  trip_id uuid not null references public.trips (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  display_name text not null,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (trip_id, user_id)
);

-- =========================================================================
-- Helper functions (SECURITY DEFINER to avoid RLS recursion) — trip_members
-- must exist before these, since `language sql` functions are validated at
-- CREATE time.
-- =========================================================================
create or replace function public.is_trip_member(target_trip_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.trip_members tm
    where tm.trip_id = target_trip_id and tm.user_id = auth.uid()
  );
$$;

create or replace function public.is_trip_owner(target_trip_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.trip_members tm
    where tm.trip_id = target_trip_id and tm.user_id = auth.uid() and tm.role = 'owner'
  );
$$;

create or replace function public.shares_trip_with(other_user uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.trip_members mine
    join public.trip_members theirs on theirs.trip_id = mine.trip_id
    where mine.user_id = auth.uid() and theirs.user_id = other_user
  );
$$;

-- =========================================================================
-- Trip-scoped RPCs (atomic create/join/leave/remove — bypass RLS via definer)
-- =========================================================================
create or replace function public.create_trip(
  p_name text,
  p_destination text default null,
  p_start_date date default null,
  p_end_date date default null
)
returns public.trips
language plpgsql
security definer
set search_path = public
as $$
declare
  new_trip public.trips;
  display text;
begin
  select coalesce(name, split_part(email, '@', 1)) into display from public.profiles where id = auth.uid();

  insert into public.trips (name, destination, start_date, end_date, created_by)
  values (p_name, p_destination, p_start_date, p_end_date, auth.uid())
  returning * into new_trip;

  insert into public.trip_members (trip_id, user_id, display_name, role)
  values (new_trip.id, auth.uid(), display, 'owner');

  return new_trip;
end;
$$;

create or replace function public.join_trip_by_code(p_invite_code text)
returns public.trips
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.trips;
  display text;
begin
  select * into target from public.trips where invite_code = upper(p_invite_code);

  if target.id is null then
    raise exception 'Invite code not found';
  end if;

  select coalesce(name, split_part(email, '@', 1)) into display from public.profiles where id = auth.uid();

  insert into public.trip_members (trip_id, user_id, display_name, role)
  values (target.id, auth.uid(), display, 'member')
  on conflict (trip_id, user_id) do nothing;

  return target;
end;
$$;

create or replace function public.leave_trip(p_trip_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.trip_members where trip_id = p_trip_id and user_id = auth.uid();
end;
$$;

create or replace function public.remove_trip_member(p_trip_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_trip_owner(p_trip_id) then
    raise exception 'Only the trip owner can remove members';
  end if;
  delete from public.trip_members where trip_id = p_trip_id and user_id = p_user_id;
end;
$$;

create or replace function public.delete_trip(p_trip_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_trip_owner(p_trip_id) then
    raise exception 'Only the trip owner can delete the trip';
  end if;
  delete from public.trips where id = p_trip_id;
end;
$$;

-- =========================================================================
-- FLIGHTS  (one row per member per trip)
-- =========================================================================
create table public.flights (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'searching' check (status in ('searching', 'booked', 'opted_out')),
  airline text,
  flight_number text,
  price numeric(10, 2),
  departure_airport text,
  arrival_airport text,
  departure_time timestamptz,
  arrival_time timestamptz,
  booking_link text,
  notes text,
  locked_in boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (trip_id, user_id)
);

create trigger flights_set_updated_at
  before update on public.flights
  for each row execute procedure public.set_updated_at();

-- =========================================================================
-- LODGING
-- =========================================================================
create table public.lodging_options (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  name text not null,
  url text,
  price_per_night numeric(10, 2),
  notes text,
  status text not null default 'proposed' check (status in ('proposed', 'booked')),
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger lodging_options_set_updated_at
  before update on public.lodging_options
  for each row execute procedure public.set_updated_at();

-- trip_id is denormalized (redundant with lodging_options.trip_id) so realtime
-- subscriptions can filter on it directly; enforced to match via the insert policy below.
create table public.lodging_votes (
  lodging_option_id uuid not null references public.lodging_options (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  trip_id uuid not null references public.trips (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (lodging_option_id, user_id)
);

-- =========================================================================
-- ITINERARY
-- =========================================================================
create table public.itinerary_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  day date not null,
  time time,
  title text not null,
  description text,
  location text,
  category text not null default 'activity' check (category in ('activity', 'food', 'transport', 'lodging', 'other')),
  cost numeric(10, 2),
  position double precision not null default 0,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger itinerary_items_set_updated_at
  before update on public.itinerary_items
  for each row execute procedure public.set_updated_at();

create index itinerary_items_trip_day_idx on public.itinerary_items (trip_id, day, position);

-- =========================================================================
-- FOOD / RESTAURANTS
-- =========================================================================
create table public.restaurants (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  name text not null,
  url text,
  cuisine text,
  notes text,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

-- trip_id is denormalized (redundant with restaurants.trip_id) so realtime
-- subscriptions can filter on it directly; enforced to match via the insert policy below.
create table public.restaurant_votes (
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  trip_id uuid not null references public.trips (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (restaurant_id, user_id)
);

-- =========================================================================
-- AI SUGGESTIONS
-- =========================================================================
create table public.ai_suggestions (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  type text not null check (type in ('itinerary', 'restaurant', 'packing', 'budget', 'catch_me_up')),
  content jsonb not null,
  status text not null default 'suggested' check (status in ('suggested', 'accepted', 'dismissed')),
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create index ai_suggestions_trip_type_idx on public.ai_suggestions (trip_id, type, status);

-- Packing list items (generated by AI or added manually), checked off per-member
create table public.packing_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  label text not null,
  category text,
  source text not null default 'manual' check (source in ('ai', 'manual')),
  created_at timestamptz not null default now()
);

-- trip_id is denormalized (redundant with packing_items.trip_id) so realtime
-- subscriptions can filter on it directly; enforced to match via the insert policy below.
create table public.packing_item_checks (
  packing_item_id uuid not null references public.packing_items (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  trip_id uuid not null references public.trips (id) on delete cascade,
  checked boolean not null default true,
  primary key (packing_item_id, user_id)
);

-- =========================================================================
-- ROW LEVEL SECURITY
-- =========================================================================
alter table public.profiles enable row level security;
alter table public.trips enable row level security;
alter table public.trip_date_proposals enable row level security;
alter table public.trip_date_votes enable row level security;
alter table public.trip_members enable row level security;
alter table public.flights enable row level security;
alter table public.lodging_options enable row level security;
alter table public.lodging_votes enable row level security;
alter table public.itinerary_items enable row level security;
alter table public.restaurants enable row level security;
alter table public.restaurant_votes enable row level security;
alter table public.ai_suggestions enable row level security;
alter table public.packing_items enable row level security;
alter table public.packing_item_checks enable row level security;

-- profiles: self, or anyone who shares a trip with you
create policy "profiles_select" on public.profiles for select
  using (auth.uid() = id or public.shares_trip_with(id));
create policy "profiles_update_self" on public.profiles for update
  using (auth.uid() = id);

-- trips: members only. Insert/delete goes through the RPCs above.
create policy "trips_select" on public.trips for select
  using (public.is_trip_member(id));
create policy "trips_update" on public.trips for update
  using (public.is_trip_member(id));
create policy "trips_delete_owner" on public.trips for delete
  using (public.is_trip_owner(id));

-- trip_date_proposals / votes
create policy "date_proposals_select" on public.trip_date_proposals for select
  using (public.is_trip_member(trip_id));
create policy "date_proposals_insert" on public.trip_date_proposals for insert
  with check (public.is_trip_member(trip_id) and proposed_by = auth.uid());
create policy "date_proposals_delete" on public.trip_date_proposals for delete
  using (public.is_trip_member(trip_id));

create policy "date_votes_select" on public.trip_date_votes for select
  using (public.is_trip_member(trip_id));
create policy "date_votes_insert" on public.trip_date_votes for insert
  with check (
    user_id = auth.uid()
    and public.is_trip_member(trip_id)
    and trip_id = (select p.trip_id from public.trip_date_proposals p where p.id = proposal_id)
  );
create policy "date_votes_delete" on public.trip_date_votes for delete
  using (user_id = auth.uid());

-- trip_members: visible to fellow members; self-update display_name; leave/remove via RPCs
create policy "trip_members_select" on public.trip_members for select
  using (public.is_trip_member(trip_id));
create policy "trip_members_update_self" on public.trip_members for update
  using (user_id = auth.uid());
create policy "trip_members_delete_self_or_owner" on public.trip_members for delete
  using (user_id = auth.uid() or public.is_trip_owner(trip_id));

-- flights: any trip member can see all flights; only the owning member can write their own row
create policy "flights_select" on public.flights for select
  using (public.is_trip_member(trip_id));
create policy "flights_insert" on public.flights for insert
  with check (public.is_trip_member(trip_id) and user_id = auth.uid());
create policy "flights_update" on public.flights for update
  using (public.is_trip_member(trip_id) and user_id = auth.uid());
create policy "flights_delete" on public.flights for delete
  using (public.is_trip_member(trip_id) and user_id = auth.uid());

-- lodging_options
create policy "lodging_options_select" on public.lodging_options for select
  using (public.is_trip_member(trip_id));
create policy "lodging_options_insert" on public.lodging_options for insert
  with check (public.is_trip_member(trip_id) and created_by = auth.uid());
create policy "lodging_options_update" on public.lodging_options for update
  using (public.is_trip_member(trip_id));
create policy "lodging_options_delete" on public.lodging_options for delete
  using (public.is_trip_member(trip_id));

create policy "lodging_votes_select" on public.lodging_votes for select
  using (public.is_trip_member(trip_id));
create policy "lodging_votes_insert" on public.lodging_votes for insert
  with check (
    user_id = auth.uid()
    and public.is_trip_member(trip_id)
    and trip_id = (select o.trip_id from public.lodging_options o where o.id = lodging_option_id)
  );
create policy "lodging_votes_delete" on public.lodging_votes for delete
  using (user_id = auth.uid());

-- itinerary_items
create policy "itinerary_items_select" on public.itinerary_items for select
  using (public.is_trip_member(trip_id));
create policy "itinerary_items_insert" on public.itinerary_items for insert
  with check (public.is_trip_member(trip_id) and created_by = auth.uid());
create policy "itinerary_items_update" on public.itinerary_items for update
  using (public.is_trip_member(trip_id));
create policy "itinerary_items_delete" on public.itinerary_items for delete
  using (public.is_trip_member(trip_id));

-- restaurants
create policy "restaurants_select" on public.restaurants for select
  using (public.is_trip_member(trip_id));
create policy "restaurants_insert" on public.restaurants for insert
  with check (public.is_trip_member(trip_id) and created_by = auth.uid());
create policy "restaurants_update" on public.restaurants for update
  using (public.is_trip_member(trip_id));
create policy "restaurants_delete" on public.restaurants for delete
  using (public.is_trip_member(trip_id));

create policy "restaurant_votes_select" on public.restaurant_votes for select
  using (public.is_trip_member(trip_id));
create policy "restaurant_votes_insert" on public.restaurant_votes for insert
  with check (
    user_id = auth.uid()
    and public.is_trip_member(trip_id)
    and trip_id = (select r.trip_id from public.restaurants r where r.id = restaurant_id)
  );
create policy "restaurant_votes_delete" on public.restaurant_votes for delete
  using (user_id = auth.uid());

-- ai_suggestions
create policy "ai_suggestions_select" on public.ai_suggestions for select
  using (public.is_trip_member(trip_id));
create policy "ai_suggestions_insert" on public.ai_suggestions for insert
  with check (public.is_trip_member(trip_id));
create policy "ai_suggestions_update" on public.ai_suggestions for update
  using (public.is_trip_member(trip_id));
create policy "ai_suggestions_delete" on public.ai_suggestions for delete
  using (public.is_trip_member(trip_id));

-- packing_items / checks
create policy "packing_items_select" on public.packing_items for select
  using (public.is_trip_member(trip_id));
create policy "packing_items_insert" on public.packing_items for insert
  with check (public.is_trip_member(trip_id));
create policy "packing_items_delete" on public.packing_items for delete
  using (public.is_trip_member(trip_id));

create policy "packing_item_checks_select" on public.packing_item_checks for select
  using (public.is_trip_member(trip_id));
create policy "packing_item_checks_upsert" on public.packing_item_checks for insert
  with check (
    user_id = auth.uid()
    and public.is_trip_member(trip_id)
    and trip_id = (select i.trip_id from public.packing_items i where i.id = packing_item_id)
  );
create policy "packing_item_checks_update" on public.packing_item_checks for update
  using (user_id = auth.uid());
create policy "packing_item_checks_delete" on public.packing_item_checks for delete
  using (user_id = auth.uid());

-- =========================================================================
-- Realtime: add tables to the supabase_realtime publication
-- =========================================================================
alter publication supabase_realtime add table
  public.trips,
  public.trip_members,
  public.flights,
  public.lodging_options,
  public.lodging_votes,
  public.itinerary_items,
  public.restaurants,
  public.restaurant_votes,
  public.ai_suggestions,
  public.packing_items,
  public.packing_item_checks,
  public.trip_date_proposals,
  public.trip_date_votes;
