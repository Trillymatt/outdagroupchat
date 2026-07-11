-- Booking/confirmation details for lodging and personal flights.

alter table public.lodging_options
  add column confirmation_number text,
  add column booking_url text,
  add column booking_notes text;

alter table public.flights
  add column confirmation_number text;
