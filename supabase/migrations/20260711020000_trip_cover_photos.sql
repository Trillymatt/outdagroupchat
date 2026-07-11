-- Storage for manually-uploaded trip/city cover photos (the override next to
-- the Unsplash auto-suggestion in lib/images/unsplash-client.ts). Public,
-- unlike trip-documents' private bucket: cover photos render directly as
-- <img src> in many places (dashboard cards, itinerary headers) and are
-- decorative, not sensitive documents, so paying for a signed-URL round trip
-- per render isn't worth it. Object paths are still scoped by trip id.
insert into storage.buckets (id, name, public)
values ('trip-covers', 'trip-covers', true)
on conflict (id) do nothing;

create policy "trip_covers_storage_select" on storage.objects for select
  using (bucket_id = 'trip-covers');
create policy "trip_covers_storage_insert" on storage.objects for insert
  with check (bucket_id = 'trip-covers' and public.is_trip_member(((storage.foldername(name))[1])::uuid));
create policy "trip_covers_storage_update" on storage.objects for update
  using (bucket_id = 'trip-covers' and public.is_trip_member(((storage.foldername(name))[1])::uuid));
create policy "trip_covers_storage_delete" on storage.objects for delete
  using (bucket_id = 'trip-covers' and public.is_trip_member(((storage.foldername(name))[1])::uuid));
