-- Elevate platform Admin layer (DevFusion Admin blueprint, adapted to Postgres/Supabase).
-- Run in the Supabase SQL editor after the core schema scripts.

-- ---------------------------------------------------------------------------
-- 1. Admin role
-- ---------------------------------------------------------------------------
INSERT INTO public.roles (name)
SELECT 'admin'
WHERE NOT EXISTS (SELECT 1 FROM public.roles WHERE name = 'admin');

-- ---------------------------------------------------------------------------
-- 2. User suspend flag
-- ---------------------------------------------------------------------------
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_status_check'
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_status_check
      CHECK (status IN ('active', 'suspended'));
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. Company approval (existing rows stay approved)
-- ---------------------------------------------------------------------------
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'approved';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'companies_status_check'
  ) THEN
    ALTER TABLE public.companies
      ADD CONSTRAINT companies_status_check
      CHECK (status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4. Audit logs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id bigserial PRIMARY KEY,
  actor_id uuid,
  actor_role text,
  action text NOT NULL,
  resource_type text,
  resource_id text,
  ip_address text,
  user_agent text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_actor_id_idx ON public.audit_logs (actor_id);
CREATE INDEX IF NOT EXISTS audit_logs_action_idx ON public.audit_logs (action);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_logs_admin_read ON public.audit_logs;
-- Service role bypasses RLS. No anon/authenticated policies on purpose.

-- ---------------------------------------------------------------------------
-- 5. Platform settings (email templates, feature flags, integration notes)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.platform_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

INSERT INTO public.platform_settings (key, value)
VALUES
  (
    'email_templates',
    '{
      "application_confirmation": "Hi {{name}}, we received your application for {{job}}.",
      "interview_invite": "Hi {{name}}, you are invited to interview for {{job}}.",
      "offer_letter": "Hi {{name}}, congratulations — here is your offer for {{job}}.",
      "rejection": "Hi {{name}}, thank you for applying to {{job}}. We will not move forward this time."
    }'::jsonb
  ),
  ('feature_flags', '{"referrals": false, "live_kanban": false, "pwa": false}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 6. RBAC matrix (demo + middleware source of truth)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id bigserial PRIMARY KEY,
  role text NOT NULL,
  resource text NOT NULL,
  action text NOT NULL,
  allowed boolean NOT NULL DEFAULT true,
  UNIQUE (role, resource, action)
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

INSERT INTO public.role_permissions (role, resource, action, allowed)
VALUES
  -- Admin: full control plane
  ('admin', 'users', 'create', true),
  ('admin', 'users', 'read', true),
  ('admin', 'users', 'update', true),
  ('admin', 'users', 'delete', true),
  ('admin', 'companies', 'create', true),
  ('admin', 'companies', 'read', true),
  ('admin', 'companies', 'update', true),
  ('admin', 'companies', 'delete', true),
  ('admin', 'jobs', 'create', false),
  ('admin', 'jobs', 'read', true),
  ('admin', 'jobs', 'update', true),
  ('admin', 'jobs', 'delete', true),
  ('admin', 'applications', 'read', true),
  ('admin', 'applications', 'update', true),
  ('admin', 'settings', 'read', true),
  ('admin', 'settings', 'update', true),
  ('admin', 'audit', 'read', true),
  ('admin', 'permissions', 'read', true),
  ('admin', 'permissions', 'update', true),

  -- Recruiter
  ('recruiter', 'jobs', 'create', true),
  ('recruiter', 'jobs', 'read', true),
  ('recruiter', 'jobs', 'update', true),
  ('recruiter', 'applications', 'read', true),
  ('recruiter', 'applications', 'update', true),
  ('recruiter', 'interviews', 'create', true),
  ('recruiter', 'offers', 'create', true),

  -- Hiring manager
  ('hiring_manager', 'applications', 'read', true),
  ('hiring_manager', 'applications', 'update', true),
  ('hiring_manager', 'interviews', 'read', true),
  ('hiring_manager', 'offers', 'update', true),

  -- Interviewer
  ('interviewer', 'interviews', 'read', true),
  ('interviewer', 'interviews', 'update', true),
  ('interviewer', 'applications', 'read', true),

  -- Founder (company owner)
  ('founder', 'companies', 'update', true),
  ('founder', 'jobs', 'create', true),
  ('founder', 'jobs', 'read', true),
  ('founder', 'jobs', 'update', true),
  ('founder', 'applications', 'read', true),
  ('founder', 'applications', 'update', true),

  -- Candidate
  ('candidate', 'jobs', 'read', true),
  ('candidate', 'applications', 'create', true),
  ('candidate', 'applications', 'read', true)
ON CONFLICT (role, resource, action) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 7. How to promote an existing Auth user to platform Admin
--    (also see backend/scripts/seed-admin.js)
-- ---------------------------------------------------------------------------
-- UPDATE public.users SET full_name = 'Platform Admin' WHERE email = 'you@example.com';
-- INSERT INTO public.user_roles (user_id, role_id)
-- SELECT u.id, r.id
-- FROM public.users u
-- JOIN public.roles r ON r.name = 'admin'
-- WHERE u.email = 'you@example.com'
-- ON CONFLICT DO NOTHING;
