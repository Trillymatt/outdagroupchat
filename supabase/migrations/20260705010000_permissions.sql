-- Per-category edit permissions.
-- Owners can grant individual members edit/delete rights on lodging, food,
-- itinerary, and flight-suggestion items created by other people. This also
-- tightens today's overly-permissive default: previously ANY trip member
-- could update/delete ANY other member's lodging/restaurant/itinerary rows.
-- The new default is creator-or-owner-only, reopened per category via these
-- flags.

alter table public.trip_members
  add column can_edit_lodging boolean not null default false,
  add column can_edit_food boolean not null default false,
  add column can_edit_itinerary boolean not null default false,
  add column can_edit_flights boolean not null default false;

-- `trip_members` already exists (init migration), so this `language sql`
-- function can reference the new columns immediately — same ordering rule
-- documented in 20250101000000_init.sql applies: the ALTER TABLE above must
-- run before this CREATE FUNCTION in the same file.
create or replace function public.can_edit_category(target_trip_id uuid, category text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.trip_members tm
    where tm.trip_id = target_trip_id
      and tm.user_id = auth.uid()
      and (
        (category = 'lodging' and tm.can_edit_lodging)
        or (category = 'food' and tm.can_edit_food)
        or (category = 'itinerary' and tm.can_edit_itinerary)
        or (category = 'flights' and tm.can_edit_flights)
      )
  );
$$;

-- Owner-only RPC. Fixed set of boolean params (no dynamic column names / no
-- format()), so there's no SQL-injection surface. Passing null for a
-- category leaves it unchanged, so the client can flip one toggle at a time.
create or replace function public.set_trip_member_permission(
  p_trip_id uuid,
  p_user_id uuid,
  p_can_edit_lodging boolean default null,
  p_can_edit_food boolean default null,
  p_can_edit_itinerary boolean default null,
  p_can_edit_flights boolean default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_trip_owner(p_trip_id) then
    raise exception 'Only the trip owner can change member permissions';
  end if;

  update public.trip_members
  set
    can_edit_lodging = coalesce(p_can_edit_lodging, can_edit_lodging),
    can_edit_food = coalesce(p_can_edit_food, can_edit_food),
    can_edit_itinerary = coalesce(p_can_edit_itinerary, can_edit_itinerary),
    can_edit_flights = coalesce(p_can_edit_flights, can_edit_flights)
  where trip_id = p_trip_id and user_id = p_user_id;
end;
$$;

-- Tighten lodging/food/itinerary update+delete to creator-or-owner-or-permission.
drop policy "lodging_options_update" on public.lodging_options;
drop policy "lodging_options_delete" on public.lodging_options;
create policy "lodging_options_update" on public.lodging_options for update
  using (
    created_by = auth.uid()
    or public.is_trip_owner(trip_id)
    or public.can_edit_category(trip_id, 'lodging')
  );
create policy "lodging_options_delete" on public.lodging_options for delete
  using (
    created_by = auth.uid()
    or public.is_trip_owner(trip_id)
    or public.can_edit_category(trip_id, 'lodging')
  );

drop policy "restaurants_update" on public.restaurants;
drop policy "restaurants_delete" on public.restaurants;
create policy "restaurants_update" on public.restaurants for update
  using (
    created_by = auth.uid()
    or public.is_trip_owner(trip_id)
    or public.can_edit_category(trip_id, 'food')
  );
create policy "restaurants_delete" on public.restaurants for delete
  using (
    created_by = auth.uid()
    or public.is_trip_owner(trip_id)
    or public.can_edit_category(trip_id, 'food')
  );

drop policy "itinerary_items_update" on public.itinerary_items;
drop policy "itinerary_items_delete" on public.itinerary_items;
create policy "itinerary_items_update" on public.itinerary_items for update
  using (
    created_by = auth.uid()
    or public.is_trip_owner(trip_id)
    or public.can_edit_category(trip_id, 'itinerary')
  );
create policy "itinerary_items_delete" on public.itinerary_items for delete
  using (
    created_by = auth.uid()
    or public.is_trip_owner(trip_id)
    or public.can_edit_category(trip_id, 'itinerary')
  );

-- flights (the personal per-user tracker) is intentionally left untouched —
-- it's already scoped to `user_id = auth.uid()` and isn't a shared/creator
-- item like the other three.
