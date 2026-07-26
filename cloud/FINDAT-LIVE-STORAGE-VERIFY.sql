-- FINDAT live cloud verification. Run after FINDAT-LIVE-STORAGE-REPAIR.sql.

select public.findat_cloud_health() as findat_cloud_health;

select
  path,
  name,
  type,
  size,
  mime,
  object_path,
  upload_status,
  modified,
  updated_at
from public.findat_documents
order by updated_at desc
limit 20;

select
  bucket_id,
  name,
  metadata,
  created_at,
  updated_at
from storage.objects
where bucket_id = 'findat-documents'
order by created_at desc
limit 20;
