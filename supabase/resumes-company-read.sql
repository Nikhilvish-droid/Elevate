-- Allow company members to read resumes linked to applications on their jobs.
-- Optional if SUPABASE_SERVICE_ROLE_KEY is set (AI screening uses service role).
-- Run in Supabase SQL editor.

alter table public.resumes enable row level security;
grant select on public.resumes to authenticated;

drop policy if exists "resumes_select_own" on public.resumes;
create policy "resumes_select_own"
  on public.resumes for select to authenticated
  using (
    candidate_id in (
      select c.id from public.candidates c where c.user_id = auth.uid()
    )
  );

drop policy if exists "resumes_select_company" on public.resumes;
create policy "resumes_select_company"
  on public.resumes for select to authenticated
  using (
    id in (
      select a.resume_id
      from public.applications a
      join public.jobs j on j.id = a.job_id
      join public.company_members cm on cm.company_id = j.company_id
      where cm.user_id = auth.uid()
        and a.resume_id is not null
    )
    or candidate_id in (
      select a.candidate_id
      from public.applications a
      join public.jobs j on j.id = a.job_id
      join public.company_members cm on cm.company_id = j.company_id
      where cm.user_id = auth.uid()
    )
  );
