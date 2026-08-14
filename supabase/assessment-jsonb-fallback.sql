-- ALTER only — no CREATE TABLE.
-- SQL Editor: Role = supabase_admin or postgres (table owner).
-- If you get "must be owner", add the same columns in Table Editor instead.

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
  add column if not exists questions jsonb default '[]'::jsonb;

alter table public.coding_assessments
  add column if not exists pass_score numeric default 60;

alter table public.coding_assessments
  add column if not exists max_violations int default 3;

alter table public.coding_assessments
  add column if not exists description text;

alter table public.coding_assessments
  add column if not exists updated_at timestamptz default now();

alter table public.assessment_attempts
  add column if not exists answers_json jsonb default '{}'::jsonb;

alter table public.assessment_attempts
  add column if not exists violations_json jsonb default '[]'::jsonb;

alter table public.assessment_attempts
  add column if not exists question_order jsonb default '[]'::jsonb;

alter table public.assessment_attempts
  add column if not exists max_score numeric;

alter table public.assessment_attempts
  add column if not exists violation_count int default 0;

alter table public.assessment_attempts
  add column if not exists plagiarism_flag boolean default false;

alter table public.assessment_attempts
  add column if not exists application_id bigint;

select 'ok: jsonb columns ready' as status;
