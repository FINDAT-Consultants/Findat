-- FINDAT Cloud: PostgreSQL metadata + Supabase Storage
-- Project: gmiqvpemuabjueyprwyl
--
-- File bytes are stored through the Supabase Storage API.
-- This SQL table stores the authoritative document/folder metadata used by the
-- FINDAT desktop. Do not insert/delete rows in storage.objects directly.

begin;

create table if not exists public.findat_documents (
  path text primary key,
  parent text,
  name text not null,
  type text not null,
  size bigint not null default 0,
  mime text,
  modified timestamptz not null default now(),
  object_path text,
  original_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  upload_status text not null default 'ready',
  version bigint not null default 1,
  checksum text,
  metadata jsonb not null default '{}'::jsonb
);

-- Make the migration safe when upgrading the earlier FINDAT table.
alter table public.findat_documents
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz,
  add column if not exists deleted_at timestamptz,
  add column if not exists upload_status text,
  add column if not exists version bigint,
  add column if not exists checksum text,
  add column if not exists metadata jsonb;

update public.findat_documents
set
  created_at = coalesce(created_at, modified, now()),
  updated_at = coalesce(updated_at, modified, now()),
  upload_status = coalesce(upload_status, 'ready'),
  version = greatest(coalesce(version, 1), 1),
  metadata = coalesce(metadata, '{}'::jsonb),
  deleted_at = case
    when path like '/Trash/%' then coalesce(deleted_at, modified, now())
    else null
  end;

alter table public.findat_documents
  alter column created_at set default now(),
  alter column created_at set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null,
  alter column upload_status set default 'ready',
  alter column upload_status set not null,
  alter column version set default 1,
  alter column version set not null,
  alter column metadata set default '{}'::jsonb,
  alter column metadata set not null;

-- Add named constraints only when they do not already exist.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.findat_documents'::regclass
      and conname = 'findat_documents_type_check_v2'
  ) then
    alter table public.findat_documents
      add constraint findat_documents_type_check_v2
      check (type in ('file', 'folder'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.findat_documents'::regclass
      and conname = 'findat_documents_size_check'
  ) then
    alter table public.findat_documents
      add constraint findat_documents_size_check
      check (size >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.findat_documents'::regclass
      and conname = 'findat_documents_status_check'
  ) then
    alter table public.findat_documents
      add constraint findat_documents_status_check
      check (upload_status in ('pending', 'uploading', 'ready', 'failed', 'deleting'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.findat_documents'::regclass
      and conname = 'findat_documents_path_check'
  ) then
    alter table public.findat_documents
      add constraint findat_documents_path_check
      check (
        path ~ '^/(Desktop|Documents|Downloads|Pictures|Music|Movies|Projects|Trash)/.+'
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.findat_documents'::regclass
      and conname = 'findat_documents_object_check'
  ) then
    alter table public.findat_documents
      add constraint findat_documents_object_check
      check (
        (type = 'folder' and object_path is null)
        or
        (type = 'file' and object_path is not null)
      ) not valid;
  end if;
end
$$;

create index if not exists findat_documents_parent_idx
  on public.findat_documents(parent);

create index if not exists findat_documents_modified_idx
  on public.findat_documents(modified desc);

create index if not exists findat_documents_deleted_idx
  on public.findat_documents(deleted_at)
  where deleted_at is not null;

create unique index if not exists findat_documents_object_path_idx
  on public.findat_documents(object_path)
  where object_path is not null;

create or replace function public.findat_prepare_document_row()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  new.created_at := coalesce(new.created_at, now());
  new.modified := coalesce(new.modified, now());
  new.version := greatest(coalesce(new.version, 1), 1);
  new.metadata := coalesce(new.metadata, '{}'::jsonb);

  if tg_op = 'UPDATE' then
    new.version := greatest(coalesce(old.version, 1) + 1, coalesce(new.version, 1));
  end if;

  if new.path like '/Trash/%' then
    new.deleted_at := coalesce(new.deleted_at, now());
  else
    new.deleted_at := null;
  end if;

  if new.type = 'folder' then
    new.size := 0;
    new.mime := coalesce(new.mime, 'inode/directory');
    new.object_path := null;
  else
    new.mime := coalesce(nullif(new.mime, ''), 'application/octet-stream');
  end if;

  new.upload_status := 'ready';
  return new;
end
$$;

drop trigger if exists findat_prepare_document_row_trigger on public.findat_documents;
create trigger findat_prepare_document_row_trigger
before insert or update on public.findat_documents
for each row execute function public.findat_prepare_document_row();

-- Storage bucket for the actual document bytes.
insert into storage.buckets (id, name, public, file_size_limit)
values ('findat-documents', 'findat-documents', true, 52428800)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit;

alter table public.findat_documents enable row level security;

-- Explicit Data API privileges. RLS still decides which rows are allowed.
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table public.findat_documents to anon, authenticated;

-- Metadata policies: public reading and collaborative writes for the current
-- browser-only FINDAT workspace. Replace write policies with authenticated
-- owner/admin policies before exposing the site to an untrusted public audience.
drop policy if exists "FINDAT public metadata read" on public.findat_documents;
create policy "FINDAT public metadata read"
on public.findat_documents
for select
to anon, authenticated
using (true);

drop policy if exists "FINDAT collaborative metadata insert" on public.findat_documents;
create policy "FINDAT collaborative metadata insert"
on public.findat_documents
for insert
to anon, authenticated
with check (
  path ~ '^/(Desktop|Documents|Downloads|Pictures|Music|Movies|Projects|Trash)/.+'
);

drop policy if exists "FINDAT collaborative metadata update" on public.findat_documents;
create policy "FINDAT collaborative metadata update"
on public.findat_documents
for update
to anon, authenticated
using (true)
with check (
  path ~ '^/(Desktop|Documents|Downloads|Pictures|Music|Movies|Projects|Trash)/.+'
);

drop policy if exists "FINDAT collaborative metadata delete" on public.findat_documents;
create policy "FINDAT collaborative metadata delete"
on public.findat_documents
for delete
to anon, authenticated
using (true);

-- Storage policies. Object changes must go through the Storage API.
drop policy if exists "FINDAT collaborative object select" on storage.objects;
create policy "FINDAT collaborative object select"
on storage.objects
for select
to anon, authenticated
using (
  bucket_id = 'findat-documents'
  and name like 'objects/%'
);

drop policy if exists "FINDAT collaborative object insert" on storage.objects;
create policy "FINDAT collaborative object insert"
on storage.objects
for insert
to anon, authenticated
with check (
  bucket_id = 'findat-documents'
  and name like 'objects/%'
);

drop policy if exists "FINDAT collaborative object update" on storage.objects;
create policy "FINDAT collaborative object update"
on storage.objects
for update
to anon, authenticated
using (
  bucket_id = 'findat-documents'
  and name like 'objects/%'
)
with check (
  bucket_id = 'findat-documents'
  and name like 'objects/%'
);

drop policy if exists "FINDAT collaborative object delete" on storage.objects;
create policy "FINDAT collaborative object delete"
on storage.objects
for delete
to anon, authenticated
using (
  bucket_id = 'findat-documents'
  and name like 'objects/%'
);

-- Small SQL health endpoint used by the FINDAT settings panel.
create or replace function public.findat_cloud_health()
returns jsonb
language sql
stable
security definer
set search_path = public, storage, pg_temp
as $$
  select jsonb_build_object(
    'database', 'ok',
    'engine', 'PostgreSQL',
    'postgres_version', current_setting('server_version'),
    'schema', 'public',
    'table', 'findat_documents',
    'bucket', 'findat-documents',
    'bucket_exists', exists (
      select 1 from storage.buckets where id = 'findat-documents'
    ),
    'documents', count(*),
    'files', count(*) filter (where type = 'file'),
    'folders', count(*) filter (where type = 'folder'),
    'trash_items', count(*) filter (where deleted_at is not null),
    'total_bytes', coalesce(sum(size) filter (where type = 'file'), 0),
    'last_modified', max(modified)
  )
  from public.findat_documents;
$$;

revoke all on function public.findat_cloud_health() from public;
grant execute on function public.findat_cloud_health() to anon, authenticated;

-- Publish metadata changes for future Realtime subscriptions. The current
-- client also polls, so failure to alter the publication does not block setup.
do $$
begin
  alter publication supabase_realtime add table public.findat_documents;
exception
  when duplicate_object then null;
  when undefined_object then null;
end
$$;

commit;

-- Force the Supabase Data API (PostgREST) to refresh its schema cache after
-- creating/updating the FINDAT table and optional health RPC.
notify pgrst, 'reload schema';
notify pgrst, 'reload config';
