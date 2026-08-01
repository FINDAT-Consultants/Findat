-- FINDAT x1 AI Training Lab verification

select
  to_regclass('public.findat_x1_training_tasks') as training_tasks,
  to_regclass('public.findat_x1_training_examples') as training_examples,
  to_regclass('public.findat_x1_interactions') as interactions,
  to_regclass('public.findat_x1_reviews') as reviews,
  to_regclass('public.findat_x1_eval_runs') as evaluation_runs,
  to_regclass('public.findat_x1_model_snapshots') as model_snapshots;

select proname
from pg_proc
where pronamespace = 'public'::regnamespace
  and proname in (
    'findat_x1_has_training_access',
    'findat_x1_set_task_status',
    'findat_x1_submit_example',
    'findat_x1_review_example',
    'findat_x1_apply_training_snapshot'
  )
order by proname;

select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename like 'findat_x1_%'
order by tablename;

select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename like 'findat_x1_%'
order by tablename, policyname;

select tablename,
       exists (
         select 1 from pg_publication_tables p
         where p.pubname = 'supabase_realtime'
           and p.schemaname = 'public'
           and p.tablename = t.tablename
       ) as realtime_enabled
from (values ('findat_x1_training_tasks'),('findat_x1_training_examples')) as t(tablename);
