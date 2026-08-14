-- ALTER only — no CREATE TABLE.
-- SQL Editor: Role = supabase_admin or postgres (table owner).
-- If ALTER fails with "must be owner", add the same columns in Table Editor.

select current_user as running_as;

do $$
begin
  begin
    execute format(
      'alter table public.coding_assessments owner to %I',
      current_user
    );
  exception when others then null;
  end;
  begin
    execute format(
      'alter table public.assessment_attempts owner to %I',
      current_user
    );
  exception when others then null;
  end;
end $$;

alter table public.coding_assessments
  add column if not exists job_id bigint;

alter table public.coding_assessments
  add column if not exists company_id bigint;

alter table public.coding_assessments
  add column if not exists title text;

alter table public.coding_assessments
  add column if not exists description text;

alter table public.coding_assessments
  add column if not exists duration_minutes int default 60;

alter table public.coding_assessments
  add column if not exists questions jsonb default '[]'::jsonb;

alter table public.coding_assessments
  add column if not exists pass_score numeric default 60;

alter table public.coding_assessments
  add column if not exists max_violations int default 3;

alter table public.coding_assessments
  add column if not exists created_by uuid;

alter table public.coding_assessments
  add column if not exists updated_at timestamptz default now();

alter table public.assessment_attempts
  add column if not exists assessment_id bigint;

alter table public.assessment_attempts
  add column if not exists application_id bigint;

alter table public.assessment_attempts
  add column if not exists candidate_id bigint;

alter table public.assessment_attempts
  add column if not exists status text default 'assigned';

alter table public.assessment_attempts
  add column if not exists started_at timestamptz;

alter table public.assessment_attempts
  add column if not exists submitted_at timestamptz;

alter table public.assessment_attempts
  add column if not exists score numeric;

alter table public.assessment_attempts
  add column if not exists max_score numeric;

alter table public.assessment_attempts
  add column if not exists answers_json jsonb default '{}'::jsonb;

alter table public.assessment_attempts
  add column if not exists violations_json jsonb default '[]'::jsonb;

alter table public.assessment_attempts
  add column if not exists question_order jsonb default '[]'::jsonb;

alter table public.assessment_attempts
  add column if not exists violation_count int default 0;

alter table public.assessment_attempts
  add column if not exists plagiarism_flag boolean default false;

select 'ok: assessment columns ready (including job_id)' as status;
