select to_regclass('public.findat_platform_events') as platform_events,
       to_regclass('public.findat_cloud_workstations') as cloud_workstations,
       to_regclass('public.findat_site_patches') as site_patches;

select proname
from pg_proc
where pronamespace = 'public'::regnamespace
  and proname in (
    'findat_track_platform_event',
    'findat_admin_list_workstations',
    'findat_admin_save_workstation',
    'findat_admin_delete_workstation',
    'findat_my_workstations',
    'findat_verify_workstation_password',
    'findat_admin_save_site_patch'
  )
order by proname;

select tablename, rowsecurity
from pg_tables
where schemaname='public'
  and tablename in ('findat_platform_events','findat_cloud_workstations','findat_site_patches')
order by tablename;

select exists (
  select 1 from pg_publication_tables
  where pubname='supabase_realtime'
    and schemaname='public'
    and tablename='findat_site_patches'
) as site_patches_realtime_enabled;
