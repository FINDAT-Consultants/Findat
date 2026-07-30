-- FINDAT commerce, x1 knowledge-training and monthly Cloud access upgrade
-- Run after the existing FINDAT Auth/RBAC, collaboration, course and notification migrations.
-- Safe to run more than once.

begin;

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- 1. Course pricing, enrolments, payments and certificates
-- -----------------------------------------------------------------------------

alter table public.findat_courses
  add column if not exists is_free boolean not null default true,
  add column if not exists price_amount numeric(14,2) not null default 0,
  add column if not exists currency text not null default 'ZMW',
  add column if not exists access_months integer not null default 1;

alter table public.findat_courses
  drop constraint if exists findat_course_currency_check;
alter table public.findat_courses
  add constraint findat_course_currency_check check (currency in ('ZMW','USD','GBP'));

alter table public.findat_courses
  drop constraint if exists findat_course_price_check;
alter table public.findat_courses
  add constraint findat_course_price_check check (price_amount >= 0);

alter table public.findat_courses
  drop constraint if exists findat_course_access_months_check;
alter table public.findat_courses
  add constraint findat_course_access_months_check check (access_months >= 1 and access_months <= 36);

update public.findat_courses
set is_free = true,
    price_amount = 0,
    currency = 'ZMW',
    access_months = greatest(1, coalesce(access_months,1))
where slug = 'data-analytics-foundations';

create table if not exists public.findat_course_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.findat_profiles(id) on delete cascade,
  course_id uuid not null references public.findat_courses(id) on delete cascade,
  amount numeric(14,2) not null,
  currency text not null,
  status text not null default 'pending',
  payment_method text not null default 'manual',
  payment_reference text not null default '',
  requested_at timestamptz not null default now(),
  paid_at timestamptz,
  recorded_by uuid references public.findat_profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint findat_course_payment_currency_check check (currency in ('ZMW','USD','GBP')),
  constraint findat_course_payment_status_check check (status in ('pending','paid','failed','refunded','cancelled')),
  constraint findat_course_payment_amount_check check (amount >= 0)
);

create index if not exists findat_course_payments_user_idx
  on public.findat_course_payments(user_id, requested_at desc);
create index if not exists findat_course_payments_admin_idx
  on public.findat_course_payments(status, requested_at desc);

create table if not exists public.findat_course_enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.findat_profiles(id) on delete cascade,
  course_id uuid not null references public.findat_courses(id) on delete cascade,
  status text not null default 'active',
  access_started_at timestamptz not null default now(),
  access_expires_at timestamptz,
  completion_percent numeric(5,2) not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint findat_course_enrollment_status_check check (status in ('active','completed','expired','suspended')),
  constraint findat_course_completion_check check (completion_percent between 0 and 100),
  constraint findat_course_enrollment_unique unique (user_id, course_id)
);

create index if not exists findat_course_enrollments_user_idx
  on public.findat_course_enrollments(user_id, status, access_expires_at);

create table if not exists public.findat_course_certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.findat_profiles(id) on delete cascade,
  course_id uuid not null references public.findat_courses(id) on delete cascade,
  certificate_number text not null unique,
  certificate_url text not null default '',
  awarded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint findat_course_certificate_unique unique (user_id, course_id)
);

alter table public.findat_course_payments enable row level security;
alter table public.findat_course_enrollments enable row level security;
alter table public.findat_course_certificates enable row level security;

revoke all on public.findat_course_payments, public.findat_course_enrollments, public.findat_course_certificates from anon, authenticated;
grant select on public.findat_course_payments, public.findat_course_enrollments, public.findat_course_certificates to authenticated;

-- Course history is private to the learner and visible to Administrators.
drop policy if exists "FINDAT payment history select" on public.findat_course_payments;
create policy "FINDAT payment history select" on public.findat_course_payments
for select to authenticated
using (user_id = auth.uid() or public.findat_is_admin());

drop policy if exists "FINDAT enrollment select" on public.findat_course_enrollments;
create policy "FINDAT enrollment select" on public.findat_course_enrollments
for select to authenticated
using (user_id = auth.uid() or public.findat_is_admin());

drop policy if exists "FINDAT certificate select" on public.findat_course_certificates;
create policy "FINDAT certificate select" on public.findat_course_certificates
for select to authenticated
using (user_id = auth.uid() or public.findat_is_admin());

-- Extend notification kinds used by the new controlled workflows.
alter table public.findat_notifications
  drop constraint if exists findat_notification_kind_check;
alter table public.findat_notifications
  add constraint findat_notification_kind_check check (kind in (
    'collaboration_request','collaboration_response','collaboration_cancelled',
    'article_update','article_comment','course_update','course_payment',
    'course_enrollment','course_certificate','cloud_access','x1_training','system'
  ));

create or replace function public.findat_course_has_access(p_course_id uuid, p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.findat_courses c
    where c.id = p_course_id
      and c.status = 'published'
      and (
        c.is_free = true
        or public.findat_is_admin()
        or exists (
          select 1
          from public.findat_course_enrollments e
          where e.course_id = c.id
            and e.user_id = p_user_id
            and e.status in ('active','completed')
            and (e.access_expires_at is null or e.access_expires_at > now())
        )
      )
  )
$$;

-- New course media is stored in a private bucket. Course-card images remain
-- visible for published courses; lesson videos and documents require free-course,
-- active-enrolment, or Administrator access.
insert into storage.buckets(id,name,public,file_size_limit)
values('findat-course-media','findat-course-media',false,524288000)
on conflict(id) do update
set public=false,
    file_size_limit=excluded.file_size_limit;

drop policy if exists "FINDAT private course media select" on storage.objects;
create policy "FINDAT private course media select" on storage.objects
for select to anon, authenticated
using (
  bucket_id='findat-course-media'
  and exists (
    select 1
    from public.findat_courses c
    where c.id::text=split_part(storage.objects.name,'/',1)
      and c.status='published'
      and (
        split_part(storage.objects.name,'/',2)='course-cover'
        or c.is_free=true
        or public.findat_is_admin()
        or (
          auth.uid() is not null
          and public.findat_course_has_access(c.id,auth.uid())
        )
      )
  )
);

drop policy if exists "FINDAT private course media insert" on storage.objects;
create policy "FINDAT private course media insert" on storage.objects
for insert to authenticated
with check (bucket_id='findat-course-media' and public.findat_is_admin());

drop policy if exists "FINDAT private course media update" on storage.objects;
create policy "FINDAT private course media update" on storage.objects
for update to authenticated
using (bucket_id='findat-course-media' and public.findat_is_admin())
with check (bucket_id='findat-course-media' and public.findat_is_admin());

drop policy if exists "FINDAT private course media delete" on storage.objects;
create policy "FINDAT private course media delete" on storage.objects
for delete to authenticated
using (bucket_id='findat-course-media' and public.findat_is_admin());

-- Free lessons remain available to everyone. Paid lessons require an active
-- authenticated enrolment (or Administrator access).
drop policy if exists "FINDAT course lessons select" on public.findat_course_lessons;
create policy "FINDAT course lessons select" on public.findat_course_lessons
for select to anon, authenticated
using (
  is_published = true
  and exists (
    select 1 from public.findat_courses c
    where c.id = findat_course_lessons.course_id
      and c.status = 'published'
      and (
        c.is_free = true
        or public.findat_is_admin()
        or (
          auth.uid() is not null
          and public.findat_course_has_access(c.id, auth.uid())
        )
      )
  )
);

create or replace function public.findat_request_course_access(p_course_id uuid)
returns table (
  course_id uuid,
  access_granted boolean,
  payment_status text,
  message text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_course public.findat_courses;
  v_payment public.findat_course_payments;
  v_expiry timestamptz;
begin
  if auth.uid() is null or not public.findat_user_is_active(auth.uid()) then
    raise exception 'Sign in to request course access';
  end if;

  select * into v_course from public.findat_courses c
  where c.id = p_course_id and c.status = 'published';
  if not found then raise exception 'Course not found'; end if;

  if v_course.is_free or v_course.price_amount = 0 then
    v_expiry := now() + make_interval(months => greatest(1, v_course.access_months));
    insert into public.findat_course_enrollments(user_id, course_id, status, access_started_at, access_expires_at)
    values(auth.uid(), p_course_id, 'active', now(), v_expiry)
    on conflict(user_id, course_id) do update
      set status='active', access_started_at=now(), access_expires_at=v_expiry, updated_at=now();
    return query select p_course_id, true, 'free', 'Course access is active.';
    return;
  end if;

  select * into v_payment
  from public.findat_course_payments p
  where p.user_id = auth.uid() and p.course_id = p_course_id and p.status = 'pending'
  order by p.requested_at desc limit 1;

  if not found then
    insert into public.findat_course_payments(user_id, course_id, amount, currency, status)
    values(auth.uid(), p_course_id, v_course.price_amount, v_course.currency, 'pending')
    returning * into v_payment;

    insert into public.findat_notifications(recipient_id, actor_id, kind, title, message, action_state)
    select p.id, auth.uid(), 'course_payment', 'New course payment request',
      coalesce(nullif(trim(concat_ws(' ', learner.first_name, learner.last_name)),''),learner.username,'A learner')
      || ' requested access to “' || v_course.title || '” for '
      || v_course.currency || ' ' || to_char(v_course.price_amount,'FM999999990.00') || '.',
      'pending'
    from public.findat_profiles p
    cross join public.findat_profiles learner
    where learner.id = auth.uid() and p.role = 'admin' and p.active = true;
  end if;

  return query select p_course_id, false, v_payment.status,
    'Payment request recorded. Access opens after payment confirmation.';
end;
$$;

create or replace function public.findat_course_payment_admin_feed()
returns table (
  payment_id uuid,
  user_id uuid,
  learner_name text,
  learner_username text,
  course_id uuid,
  course_title text,
  amount numeric,
  currency text,
  status text,
  payment_reference text,
  requested_at timestamptz,
  paid_at timestamptz,
  access_expires_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.user_id,
    coalesce(nullif(trim(concat_ws(' ',u.first_name,u.last_name)),''),u.username),
    u.username, p.course_id, c.title, p.amount, p.currency, p.status,
    p.payment_reference, p.requested_at, p.paid_at, e.access_expires_at
  from public.findat_course_payments p
  join public.findat_profiles u on u.id=p.user_id
  join public.findat_courses c on c.id=p.course_id
  left join public.findat_course_enrollments e on e.user_id=p.user_id and e.course_id=p.course_id
  where public.findat_is_admin()
  order by case p.status when 'pending' then 0 else 1 end, p.requested_at desc
$$;

create or replace function public.findat_record_course_payment(
  p_payment_id uuid,
  p_reference text default '',
  p_method text default 'manual'
)
returns table (user_id uuid, course_id uuid, access_expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payment public.findat_course_payments;
  v_course public.findat_courses;
  v_expiry timestamptz;
begin
  if not public.findat_is_admin() then raise exception 'Administrator privileges required'; end if;
  select * into v_payment from public.findat_course_payments where id=p_payment_id for update;
  if not found then raise exception 'Payment request not found'; end if;
  select * into v_course from public.findat_courses where id=v_payment.course_id;
  v_expiry := now() + make_interval(months => greatest(1, v_course.access_months));

  update public.findat_course_payments
    set status='paid', payment_reference=left(coalesce(p_reference,''),180),
        payment_method=left(coalesce(p_method,'manual'),80), paid_at=now(),
        recorded_by=auth.uid(), updated_at=now()
  where id=p_payment_id;

  insert into public.findat_course_enrollments(user_id,course_id,status,access_started_at,access_expires_at)
  values(v_payment.user_id,v_payment.course_id,'active',now(),v_expiry)
  on conflict(user_id,course_id) do update
    set status='active', access_started_at=now(), access_expires_at=v_expiry, updated_at=now();

  insert into public.findat_notifications(recipient_id,actor_id,kind,title,message,action_state)
  values(v_payment.user_id,auth.uid(),'course_enrollment','Course access activated',
    'Payment confirmed. “'||v_course.title||'” is available until '
    ||to_char(v_expiry,'DD Mon YYYY HH24:MI')||'.','accepted');

  return query select v_payment.user_id,v_payment.course_id,v_expiry;
end;
$$;

create or replace function public.findat_my_learning()
returns table (
  course_id uuid,
  course_title text,
  cover_url text,
  is_free boolean,
  price_amount numeric,
  currency text,
  access_months integer,
  payment_status text,
  payment_amount numeric,
  payment_currency text,
  payment_reference text,
  requested_at timestamptz,
  paid_at timestamptz,
  enrollment_status text,
  access_started_at timestamptz,
  access_expires_at timestamptz,
  completion_percent numeric,
  completed_at timestamptz,
  certificate_number text,
  certificate_url text,
  awarded_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  with latest_payment as (
    select distinct on (p.course_id) p.*
    from public.findat_course_payments p
    where p.user_id=auth.uid()
    order by p.course_id,p.requested_at desc
  )
  select c.id,c.title,c.cover_url,c.is_free,c.price_amount,c.currency,c.access_months,
    lp.status,lp.amount,lp.currency,lp.payment_reference,lp.requested_at,lp.paid_at,
    e.status,e.access_started_at,e.access_expires_at,e.completion_percent,e.completed_at,
    cert.certificate_number,cert.certificate_url,cert.awarded_at
  from public.findat_courses c
  left join latest_payment lp on lp.course_id=c.id
  left join public.findat_course_enrollments e on e.course_id=c.id and e.user_id=auth.uid()
  left join public.findat_course_certificates cert on cert.course_id=c.id and cert.user_id=auth.uid()
  where auth.uid() is not null
    and (c.status='published' or public.findat_is_admin())
  order by c.updated_at desc
$$;

create or replace function public.findat_update_course_progress(p_course_id uuid, p_percent numeric)
returns table (completion_percent numeric, certificate_number text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_percent numeric := greatest(0,least(100,coalesce(p_percent,0)));
  v_course public.findat_courses;
  v_cert text := null;
  v_expiry timestamptz;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into v_course from public.findat_courses where id=p_course_id and status='published';
  if not found then raise exception 'Course not found'; end if;
  if not public.findat_course_has_access(p_course_id,auth.uid()) then raise exception 'Course access is not active'; end if;

  v_expiry := now()+make_interval(months=>greatest(1,v_course.access_months));
  insert into public.findat_course_enrollments(user_id,course_id,status,access_started_at,access_expires_at,completion_percent,completed_at)
  values(auth.uid(),p_course_id,case when v_percent>=100 then 'completed' else 'active' end,now(),v_expiry,v_percent,case when v_percent>=100 then now() end)
  on conflict(user_id,course_id) do update
  set completion_percent=greatest(public.findat_course_enrollments.completion_percent,v_percent),
      status=case when greatest(public.findat_course_enrollments.completion_percent,v_percent)>=100 then 'completed' else public.findat_course_enrollments.status end,
      completed_at=case when greatest(public.findat_course_enrollments.completion_percent,v_percent)>=100 then coalesce(public.findat_course_enrollments.completed_at,now()) else public.findat_course_enrollments.completed_at end,
      updated_at=now();

  if v_percent>=100 then
    v_cert := 'FINDAT-'||to_char(now(),'YYYYMM')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
    insert into public.findat_course_certificates(user_id,course_id,certificate_number)
    values(auth.uid(),p_course_id,v_cert)
    on conflict(user_id,course_id) do update set awarded_at=public.findat_course_certificates.awarded_at
    returning public.findat_course_certificates.certificate_number into v_cert;

    insert into public.findat_notifications(recipient_id,actor_id,kind,title,message,action_state)
    values(auth.uid(),auth.uid(),'course_certificate','Course certificate awarded',
      'You completed “'||v_course.title||'”. Certificate number: '||v_cert||'.','accepted');
  end if;

  return query select v_percent,v_cert;
end;
$$;

-- -----------------------------------------------------------------------------
-- 2. x1 | ProATR controlled knowledge training
-- -----------------------------------------------------------------------------

create table if not exists public.findat_x1_training_entries (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  tags text[] not null default '{}',
  input_text text not null default '',
  expected_output text not null default '',
  python_code text not null default '',
  status text not null default 'active',
  created_by uuid not null references public.findat_profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint findat_x1_training_status_check check (status in ('draft','active','archived'))
);

create table if not exists public.findat_x1_training_documents (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid references public.findat_x1_training_entries(id) on delete cascade,
  file_name text not null,
  file_url text not null default '',
  mime_type text not null default '',
  file_size bigint not null default 0,
  extracted_text text not null default '',
  created_by uuid not null references public.findat_profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

alter table public.findat_x1_training_entries enable row level security;
alter table public.findat_x1_training_documents enable row level security;
revoke all on public.findat_x1_training_entries,public.findat_x1_training_documents from anon,authenticated;
grant select,insert,update,delete on public.findat_x1_training_entries,public.findat_x1_training_documents to authenticated;

drop policy if exists "FINDAT x1 training read" on public.findat_x1_training_entries;
create policy "FINDAT x1 training read" on public.findat_x1_training_entries for select to authenticated
using (status='active' or public.findat_is_admin());
drop policy if exists "FINDAT x1 training admin write" on public.findat_x1_training_entries;
create policy "FINDAT x1 training admin write" on public.findat_x1_training_entries for all to authenticated
using (public.findat_is_admin()) with check (public.findat_is_admin());

drop policy if exists "FINDAT x1 training document read" on public.findat_x1_training_documents;
create policy "FINDAT x1 training document read" on public.findat_x1_training_documents for select to authenticated
using (public.findat_is_admin() or exists(select 1 from public.findat_x1_training_entries e where e.id=entry_id and e.status='active'));
drop policy if exists "FINDAT x1 training document admin write" on public.findat_x1_training_documents;
create policy "FINDAT x1 training document admin write" on public.findat_x1_training_documents for all to authenticated
using (public.findat_is_admin()) with check (public.findat_is_admin());

create or replace function public.findat_x1_training_feed()
returns table (
  id uuid,
  title text,
  tags text[],
  input_text text,
  expected_output text,
  document_text text,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select e.id,e.title,e.tags,e.input_text,e.expected_output,
    coalesce(string_agg(nullif(d.extracted_text,''), E'\n\n' order by d.created_at),'') as document_text,
    e.updated_at
  from public.findat_x1_training_entries e
  left join public.findat_x1_training_documents d on d.entry_id=e.id
  where e.status='active'
  group by e.id,e.title,e.tags,e.input_text,e.expected_output,e.updated_at
  order by e.updated_at desc
$$;

-- Storage path used only by Administrators for x1 training documents.
drop policy if exists "FINDAT x1 training storage select" on storage.objects;
create policy "FINDAT x1 training storage select" on storage.objects
for select to authenticated
using (bucket_id='findat-documents' and name like 'findat-v1/x1-training/%');

drop policy if exists "FINDAT x1 training storage insert" on storage.objects;
create policy "FINDAT x1 training storage insert" on storage.objects
for insert to authenticated
with check (bucket_id='findat-documents' and name like 'findat-v1/x1-training/%' and public.findat_is_admin());

drop policy if exists "FINDAT x1 training storage update" on storage.objects;
create policy "FINDAT x1 training storage update" on storage.objects
for update to authenticated
using (bucket_id='findat-documents' and name like 'findat-v1/x1-training/%' and public.findat_is_admin())
with check (bucket_id='findat-documents' and name like 'findat-v1/x1-training/%' and public.findat_is_admin());

drop policy if exists "FINDAT x1 training storage delete" on storage.objects;
create policy "FINDAT x1 training storage delete" on storage.objects
for delete to authenticated
using (bucket_id='findat-documents' and name like 'findat-v1/x1-training/%' and public.findat_is_admin());

-- -----------------------------------------------------------------------------
-- 3. Monthly FINDAT Cloud credentials
-- -----------------------------------------------------------------------------

create table if not exists public.findat_cloud_access (
  user_id uuid primary key references public.findat_profiles(id) on delete cascade,
  password_hash text not null,
  active boolean not null default true,
  issued_by uuid not null references public.findat_profiles(id) on delete restrict,
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);

alter table public.findat_cloud_access enable row level security;
revoke all on public.findat_cloud_access from anon,authenticated;
grant select on public.findat_cloud_access to authenticated;

drop policy if exists "FINDAT cloud access self/admin select" on public.findat_cloud_access;
create policy "FINDAT cloud access self/admin select" on public.findat_cloud_access
for select to authenticated
using (user_id=auth.uid() or public.findat_is_admin());

create or replace function public.findat_generate_cloud_access(p_user_id uuid)
returns table (user_id uuid, username text, temporary_password text, expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.findat_profiles;
  v_password text;
  v_expiry timestamptz;
begin
  if not public.findat_is_admin() then raise exception 'Administrator privileges required'; end if;
  select * into v_profile from public.findat_profiles where id=p_user_id and active=true;
  if not found then raise exception 'Active user not found'; end if;
  if v_profile.role='admin' then raise exception 'Administrators access FINDAT Cloud automatically'; end if;

  v_password := 'FC-'||upper(substr(encode(gen_random_bytes(8),'hex'),1,4))||'-'||upper(substr(encode(gen_random_bytes(8),'hex'),1,6));
  v_expiry := date_trunc('month',now()) + interval '1 month' - interval '1 second';

  insert into public.findat_cloud_access(user_id,password_hash,active,issued_by,issued_at,expires_at,updated_at)
  values(p_user_id,crypt(v_password,gen_salt('bf')),true,auth.uid(),now(),v_expiry,now())
  on conflict on constraint findat_cloud_access_pkey do update set password_hash=excluded.password_hash,active=true,issued_by=auth.uid(),issued_at=now(),expires_at=v_expiry,updated_at=now();

  insert into public.findat_notifications(recipient_id,actor_id,kind,title,message,action_state)
  values(p_user_id,auth.uid(),'cloud_access','FINDAT Cloud password',
    'Username: '||v_profile.username||E'\nTemporary password: '||v_password||E'\nExpires: '||to_char(v_expiry,'DD Mon YYYY HH24:MI')||E'\nUse this password after the FINDAT Cloud loader finishes.',
    'accepted');

  return query select p_user_id,v_profile.username,v_password,v_expiry;
end;
$$;

create or replace function public.findat_set_cloud_access_active(p_user_id uuid,p_active boolean)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.findat_is_admin() then raise exception 'Administrator privileges required'; end if;
  update public.findat_cloud_access set active=coalesce(p_active,false),updated_at=now() where user_id=p_user_id;
  return found;
end;
$$;

create or replace function public.findat_cloud_access_registry()
returns table (
  user_id uuid,
  display_name text,
  username text,
  role public.findat_role,
  active boolean,
  cloud_active boolean,
  issued_at timestamptz,
  expires_at timestamptz,
  expired boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id,
    coalesce(nullif(trim(concat_ws(' ',p.first_name,p.last_name)),''),p.username),
    p.username,p.role,p.active,coalesce(c.active,false),c.issued_at,c.expires_at,
    case when c.expires_at is null then true else c.expires_at<=now() end
  from public.findat_profiles p
  left join public.findat_cloud_access c on c.user_id=p.id
  where public.findat_is_admin() and p.role<>'admin'
  order by p.role,p.first_name,p.last_name,p.username
$$;

create or replace function public.findat_verify_cloud_access(p_username text,p_password text)
returns table (access_granted boolean, expires_at timestamptz, message text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.findat_profiles;
  v_access public.findat_cloud_access;
begin
  if auth.uid() is null then return query select false,null::timestamptz,'Sign in to FINDAT first.'; return; end if;
  select * into v_profile from public.findat_profiles where id=auth.uid() and active=true;
  if not found then return query select false,null::timestamptz,'Your FINDAT account is unavailable.'; return; end if;
  if v_profile.role='admin' then return query select true,null::timestamptz,'Administrator access granted.'; return; end if;
  if lower(trim(coalesce(p_username,'')))<>lower(v_profile.username) then return query select false,null::timestamptz,'Use your assigned FINDAT username.'; return; end if;
  select * into v_access from public.findat_cloud_access c where c.user_id=auth.uid();
  if not found then
    return query select false,null::timestamptz,'Cloud access is not active. Contact an Administrator.';
    return;
  end if;
  if not v_access.active then
    return query select false,v_access.expires_at,'Cloud access is suspended. Contact an Administrator.';
    return;
  end if;
  if v_access.expires_at<=now() then return query select false,v_access.expires_at,'This Cloud password has expired. Ask an Administrator to renew it.'; return; end if;
  if crypt(coalesce(p_password,''),v_access.password_hash)<>v_access.password_hash then return query select false,v_access.expires_at,'The Cloud password is incorrect.'; return; end if;
  return query select true,v_access.expires_at,'Cloud access granted.';
end;
$$;

-- -----------------------------------------------------------------------------
-- 4. Touch timestamps and grants
-- -----------------------------------------------------------------------------

drop trigger if exists findat_course_payments_touch_updated_at on public.findat_course_payments;
create trigger findat_course_payments_touch_updated_at before update on public.findat_course_payments
for each row execute function public.findat_touch_updated_at();
drop trigger if exists findat_course_enrollments_touch_updated_at on public.findat_course_enrollments;
create trigger findat_course_enrollments_touch_updated_at before update on public.findat_course_enrollments
for each row execute function public.findat_touch_updated_at();
drop trigger if exists findat_x1_training_entries_touch_updated_at on public.findat_x1_training_entries;
create trigger findat_x1_training_entries_touch_updated_at before update on public.findat_x1_training_entries
for each row execute function public.findat_touch_updated_at();

revoke all on function public.findat_course_has_access(uuid,uuid) from public,anon;
revoke all on function public.findat_request_course_access(uuid) from public,anon;
revoke all on function public.findat_course_payment_admin_feed() from public,anon;
revoke all on function public.findat_record_course_payment(uuid,text,text) from public,anon;
revoke all on function public.findat_my_learning() from public,anon;
revoke all on function public.findat_update_course_progress(uuid,numeric) from public,anon;
revoke all on function public.findat_x1_training_feed() from public,anon;
revoke all on function public.findat_generate_cloud_access(uuid) from public,anon;
revoke all on function public.findat_set_cloud_access_active(uuid,boolean) from public,anon;
revoke all on function public.findat_cloud_access_registry() from public,anon;
revoke all on function public.findat_verify_cloud_access(text,text) from public,anon;

grant execute on function public.findat_course_has_access(uuid,uuid) to anon, authenticated;
grant execute on function public.findat_request_course_access(uuid) to authenticated;
grant execute on function public.findat_course_payment_admin_feed() to authenticated;
grant execute on function public.findat_record_course_payment(uuid,text,text) to authenticated;
grant execute on function public.findat_my_learning() to authenticated;
grant execute on function public.findat_update_course_progress(uuid,numeric) to authenticated;
grant execute on function public.findat_x1_training_feed() to authenticated;
grant execute on function public.findat_generate_cloud_access(uuid) to authenticated;
grant execute on function public.findat_set_cloud_access_active(uuid,boolean) to authenticated;
grant execute on function public.findat_cloud_access_registry() to authenticated;
grant execute on function public.findat_verify_cloud_access(text,text) to authenticated;

-- Realtime for learner history, payments and training entries.
do $$
begin
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='findat_course_payments') then
    alter publication supabase_realtime add table public.findat_course_payments;
  end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='findat_course_enrollments') then
    alter publication supabase_realtime add table public.findat_course_enrollments;
  end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='findat_course_certificates') then
    alter publication supabase_realtime add table public.findat_course_certificates;
  end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='findat_x1_training_entries') then
    alter publication supabase_realtime add table public.findat_x1_training_entries;
  end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='findat_cloud_access') then
    alter publication supabase_realtime add table public.findat_cloud_access;
  end if;
end $$;

commit;

select
  to_regclass('public.findat_course_payments') as course_payments,
  to_regclass('public.findat_course_enrollments') as course_enrollments,
  to_regclass('public.findat_course_certificates') as course_certificates,
  to_regclass('public.findat_x1_training_entries') as x1_training,
  to_regclass('public.findat_cloud_access') as cloud_access;
