-- FINDAT x1 AI Training Lab
-- Finance/accounting/financial-forensics training management and local-engine governance.
-- Run after the existing FINDAT Auth/RBAC and collaboration migrations.
-- Safe to run more than once.

begin;

-- -----------------------------------------------------------------------------
-- 1. Training assignments
-- -----------------------------------------------------------------------------

create table if not exists public.findat_x1_training_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  module text not null default 'financial_assistant',
  instructions text not null default '',
  assigned_to uuid not null references public.findat_profiles(id) on delete cascade,
  created_by uuid not null references public.findat_profiles(id) on delete restrict,
  priority text not null default 'normal',
  status text not null default 'assigned',
  target_examples integer not null default 5,
  due_at timestamptz,
  started_at timestamptz,
  submitted_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint findat_x1_task_module_check check (module in ('financial_assistant','transform','reconciliation','workflows')),
  constraint findat_x1_task_priority_check check (priority in ('normal','high','urgent')),
  constraint findat_x1_task_status_check check (status in ('assigned','in_progress','submitted','approved','closed')),
  constraint findat_x1_task_target_check check (target_examples between 1 and 200)
);

create index if not exists findat_x1_training_tasks_assignee_idx
  on public.findat_x1_training_tasks(assigned_to, status, updated_at desc);
create index if not exists findat_x1_training_tasks_creator_idx
  on public.findat_x1_training_tasks(created_by, updated_at desc);

-- -----------------------------------------------------------------------------
-- 2. Training demonstrations and candidate comparisons
-- -----------------------------------------------------------------------------

create table if not exists public.findat_x1_training_examples (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references public.findat_x1_training_tasks(id) on delete set null,
  created_by uuid not null references public.findat_profiles(id) on delete cascade,
  reviewer_id uuid references public.findat_profiles(id) on delete set null,
  domain text not null default 'Accounting',
  module text not null default 'financial_assistant',
  intent_label text not null default '',
  risk_level text not null default 'low',
  source_reference text not null default '',
  prompt text not null,
  response_a text not null default '',
  response_b text not null default '',
  ideal_response text not null,
  acceptance_criteria text not null default '',
  status text not null default 'draft',
  is_active boolean not null default false,
  quality_score numeric(5,2),
  reviewer_notes text not null default '',
  submitted_at timestamptz,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint findat_x1_example_module_check check (module in ('financial_assistant','transform','reconciliation','workflows')),
  constraint findat_x1_example_risk_check check (risk_level in ('low','medium','high')),
  constraint findat_x1_example_status_check check (status in ('draft','submitted','approved','rejected')),
  constraint findat_x1_example_prompt_check check (length(trim(prompt)) between 3 and 4000),
  constraint findat_x1_example_ideal_check check (length(trim(ideal_response)) between 3 and 24000)
);

create index if not exists findat_x1_training_examples_status_idx
  on public.findat_x1_training_examples(status, is_active, updated_at desc);
create index if not exists findat_x1_training_examples_task_idx
  on public.findat_x1_training_examples(task_id, status, updated_at desc);
create index if not exists findat_x1_training_examples_creator_idx
  on public.findat_x1_training_examples(created_by, updated_at desc);

-- -----------------------------------------------------------------------------
-- 3. Captured x1 inputs and outputs
-- -----------------------------------------------------------------------------

create table if not exists public.findat_x1_interactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.findat_profiles(id) on delete cascade,
  module text not null default 'financial_assistant',
  action text not null default 'run',
  prompt text not null default '',
  input_payload jsonb not null default '{}'::jsonb,
  output_payload jsonb not null default '{}'::jsonb,
  answer text not null default '',
  success boolean not null default true,
  confidence numeric(6,5),
  created_at timestamptz not null default now(),
  constraint findat_x1_interaction_module_check check (module in ('financial_assistant','transform','reconciliation','workflows')),
  constraint findat_x1_confidence_check check (confidence is null or (confidence >= 0 and confidence <= 1))
);

create index if not exists findat_x1_interactions_user_idx
  on public.findat_x1_interactions(user_id, created_at desc);
create index if not exists findat_x1_interactions_module_idx
  on public.findat_x1_interactions(module, created_at desc);

-- -----------------------------------------------------------------------------
-- 4. Human-feedback reviews
-- -----------------------------------------------------------------------------

create table if not exists public.findat_x1_reviews (
  id uuid primary key default gen_random_uuid(),
  example_id uuid not null references public.findat_x1_training_examples(id) on delete cascade,
  reviewer_id uuid not null references public.findat_profiles(id) on delete cascade,
  decision text not null,
  preferred_response text not null default 'ideal',
  correctness integer not null default 4,
  relevance integer not null default 4,
  clarity integer not null default 4,
  support integer not null default 4,
  notes text not null default '',
  created_at timestamptz not null default now(),
  constraint findat_x1_review_decision_check check (decision in ('approve','reject')),
  constraint findat_x1_review_preference_check check (preferred_response in ('A','B','tie','ideal')),
  constraint findat_x1_review_scores_check check (
    correctness between 1 and 5 and relevance between 1 and 5 and clarity between 1 and 5 and support between 1 and 5
  )
);

create index if not exists findat_x1_reviews_example_idx
  on public.findat_x1_reviews(example_id, created_at desc);

-- -----------------------------------------------------------------------------
-- 5. Evaluation runs and governed model snapshots
-- -----------------------------------------------------------------------------

create table if not exists public.findat_x1_eval_runs (
  id uuid primary key default gen_random_uuid(),
  run_name text not null,
  created_by uuid not null references public.findat_profiles(id) on delete cascade,
  dataset_size integer not null default 0,
  passed integer not null default 0,
  failed integer not null default 0,
  pass_rate numeric(6,2) not null default 0,
  average_score numeric(6,2) not null default 0,
  results jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  constraint findat_x1_eval_count_check check (dataset_size >= 0 and passed >= 0 and failed >= 0),
  constraint findat_x1_eval_rate_check check (pass_rate between 0 and 100 and average_score between 0 and 100)
);

create index if not exists findat_x1_eval_runs_created_idx
  on public.findat_x1_eval_runs(created_at desc);

create table if not exists public.findat_x1_model_snapshots (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  release_note text not null default '',
  created_by uuid not null references public.findat_profiles(id) on delete restrict,
  is_active boolean not null default false,
  training_count integer not null default 0,
  example_ids uuid[] not null default '{}'::uuid[],
  metrics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists findat_x1_one_active_snapshot_idx
  on public.findat_x1_model_snapshots((is_active))
  where is_active = true;

-- -----------------------------------------------------------------------------
-- 6. Shared helpers and audit timestamps
-- -----------------------------------------------------------------------------

create or replace function public.findat_x1_touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists findat_x1_tasks_touch on public.findat_x1_training_tasks;
create trigger findat_x1_tasks_touch
before update on public.findat_x1_training_tasks
for each row execute function public.findat_x1_touch_updated_at();

drop trigger if exists findat_x1_examples_touch on public.findat_x1_training_examples;
create trigger findat_x1_examples_touch
before update on public.findat_x1_training_examples
for each row execute function public.findat_x1_touch_updated_at();

create or replace function public.findat_x1_has_training_access(p_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.findat_profiles p
    where p.id = p_user
      and p.active = true
      and (
        p.role = 'admin'::public.findat_role
        or (
          p.role = 'consultant'::public.findat_role
          and exists (
            select 1
            from public.findat_x1_training_tasks t
            where t.assigned_to = p_user
              and t.status <> 'closed'
          )
        )
      )
  )
$$;

grant execute on function public.findat_x1_has_training_access(uuid) to authenticated;

-- Consultants may never deploy or activate examples directly.
create or replace function public.findat_x1_guard_example_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_is_admin boolean := public.findat_is_admin();
  v_assigned boolean := false;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if new.task_id is not null then
    select exists (
      select 1 from public.findat_x1_training_tasks t
      where t.id = new.task_id
        and (t.assigned_to = auth.uid() or v_is_admin)
    ) into v_assigned;
  else
    v_assigned := v_is_admin;
  end if;

  if tg_op = 'INSERT' then
    if not v_is_admin then
      if new.created_by <> auth.uid() or not v_assigned then
        raise exception 'This training example is not assigned to the current user';
      end if;
      new.status := 'draft';
      new.is_active := false;
      new.reviewer_id := null;
      new.reviewer_notes := '';
      new.quality_score := null;
      new.reviewed_at := null;
    end if;
  elsif not v_is_admin then
    if old.created_by <> auth.uid() then
      raise exception 'Only the creator may edit this draft';
    end if;
    if old.status not in ('draft','rejected') then
      raise exception 'Submitted or approved examples cannot be edited by Consultants';
    end if;
    new.created_by := old.created_by;
    new.status := old.status;
    new.is_active := false;
    new.reviewer_id := old.reviewer_id;
    new.reviewer_notes := old.reviewer_notes;
    new.quality_score := old.quality_score;
    new.submitted_at := old.submitted_at;
    new.reviewed_at := old.reviewed_at;
  end if;

  return new;
end;
$$;

drop trigger if exists findat_x1_examples_guard on public.findat_x1_training_examples;
create trigger findat_x1_examples_guard
before insert or update on public.findat_x1_training_examples
for each row execute function public.findat_x1_guard_example_write();

-- -----------------------------------------------------------------------------
-- 7. Row Level Security
-- -----------------------------------------------------------------------------

alter table public.findat_x1_training_tasks enable row level security;
alter table public.findat_x1_training_examples enable row level security;
alter table public.findat_x1_interactions enable row level security;
alter table public.findat_x1_reviews enable row level security;
alter table public.findat_x1_eval_runs enable row level security;
alter table public.findat_x1_model_snapshots enable row level security;

-- Tasks

drop policy if exists "FINDAT x1 tasks select" on public.findat_x1_training_tasks;
create policy "FINDAT x1 tasks select"
on public.findat_x1_training_tasks for select to authenticated
using (public.findat_is_admin() or assigned_to = auth.uid());

drop policy if exists "FINDAT x1 tasks admin insert" on public.findat_x1_training_tasks;
create policy "FINDAT x1 tasks admin insert"
on public.findat_x1_training_tasks for insert to authenticated
with check (
  public.findat_is_admin()
  and created_by = auth.uid()
  and exists (
    select 1 from public.findat_profiles p
    where p.id = assigned_to and p.active = true and p.role = 'consultant'::public.findat_role
  )
);

drop policy if exists "FINDAT x1 tasks admin update" on public.findat_x1_training_tasks;
create policy "FINDAT x1 tasks admin update"
on public.findat_x1_training_tasks for update to authenticated
using (public.findat_is_admin()) with check (public.findat_is_admin());

drop policy if exists "FINDAT x1 tasks admin delete" on public.findat_x1_training_tasks;
create policy "FINDAT x1 tasks admin delete"
on public.findat_x1_training_tasks for delete to authenticated
using (public.findat_is_admin());

-- Examples

drop policy if exists "FINDAT x1 examples select" on public.findat_x1_training_examples;
create policy "FINDAT x1 examples select"
on public.findat_x1_training_examples for select to authenticated
using (
  public.findat_is_admin()
  or created_by = auth.uid()
  or (status = 'approved' and is_active = true)
  or exists (
    select 1 from public.findat_x1_training_tasks t
    where t.id = task_id and t.assigned_to = auth.uid()
  )
);

drop policy if exists "FINDAT x1 examples insert" on public.findat_x1_training_examples;
create policy "FINDAT x1 examples insert"
on public.findat_x1_training_examples for insert to authenticated
with check (
  public.findat_is_admin()
  or (
    created_by = auth.uid()
    and exists (
      select 1 from public.findat_x1_training_tasks t
      where t.id = task_id and t.assigned_to = auth.uid() and t.status in ('assigned','in_progress','submitted')
    )
  )
);

drop policy if exists "FINDAT x1 examples update" on public.findat_x1_training_examples;
create policy "FINDAT x1 examples update"
on public.findat_x1_training_examples for update to authenticated
using (public.findat_is_admin() or created_by = auth.uid())
with check (public.findat_is_admin() or created_by = auth.uid());

drop policy if exists "FINDAT x1 examples admin delete" on public.findat_x1_training_examples;
create policy "FINDAT x1 examples admin delete"
on public.findat_x1_training_examples for delete to authenticated
using (public.findat_is_admin());

-- Interactions

drop policy if exists "FINDAT x1 interactions insert own" on public.findat_x1_interactions;
create policy "FINDAT x1 interactions insert own"
on public.findat_x1_interactions for insert to authenticated
with check (user_id = auth.uid() and public.findat_user_is_active(auth.uid()));

drop policy if exists "FINDAT x1 interactions select" on public.findat_x1_interactions;
create policy "FINDAT x1 interactions select"
on public.findat_x1_interactions for select to authenticated
using (public.findat_is_admin() or user_id = auth.uid());

drop policy if exists "FINDAT x1 interactions admin delete" on public.findat_x1_interactions;
create policy "FINDAT x1 interactions admin delete"
on public.findat_x1_interactions for delete to authenticated
using (public.findat_is_admin());

-- Reviews

drop policy if exists "FINDAT x1 reviews select" on public.findat_x1_reviews;
create policy "FINDAT x1 reviews select"
on public.findat_x1_reviews for select to authenticated
using (
  public.findat_is_admin()
  or reviewer_id = auth.uid()
  or exists (
    select 1
    from public.findat_x1_training_examples e
    left join public.findat_x1_training_tasks t on t.id = e.task_id
    where e.id = example_id and (e.created_by = auth.uid() or t.assigned_to = auth.uid())
  )
);

drop policy if exists "FINDAT x1 reviews insert" on public.findat_x1_reviews;
create policy "FINDAT x1 reviews insert"
on public.findat_x1_reviews for insert to authenticated
with check (
  reviewer_id = auth.uid()
  and (
    public.findat_is_admin()
    or exists (
      select 1
      from public.findat_x1_training_examples e
      join public.findat_x1_training_tasks t on t.id = e.task_id
      where e.id = example_id and t.assigned_to = auth.uid()
    )
  )
);

-- Evaluation runs

drop policy if exists "FINDAT x1 eval select" on public.findat_x1_eval_runs;
create policy "FINDAT x1 eval select"
on public.findat_x1_eval_runs for select to authenticated
using (public.findat_is_admin() or created_by = auth.uid());

drop policy if exists "FINDAT x1 eval insert" on public.findat_x1_eval_runs;
create policy "FINDAT x1 eval insert"
on public.findat_x1_eval_runs for insert to authenticated
with check (created_by = auth.uid() and public.findat_x1_has_training_access(auth.uid()));

-- Model snapshots

drop policy if exists "FINDAT x1 snapshots select" on public.findat_x1_model_snapshots;
create policy "FINDAT x1 snapshots select"
on public.findat_x1_model_snapshots for select to authenticated
using (is_active = true or public.findat_is_admin());

-- -----------------------------------------------------------------------------
-- 8. Controlled task, review and deployment functions
-- -----------------------------------------------------------------------------

create or replace function public.findat_x1_set_task_status(
  p_task_id uuid,
  p_status text
)
returns public.findat_x1_training_tasks
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_task public.findat_x1_training_tasks;
  v_admin boolean := public.findat_is_admin();
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_status not in ('assigned','in_progress','submitted','approved','closed') then
    raise exception 'Unsupported training-task status';
  end if;

  select * into v_task from public.findat_x1_training_tasks where id = p_task_id;
  if not found then raise exception 'Training task not found'; end if;

  if not v_admin then
    if v_task.assigned_to <> auth.uid() then raise exception 'This task is not assigned to you'; end if;
    if not (
      (v_task.status = 'assigned' and p_status = 'in_progress')
      or (v_task.status = 'in_progress' and p_status = 'submitted')
    ) then raise exception 'Consultants may only start or submit assigned training work'; end if;
  end if;

  update public.findat_x1_training_tasks
  set status = p_status,
      started_at = case when p_status = 'in_progress' then coalesce(started_at, now()) else started_at end,
      submitted_at = case when p_status = 'submitted' then now() else submitted_at end,
      approved_at = case when p_status = 'approved' then now() else approved_at end,
      updated_at = now()
  where id = p_task_id
  returning * into v_task;

  if to_regclass('public.findat_notifications') is not null then
    if p_status = 'submitted' and v_task.created_by <> auth.uid() then
      insert into public.findat_notifications(recipient_id,actor_id,kind,title,message,action_state)
      values(v_task.created_by,auth.uid(),'system','x1 training submitted',v_task.title,'none');
    elsif p_status in ('approved','closed') and v_task.assigned_to <> auth.uid() then
      insert into public.findat_notifications(recipient_id,actor_id,kind,title,message,action_state)
      values(v_task.assigned_to,auth.uid(),'system','x1 training task updated',v_task.title || ' — ' || p_status,'none');
    end if;
  end if;

  return v_task;
end;
$$;

grant execute on function public.findat_x1_set_task_status(uuid,text) to authenticated;

create or replace function public.findat_x1_submit_example(p_example_id uuid)
returns public.findat_x1_training_examples
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_example public.findat_x1_training_examples;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  select * into v_example from public.findat_x1_training_examples where id = p_example_id;
  if not found then raise exception 'Training example not found'; end if;
  if not public.findat_is_admin() and v_example.created_by <> auth.uid() then
    raise exception 'Only the creator may submit this training example';
  end if;
  if v_example.status not in ('draft','rejected') then
    raise exception 'Only draft or rejected examples may be submitted';
  end if;

  update public.findat_x1_training_examples
  set status = 'submitted', submitted_at = now(), is_active = false, updated_at = now()
  where id = p_example_id
  returning * into v_example;

  return v_example;
end;
$$;

grant execute on function public.findat_x1_submit_example(uuid) to authenticated;

create or replace function public.findat_x1_review_example(
  p_example_id uuid,
  p_decision text,
  p_preference text default 'ideal',
  p_correctness integer default 4,
  p_relevance integer default 4,
  p_clarity integer default 4,
  p_support integer default 4,
  p_notes text default ''
)
returns public.findat_x1_training_examples
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_example public.findat_x1_training_examples;
  v_score numeric(5,2);
  v_admin boolean := public.findat_is_admin();
  v_assigned boolean := false;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_decision not in ('approve','reject') then raise exception 'Unsupported review decision'; end if;
  if p_preference not in ('A','B','tie','ideal') then raise exception 'Unsupported preference'; end if;
  if p_correctness not between 1 and 5 or p_relevance not between 1 and 5 or p_clarity not between 1 and 5 or p_support not between 1 and 5 then
    raise exception 'Rubric scores must be between 1 and 5';
  end if;

  select * into v_example from public.findat_x1_training_examples where id = p_example_id;
  if not found then raise exception 'Training example not found'; end if;
  if v_example.status <> 'submitted' then raise exception 'Only submitted examples can be reviewed'; end if;

  if not v_admin then
    select exists (
      select 1 from public.findat_x1_training_tasks t
      where t.id = v_example.task_id and t.assigned_to = auth.uid()
    ) into v_assigned;
    if not v_assigned then raise exception 'This review is not assigned to you'; end if;
  end if;

  v_score := ((p_correctness + p_relevance + p_clarity + p_support)::numeric / 20) * 100;

  insert into public.findat_x1_reviews(example_id,reviewer_id,decision,preferred_response,correctness,relevance,clarity,support,notes)
  values(p_example_id,auth.uid(),p_decision,p_preference,p_correctness,p_relevance,p_clarity,p_support,coalesce(p_notes,''));

  if v_admin then
    update public.findat_x1_training_examples
    set status = case when p_decision = 'approve' then 'approved' else 'rejected' end,
        is_active = (p_decision = 'approve'),
        reviewer_id = auth.uid(),
        reviewer_notes = coalesce(p_notes,''),
        quality_score = v_score,
        reviewed_at = now(),
        updated_at = now()
    where id = p_example_id
    returning * into v_example;
  end if;

  return v_example;
end;
$$;

grant execute on function public.findat_x1_review_example(uuid,text,text,integer,integer,integer,integer,text) to authenticated;

create or replace function public.findat_x1_apply_training_snapshot(
  p_name text,
  p_release_note text default ''
)
returns public.findat_x1_model_snapshots
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ids uuid[];
  v_count integer;
  v_snapshot public.findat_x1_model_snapshots;
begin
  if auth.uid() is null or not public.findat_is_admin() then
    raise exception 'Administrator privileges are required';
  end if;
  if length(trim(coalesce(p_name,''))) < 3 then raise exception 'Enter a snapshot name'; end if;

  select coalesce(array_agg(id order by updated_at), '{}'::uuid[]), count(*)
  into v_ids, v_count
  from public.findat_x1_training_examples
  where status = 'approved' and is_active = true;

  if v_count = 0 then raise exception 'Approve and activate at least one training example first'; end if;

  update public.findat_x1_model_snapshots set is_active = false where is_active = true;

  insert into public.findat_x1_model_snapshots(name,release_note,created_by,is_active,training_count,example_ids,metrics)
  values(trim(p_name),coalesce(p_release_note,''),auth.uid(),true,v_count,v_ids,jsonb_build_object('scope','finance_accounting_forensics','approved_examples',v_count,'engine','browser_rag_rules_classifier'))
  returning * into v_snapshot;

  return v_snapshot;
end;
$$;

grant execute on function public.findat_x1_apply_training_snapshot(text,text) to authenticated;

-- -----------------------------------------------------------------------------
-- 9. Assignment notifications
-- -----------------------------------------------------------------------------

create or replace function public.findat_x1_notify_task_assignment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if to_regclass('public.findat_notifications') is not null then
    insert into public.findat_notifications(recipient_id,actor_id,kind,title,message,action_state)
    values(new.assigned_to,new.created_by,'system','New x1 training assignment',new.title,'none');
  end if;
  return new;
end;
$$;

drop trigger if exists findat_x1_task_assignment_notification on public.findat_x1_training_tasks;
create trigger findat_x1_task_assignment_notification
after insert on public.findat_x1_training_tasks
for each row execute function public.findat_x1_notify_task_assignment();

-- -----------------------------------------------------------------------------
-- 10. Grants
-- -----------------------------------------------------------------------------

grant select, insert, update, delete on public.findat_x1_training_tasks to authenticated;
grant select, insert, update, delete on public.findat_x1_training_examples to authenticated;
grant select, insert, delete on public.findat_x1_interactions to authenticated;
grant select on public.findat_x1_reviews to authenticated;
grant select, insert on public.findat_x1_eval_runs to authenticated;
grant select on public.findat_x1_model_snapshots to authenticated;

-- Realtime helps assigned Consultants see task and review changes promptly.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'findat_x1_training_tasks'
  ) then alter publication supabase_realtime add table public.findat_x1_training_tasks; end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'findat_x1_training_examples'
  ) then alter publication supabase_realtime add table public.findat_x1_training_examples; end if;
end $$;

commit;
