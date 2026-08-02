-- FINDAT editor workflow upgrade
-- Allows Clients to upload/replace cover photos while preserving role limits.

create or replace function public.findat_guard_article_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_role public.findat_role := public.findat_role_for(auth.uid());
  v_owner_role public.findat_role;
begin
  if auth.role() = 'service_role' then
    new.updated_at := now();
    new.author_name := coalesce(public.findat_profile_display_name(new.owner_id), new.author_name, 'FINDAT Member');
    return new;
  end if;

  if v_uid is null or v_role is null then
    raise exception 'Authentication required';
  end if;

  if not public.findat_validate_consultant(new.collaborator_id) then
    raise exception 'The collaborator must be an active Consultant account';
  end if;

  if tg_op = 'INSERT' then
    new.created_at := coalesce(new.created_at, now());
    new.updated_at := now();
    new.owner_id := coalesce(new.owner_id, v_uid);
    new.created_by := coalesce(new.created_by, v_uid);

    if v_role = 'consultant' then
      raise exception 'Consultants can edit assigned client articles but cannot create articles';
    elsif v_role = 'client' then
      if new.owner_id <> v_uid or new.created_by <> v_uid then
        raise exception 'Clients may create only their own articles';
      end if;
      if new.status not in ('Draft', 'Pending approval') then
        raise exception 'Clients cannot approve or publish articles';
      end if;
      new.collaborator_id := null;
      new.attachments := '[]'::jsonb;
      new.review_note := null;
      new.reviewed_at := null;
      new.reviewed_by := null;
      new.published_at := null;
    end if;
  else
    new.updated_at := now();

    if v_role = 'client' then
      if old.owner_id <> v_uid then
        raise exception 'Clients may edit only their own articles';
      end if;
      if old.status = 'Published' then
        raise exception 'Published articles may be changed only by an Administrator';
      end if;
      new.owner_id := old.owner_id;
      new.created_by := old.created_by;
      new.created_at := old.created_at;
      new.collaborator_id := old.collaborator_id;
      new.attachments := old.attachments;
      new.reviewed_at := old.reviewed_at;
      new.reviewed_by := old.reviewed_by;
      new.published_at := old.published_at;
      if new.status not in ('Draft', 'Pending approval') then
        raise exception 'Clients cannot approve or publish articles';
      end if;
      if new.status = 'Pending approval' then
        new.submitted_at := coalesce(new.submitted_at, now());
        new.review_note := null;
      end if;

    elsif v_role = 'consultant' then
      select p.role into v_owner_role from public.findat_profiles p where p.id = old.owner_id;
      if old.collaborator_id <> v_uid or v_owner_role <> 'client'::public.findat_role then
        raise exception 'Consultants may edit only client articles assigned to them';
      end if;
      if old.status = 'Published' then
        raise exception 'Published articles may be changed only by an Administrator';
      end if;
      new.owner_id := old.owner_id;
      new.created_by := old.created_by;
      new.collaborator_id := old.collaborator_id;
      new.created_at := old.created_at;
      new.status := old.status;
      new.submitted_at := old.submitted_at;
      new.review_note := old.review_note;
      new.reviewed_at := old.reviewed_at;
      new.reviewed_by := old.reviewed_by;
      new.published_at := old.published_at;
    end if;
  end if;

  new.author_name := coalesce(public.findat_profile_display_name(new.owner_id), new.author_name, 'FINDAT Member');
  return new;
end;
$$;
