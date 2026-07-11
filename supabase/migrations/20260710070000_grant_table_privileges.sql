-- Every application table was missing baseline SELECT/INSERT/DELETE grants for
-- `authenticated` (RLS policies existed and were correct, but Postgres checks
-- the table-level grant before it ever evaluates a policy, so every query was
-- being rejected with "permission denied" before RLS even ran). UPDATE is
-- deliberately left alone here — 20260710060000_harden_rls_and_integrity.sql
-- already grants it per-column on a case-by-case basis, and a blanket
-- table-level UPDATE grant here would bypass that.
grant select, insert, delete on
  public.activity_events,
  public.ai_suggestions,
  public.comments,
  public.expense_splits,
  public.expenses,
  public.flight_suggestions,
  public.flights,
  public.itinerary_items,
  public.itinerary_votes,
  public.lodging_options,
  public.lodging_votes,
  public.packing_item_checks,
  public.packing_items,
  public.profiles,
  public.restaurant_votes,
  public.restaurants,
  public.trip_date_availability,
  public.trip_documents,
  public.trip_members,
  public.trips
to authenticated;

-- So a future migration that adds a table doesn't fall into the same trap.
alter default privileges for role postgres in schema public
  grant select, insert, delete on tables to authenticated;
