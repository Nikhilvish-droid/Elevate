-- Company create, membership, and join-request RLS.
-- Re-run this file to fix broken login after recursive company_members policies.
-- Uses SECURITY DEFINER helpers so policies do not recurse on company_members.

alter table public.companies enable row level security;
alter table public.company_members enable row level security;
alter table public.company_join_requests enable row level security;

grant select, insert, update on public.companies to authenticated;
grant select, insert, update, delete on public.company_members to authenticated;
grant select, insert, update on public.company_join_requests to authenticated;

-- Helpers (bypass RLS safely; only expose membership checks for auth.uid())
create or replace function public.my_company_ids()
returns setof bigint
language sql
stable
security definer
set search_path = public
as $$
  select company_id
  from public.company_members
  where user_id = auth.uid();
$$;

create or replace function public.is_company_founder(cid bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.company_members
    where company_id = cid
      and user_id = auth.uid()
      and role = 'founder'
  );
$$;

grant execute on function public.my_company_ids() to authenticated;
grant execute on function public.is_company_founder(bigint) to authenticated;

-- Companies
drop policy if exists "companies_select_member" on public.companies;
create policy "companies_select_member"
  on public.companies for select to authenticated
  using (true);

drop policy if exists "companies_insert_auth" on public.companies;
create policy "companies_insert_auth"
  on public.companies for insert to authenticated
  with check (true);

drop policy if exists "companies_update_founder" on public.companies;
create policy "companies_update_founder"
  on public.companies for update to authenticated
  using (public.is_company_founder(id));

-- Members: no self-referencing subqueries (those caused infinite recursion / login failures)
drop policy if exists "company_members_select" on public.company_members;
create policy "company_members_select"
  on public.company_members for select to authenticated
  using (
    user_id = auth.uid()
    or company_id in (select public.my_company_ids())
  );

drop policy if exists "company_members_insert_self_founder" on public.company_members;
create policy "company_members_insert_self_founder"
  on public.company_members for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "company_members_insert_founder" on public.company_members;
create policy "company_members_insert_founder"
  on public.company_members for insert to authenticated
  with check (public.is_company_founder(company_id));

drop policy if exists "company_members_update_founder" on public.company_members;
create policy "company_members_update_founder"
  on public.company_members for update to authenticated
  using (public.is_company_founder(company_id));

-- Join requests
drop policy if exists "join_requests_select" on public.company_join_requests;
create policy "join_requests_select"
  on public.company_join_requests for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_company_founder(company_id)
  );

drop policy if exists "join_requests_insert_own" on public.company_join_requests;
create policy "join_requests_insert_own"
  on public.company_join_requests for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "join_requests_update_founder" on public.company_join_requests;
create policy "join_requests_update_founder"
  on public.company_join_requests for update to authenticated
  using (public.is_company_founder(company_id));

-- Optional helper RPC used by onboarding
create or replace function public.create_company_as_founder(payload jsonb)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id bigint;
begin
  if exists (
    select 1 from public.company_members where user_id = auth.uid()
  ) then
    raise exception 'already belong to a company';
  end if;

  insert into public.companies (
    name, website_url, industry, company_size, description,
    linkedin_url, twitter_url, github_url, logo_url
  ) values (
    payload->>'name',
    nullif(payload->>'website_url', ''),
    nullif(payload->>'industry', ''),
    nullif(payload->>'company_size', ''),
    nullif(payload->>'description', ''),
    nullif(payload->>'linkedin_url', ''),
    nullif(payload->>'twitter_url', ''),
    nullif(payload->>'github_url', ''),
    nullif(payload->>'logo_url', '')
  )
  returning id into new_id;

  insert into public.company_members (company_id, user_id, role)
  values (new_id, auth.uid(), 'founder');

  if coalesce(payload->>'city', payload->>'address_line', '') <> '' then
    insert into public.company_locations (
      company_id, address_line, city, state, country, postal_code, is_headquarters
    ) values (
      new_id,
      nullif(payload->>'address_line', ''),
      nullif(payload->>'city', ''),
      nullif(payload->>'state', ''),
      nullif(payload->>'country', ''),
      nullif(payload->>'postal_code', ''),
      true
    );
  end if;

  return new_id;
end;
$$;

grant execute on function public.create_company_as_founder(jsonb) to authenticated;
