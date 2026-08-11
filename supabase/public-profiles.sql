-- Public candidate profiles so a unique /u/name-123 link can be shared.
-- Does not expose applications, resumes, offers, or notifications.

alter table public.candidates enable row level security;
drop policy if exists "candidates_public_read" on public.candidates;
create policy "candidates_public_read"
  on public.candidates for select
  to anon, authenticated
  using (true);

alter table public.candidate_education enable row level security;
drop policy if exists "candidate_education_public_read" on public.candidate_education;
create policy "candidate_education_public_read"
  on public.candidate_education for select
  to anon, authenticated
  using (true);

alter table public.candidate_experience enable row level security;
drop policy if exists "candidate_experience_public_read" on public.candidate_experience;
create policy "candidate_experience_public_read"
  on public.candidate_experience for select
  to anon, authenticated
  using (true);

alter table public.candidate_certifications enable row level security;
drop policy if exists "candidate_certifications_public_read" on public.candidate_certifications;
create policy "candidate_certifications_public_read"
  on public.candidate_certifications for select
  to anon, authenticated
  using (true);

alter table public.candidate_skills enable row level security;
drop policy if exists "candidate_skills_public_read" on public.candidate_skills;
create policy "candidate_skills_public_read"
  on public.candidate_skills for select
  to anon, authenticated
  using (true);

alter table public.skills enable row level security;
drop policy if exists "skills_public_read" on public.skills;
create policy "skills_public_read"
  on public.skills for select
  to anon, authenticated
  using (true);
  