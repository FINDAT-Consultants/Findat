-- FINDAT commerce, x1 training and Cloud access verification
-- Run after FINDAT-COMMERCE-X1-CLOUD-ACCESS-UPGRADE.sql.

select
  to_regclass('public.findat_course_payments') is not null as course_payments_table,
  to_regclass('public.findat_course_enrollments') is not null as course_enrollments_table,
  to_regclass('public.findat_course_certificates') is not null as course_certificates_table,
  to_regclass('public.findat_cloud_access') is not null as cloud_access_table,
  to_regclass('public.findat_x1_training_projects') is not null as x1_projects_table,
  to_regclass('public.findat_x1_training_assignments') is not null as x1_assignments_table,
  to_regclass('public.findat_x1_training_documents') is not null as x1_documents_table,
  to_regclass('public.findat_x1_training_jobs') is not null as x1_jobs_table,
  to_regclass('public.findat_x1_training_evaluations') is not null as x1_evaluations_table,
  to_regclass('public.findat_x1_model_versions') is not null as x1_model_versions_table;

select
  exists(select 1 from information_schema.columns where table_schema='public' and table_name='findat_courses' and column_name='is_free') as course_free_column,
  exists(select 1 from information_schema.columns where table_schema='public' and table_name='findat_courses' and column_name='price_amount') as course_price_column,
  exists(select 1 from information_schema.columns where table_schema='public' and table_name='findat_courses' and column_name='price_currency') as course_currency_column,
  exists(select 1 from information_schema.columns where table_schema='public' and table_name='findat_courses' and column_name='access_months') as course_access_months_column,
  exists(select 1 from information_schema.columns where table_schema='public' and table_name='findat_notifications' and column_name='payload') as notification_payload_column;

select
  to_regprocedure('public.findat_request_course_access(uuid,text,text)') is not null as request_course_access_rpc,
  to_regprocedure('public.findat_admin_course_payments()') is not null as admin_course_payments_rpc,
  to_regprocedure('public.findat_admin_review_course_payment(uuid,boolean)') is not null as review_course_payment_rpc,
  to_regprocedure('public.findat_my_learning_history()') is not null as learning_history_rpc,
  to_regprocedure('public.findat_record_course_completion(uuid,numeric)') is not null as course_completion_rpc,
  to_regprocedure('public.findat_x1_assigned(uuid)') is not null as x1_assignment_check;

select
  exists(select 1 from storage.buckets where id='findat-documents') as findat_documents_bucket,
  exists(select 1 from storage.buckets where id='findat-x1-training' and public=false) as private_x1_training_bucket;

select
  exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='findat_course_payments') as course_payments_realtime,
  exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='findat_course_enrollments') as course_enrollments_realtime,
  exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='findat_x1_training_jobs') as x1_jobs_realtime;

select tablename, policyname, cmd, roles
from pg_policies
where schemaname='public'
  and tablename in (
    'findat_course_payments','findat_course_enrollments','findat_course_certificates',
    'findat_cloud_access','findat_x1_training_projects','findat_x1_training_assignments',
    'findat_x1_training_documents','findat_x1_training_jobs',
    'findat_x1_training_evaluations','findat_x1_model_versions'
  )
order by tablename, policyname;
