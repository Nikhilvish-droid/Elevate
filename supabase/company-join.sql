-- One company profile, founder-owned. Others request to join.
-- Run in the Supabase SQL editor.

alter table public.company_members
  add column if not exists role text;

update public.company_members
set role = 'founder'
where role is null;

alter table public.company_members
  alter column role set default 'recruiter';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'company_members_role_check'
  ) then
    alter table public.company_members
      add constraint company_members_role_check
      check (role in ('founder', 'recruiter', 'hiring_manager', 'interviewer'));
  end if;
end $$;

create unique index if not exists company_members_user_id_unique
  on public.company_members (user_id);

create table if not exists public.company_join_requests (
  id bigint generated always as identity primary key,
  company_id bigint not null references public.companies (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  requested_role text not null
    check (requested_role in ('recruiter', 'hiring_manager', 'interviewer')),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_by uuid references public.users (id),
  reviewed_at timestamptz
);

create unique index if not exists company_join_requests_pending_unique
  on public.company_join_requests (company_id, user_id)
  where status = 'pending';

create or replace function public.is_company_founder(cid bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.company_members m
    where m.company_id = cid
      and m.user_id = auth.uid()
      and m.role = 'founder'
  );
$$;

create or replace function public.is_company_member(cid bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.company_members m
    where m.company_id = cid
      and m.user_id = auth.uid()
  );
$$;

grant execute on function public.is_company_founder(bigint) to authenticated;
grant execute on function public.is_company_member(bigint) to authenticated;

alter table public.companies enable row level security;

-- Old policies often require company_members first (chicken-and-egg).
do $$
declare pol record;
begin
  for pol in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'companies'
      and cmd = 'INSERT'
  loop
    execute format('drop policy if exists %I on public.companies', pol.policyname);
  end loop;
end $$;

drop policy if exists "companies_read_authenticated" on public.companies;
create policy "companies_read_authenticated"
  on public.companies for select
  to authenticated
  using (true);

drop policy if exists "companies_insert_authenticated" on public.companies;
create policy "companies_insert_authenticated"
  on public.companies for insert
  to authenticated
  with check (true);

grant select, insert, update on public.companies to authenticated;

create or replace function public.create_company_as_founder(payload jsonb)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  new_id bigint;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  if exists (select 1 from public.company_members where user_id = uid) then
    raise exception 'You already belong to a company';
  end if;

  insert into public.companies (
    name,
    website_url,
    logo_url,
    industry,
    company_size,
    description,
    linkedin_url,
    twitter_url,
    github_url,
    updated_at
  )
  values (
    nullif(btrim(payload->>'name'), ''),
    nullif(btrim(payload->>'website_url'), ''),
    nullif(btrim(payload->>'logo_url'), ''),
    nullif(btrim(payload->>'industry'), ''),
    nullif(btrim(payload->>'company_size'), ''),
    nullif(btrim(payload->>'description'), ''),
    nullif(btrim(payload->>'linkedin_url'), ''),
    nullif(btrim(payload->>'twitter_url'), ''),
    nullif(btrim(payload->>'github_url'), ''),
    now()
  )
  returning id into new_id;

  insert into public.company_members (company_id, user_id, role)
  values (new_id, uid, 'founder');

  if coalesce(btrim(payload->>'city'), '') <> ''
     or coalesce(btrim(payload->>'address_line'), '') <> '' then
    insert into public.company_locations (
      company_id,
      address_line,
      city,
      state,
      country,
      postal_code,
      is_headquarters
    )
    values (
      new_id,
      nullif(btrim(payload->>'address_line'), ''),
      nullif(btrim(payload->>'city'), ''),
      nullif(btrim(payload->>'state'), ''),
      nullif(btrim(payload->>'country'), ''),
      nullif(btrim(payload->>'postal_code'), ''),
      true
    );
  end if;

  return new_id;
end;
$$;

grant execute on function public.create_company_as_founder(jsonb) to authenticated;

drop policy if exists "companies_update_founder" on public.companies;
create policy "companies_update_founder"
  on public.companies for update
  to authenticated
  using (public.is_company_founder(id))
  with check (public.is_company_founder(id));

alter table public.company_members enable row level security;

drop policy if exists "company_members_select" on public.company_members;
create policy "company_members_select"
  on public.company_members for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_company_member(company_id)
  );

do $$
declare pol record;
begin
  for pol in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'company_members'
      and cmd = 'INSERT'
  loop
    execute format('drop policy if exists %I on public.company_members', pol.policyname);
  end loop;
end $$;

drop policy if exists "company_members_insert_founder_self" on public.company_members;
create policy "company_members_insert_founder_self"
  on public.company_members for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and role = 'founder'
  );

drop policy if exists "company_members_insert_by_founder" on public.company_members;
create policy "company_members_insert_by_founder"
  on public.company_members for insert
  to authenticated
  with check (public.is_company_founder(company_id));

grant select, insert, update on public.company_members to authenticated;
grant select, insert, update on public.company_join_requests to authenticated;
grant select, insert on public.user_roles to authenticated;
grant select on public.roles to authenticated;

create or replace function public.review_company_join_request(p_id bigint, p_action text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  req public.company_join_requests%rowtype;
  existing_company bigint;
  role_id bigint;
  new_status text;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  if p_action not in ('approve', 'reject') then
    raise exception 'action must be approve or reject';
  end if;

  select * into req
  from public.company_join_requests
  where id = p_id;
  if not found then
    raise exception 'Request not found';
  end if;

  if not exists (
    select 1
    from public.company_members m
    where m.company_id = req.company_id
      and m.user_id = uid
      and m.role = 'founder'
  ) then
    raise exception 'Only the founder can review join requests';
  end if;

  if req.status <> 'pending' then
    return jsonb_build_object('ok', true, 'status', req.status);
  end if;

  new_status := case when p_action = 'approve' then 'approved' else 'rejected' end;

  if p_action = 'approve' then
    select m.company_id into existing_company
    from public.company_members m
    where m.user_id = req.user_id
    limit 1;

    if existing_company is not null and existing_company <> req.company_id then
      raise exception 'That user already belongs to another company';
    end if;

    if existing_company is null then
      begin
        insert into public.company_members (company_id, user_id, role)
        values (req.company_id, req.user_id, req.requested_role);
      exception
        when unique_violation then
          null;
      end;
    end if;

    begin
      select r.id into role_id
      from public.roles r
      where r.name = req.requested_role;
      if role_id is not null then
        insert into public.user_roles (user_id, role_id)
        select req.user_id, role_id
        where not exists (
          select 1 from public.user_roles ur
          where ur.user_id = req.user_id and ur.role_id = role_id
        );
      end if;
    exception
      when others then
        null;
    end;

    if req.requested_role = 'interviewer' then
      begin
        insert into public.interviewers (user_id, company_id, designation)
        select req.user_id, req.company_id, 'Interviewer'
        where not exists (
          select 1 from public.interviewers i
          where i.user_id = req.user_id and i.company_id = req.company_id
        );
      exception
        when others then
          null;
      end;
    end if;
  end if;

  update public.company_join_requests
  set
    status = new_status,
    reviewed_by = uid,
    reviewed_at = now()
  where id = req.id;

  return jsonb_build_object('ok', true, 'status', new_status);
end;
$$;

grant execute on function public.review_company_join_request(bigint, text) to authenticated;

drop policy if exists "company_members_update_founder" on public.company_members;
create policy "company_members_update_founder"
  on public.company_members for update
  to authenticated
  using (public.is_company_founder(company_id));

alter table public.company_join_requests enable row level security;

drop policy if exists "join_requests_select" on public.company_join_requests;
create policy "join_requests_select"
  on public.company_join_requests for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_company_founder(company_id)
  );

drop policy if exists "join_requests_insert_own" on public.company_join_requests;
create policy "join_requests_insert_own"
  on public.company_join_requests for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "join_requests_update_founder" on public.company_join_requests;
create policy "join_requests_update_founder"
  on public.company_join_requests for update
  to authenticated
  using (public.is_company_founder(company_id));

alter table public.users enable row level security;

drop policy if exists "users_read_company_peers" on public.users;
create policy "users_read_company_peers"
  on public.users for select
  to authenticated
  using (
    id = auth.uid()
    or exists (
      select 1
      from public.company_members me
      join public.company_members them on them.company_id = me.company_id
      where me.user_id = auth.uid()
        and them.user_id = users.id
    )
    or exists (
      select 1 from public.company_join_requests r
      where r.user_id = users.id
        and public.is_company_founder(r.company_id)
    )
  );

alter table public.company_locations enable row level security;

drop policy if exists "company_locations_insert_founder" on public.company_locations;
create policy "company_locations_insert_founder"
  on public.company_locations for insert
  to authenticated
  with check (public.is_company_founder(company_id));

drop policy if exists "company_locations_select_member" on public.company_locations;
create policy "company_locations_select_member"
  on public.company_locations for select
  to authenticated
  using (
    public.is_company_member(company_id)
    or public.is_company_founder(company_id)
  );
