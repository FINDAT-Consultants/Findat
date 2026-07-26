-- FINDAT Cloud final repair
-- Purpose: remove conflicting FINDAT RLS policies, recreate deterministic
-- PostgreSQL/Data API and Storage permissions, and install validated RPC
-- fallbacks for metadata writes/deletes.
--
-- Run once in Supabase Dashboard -> SQL Editor as a project administrator.
-- This script does not store any Supabase Secret or S3 credentials.

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

alter table public.findat_documents
  add column if not exists parent text,
  add column if not exists name text,
  add column if not exists type text,
  add column if not exists size bigint,
  add column if not exists mime text,
  add column if not exists modified timestamptz,
  add column if not exists object_path text,
  add column if not exists original_path text,
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
  modified = coalesce(modified, updated_at, created_at, now()),
  size = greatest(coalesce(size, 0), 0),
  upload_status = coalesce(upload_status, 'ready'),
  version = greatest(coalesce(version, 1), 1),
  metadata = coalesce(metadata, '{}'::jsonb),
  deleted_at = case
    when path like '/Trash/%' then coalesce(deleted_at, modified, now())
    else null
  end;

alter table public.findat_documents
  alter column size set default 0,
  alter column size set not null,
  alter column modified set default now(),
  alter column modified set not null,
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
  if new.path is null or new.path !~ '^/(Desktop|Documents|Downloads|Pictures|Music|Movies|Projects|Trash)/.+' then
    raise exception 'Invalid FINDAT virtual path';
  end if;
  if new.type not in ('file', 'folder') then
    raise exception 'Invalid FINDAT item type';
  end if;

  new.parent := coalesce(new.parent, regexp_replace(new.path, '/[^/]+$', ''));
  new.name := coalesce(nullif(new.name, ''), regexp_replace(new.path, '^.*/', ''));
  new.updated_at := now();
  new.created_at := coalesce(new.created_at, now());
  new.modified := coalesce(new.modified, now());
  new.version := greatest(coalesce(new.version, 1), 1);
  new.metadata := coalesce(new.metadata, '{}'::jsonb);
  new.size := greatest(coalesce(new.size, 0), 0);

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
    new.mime := coalesce(nullif(new.mime, ''), 'inode/directory');
    new.object_path := null;
  else
    new.mime := coalesce(nullif(new.mime, ''), 'application/octet-stream');
    if new.object_path is null or new.object_path not like 'objects/%' then
      raise exception 'A FINDAT file requires an objects/ Storage path';
    end if;
  end if;

  new.upload_status := 'ready';
  return new;
end
$$;

drop trigger if exists findat_prepare_document_row_trigger on public.findat_documents;
create trigger findat_prepare_document_row_trigger
before insert or update on public.findat_documents
for each row execute function public.findat_prepare_document_row();

insert into storage.buckets (id, name, public, file_size_limit)
values ('findat-documents', 'findat-documents', true, 52428800)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit;

alter table public.findat_documents enable row level security;
alter table public.findat_documents no force row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on table public.findat_documents to anon, authenticated;

-- The previous builds used several different policy names. A restrictive old
-- policy can AND with a new permissive policy and still reject every write.
-- The metadata table is dedicated to FINDAT, so remove every existing policy.
do $$
declare
  policy_record record;
begin
  for policy_record in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'findat_documents'
  loop
    execute format(
      'drop policy if exists %I on public.findat_documents',
      policy_record.policyname
    );
  end loop;
end
$$;

create policy "FINDAT metadata select"
on public.findat_documents
as permissive
for select
to anon, authenticated
using (true);

create policy "FINDAT metadata insert"
on public.findat_documents
as permissive
for insert
to anon, authenticated
with check (
  path ~ '^/(Desktop|Documents|Downloads|Pictures|Music|Movies|Projects|Trash)/.+'
  and type in ('file', 'folder')
  and (
    (type = 'folder' and object_path is null)
    or (type = 'file' and object_path like 'objects/%')
  )
);

create policy "FINDAT metadata update"
on public.findat_documents
as permissive
for update
to anon, authenticated
using (true)
with check (
  path ~ '^/(Desktop|Documents|Downloads|Pictures|Music|Movies|Projects|Trash)/.+'
  and type in ('file', 'folder')
  and (
    (type = 'folder' and object_path is null)
    or (type = 'file' and object_path like 'objects/%')
  )
);

create policy "FINDAT metadata delete"
on public.findat_documents
as permissive
for delete
to anon, authenticated
using (true);

-- Remove only Storage policies associated with FINDAT. Policies belonging to
-- other buckets are preserved.
do $$
declare
  policy_record record;
begin
  for policy_record in
    select policyname
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and (
        policyname ilike '%findat%'
        or coalesce(qual, '') ilike '%findat-documents%'
        or coalesce(with_check, '') ilike '%findat-documents%'
      )
  loop
    execute format(
      'drop policy if exists %I on storage.objects',
      policy_record.policyname
    );
  end loop;
end
$$;

create policy "FINDAT object select"
on storage.objects
as permissive
for select
to anon, authenticated
using (
  bucket_id = 'findat-documents'
  and name like 'objects/%'
);

create policy "FINDAT object insert"
on storage.objects
as permissive
for insert
to anon, authenticated
with check (
  bucket_id = 'findat-documents'
  and name like 'objects/%'
);

create policy "FINDAT object update"
on storage.objects
as permissive
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

create policy "FINDAT object delete"
on storage.objects
as permissive
for delete
to anon, authenticated
using (
  bucket_id = 'findat-documents'
  and name like 'objects/%'
);

-- Validated SECURITY DEFINER fallbacks. The client normally uses the Data API
-- directly; these functions are retried only if an old/conflicting metadata
-- policy still returns 401/403 during rollout.
create or replace function public.findat_upsert_documents(p_rows jsonb)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  affected integer := 0;
  item jsonb;
begin
  if jsonb_typeof(p_rows) <> 'array' then
    raise exception 'p_rows must be a JSON array';
  end if;

  for item in select value from jsonb_array_elements(p_rows)
  loop
    if coalesce(item->>'path', '') !~ '^/(Desktop|Documents|Downloads|Pictures|Music|Movies|Projects|Trash)/.+' then
      raise exception 'Invalid FINDAT path';
    end if;
    if coalesce(item->>'type', '') not in ('file', 'folder') then
      raise exception 'Invalid FINDAT type';
    end if;
    if item->>'type' = 'file' and coalesce(item->>'object_path', '') not like 'objects/%' then
      raise exception 'Invalid FINDAT Storage path';
    end if;

    insert into public.findat_documents (
      path, parent, name, type, size, mime, modified, object_path,
      original_path, created_at, updated_at, deleted_at, upload_status,
      version, checksum, metadata
    ) values (
      item->>'path',
      nullif(item->>'parent', ''),
      item->>'name',
      item->>'type',
      greatest(coalesce((item->>'size')::bigint, 0), 0),
      nullif(item->>'mime', ''),
      coalesce((item->>'modified')::timestamptz, now()),
      nullif(item->>'object_path', ''),
      nullif(item->>'original_path', ''),
      coalesce((item->>'created_at')::timestamptz, now()),
      now(),
      case when item->>'path' like '/Trash/%'
        then coalesce((item->>'deleted_at')::timestamptz, now())
        else null
      end,
      'ready',
      greatest(coalesce((item->>'version')::bigint, 1), 1),
      nullif(item->>'checksum', ''),
      coalesce(item->'metadata', '{}'::jsonb)
    )
    on conflict (path) do update set
      parent = excluded.parent,
      name = excluded.name,
      type = excluded.type,
      size = excluded.size,
      mime = excluded.mime,
      modified = excluded.modified,
      object_path = excluded.object_path,
      original_path = excluded.original_path,
      deleted_at = excluded.deleted_at,
      upload_status = 'ready',
      checksum = excluded.checksum,
      metadata = excluded.metadata,
      updated_at = now();

    affected := affected + 1;
  end loop;

  return affected;
end
$$;

create or replace function public.findat_delete_documents(p_paths text[])
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  affected integer := 0;
  candidate text;
begin
  if p_paths is null then
    return 0;
  end if;

  foreach candidate in array p_paths
  loop
    if candidate !~ '^/(Desktop|Documents|Downloads|Pictures|Music|Movies|Projects|Trash)/.+' then
      raise exception 'Invalid FINDAT path';
    end if;
  end loop;

  delete from public.findat_documents
  where path = any(p_paths);
  get diagnostics affected = row_count;
  return affected;
end
$$;

revoke all on function public.findat_upsert_documents(jsonb) from public;
revoke all on function public.findat_delete_documents(text[]) from public;
grant execute on function public.findat_upsert_documents(jsonb) to anon, authenticated;
grant execute on function public.findat_delete_documents(text[]) to anon, authenticated;

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

commit;

notify pgrst, 'reload schema';
notify pgrst, 'reload config';
