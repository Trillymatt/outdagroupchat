-- Harden tenant boundaries and immutable identity columns.
--
-- RLS controls which rows a caller may update, but it does not control which
-- columns they may change. Supabase grants UPDATE on new public tables to the
-- authenticated role by default, so the earlier self-update policy on
-- trip_members also allowed a member to promote their own role and grant their
-- own category permissions. Column grants below keep identifiers, ownership,
-- trip scope, and audit timestamps immutable through the Data API.

-- Track who recorded an expense separately from the member who paid it. This
-- matches the UI, which intentionally lets a member log an expense on another
-- member's behalf, and gives the recorder ownership of the ledger entry.
alter table public.expenses add column created_by uuid references public.profiles (id);
update public.expenses set created_by = paid_by where created_by is null;
alter table public.expenses
  alter column created_by set default auth.uid(),
  alter column created_by set not null;

alter table public.expense_splits
  add constraint expense_splits_amount_nonnegative check (amount >= 0);

-- A member may record an expense, but both its payer and every split recipient
-- must actually belong to the same trip. Only the recorder can change/remove
-- the expense or manage its splits.
drop policy "expenses_insert" on public.expenses;
drop policy "expenses_update" on public.expenses;
drop policy "expenses_delete" on public.expenses;
create policy "expenses_insert" on public.expenses for insert
  with check (
    public.is_trip_member(trip_id)
    and created_by = auth.uid()
    and exists (
      select 1
      from public.trip_members tm
      where tm.trip_id = expenses.trip_id and tm.user_id = expenses.paid_by
    )
  );
create policy "expenses_update" on public.expenses for update
  using (created_by = auth.uid())
  with check (
    created_by = auth.uid()
    and public.is_trip_member(trip_id)
    and exists (
      select 1
      from public.trip_members tm
      where tm.trip_id = expenses.trip_id and tm.user_id = expenses.paid_by
    )
  );
create policy "expenses_delete" on public.expenses for delete
  using (created_by = auth.uid());

drop policy "expense_splits_insert" on public.expense_splits;
drop policy "expense_splits_delete" on public.expense_splits;
create policy "expense_splits_insert" on public.expense_splits for insert
  with check (
    auth.uid() = (
      select e.created_by from public.expenses e where e.id = expense_id
    )
    and exists (
      select 1
      from public.expenses e
      join public.trip_members tm
        on tm.trip_id = e.trip_id and tm.user_id = expense_splits.user_id
      where e.id = expense_splits.expense_id
    )
  );
create policy "expense_splits_delete" on public.expense_splits for delete
  using (
    auth.uid() = (
      select e.created_by from public.expenses e where e.id = expense_id
    )
  );

-- A polymorphic comment target must exist and belong to the stated trip.
drop policy "comments_insert" on public.comments;
create policy "comments_insert" on public.comments for insert
  with check (
    public.is_trip_member(trip_id)
    and user_id = auth.uid()
    and case target_type
      when 'lodging' then exists (
        select 1 from public.lodging_options x
        where x.id = target_id and x.trip_id = comments.trip_id
      )
      when 'restaurant' then exists (
        select 1 from public.restaurants x
        where x.id = target_id and x.trip_id = comments.trip_id
      )
      when 'itinerary' then exists (
        select 1 from public.itinerary_items x
        where x.id = target_id and x.trip_id = comments.trip_id
      )
      when 'flight_suggestion' then exists (
        select 1 from public.flight_suggestions x
        where x.id = target_id and x.trip_id = comments.trip_id
      )
      else false
    end
  );

-- Preserve the parent/item/trip relationship when a check row is updated.
drop policy "packing_item_checks_update" on public.packing_item_checks;
create policy "packing_item_checks_update" on public.packing_item_checks for update
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and public.is_trip_member(trip_id)
    and trip_id = (
      select i.trip_id from public.packing_items i where i.id = packing_item_id
    )
  );

-- Owners cannot be removed through either the Data API or the RPCs. There is
-- no ownership-transfer flow yet, so deleting the trip is the valid owner exit.
drop policy "trip_members_delete_self_or_owner" on public.trip_members;
create policy "trip_members_delete_self_or_owner" on public.trip_members for delete
  using (
    role = 'member'
    and (user_id = auth.uid() or public.is_trip_owner(trip_id))
  );

create or replace function public.leave_trip(p_trip_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_trip_owner(p_trip_id) then
    raise exception 'The trip owner cannot leave; delete the trip instead';
  end if;

  delete from public.trip_members
  where trip_id = p_trip_id and user_id = auth.uid() and role = 'member';
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

  if exists (
    select 1 from public.trip_members
    where trip_id = p_trip_id and user_id = p_user_id and role = 'owner'
  ) then
    raise exception 'The trip owner cannot be removed';
  end if;

  delete from public.trip_members
  where trip_id = p_trip_id and user_id = p_user_id and role = 'member';
end;
$$;

-- Restrict UPDATE to fields the application actually treats as mutable.
revoke update on table public.profiles from anon, authenticated;
grant update (name, phone_number, sms_opt_in, avatar_color) on public.profiles to authenticated;

revoke update on table public.trips from anon, authenticated;
grant update (name, destination, start_date, end_date, dates_locked, cover_image)
  on public.trips to authenticated;

revoke update on table public.trip_members from anon, authenticated;
grant update (display_name) on public.trip_members to authenticated;

revoke update on table public.flights from anon, authenticated;
grant update (
  status, airline, flight_number, price, departure_airport, arrival_airport,
  departure_time, arrival_time, booking_link, notes, locked_in,
  confirmation_number
) on public.flights to authenticated;

revoke update on table public.lodging_options from anon, authenticated;
grant update (
  name, url, price_per_night, notes, status, confirmation_number, booking_url,
  booking_notes
) on public.lodging_options to authenticated;

revoke update on table public.itinerary_items from anon, authenticated;
grant update (
  day, time, title, description, location, category, cost, position, link,
  lat, lng
) on public.itinerary_items to authenticated;

revoke update on table public.restaurants from anon, authenticated;
grant update (name, url, cuisine, notes) on public.restaurants to authenticated;

revoke update on table public.ai_suggestions from anon, authenticated;
grant update (type, content, status) on public.ai_suggestions to authenticated;

revoke update on table public.packing_item_checks from anon, authenticated;
grant update (checked) on public.packing_item_checks to authenticated;

revoke update on table public.flight_suggestions from anon, authenticated;
grant update (
  airline, flight_number, price, departure_airport, arrival_airport,
  departure_time, arrival_time, nonstop, booking_link, notes, status
) on public.flight_suggestions to authenticated;

revoke update on table public.expenses from anon, authenticated;
grant update (paid_by, description, amount, category, expense_date)
  on public.expenses to authenticated;

-- SECURITY DEFINER RPCs should not be callable by unauthenticated roles.
revoke execute on function public.create_trip(text, text, date, date) from public, anon;
revoke execute on function public.join_trip_by_code(text) from public, anon;
revoke execute on function public.leave_trip(uuid) from public, anon;
revoke execute on function public.remove_trip_member(uuid, uuid) from public, anon;
revoke execute on function public.delete_trip(uuid) from public, anon;
revoke execute on function public.set_trip_member_permission(uuid, uuid, boolean, boolean, boolean, boolean) from public, anon;

grant execute on function public.create_trip(text, text, date, date) to authenticated;
grant execute on function public.join_trip_by_code(text) to authenticated;
grant execute on function public.leave_trip(uuid) to authenticated;
grant execute on function public.remove_trip_member(uuid, uuid) to authenticated;
grant execute on function public.delete_trip(uuid) to authenticated;
grant execute on function public.set_trip_member_permission(uuid, uuid, boolean, boolean, boolean, boolean) to authenticated;
