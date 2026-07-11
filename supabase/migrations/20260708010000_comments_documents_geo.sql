-- The trip document vault, and geocoded itinerary locations.
-- (Comments live in 20260710020000_comments.sql instead of here — see that
-- file's header for why.)

-- =========================================================================
-- DOCUMENT VAULT  (booking confirmations, tickets, receipts)
-- =========================================================================
create table public.trip_documents (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  name text not null,
  file_path text not null,
  content_type text,
  size_bytes bigint,
  uploaded_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

create index trip_documents_trip_idx on public.trip_documents (trip_id, created_at);

alter table public.trip_documents enable row level security;

create policy "trip_documents_select" on public.trip_documents for select
  using (public.is_trip_member(trip_id));
create policy "trip_documents_insert" on public.trip_documents for insert
  with check (public.is_trip_member(trip_id) and uploaded_by = auth.uid());
create policy "trip_documents_delete" on public.trip_documents for delete
  using (uploaded_by = auth.uid() or public.is_trip_owner(trip_id));

alter publication supabase_realtime add table public.trip_documents;

-- Private storage bucket; objects live under "<trip_id>/<uuid>-<filename>" so
-- the first path segment gates access via trip membership.
insert into storage.buckets (id, name, public)
values ('trip-documents', 'trip-documents', false)
on conflict (id) do nothing;

create policy "trip_documents_storage_select" on storage.objects for select
  using (bucket_id = 'trip-documents' and public.is_trip_member(((storage.foldername(name))[1])::uuid));
create policy "trip_documents_storage_insert" on storage.objects for insert
  with check (bucket_id = 'trip-documents' and public.is_trip_member(((storage.foldername(name))[1])::uuid));
create policy "trip_documents_storage_delete" on storage.objects for delete
  using (bucket_id = 'trip-documents' and public.is_trip_member(((storage.foldername(name))[1])::uuid));

-- =========================================================================
-- GEOCODED ITINERARY LOCATIONS  (for the map view)
-- =========================================================================
alter table public.itinerary_items
  add column lat double precision,
  add column lng double precision;
