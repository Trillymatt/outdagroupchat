-- Coordinates for Google Places-backed location pickers (trip destination,
-- lodging). itinerary_items already has lat/lng from 20260708010000.

alter table public.trips
  add column destination_lat double precision,
  add column destination_lng double precision;

alter table public.lodging_options
  add column location text,
  add column lat double precision,
  add column lng double precision;

-- New columns need their own UPDATE grant — 20260710060000 revoked blanket
-- UPDATE and re-granted per-column, so newly added columns aren't covered
-- until explicitly listed here.
grant update (destination_lat, destination_lng) on public.trips to authenticated;
grant update (location, lat, lng) on public.lodging_options to authenticated;
