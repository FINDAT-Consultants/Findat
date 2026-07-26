-- FINDAT Cloud verification queries

select version() as postgresql_version;

select public.findat_cloud_health() as findat_cloud_health;

select
  path,
  parent,
  name,
  type,
  size,
  mime,
  object_path,
  upload_status,
  version,
  deleted_at,
  modified,
  updated_at
from public.findat_documents
order by modified desc
limit 100;

select
  id,
  name,
  public,
  file_size_limit,
  created_at,
  updated_at
from storage.buckets
where id = 'findat-documents';

-- Expected after the S3 migration: public = false.
select
  policyname,
  cmd,
  roles,
  qual,
  with_check
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
  and policyname like 'FINDAT%'
order by policyname;
