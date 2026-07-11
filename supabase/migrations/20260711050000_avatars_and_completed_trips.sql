-- =========================================================================
-- AVATARS
-- Public bucket like trip-covers, but scoped by the uploading user's own id
-- rather than trip membership — simpler check, direct auth.uid() comparison.
-- =========================================================================

alter table public.profiles add column avatar_url text;
grant update (avatar_url) on public.profiles to authenticated;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatars_storage_select" on storage.objects for select
  using (bucket_id = 'avatars');
create policy "avatars_storage_insert" on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.uid() = ((storage.foldername(name))[1])::uuid);
create policy "avatars_storage_update" on storage.objects for update
  using (bucket_id = 'avatars' and auth.uid() = ((storage.foldername(name))[1])::uuid);
create policy "avatars_storage_delete" on storage.objects for delete
  using (bucket_id = 'avatars' and auth.uid() = ((storage.foldername(name))[1])::uuid);

-- =========================================================================
-- COMPLETED TRIPS
-- Manual owner-only flag (not date-derived) so a trip can be flagged for a
-- user's profile history independent of the dashboard's existing
-- end_date-based "past" section (lib/types/trip.ts tripStatusLabel).
-- =========================================================================

alter table public.trips add column completed_at timestamptz;

create or replace function public.set_trip_completed(p_trip_id uuid, p_completed boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_trip_owner(p_trip_id) then
    raise exception 'Only the trip owner can mark a trip completed';
  end if;

  update public.trips
  set completed_at = case when p_completed then now() else null end
  where id = p_trip_id;
end;
$$;

create or replace function public.trg_log_trip_completed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if OLD.completed_at is null and NEW.completed_at is not null then
    perform public.log_activity(NEW.id, 'trip_completed', 'Trip marked as completed');
  elsif OLD.completed_at is not null and NEW.completed_at is null then
    perform public.log_activity(NEW.id, 'trip_reopened', 'Trip marked as not completed');
  end if;
  return NEW;
end;
$$;

create trigger trips_log_completed
  after update on public.trips
  for each row execute function public.trg_log_trip_completed();

-- =========================================================================
-- PUBLIC PROFILE
-- Visibility is intentionally broader than the rest of the app: any signed-in
-- user with the link, not just people who share a trip. profiles_select
-- can't just be loosened for this (it also protects email/phone), so these
-- two RPCs expose a narrow, safe slice instead — name/avatar and a
-- completed-trip summary only, nothing else.
-- =========================================================================

create or replace function public.get_public_profile(p_user_id uuid)
returns table (name text, avatar_url text, avatar_color text)
language sql
security definer
set search_path = public
stable
as $$
  select name, avatar_url, avatar_color from public.profiles where id = p_user_id;
$$;

create or replace function public.get_public_completed_trips(p_user_id uuid)
returns table (
  id uuid,
  name text,
  destination text,
  cover_image text,
  start_date date,
  end_date date,
  completed_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select t.id, t.name, t.destination, t.cover_image, t.start_date, t.end_date, t.completed_at
  from public.trips t
  join public.trip_members tm on tm.trip_id = t.id
  where tm.user_id = p_user_id and t.completed_at is not null
  order by t.completed_at desc;
$$;
