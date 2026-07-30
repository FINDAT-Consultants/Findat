select
  to_regclass('public.findat_course_payments') as course_payments,
  to_regclass('public.findat_course_enrollments') as course_enrollments,
  to_regclass('public.findat_course_certificates') as course_certificates,
  to_regclass('public.findat_x1_training_entries') as x1_training_entries,
  to_regclass('public.findat_x1_training_documents') as x1_training_documents,
  to_regclass('public.findat_cloud_access') as cloud_access;

select
  to_regprocedure('public.findat_request_course_access(uuid)') as request_course_access,
  to_regprocedure('public.findat_record_course_payment(uuid,text,text)') as record_payment,
  to_regprocedure('public.findat_my_learning()') as my_learning,
  to_regprocedure('public.findat_x1_training_feed()') as x1_training_feed,
  to_regprocedure('public.findat_generate_cloud_access(uuid)') as generate_cloud_access,
  to_regprocedure('public.findat_verify_cloud_access(text,text)') as verify_cloud_access;

select slug,title,is_free,price_amount,currency,access_months
from public.findat_courses
order by updated_at desc;

select id,name,public,file_size_limit
from storage.buckets
where id in ('findat-documents','findat-course-media')
order by id;
