-- FINDAT course pricing, payment history, timed access, completion and certificate upgrade
-- Run after FINDAT-COURSES-PROFILES-ARTICLE-COLLABORATION-UPGRADE.sql.
-- Safe to run more than once.

begin;

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- 1. Pricing and access settings on every course
-- -----------------------------------------------------------------------------

alter table public.findat_courses
  add column if not exists is_free boolean not null default true,
  add column if not exists price numeric(12,2) not null default 0,
  add column if not exists currency text not null default 'ZMW',
  add column if not exists access_days integer not null default 30;

update public.findat_courses
set is_free = true,
    price = 0,
    currency = coalesce(nullif(currency, ''), 'ZMW'),
    access_days = greatest(coalesce(access_days, 30), 30)
where is_builtin = true or slug = 'data-analytics-foundations';

update public.findat_courses
set price = 0
where is_free = true;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'findat_course_price_check') then
    alter table public.findat_courses
      add constraint findat_course_price_check check (price >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'findat_course_currency_check') then
    alter table public.findat_courses
      add constraint findat_course_currency_check check (currency in ('ZMW', 'USD', 'GBP'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'findat_course_access_days_check') then
    alter table public.findat_courses
      add constraint findat_course_access_days_check check (access_days >= 30);
  end if;
end $$;

-- -----------------------------------------------------------------------------
-- 2. Payment requests and course enrolments
-- -----------------------------------------------------------------------------

create table if not exists public.findat_course_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.findat_profiles(id) on delete cascade,
  course_id uuid not null references public.findat_courses(id) on delete cascade,
  amount numeric(12,2) not null,
  currency text not null,
  payment_method text not null default '',
  payment_reference text not null default '',
  status text not null default 'pending',
  review_note text not null default '',
  paid_at timestamptz,
  verified_by uuid references public.findat_profiles(id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint findat_course_payment_amount_check check (amount >= 0),
  constraint findat_course_payment_currency_check check (currency in ('ZMW', 'USD', 'GBP')),
  constraint findat_course_payment_status_check check (status in ('pending', 'paid', 'rejected', 'refunded'))
);

create index if not exists findat_course_payments_user_idx
  on public.findat_course_payments(user_id, created_at desc);
create index if not exists findat_course_payments_course_idx
  on public.findat_course_payments(course_id, status, created_at desc);

create table if not exists public.findat_course_enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.findat_profiles(id) on delete cascade,
  course_id uuid not null references public.findat_courses(id) on delete cascade,
  payment_id uuid references public.findat_course_payments(id) on delete set null,
  status text not null default 'active',
  progress numeric(5,2) not null default 0,
  access_starts_at timestamptz not null default now(),
  access_expires_at timestamptz not null,
  completed_at timestamptz,
  certificate_number text,
  certificate_issued_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint findat_course_enrollment_status_check check (status in ('active', 'completed', 'expired', 'revoked')),
  constraint findat_course_enrollment_progress_check check (progress between 0 and 100),
  constraint findat_course_enrollment_access_check check (access_expires_at > access_starts_at),
  constraint findat_course_enrollment_user_course_uq unique (user_id, course_id)
);

create index if not exists findat_course_enrollments_user_idx
  on public.findat_course_enrollments(user_id, updated_at desc);
create index if not exists findat_course_enrollments_access_idx
  on public.findat_course_enrollments(course_id, status, access_expires_at);

-- Updated-at triggers use the existing helper from the course migration.
drop trigger if exists findat_course_payments_touch_updated_at on public.findat_course_payments;
create trigger findat_course_payments_touch_updated_at
before update on public.findat_course_payments
for each row execute function public.findat_touch_updated_at();

drop trigger if exists findat_course_enrollments_touch_updated_at on public.findat_course_enrollments;
create trigger findat_course_enrollments_touch_updated_at
before update on public.findat_course_enrollments
for each row execute function public.findat_touch_updated_at();

alter table public.findat_course_payments enable row level security;
alter table public.findat_course_enrollments enable row level security;

revoke all on public.findat_course_payments, public.findat_course_enrollments from anon, authenticated;
grant select on public.findat_course_payments, public.findat_course_enrollments to authenticated;

-- Users see their own records. Administrators see all records.
drop policy if exists "FINDAT own or admin course payments select" on public.findat_course_payments;
create policy "FINDAT own or admin course payments select"
on public.findat_course_payments for select
to authenticated
using (user_id = auth.uid() or public.findat_is_admin());

drop policy if exists "FINDAT own or admin course enrollments select" on public.findat_course_enrollments;
create policy "FINDAT own or admin course enrollments select"
on public.findat_course_enrollments for select
to authenticated
using (user_id = auth.uid() or public.findat_is_admin());

-- -----------------------------------------------------------------------------
-- 3. Access helpers and controlled writes
-- -----------------------------------------------------------------------------

create or replace function public.findat_course_has_access(p_course_id uuid)
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
            and e.user_id = auth.uid()
            and e.status in ('active', 'completed')
            and e.access_expires_at > now()
        )
      )
  )
$$;

grant execute on function public.findat_course_has_access(uuid) to anon, authenticated;

create or replace function public.findat_request_course_access(
  p_course_id uuid,
  p_payment_method text default '',
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
    raise exception 'Please sign in with an active FINDAT account';
  end if;

  select * into v_course
  from public.findat_courses
  where id = p_course_id and status = 'published';

  if v_course.id is null then
    raise exception 'Course not found';
  end if;

  if v_course.is_free then
    insert into public.findat_course_enrollments (
      user_id, course_id, status, progress, access_starts_at, access_expires_at
    ) values (
      auth.uid(), v_course.id, 'active', 0, now(), now() + make_interval(days => greatest(v_course.access_days, 30))
    )
    on conflict (user_id, course_id) do update
    set status = case when public.findat_course_enrollments.status = 'completed' then 'completed' else 'active' end,
        access_starts_at = least(public.findat_course_enrollments.access_starts_at, now()),
        access_expires_at = greatest(public.findat_course_enrollments.access_expires_at, now() + make_interval(days => greatest(v_course.access_days, 30))),
        updated_at = now()
    returning * into v_enrollment;

    return jsonb_build_object('kind', 'enrollment', 'status', v_enrollment.status, 'enrollment_id', v_enrollment.id);
  end if;

  if length(trim(coalesce(p_payment_method, ''))) < 2
     or length(trim(coalesce(p_payment_reference, ''))) < 3 then
    raise exception 'Enter the payment method and payment reference';
  end if;

  select * into v_payment
  from public.findat_course_payments
  where user_id = auth.uid()
    and course_id = v_course.id
    and status in ('pending', 'paid')
  order by created_at desc
  limit 1;

  if v_payment.id is not null then
    return jsonb_build_object('kind', 'payment', 'status', v_payment.status, 'payment_id', v_payment.id);
  end if;

  insert into public.findat_course_payments (
    user_id, course_id, amount, currency, payment_method, payment_reference, status
  ) values (
    auth.uid(), v_course.id, v_course.price, v_course.currency,
    left(trim(p_payment_method), 100), left(trim(p_payment_reference), 180), 'pending'
  ) returning * into v_payment;

  return jsonb_build_object('kind', 'payment', 'status', v_payment.status, 'payment_id', v_payment.id);
end;
$$;

grant execute on function public.findat_request_course_access(uuid, text, text) to authenticated;

create or replace function public.findat_admin_verify_course_payment(
  p_payment_id uuid,
  p_approve boolean,
  p_review_note text default ''
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
  if not public.findat_is_admin() then
    raise exception 'Administrator privileges are required';
  end if;

  select * into v_payment
  from public.findat_course_payments
  where id = p_payment_id
  for update;

  if v_payment.id is null then
    raise exception 'Payment request not found';
  end if;

  if v_payment.status <> 'pending' then
    return jsonb_build_object('status', v_payment.status, 'payment_id', v_payment.id);
  end if;

  if not p_approve then
    update public.findat_course_payments
    set status = 'rejected', review_note = left(trim(coalesce(p_review_note, '')), 500),
        verified_by = auth.uid(), verified_at = now(), updated_at = now()
    where id = v_payment.id
    returning * into v_payment;
    return jsonb_build_object('status', v_payment.status, 'payment_id', v_payment.id);
  end if;

  select * into v_course from public.findat_courses where id = v_payment.course_id;
  if v_course.id is null then raise exception 'Course not found'; end if;

  update public.findat_course_payments
  set status = 'paid', paid_at = now(), review_note = left(trim(coalesce(p_review_note, '')), 500),
      verified_by = auth.uid(), verified_at = now(), updated_at = now()
  where id = v_payment.id
  returning * into v_payment;

  insert into public.findat_course_enrollments (
    user_id, course_id, payment_id, status, progress, access_starts_at, access_expires_at
  ) values (
    v_payment.user_id, v_payment.course_id, v_payment.id, 'active', 0,
    now(), now() + make_interval(days => greatest(v_course.access_days, 30))
  )
  on conflict (user_id, course_id) do update
  set payment_id = excluded.payment_id,
      status = case when public.findat_course_enrollments.status = 'completed' then 'completed' else 'active' end,
      access_starts_at = now(),
      access_expires_at = now() + make_interval(days => greatest(v_course.access_days, 30)),
      updated_at = now()
  returning * into v_enrollment;

  return jsonb_build_object(
    'status', v_payment.status,
    'payment_id', v_payment.id,
    'enrollment_id', v_enrollment.id,
    'access_expires_at', v_enrollment.access_expires_at
  );
end;
$$;

grant execute on function public.findat_admin_verify_course_payment(uuid, boolean, text) to authenticated;

create or replace function public.findat_record_course_progress(
  p_course_id uuid,
  p_progress numeric,
  p_completed boolean default false
)
returns public.findat_course_enrollments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_course public.findat_courses;
  v_enrollment public.findat_course_enrollments;
  v_progress numeric(5,2) := greatest(0, least(100, coalesce(p_progress, 0)));
  v_certificate text;
begin
  if auth.uid() is null or not public.findat_user_is_active(auth.uid()) then
    raise exception 'Authentication required';
  end if;

  select * into v_course from public.findat_courses where id = p_course_id and status = 'published';
  if v_course.id is null then raise exception 'Course not found'; end if;

  if v_course.is_free then
    perform public.findat_request_course_access(v_course.id, '', '');
  end if;

  select * into v_enrollment
  from public.findat_course_enrollments
  where user_id = auth.uid() and course_id = v_course.id
    and status in ('active', 'completed')
    and access_expires_at > now()
  for update;

  if v_enrollment.id is null then raise exception 'Active course access is required'; end if;

  if (p_completed or v_progress >= 100) and v_enrollment.certificate_number is null then
    v_certificate := 'FINDAT-' || extract(year from now())::text || '-' || upper(substr(replace(v_enrollment.id::text, '-', ''), 1, 10));
  else
    v_certificate := v_enrollment.certificate_number;
  end if;

  update public.findat_course_enrollments
  set progress = greatest(progress, v_progress),
      status = case when p_completed or v_progress >= 100 then 'completed' else status end,
      completed_at = case when p_completed or v_progress >= 100 then coalesce(completed_at, now()) else completed_at end,
      certificate_number = v_certificate,
      certificate_issued_at = case when v_certificate is not null then coalesce(certificate_issued_at, now()) else certificate_issued_at end,
      updated_at = now()
  where id = v_enrollment.id
  returning * into v_enrollment;

  return v_enrollment;
end;
$$;

grant execute on function public.findat_record_course_progress(uuid, numeric, boolean) to authenticated;

-- -----------------------------------------------------------------------------
-- 4. Lock paid lesson records until access has been granted
-- -----------------------------------------------------------------------------

drop policy if exists "FINDAT course lessons select" on public.findat_course_lessons;
create policy "FINDAT course lessons select"
on public.findat_course_lessons for select
to anon, authenticated
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
          or exists (
            select 1
            from public.findat_course_enrollments e
            where e.course_id = c.id
              and e.user_id = auth.uid()
              and e.status in ('active', 'completed')
              and e.access_expires_at > now()
          )
        )
    )
  )
);

-- -----------------------------------------------------------------------------
-- 5. Private course lesson media for newly uploaded videos/documents/thumbnails
-- -----------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('findat-course-media', 'findat-course-media', false)
on conflict (id) do update set public = false;

drop policy if exists "FINDAT course media authorized select" on storage.objects;
create policy "FINDAT course media authorized select"
on storage.objects for select
to anon, authenticated
using (
  bucket_id = 'findat-course-media'
  and name ~ '^[0-9a-fA-F-]{36}/'
  and exists (
    select 1
    from public.findat_courses c
    where c.id = split_part(name, '/', 1)::uuid
      and c.status = 'published'
      and (
        c.is_free = true
        or public.findat_is_admin()
        or exists (
          select 1 from public.findat_course_enrollments e
          where e.course_id = c.id
            and e.user_id = auth.uid()
            and e.status in ('active', 'completed')
            and e.access_expires_at > now()
        )
      )
  )
);

drop policy if exists "FINDAT admin course media insert private" on storage.objects;
create policy "FINDAT admin course media insert private"
on storage.objects for insert
to authenticated
with check (bucket_id = 'findat-course-media' and public.findat_is_admin());

drop policy if exists "FINDAT admin course media update private" on storage.objects;
create policy "FINDAT admin course media update private"
on storage.objects for update
to authenticated
using (bucket_id = 'findat-course-media' and public.findat_is_admin())
with check (bucket_id = 'findat-course-media' and public.findat_is_admin());

drop policy if exists "FINDAT admin course media delete private" on storage.objects;
create policy "FINDAT admin course media delete private"
on storage.objects for delete
to authenticated
using (bucket_id = 'findat-course-media' and public.findat_is_admin());

-- Realtime helps payment and enrolment status update without a manual reload.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'findat_course_payments'
  ) then
    alter publication supabase_realtime add table public.findat_course_payments;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'findat_course_enrollments'
  ) then
    alter publication supabase_realtime add table public.findat_course_enrollments;
  end if;
end $$;

commit;
