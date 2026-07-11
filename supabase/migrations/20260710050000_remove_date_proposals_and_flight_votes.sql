-- Remove the date-proposal voting flow (superseded by trip_date_availability,
-- which stays, along with trips.dates_locked) and flight-suggestion voting
-- (flight_suggestions itself stays).
--
-- Policies on these tables are dropped implicitly with the tables; publication
-- membership is removed explicitly first so realtime stops streaming them.
-- Drop order respects the FK: votes before proposals.

alter publication supabase_realtime drop table
  public.trip_date_votes,
  public.trip_date_proposals,
  public.flight_suggestion_votes;

drop table public.trip_date_votes;
drop table public.trip_date_proposals;

drop table public.flight_suggestion_votes;
