-- FINDAT Cloud shared document storage for Supabase
-- Run this file in the Supabase SQL Editor.

create table if not exists public.findat_documents (
  path text primary key,
  parent text,
  name text not null,
  type text not null check (type in ('file', 'folder')),
  size bigint not null default 0,
  mime text,
  modified timestamptz not null default now(),
  object_path text,
  original_path text
);

create index if not exists findat_documents_parent_idx
  on public.findat_documents(parent);

alter table public.findat_documents enable row level security;

insert into storage.buckets (id, name, public)
values ('findat-documents', 'findat-documents', true)
on conflict (id) do update set public = excluded.public;

-- Public viewing: visitors can list metadata and public bucket files.
drop policy if exists "FINDAT public metadata read" on public.findat_documents;
create policy "FINDAT public metadata read"
on public.findat_documents for select
to anon, authenticated
using (true);

-- Collaborative mode: anyone with the website can add, update and delete files.
-- This is convenient for a trusted group but is not suitable for an unrestricted public site.
drop policy if exists "FINDAT collaborative metadata insert" on public.findat_documents;
create policy "FINDAT collaborative metadata insert"
on public.findat_documents for insert
to anon, authenticated
with check (true);

drop policy if exists "FINDAT collaborative metadata update" on public.findat_documents;
create policy "FINDAT collaborative metadata update"
on public.findat_documents for update
to anon, authenticated
using (true) with check (true);

drop policy if exists "FINDAT collaborative metadata delete" on public.findat_documents;
create policy "FINDAT collaborative metadata delete"
on public.findat_documents for delete
to anon, authenticated
using (true);

drop policy if exists "FINDAT collaborative object insert" on storage.objects;
create policy "FINDAT collaborative object insert"
on storage.objects for insert
to anon, authenticated
with check (bucket_id = 'findat-documents');

drop policy if exists "FINDAT collaborative object select" on storage.objects;
create policy "FINDAT collaborative object select"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'findat-documents');

drop policy if exists "FINDAT collaborative object update" on storage.objects;
create policy "FINDAT collaborative object update"
on storage.objects for update
to anon, authenticated
using (bucket_id = 'findat-documents')
with check (bucket_id = 'findat-documents');

drop policy if exists "FINDAT collaborative object delete" on storage.objects;
create policy "FINDAT collaborative object delete"
on storage.objects for delete
to anon, authenticated
using (bucket_id = 'findat-documents');

-- Production hardening:
-- Replace the write/delete policies above with authenticated-user or owner-based policies
-- after integrating Supabase Auth. Never put the service-role key in cloud-config.js.
