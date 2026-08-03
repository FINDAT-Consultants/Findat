-- FINDAT Cloud — Supabase Storage-only setup
--
-- No custom document metadata table is created or used. The FINDAT website
-- sends file bytes directly to the findat-documents Storage bucket. Virtual
-- paths are encoded in object keys under findat-v1/.

insert into storage.buckets (id, name, public, file_size_limit)
values ('findat-documents', 'findat-documents', true, 52428800)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit;

-- Remove policies used by earlier FINDAT builds and recreate a clear,
-- Storage-only collaborative policy set.
drop policy if exists "FINDAT collaborative object select" on storage.objects;
drop policy if exists "FINDAT collaborative object insert" on storage.objects;
drop policy if exists "FINDAT collaborative object update" on storage.objects;
drop policy if exists "FINDAT collaborative object delete" on storage.objects;
drop policy if exists "FINDAT object select" on storage.objects;
drop policy if exists "FINDAT object insert" on storage.objects;
drop policy if exists "FINDAT object update" on storage.objects;
drop policy if exists "FINDAT object delete" on storage.objects;
drop policy if exists "FINDAT storage-only select" on storage.objects;
drop policy if exists "FINDAT storage-only insert" on storage.objects;
drop policy if exists "FINDAT storage-only update" on storage.objects;
drop policy if exists "FINDAT storage-only delete" on storage.objects;

grant select, insert, update, delete on table storage.objects to anon, authenticated;

create policy "FINDAT storage-only select"
on storage.objects
as permissive
for select
to anon, authenticated
using (
  bucket_id = 'findat-documents'
  and name like 'findat-v1/%'
);

create policy "FINDAT storage-only insert"
on storage.objects
as permissive
for insert
to anon, authenticated
with check (
  bucket_id = 'findat-documents'
  and name like 'findat-v1/%'
);

create policy "FINDAT storage-only update"
on storage.objects
as permissive
for update
to anon, authenticated
using (
  bucket_id = 'findat-documents'
  and name like 'findat-v1/%'
)
with check (
  bucket_id = 'findat-documents'
  and name like 'findat-v1/%'
);

create policy "FINDAT storage-only delete"
on storage.objects
as permissive
for delete
to anon, authenticated
using (
  bucket_id = 'findat-documents'
  and name like 'findat-v1/%'
);
