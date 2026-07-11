-- Comments on proposals, the trip document vault, and geocoded itinerary locations.

-- =========================================================================
-- COMMENTS  (one table for lodging options, itinerary items, and restaurants)
-- =========================================================================
-- entity_id intentionally has no FK: it points at one of three tables depending
-- on entity_type. Rows are cleaned up by the trip cascade; a deleted proposal
-- simply leaves orphaned comments that no card renders.
create table public.trip_comments (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  entity_type text not null check (entity_type in ('lodging', 'itinerary', 'restaurant')),
  entity_id uuid not null,
  body text not null check (char_length(body) between 1 and 2000),
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index trip_comments_entity_idx on public.trip_comments (trip_id, entity_type, entity_id, created_at);
alter table public.trip_comments enable row level security;
create policy "trip_comments_select" on public.trip_comments for select
  using (public.is_trip_member(trip_id));
create policy "trip_comments_insert" on public.trip_comments for insert
  with check (public.is_trip_member(trip_id) and created_by = auth.uid());
create policy "trip_comments_delete" on public.trip_comments for delete
  using (created_by = auth.uid() or public.is_trip_owner(trip_id));
alter publication supabase_realtime add table public.trip_comments;
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
