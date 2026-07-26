-- Run after FINDAT-FINAL-RLS-STORAGE-REPAIR.sql.

select public.findat_cloud_health();

select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where (schemaname = 'public' and tablename = 'findat_documents')
   or (schemaname = 'storage' and tablename = 'objects' and policyname ilike '%FINDAT%')
order by schemaname, tablename, cmd, policyname;

select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'findat_documents'
  and grantee in ('anon', 'authenticated')
order by grantee, privilege_type;

select path, name, type, size, object_path, upload_status, modified
from public.findat_documents
order by modified desc
limit 20;

select bucket_id, name, created_at, updated_at
from storage.objects
where bucket_id = 'findat-documents'
order by created_at desc
limit 20;
