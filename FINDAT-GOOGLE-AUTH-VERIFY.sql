-- FINDAT Google authentication verification

select
  exists (
    select 1
    from pg_trigger
    where tgname = 'findat_on_auth_user_created'
      and not tgisinternal
  ) as profile_trigger_installed,
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'findat_profiles'
      and column_name = 'avatar_url'
  ) as avatar_column_available;

select
  u.email,
  p.username,
  p.role,
  p.active,
  p.first_name,
  p.last_name,
  p.avatar_url,
  i.provider,
  i.last_sign_in_at
from auth.identities as i
join auth.users as u on u.id = i.user_id
left join public.findat_profiles as p on p.id = u.id
where i.provider = 'google'
order by i.last_sign_in_at desc nulls last;
