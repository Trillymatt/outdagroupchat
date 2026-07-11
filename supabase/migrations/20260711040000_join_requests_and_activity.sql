-- =========================================================================
-- JOIN-APPROVAL FLOW
-- Joining a trip now requires the owner to approve a request instead of
-- adding the member immediately. All writes go through security-definer
-- RPCs (same pattern as create_trip/join_trip_by_code/set_trip_member_permission)
-- so there's no direct insert/update policy on the table itself.
-- =========================================================================

create table public.trip_join_requests (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'denied')),
  requested_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references public.profiles (id),
  unique (trip_id, user_id)
);

create index trip_join_requests_trip_status_idx on public.trip_join_requests (trip_id, status);

alter table public.trip_join_requests enable row level security;

create policy "trip_join_requests_select" on public.trip_join_requests for select
  using (user_id = auth.uid() or public.is_trip_owner(trip_id));

-- The requester isn't a trip member yet, so the existing profiles_select
-- policy (self or shares_trip_with) wouldn't let the owner see their name
-- while deciding. Additive — RLS SELECT policies are OR'd together, so this
-- only widens visibility for this specific case, it doesn't narrow anything.
create policy "profiles_select_for_join_requesters" on public.profiles for select
  using (
    exists (
      select 1 from public.trip_join_requests tjr
      where tjr.user_id = profiles.id and public.is_trip_owner(tjr.trip_id)
    )
  );

alter publication supabase_realtime add table public.trip_join_requests;

-- Upserts a pending request; re-requesting after a denial flips it back to
-- pending. Short-circuits with already_member=true if the caller is already
-- on the trip (keeps the one-tap-link UX for existing/approved members).
create or replace function public.request_to_join(p_invite_code text)
-- Output columns are prefixed `out_` — plpgsql exposes RETURNS TABLE columns
-- as bare variables in scope for the whole function body, and `trip_id`
-- collides with the real column of the same name referenced below (INSERT
-- column list / ON CONFLICT target), causing "column reference is ambiguous".
returns table (out_trip_id uuid, out_trip_name text, out_status text, out_already_member boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.trips;
  existing_member boolean;
begin
  select * into target from public.trips where invite_code = upper(p_invite_code);
  if target.id is null then
    raise exception 'Invite code not found';
  end if;

  select exists(
    select 1 from public.trip_members tm where tm.trip_id = target.id and tm.user_id = auth.uid()
  ) into existing_member;

  if existing_member then
    return query select target.id, target.name, 'approved'::text, true;
    return;
  end if;

  insert into public.trip_join_requests (trip_id, user_id, status, requested_at, decided_at, decided_by)
  values (target.id, auth.uid(), 'pending', now(), null, null)
  on conflict (trip_id, user_id) do update
    set status = 'pending', requested_at = now(), decided_at = null, decided_by = null;

  return query select target.id, target.name, 'pending'::text, false;
end;
$$;

-- Owner-only. Creates the trip_members row with the given initial
-- permissions and marks the request approved, in one transaction.
create or replace function public.approve_join_request(
  p_request_id uuid,
  p_can_edit_lodging boolean default false,
  p_can_edit_food boolean default false,
  p_can_edit_itinerary boolean default false,
  p_can_edit_flights boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  req public.trip_join_requests;
  display text;
begin
  select * into req from public.trip_join_requests where id = p_request_id;
  if req.id is null then
    raise exception 'Join request not found';
  end if;
  if not public.is_trip_owner(req.trip_id) then
    raise exception 'Only the trip owner can approve join requests';
  end if;
  if req.status != 'pending' then
    raise exception 'This request has already been decided';
  end if;

  select coalesce(name, split_part(email, '@', 1)) into display from public.profiles where id = req.user_id;

  insert into public.trip_members (trip_id, user_id, display_name, role, can_edit_lodging, can_edit_food, can_edit_itinerary, can_edit_flights)
  values (req.trip_id, req.user_id, display, 'member', p_can_edit_lodging, p_can_edit_food, p_can_edit_itinerary, p_can_edit_flights)
  on conflict (trip_id, user_id) do nothing;

  update public.trip_join_requests
  set status = 'approved', decided_at = now(), decided_by = auth.uid()
  where id = p_request_id;
end;
$$;

create or replace function public.deny_join_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  req public.trip_join_requests;
begin
  select * into req from public.trip_join_requests where id = p_request_id;
  if req.id is null then
    raise exception 'Join request not found';
  end if;
  if not public.is_trip_owner(req.trip_id) then
    raise exception 'Only the trip owner can deny join requests';
  end if;
  if req.status != 'pending' then
    raise exception 'This request has already been decided';
  end if;

  update public.trip_join_requests
  set status = 'denied', decided_at = now(), decided_by = auth.uid()
  where id = p_request_id;
end;
$$;

-- =========================================================================
-- ACTIVITY / AUDIT TRAIL
-- activity_events has existed since 20260710030000 but nothing wrote to it.
-- Logging is done via AFTER triggers rather than scattered app-level
-- inserts, since most mutations in this app go through direct client
-- .insert()/.update() calls with no single server-side choke point.
-- =========================================================================

-- Not directly callable by clients (revoked below) — only ever invoked from
-- inside the other security-definer trigger functions in this file, which
-- run as the function owner regardless of the outer grant.
create or replace function public.log_activity(p_trip_id uuid, p_event_type text, p_summary text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.activity_events (trip_id, user_id, event_type, summary)
  values (p_trip_id, auth.uid(), p_event_type, p_summary);
end;
$$;

revoke execute on function public.log_activity(uuid, text, text) from public;

create or replace function public.trg_log_join_decision()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requester_name text;
begin
  select coalesce(name, split_part(email, '@', 1)) into requester_name from public.profiles where id = NEW.user_id;
  if OLD.status = 'pending' and NEW.status = 'approved' then
    perform public.log_activity(NEW.trip_id, 'join_approved', requester_name || ' joined the trip');
  elsif OLD.status = 'pending' and NEW.status = 'denied' then
    perform public.log_activity(NEW.trip_id, 'join_denied', 'Request to join from ' || requester_name || ' was denied');
  end if;
  return NEW;
end;
$$;

create trigger trip_join_requests_log_decision
  after update on public.trip_join_requests
  for each row execute function public.trg_log_join_decision();

create or replace function public.trg_log_permission_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  member_name text;
begin
  if NEW.can_edit_lodging is distinct from OLD.can_edit_lodging
     or NEW.can_edit_food is distinct from OLD.can_edit_food
     or NEW.can_edit_itinerary is distinct from OLD.can_edit_itinerary
     or NEW.can_edit_flights is distinct from OLD.can_edit_flights then
    select coalesce(name, split_part(email, '@', 1)) into member_name from public.profiles where id = NEW.user_id;
    perform public.log_activity(NEW.trip_id, 'permission_changed', 'Permissions updated for ' || member_name);
  end if;
  return NEW;
end;
$$;

create trigger trip_members_log_permission_change
  after update on public.trip_members
  for each row execute function public.trg_log_permission_change();

create or replace function public.trg_log_member_removed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  member_name text;
begin
  select coalesce(name, split_part(email, '@', 1)) into member_name from public.profiles where id = OLD.user_id;
  if auth.uid() = OLD.user_id then
    perform public.log_activity(OLD.trip_id, 'member_left', member_name || ' left the trip');
  else
    perform public.log_activity(OLD.trip_id, 'member_removed', member_name || ' was removed from the trip');
  end if;
  return OLD;
end;
$$;

create trigger trip_members_log_removed
  after delete on public.trip_members
  for each row execute function public.trg_log_member_removed();

create or replace function public.trg_log_lodging_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_name text;
begin
  select coalesce(name, split_part(email, '@', 1)) into actor_name from public.profiles where id = auth.uid();
  if TG_OP = 'INSERT' then
    perform public.log_activity(NEW.trip_id, 'lodging_added', actor_name || ' proposed lodging: ' || NEW.name);
    return NEW;
  elsif TG_OP = 'DELETE' then
    perform public.log_activity(OLD.trip_id, 'lodging_deleted', actor_name || ' removed a lodging option: ' || OLD.name);
    return OLD;
  elsif TG_OP = 'UPDATE' and NEW.status is distinct from OLD.status and NEW.status = 'booked' then
    perform public.log_activity(NEW.trip_id, 'lodging_booked', actor_name || ' marked lodging as booked: ' || NEW.name);
  end if;
  return NEW;
end;
$$;

create trigger lodging_options_log_change
  after insert or update or delete on public.lodging_options
  for each row execute function public.trg_log_lodging_change();

create or replace function public.trg_log_itinerary_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_name text;
begin
  select coalesce(name, split_part(email, '@', 1)) into actor_name from public.profiles where id = auth.uid();
  if TG_OP = 'INSERT' then
    perform public.log_activity(NEW.trip_id, 'itinerary_added', actor_name || ' added to the itinerary: ' || NEW.title);
    return NEW;
  elsif TG_OP = 'DELETE' then
    perform public.log_activity(OLD.trip_id, 'itinerary_deleted', actor_name || ' removed from the itinerary: ' || OLD.title);
    return OLD;
  end if;
  return NEW;
end;
$$;

create trigger itinerary_items_log_change
  after insert or delete on public.itinerary_items
  for each row execute function public.trg_log_itinerary_change();

create or replace function public.trg_log_restaurant_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_name text;
begin
  select coalesce(name, split_part(email, '@', 1)) into actor_name from public.profiles where id = auth.uid();
  if TG_OP = 'INSERT' then
    perform public.log_activity(NEW.trip_id, 'restaurant_added', actor_name || ' suggested a place to eat: ' || NEW.name);
    return NEW;
  elsif TG_OP = 'DELETE' then
    perform public.log_activity(OLD.trip_id, 'restaurant_deleted', actor_name || ' removed a restaurant suggestion: ' || OLD.name);
    return OLD;
  end if;
  return NEW;
end;
$$;

create trigger restaurants_log_change
  after insert or delete on public.restaurants
  for each row execute function public.trg_log_restaurant_change();
