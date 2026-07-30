-- FINDAT course commerce, learning history, x1 training orchestration and monthly Cloud access
-- Run after the Google Authentication baseline migrations. Safe to run more than once.

begin;

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- 1. Notification payloads and additional notification types
-- -----------------------------------------------------------------------------

alter table public.findat_notifications
  add column if not exists payload jsonb not null default '{}'::jsonb;

alter table public.findat_notifications
  drop constraint if exists findat_notification_kind_check;

alter table public.findat_notifications
  add constraint findat_notification_kind_check
  check (kind in (
    'collaboration_request',
    'collaboration_response',
    'collaboration_cancelled',
    'article_comment',
    'article_revision',
    'course_payment',
    'course_access',
    'cloud_access',
    'x1_training',
    'system'
  ));

-- Return payload data to the signed-in recipient.
drop function if exists public.findat_notifications_feed();
create function public.findat_notifications_feed()
returns table (
  notification_id uuid,
  kind text,
  article_id uuid,
  article_title text,
  actor_id uuid,
  actor_name text,
  actor_avatar_url text,
  message text,
  action_state text,
  is_read boolean,
  created_at timestamptz,
  updated_at timestamptz,
  payload jsonb
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    n.id,
    n.kind,
    n.article_id,
    coalesce(nullif(trim(a.title), ''), ''),
    n.actor_id,
    coalesce(
      nullif(trim(concat_ws(' ', actor.first_name, actor.last_name)), ''),
      actor.username,
      'FINDAT'
    ),
    actor.avatar_url,
    n.message,
    n.action_state,
    n.is_read,
    n.created_at,
    n.updated_at,
    n.payload
  from public.findat_notifications n
  left join public.findat_articles a on a.id = n.article_id
  left join public.findat_profiles actor on actor.id = n.actor_id
  where auth.uid() is not null
    and public.findat_user_is_active(auth.uid())
    and n.recipient_id = auth.uid()
    and n.cleared_at is null
  order by case when n.is_read = false then 0 else 1 end, n.created_at desc
$$;

revoke all on function public.findat_notifications_feed() from public, anon;
grant execute on function public.findat_notifications_feed() to authenticated;

-- -----------------------------------------------------------------------------
-- 2. Course pricing, payment history, time-limited access and certificates
-- -----------------------------------------------------------------------------

alter table public.findat_courses
  add column if not exists is_free boolean not null default true,
  add column if not exists price_amount numeric(12,2) not null default 0,
  add column if not exists price_currency text not null default 'ZMW',
  add column if not exists access_months integer not null default 1;

alter table public.findat_courses drop constraint if exists findat_course_price_currency_check;
alter table public.findat_courses add constraint findat_course_price_currency_check
  check (price_currency in ('ZMW','USD','GBP'));
alter table public.findat_courses drop constraint if exists findat_course_access_months_check;
alter table public.findat_courses add constraint findat_course_access_months_check
  check (access_months >= 1 and access_months <= 60);
alter table public.findat_courses drop constraint if exists findat_course_price_amount_check;
alter table public.findat_courses add constraint findat_course_price_amount_check
  check (price_amount >= 0);

update public.findat_courses
set is_free = true,
    price_amount = 0,
    price_currency = coalesce(nullif(price_currency,''),'ZMW'),
    access_months = greatest(coalesce(access_months,1),1)
where slug = 'data-analytics-foundations';

create table if not exists public.findat_course_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.findat_profiles(id) on delete cascade,
  course_id uuid not null references public.findat_courses(id) on delete cascade,
  amount numeric(12,2) not null,
  currency text not null,
  payment_method text not null default 'manual',
  payment_reference text not null default '',
  status text not null default 'pending',
  reviewed_by uuid references public.findat_profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint findat_course_payment_currency_check check (currency in ('ZMW','USD','GBP')),
  constraint findat_course_payment_status_check check (status in ('pending','completed','rejected','cancelled')),
  constraint findat_course_payment_amount_check check (amount >= 0)
);

create index if not exists findat_course_payments_user_idx
  on public.findat_course_payments(user_id, created_at desc);
create index if not exists findat_course_payments_admin_idx
  on public.findat_course_payments(status, created_at desc);

create table if not exists public.findat_course_enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.findat_profiles(id) on delete cascade,
  course_id uuid not null references public.findat_courses(id) on delete cascade,
  payment_id uuid references public.findat_course_payments(id) on delete set null,
  status text not null default 'active',
  access_starts_at timestamptz not null default now(),
  access_expires_at timestamptz not null,
  progress_percent numeric(5,2) not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint findat_course_enrollment_status_check check (status in ('active','completed','expired','suspended')),
  constraint findat_course_enrollment_progress_check check (progress_percent between 0 and 100),
  unique(user_id, course_id)
);

create index if not exists findat_course_enrollments_user_idx
  on public.findat_course_enrollments(user_id, access_expires_at desc);

create table if not exists public.findat_course_certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.findat_profiles(id) on delete cascade,
  course_id uuid not null references public.findat_courses(id) on delete cascade,
  enrollment_id uuid references public.findat_course_enrollments(id) on delete set null,
  certificate_number text not null unique,
  final_score numeric(5,2),
  awarded_at timestamptz not null default now(),
  awarded_by uuid references public.findat_profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(user_id, course_id)
);

alter table public.findat_course_payments enable row level security;
alter table public.findat_course_enrollments enable row level security;
alter table public.findat_course_certificates enable row level security;

revoke all on public.findat_course_payments, public.findat_course_enrollments, public.findat_course_certificates from anon, authenticated;
grant select on public.findat_course_payments, public.findat_course_enrollments, public.findat_course_certificates to authenticated;

drop policy if exists "FINDAT own or admin course payments select" on public.findat_course_payments;
create policy "FINDAT own or admin course payments select"
  on public.findat_course_payments for select to authenticated
  using (user_id = auth.uid() or public.findat_is_admin());
drop policy if exists "FINDAT own or admin enrollments select" on public.findat_course_enrollments;
create policy "FINDAT own or admin enrollments select"
  on public.findat_course_enrollments for select to authenticated
  using (user_id = auth.uid() or public.findat_is_admin());
drop policy if exists "FINDAT own or admin certificates select" on public.findat_course_certificates;
create policy "FINDAT own or admin certificates select"
  on public.findat_course_certificates for select to authenticated
  using (user_id = auth.uid() or public.findat_is_admin());

-- Paid lesson rows are visible only to Administrators or users with valid access.
drop policy if exists "FINDAT course lessons select" on public.findat_course_lessons;
create policy "FINDAT course lessons select"
  on public.findat_course_lessons for select to anon, authenticated
  using (
    public.findat_is_admin()
    or (
      is_published = true
      and exists (
        select 1
        from public.findat_courses c
        where c.id = findat_course_lessons.course_id
          and c.status = 'published'
          and (
            c.is_free = true
            or (
              auth.uid() is not null
              and exists (
                select 1
                from public.findat_course_enrollments e
                where e.course_id = c.id
                  and e.user_id = auth.uid()
                  and e.status in ('active','completed')
                  and e.access_expires_at > now()
              )
            )
          )
      )
    )
  );

create or replace function public.findat_request_course_access(
  p_course_id uuid,
  p_payment_method text default 'manual',
  p_payment_reference text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_course public.findat_courses;
  v_payment public.findat_course_payments;
  v_enrollment public.findat_course_enrollments;
begin
  if auth.uid() is null or not public.findat_user_is_active(auth.uid()) then
    raise exception 'Sign in to request course access';
  end if;

  select * into v_course
  from public.findat_courses
  where id = p_course_id and status = 'published';
  if not found then raise exception 'Course not found'; end if;

  if v_course.is_free then
    insert into public.findat_course_enrollments (
      user_id, course_id, status, access_starts_at, access_expires_at
    ) values (
      auth.uid(), v_course.id, 'active', now(), now() + make_interval(months => greatest(v_course.access_months,1))
    )
    on conflict (user_id, course_id) do update
      set status = 'active',
          access_starts_at = now(),
          access_expires_at = now() + make_interval(months => greatest(v_course.access_months,1)),
          updated_at = now()
    returning * into v_enrollment;

    return jsonb_build_object('status','active','enrollment_id',v_enrollment.id,'expires_at',v_enrollment.access_expires_at);
  end if;

  select * into v_payment
  from public.findat_course_payments
  where user_id = auth.uid() and course_id = v_course.id and status = 'pending'
  order by created_at desc limit 1;

  if not found then
    insert into public.findat_course_payments (
      user_id, course_id, amount, currency, payment_method, payment_reference, status
    ) values (
      auth.uid(), v_course.id, v_course.price_amount, v_course.price_currency,
      left(trim(coalesce(p_payment_method,'manual')),80),
      left(trim(coalesce(p_payment_reference,'')),180),
      'pending'
    ) returning * into v_payment;
  else
    update public.findat_course_payments
    set payment_method = left(trim(coalesce(p_payment_method,'manual')),80),
        payment_reference = left(trim(coalesce(p_payment_reference,'')),180),
        updated_at = now()
    where id = v_payment.id
    returning * into v_payment;
  end if;

  insert into public.findat_notifications (
    recipient_id, actor_id, kind, title, message, action_state, payload
  )
  select p.id, auth.uid(), 'course_payment', 'Course payment awaiting review',
         concat('A payment reference was submitted for “', v_course.title, '”.'),
         'pending', jsonb_build_object('payment_id',v_payment.id,'course_id',v_course.id)
  from public.findat_profiles p
  where p.role = 'admin' and p.active = true;

  return jsonb_build_object('status','pending','payment_id',v_payment.id,'amount',v_payment.amount,'currency',v_payment.currency);
end;
$$;

create or replace function public.findat_admin_course_payments()
returns table (
  payment_id uuid,
  user_id uuid,
  user_name text,
  course_id uuid,
  course_title text,
  amount numeric,
  currency text,
  payment_method text,
  payment_reference text,
  status text,
  created_at timestamptz,
  reviewed_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.user_id,
    coalesce(nullif(trim(concat_ws(' ', u.first_name, u.last_name)),''),u.username),
    p.course_id, c.title, p.amount, p.currency, p.payment_method,
    p.payment_reference, p.status, p.created_at, p.reviewed_at
  from public.findat_course_payments p
  join public.findat_profiles u on u.id = p.user_id
  join public.findat_courses c on c.id = p.course_id
  where public.findat_is_admin()
  order by case p.status when 'pending' then 0 else 1 end, p.created_at desc
$$;

create or replace function public.findat_admin_review_course_payment(
  p_payment_id uuid,
  p_approve boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payment public.findat_course_payments;
  v_course public.findat_courses;
  v_enrollment public.findat_course_enrollments;
begin
  if not public.findat_is_admin() then raise exception 'Administrator privileges required'; end if;
  select * into v_payment from public.findat_course_payments where id = p_payment_id for update;
  if not found then raise exception 'Payment record not found'; end if;
  select * into v_course from public.findat_courses where id = v_payment.course_id;

  if p_approve then
    update public.findat_course_payments
      set status='completed', reviewed_by=auth.uid(), reviewed_at=now(), updated_at=now()
      where id=v_payment.id;
    insert into public.findat_course_enrollments (
      user_id, course_id, payment_id, status, access_starts_at, access_expires_at
    ) values (
      v_payment.user_id, v_payment.course_id, v_payment.id, 'active', now(),
      now() + make_interval(months => greatest(v_course.access_months,1))
    )
    on conflict (user_id,course_id) do update
      set payment_id=excluded.payment_id, status='active', access_starts_at=now(),
          access_expires_at=now()+make_interval(months => greatest(v_course.access_months,1)), updated_at=now()
    returning * into v_enrollment;

    insert into public.findat_notifications(recipient_id,actor_id,kind,title,message,action_state,payload)
    values(v_payment.user_id,auth.uid(),'course_access','Course access activated',
      concat('Your access to “',v_course.title,'” is active until ',to_char(v_enrollment.access_expires_at,'DD Mon YYYY'),'.'),
      'accepted',jsonb_build_object('course_id',v_course.id,'expires_at',v_enrollment.access_expires_at));
    return jsonb_build_object('status','completed','expires_at',v_enrollment.access_expires_at);
  else
    update public.findat_course_payments
      set status='rejected', reviewed_by=auth.uid(), reviewed_at=now(), updated_at=now()
      where id=v_payment.id;
    insert into public.findat_notifications(recipient_id,actor_id,kind,title,message,action_state,payload)
    values(v_payment.user_id,auth.uid(),'course_payment','Course payment not approved',
      concat('The payment reference for “',v_course.title,'” was not approved. Review the details and submit a new reference.'),
      'rejected',jsonb_build_object('course_id',v_course.id,'payment_id',v_payment.id));
    return jsonb_build_object('status','rejected');
  end if;
end;
$$;

create or replace function public.findat_my_learning_history()
returns table (
  course_id uuid,
  course_title text,
  course_slug text,
  cover_url text,
  enrollment_status text,
  access_expires_at timestamptz,
  progress_percent numeric,
  completed_at timestamptz,
  payment_status text,
  payment_amount numeric,
  payment_currency text,
  payment_reference text,
  certificate_number text,
  certificate_awarded_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id,c.title,c.slug,c.cover_url,e.status,e.access_expires_at,e.progress_percent,e.completed_at,
    p.status,p.amount,p.currency,p.payment_reference,cert.certificate_number,cert.awarded_at
  from public.findat_courses c
  left join public.findat_course_enrollments e on e.course_id=c.id and e.user_id=auth.uid()
  left join lateral (
    select p1.* from public.findat_course_payments p1
    where p1.course_id=c.id and p1.user_id=auth.uid()
    order by p1.created_at desc limit 1
  ) p on true
  left join public.findat_course_certificates cert on cert.course_id=c.id and cert.user_id=auth.uid()
  where auth.uid() is not null and (e.id is not null or p.id is not null or cert.id is not null)
  order by coalesce(e.updated_at,p.updated_at,cert.awarded_at) desc
$$;

create or replace function public.findat_record_course_completion(
  p_course_id uuid,
  p_score numeric default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_course public.findat_courses;
  v_enrollment public.findat_course_enrollments;
  v_number text;
begin
  if auth.uid() is null or not public.findat_user_is_active(auth.uid()) then raise exception 'Authentication required'; end if;
  select * into v_course from public.findat_courses where id=p_course_id and status='published';
  if not found then raise exception 'Course not found'; end if;

  select * into v_enrollment from public.findat_course_enrollments
  where user_id=auth.uid() and course_id=p_course_id and access_expires_at>now()
  for update;
  if not found then
    if not v_course.is_free then raise exception 'Active course access is required'; end if;
    insert into public.findat_course_enrollments(user_id,course_id,status,access_starts_at,access_expires_at)
    values(auth.uid(),p_course_id,'active',now(),now()+make_interval(months=>greatest(v_course.access_months,1)))
    returning * into v_enrollment;
  end if;

  update public.findat_course_enrollments
    set status='completed',progress_percent=100,completed_at=coalesce(completed_at,now()),updated_at=now()
    where id=v_enrollment.id;

  v_number := 'FINDAT-' || to_char(now(),'YYYY') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
  insert into public.findat_course_certificates(user_id,course_id,enrollment_id,certificate_number,final_score,awarded_by)
  values(auth.uid(),p_course_id,v_enrollment.id,v_number,p_score,null)
  on conflict(user_id,course_id) do update set final_score=excluded.final_score
  returning certificate_number into v_number;

  return jsonb_build_object('status','completed','certificate_number',v_number);
end;
$$;

revoke all on function public.findat_request_course_access(uuid,text,text) from public, anon;
revoke all on function public.findat_admin_course_payments() from public, anon;
revoke all on function public.findat_admin_review_course_payment(uuid,boolean) from public, anon;
revoke all on function public.findat_my_learning_history() from public, anon;
revoke all on function public.findat_record_course_completion(uuid,numeric) from public, anon;
grant execute on function public.findat_request_course_access(uuid,text,text) to authenticated;
grant execute on function public.findat_admin_course_payments() to authenticated;
grant execute on function public.findat_admin_review_course_payment(uuid,boolean) to authenticated;
grant execute on function public.findat_my_learning_history() to authenticated;
grant execute on function public.findat_record_course_completion(uuid,numeric) to authenticated;

-- -----------------------------------------------------------------------------
-- 3. Monthly Cloud access passwords
-- -----------------------------------------------------------------------------

create table if not exists public.findat_cloud_access (
  user_id uuid primary key references public.findat_profiles(id) on delete cascade,
  password_salt text not null,
  password_hash text not null,
  active boolean not null default true,
  expires_at timestamptz not null,
  generated_by uuid references public.findat_profiles(id) on delete set null,
  generated_at timestamptz not null default now(),
  last_used_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.findat_cloud_access enable row level security;
revoke all on public.findat_cloud_access from anon, authenticated;
drop policy if exists "FINDAT cloud access admin select" on public.findat_cloud_access;
-- Password hashes and salts are never exposed through the browser Data API.
-- The trusted findat-admin-users and findat-cloud-login Edge Functions use the
-- server-side service role to manage and verify these records.

-- -----------------------------------------------------------------------------
-- 4. x1 | ProATR training orchestration
-- -----------------------------------------------------------------------------

create table if not exists public.findat_x1_training_projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  objective text not null default '',
  domain text not null default 'Finance and accounting',
  technique text not null default 'retrieval_augmented_generation',
  status text not null default 'active',
  created_by uuid not null references public.findat_profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint findat_x1_project_status_check check(status in ('draft','active','archived'))
);

create table if not exists public.findat_x1_training_assignments (
  project_id uuid not null references public.findat_x1_training_projects(id) on delete cascade,
  consultant_id uuid not null references public.findat_profiles(id) on delete cascade,
  assigned_by uuid not null references public.findat_profiles(id) on delete restrict,
  active boolean not null default true,
  assigned_at timestamptz not null default now(),
  primary key(project_id,consultant_id)
);

create table if not exists public.findat_x1_training_documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.findat_x1_training_projects(id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  mime_type text not null default '',
  size_bytes bigint not null default 0,
  document_kind text not null default 'training',
  notes text not null default '',
  uploaded_by uuid not null references public.findat_profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists public.findat_x1_training_jobs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.findat_x1_training_projects(id) on delete cascade,
  job_type text not null,
  configuration jsonb not null default '{}'::jsonb,
  status text not null default 'queued',
  progress numeric(5,2) not null default 0,
  metrics jsonb not null default '{}'::jsonb,
  requested_by uuid not null references public.findat_profiles(id) on delete restrict,
  started_at timestamptz,
  completed_at timestamptz,
  error_message text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint findat_x1_job_status_check check(status in ('queued','running','completed','failed','cancelled'))
);

create table if not exists public.findat_x1_training_evaluations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.findat_x1_training_projects(id) on delete cascade,
  prompt text not null,
  expected_output text not null default '',
  actual_output text not null default '',
  score numeric(5,2),
  notes text not null default '',
  created_by uuid not null references public.findat_profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.findat_x1_model_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.findat_x1_training_projects(id) on delete set null,
  version_name text not null,
  description text not null default '',
  model_type text not null default 'retrieval-and-reconciliation',
  status text not null default 'candidate',
  metrics jsonb not null default '{}'::jsonb,
  created_by uuid not null references public.findat_profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint findat_x1_model_status_check check(status in ('candidate','testing','approved','retired'))
);

alter table public.findat_x1_training_projects enable row level security;
alter table public.findat_x1_training_assignments enable row level security;
alter table public.findat_x1_training_documents enable row level security;
alter table public.findat_x1_training_jobs enable row level security;
alter table public.findat_x1_training_evaluations enable row level security;
alter table public.findat_x1_model_versions enable row level security;

revoke all on public.findat_x1_training_projects, public.findat_x1_training_assignments,
  public.findat_x1_training_documents, public.findat_x1_training_jobs,
  public.findat_x1_training_evaluations, public.findat_x1_model_versions from anon, authenticated;
grant select,insert,update,delete on public.findat_x1_training_projects, public.findat_x1_training_assignments,
  public.findat_x1_training_documents, public.findat_x1_training_jobs,
  public.findat_x1_training_evaluations, public.findat_x1_model_versions to authenticated;

create or replace function public.findat_x1_assigned(p_project uuid)
returns boolean language sql stable security definer set search_path=''
as $$
  select public.findat_is_admin() or exists(
    select 1 from public.findat_x1_training_assignments a
    where a.project_id=p_project and a.consultant_id=auth.uid() and a.active=true
  )
$$;

grant execute on function public.findat_x1_assigned(uuid) to authenticated;

drop policy if exists "FINDAT x1 projects access" on public.findat_x1_training_projects;
create policy "FINDAT x1 projects access" on public.findat_x1_training_projects
  for select to authenticated using(public.findat_is_admin() or public.findat_x1_assigned(id));
drop policy if exists "FINDAT x1 projects admin insert" on public.findat_x1_training_projects;
create policy "FINDAT x1 projects admin insert" on public.findat_x1_training_projects
  for insert to authenticated with check(public.findat_is_admin() and created_by=auth.uid());
drop policy if exists "FINDAT x1 projects admin update" on public.findat_x1_training_projects;
create policy "FINDAT x1 projects admin update" on public.findat_x1_training_projects
  for update to authenticated using(public.findat_is_admin()) with check(public.findat_is_admin());
drop policy if exists "FINDAT x1 projects admin delete" on public.findat_x1_training_projects;
create policy "FINDAT x1 projects admin delete" on public.findat_x1_training_projects
  for delete to authenticated using(public.findat_is_admin());

 drop policy if exists "FINDAT x1 assignments access" on public.findat_x1_training_assignments;
create policy "FINDAT x1 assignments access" on public.findat_x1_training_assignments
  for select to authenticated using(public.findat_is_admin() or consultant_id=auth.uid());
drop policy if exists "FINDAT x1 assignments admin write" on public.findat_x1_training_assignments;
create policy "FINDAT x1 assignments admin write" on public.findat_x1_training_assignments
  for all to authenticated using(public.findat_is_admin()) with check(public.findat_is_admin());

drop policy if exists "FINDAT x1 documents access" on public.findat_x1_training_documents;
create policy "FINDAT x1 documents access" on public.findat_x1_training_documents
  for select to authenticated using(public.findat_x1_assigned(project_id));
drop policy if exists "FINDAT x1 documents write" on public.findat_x1_training_documents;
create policy "FINDAT x1 documents write" on public.findat_x1_training_documents
  for insert to authenticated with check(public.findat_x1_assigned(project_id) and uploaded_by=auth.uid());
drop policy if exists "FINDAT x1 documents update" on public.findat_x1_training_documents;
create policy "FINDAT x1 documents update" on public.findat_x1_training_documents
  for update to authenticated using(public.findat_x1_assigned(project_id)) with check(public.findat_x1_assigned(project_id));
drop policy if exists "FINDAT x1 documents delete" on public.findat_x1_training_documents;
create policy "FINDAT x1 documents delete" on public.findat_x1_training_documents
  for delete to authenticated using(public.findat_is_admin() or uploaded_by=auth.uid());

drop policy if exists "FINDAT x1 jobs access" on public.findat_x1_training_jobs;
create policy "FINDAT x1 jobs access" on public.findat_x1_training_jobs
  for select to authenticated using(public.findat_x1_assigned(project_id));
drop policy if exists "FINDAT x1 jobs create" on public.findat_x1_training_jobs;
create policy "FINDAT x1 jobs create" on public.findat_x1_training_jobs
  for insert to authenticated with check(public.findat_x1_assigned(project_id) and requested_by=auth.uid());
drop policy if exists "FINDAT x1 jobs admin update" on public.findat_x1_training_jobs;
create policy "FINDAT x1 jobs admin update" on public.findat_x1_training_jobs
  for update to authenticated using(public.findat_is_admin()) with check(public.findat_is_admin());
drop policy if exists "FINDAT x1 jobs admin delete" on public.findat_x1_training_jobs;
create policy "FINDAT x1 jobs admin delete" on public.findat_x1_training_jobs
  for delete to authenticated using(public.findat_is_admin());

drop policy if exists "FINDAT x1 evaluations access" on public.findat_x1_training_evaluations;
create policy "FINDAT x1 evaluations access" on public.findat_x1_training_evaluations
  for select to authenticated using(public.findat_x1_assigned(project_id));
drop policy if exists "FINDAT x1 evaluations write" on public.findat_x1_training_evaluations;
create policy "FINDAT x1 evaluations write" on public.findat_x1_training_evaluations
  for insert to authenticated with check(public.findat_x1_assigned(project_id) and created_by=auth.uid());
drop policy if exists "FINDAT x1 evaluations update" on public.findat_x1_training_evaluations;
create policy "FINDAT x1 evaluations update" on public.findat_x1_training_evaluations
  for update to authenticated using(public.findat_x1_assigned(project_id)) with check(public.findat_x1_assigned(project_id));
drop policy if exists "FINDAT x1 evaluations delete" on public.findat_x1_training_evaluations;
create policy "FINDAT x1 evaluations delete" on public.findat_x1_training_evaluations
  for delete to authenticated using(public.findat_is_admin() or created_by=auth.uid());

drop policy if exists "FINDAT x1 models access" on public.findat_x1_model_versions;
create policy "FINDAT x1 models access" on public.findat_x1_model_versions
  for select to authenticated using(public.findat_is_admin() or (project_id is not null and public.findat_x1_assigned(project_id)));
drop policy if exists "FINDAT x1 models admin insert" on public.findat_x1_model_versions;
create policy "FINDAT x1 models admin insert" on public.findat_x1_model_versions
  for insert to authenticated with check(public.findat_is_admin() and created_by=auth.uid());
drop policy if exists "FINDAT x1 models admin update" on public.findat_x1_model_versions;
create policy "FINDAT x1 models admin update" on public.findat_x1_model_versions
  for update to authenticated using(public.findat_is_admin()) with check(public.findat_is_admin());
drop policy if exists "FINDAT x1 models admin delete" on public.findat_x1_model_versions;
create policy "FINDAT x1 models admin delete" on public.findat_x1_model_versions
  for delete to authenticated using(public.findat_is_admin());

-- Storage write controls. Ordinary Cloud objects require an authenticated
-- FINDAT session; course media remains Administrator-only; x1 training data is
-- kept in a separate private bucket and limited to assigned project members.

drop policy if exists "FINDAT storage-only insert" on storage.objects;
create policy "FINDAT storage-only insert"
on storage.objects as permissive for insert
to authenticated
with check (
  bucket_id = 'findat-documents'
  and name like 'findat-v1/%'
  and name not like 'findat-v1/course-media/%'
  and name not like 'findat-v1/profiles/%'
  and name not like 'findat-v1/x1-training/%'
);

drop policy if exists "FINDAT storage-only update" on storage.objects;
create policy "FINDAT storage-only update"
on storage.objects as permissive for update
to authenticated
using (
  bucket_id = 'findat-documents'
  and name like 'findat-v1/%'
  and name not like 'findat-v1/course-media/%'
  and name not like 'findat-v1/profiles/%'
  and name not like 'findat-v1/x1-training/%'
)
with check (
  bucket_id = 'findat-documents'
  and name like 'findat-v1/%'
  and name not like 'findat-v1/course-media/%'
  and name not like 'findat-v1/profiles/%'
  and name not like 'findat-v1/x1-training/%'
);

drop policy if exists "FINDAT storage-only delete" on storage.objects;
create policy "FINDAT storage-only delete"
on storage.objects as permissive for delete
to authenticated
using (
  bucket_id = 'findat-documents'
  and name like 'findat-v1/%'
  and name not like 'findat-v1/course-media/%'
  and name not like 'findat-v1/profiles/%'
  and name not like 'findat-v1/x1-training/%'
);

-- Keep the existing course-media policies; these additional names are removed
-- if they were created by an earlier draft of this migration.
drop policy if exists "FINDAT authenticated course and x1 media insert" on storage.objects;
drop policy if exists "FINDAT authenticated course and x1 media update" on storage.objects;
drop policy if exists "FINDAT authenticated course and x1 media delete" on storage.objects;

insert into storage.buckets(id,name,public,file_size_limit)
values('findat-x1-training','findat-x1-training',false,104857600)
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit;

drop policy if exists "FINDAT x1 private media select" on storage.objects;
create policy "FINDAT x1 private media select"
on storage.objects for select to authenticated
using (
  bucket_id='findat-x1-training'
  and public.findat_x1_assigned(((storage.foldername(name))[1])::uuid)
);

drop policy if exists "FINDAT x1 private media insert" on storage.objects;
create policy "FINDAT x1 private media insert"
on storage.objects for insert to authenticated
with check (
  bucket_id='findat-x1-training'
  and public.findat_x1_assigned(((storage.foldername(name))[1])::uuid)
);

drop policy if exists "FINDAT x1 private media update" on storage.objects;
create policy "FINDAT x1 private media update"
on storage.objects for update to authenticated
using (
  bucket_id='findat-x1-training'
  and public.findat_x1_assigned(((storage.foldername(name))[1])::uuid)
)
with check (
  bucket_id='findat-x1-training'
  and public.findat_x1_assigned(((storage.foldername(name))[1])::uuid)
);

drop policy if exists "FINDAT x1 private media delete" on storage.objects;
create policy "FINDAT x1 private media delete"
on storage.objects for delete to authenticated
using (
  bucket_id='findat-x1-training'
  and public.findat_x1_assigned(((storage.foldername(name))[1])::uuid)
);

-- Realtime support.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='findat_course_payments'
  ) then alter publication supabase_realtime add table public.findat_course_payments; end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='findat_course_enrollments'
  ) then alter publication supabase_realtime add table public.findat_course_enrollments; end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='findat_x1_training_jobs'
  ) then alter publication supabase_realtime add table public.findat_x1_training_jobs; end if;
exception when duplicate_object then null;
end $$;

commit;
