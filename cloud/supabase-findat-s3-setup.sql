-- Run this after cloud/supabase-findat-setup.sql when using the S3 Edge
-- Function transport. The GitHub deployment applies the equivalent timestamped
-- migration automatically.

begin;

update storage.buckets
set public = false,
    file_size_limit = 52428800
where id = 'findat-documents';


comment on table public.findat_documents is
  'FINDAT PostgreSQL document catalogue. Actual file bytes are stored in the private findat-documents bucket and accessed through the findat-s3 Edge Function.';

commit;
