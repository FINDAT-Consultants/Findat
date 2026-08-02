select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'findat_courses'
  and column_name in ('is_free','price','currency','access_days')
order by column_name;

select to_regclass('public.findat_course_payments') as payments_table,
       to_regclass('public.findat_course_enrollments') as enrollments_table;

select proname
from pg_proc
where proname in (
  'findat_course_has_access',
  'findat_request_course_access',
  'findat_admin_verify_course_payment',
  'findat_record_course_progress'
)
order by proname;

select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('findat_course_payments','findat_course_enrollments');

select id, slug, title, is_free, price, currency, access_days
from public.findat_courses
order by updated_at desc;
