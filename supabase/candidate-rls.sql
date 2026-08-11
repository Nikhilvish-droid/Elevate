-- Run in SQL Editor so candidates can browse jobs and track their own data.

alter table public.jobs enable row level security;
drop policy if exists "jobs_read_published" on public.jobs;
create policy "jobs_read_published"
  on public.jobs for select
  to authenticated
  using (status = 'published');

alter table public.companies enable row level security;
drop policy if exists "companies_read_authenticated" on public.companies;
create policy "companies_read_authenticated"
  on public.companies for select
  to authenticated
  using (true);

alter table public.applications enable row level security;
drop policy if exists "applications_own" on public.applications;
create policy "applications_own"
  on public.applications for all
  using (
    exists (
      select 1 from public.candidates c
      where c.id = candidate_id and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.candidates c
      where c.id = candidate_id and c.user_id = auth.uid()
    )
  );

alter table public.interviews enable row level security;
drop policy if exists "interviews_own_applications" on public.interviews;
create policy "interviews_own_applications"
  on public.interviews for select
  using (
    exists (
      select 1
      from public.applications a
      join public.candidates c on c.id = a.candidate_id
      where a.id = application_id and c.user_id = auth.uid()
    )
  );

alter table public.offer_letters enable row level security;
drop policy if exists "offers_own" on public.offer_letters;
create policy "offers_own"
  on public.offer_letters for select
  using (
    exists (
      select 1 from public.candidates c
      where c.id = candidate_id and c.user_id = auth.uid()
    )
  );

drop policy if exists "offers_respond_own" on public.offer_letters;
create policy "offers_respond_own"
  on public.offer_letters for update
  using (
    exists (
      select 1 from public.candidates c
      where c.id = candidate_id and c.user_id = auth.uid()
    )
  );

alter table public.assessment_attempts enable row level security;
drop policy if exists "attempts_own" on public.assessment_attempts;
create policy "attempts_own"
  on public.assessment_attempts for select
  using (
    exists (
      select 1 from public.candidates c
      where c.id = candidate_id and c.user_id = auth.uid()
    )
  );

alter table public.coding_assessments enable row level security;
drop policy if exists "assessments_read_authenticated" on public.coding_assessments;
create policy "assessments_read_authenticated"
  on public.coding_assessments for select
  to authenticated
  using (true);

alter table public.notifications enable row level security;
drop policy if exists "notifications_own" on public.notifications;
create policy "notifications_own"
  on public.notifications for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

alter table public.resume_analyses enable row level security;
drop policy if exists "analyses_own_resume" on public.resume_analyses;
create policy "analyses_own_resume"
  on public.resume_analyses for select
  using (
    exists (
      select 1
      from public.resumes r
      join public.candidates c on c.id = r.candidate_id
      where r.id = resume_id and c.user_id = auth.uid()
    )
  );
