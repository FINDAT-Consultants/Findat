-- FINDAT Storage-only verification. This reads Supabase Storage metadata only.
select id, name, public, file_size_limit
from storage.buckets
where id = 'findat-documents';

select policyname, cmd, roles, permissive
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
  and policyname like 'FINDAT storage-only%'
order by policyname;

select name, created_at, updated_at, metadata
from storage.objects
where bucket_id = 'findat-documents'
  and name like 'findat-v1/%'
order by updated_at desc
limit 50;
