# Elevate backend (Express)

Auth stays on **Supabase**. This API verifies the user's **JWT**, then reads/writes Postgres with that user's client so **RLS still applies**.

The Next.js app should not query tables directly. Use this API for users, roles, onboarding, jobs, and candidate data. File uploads stay on the frontend (`avatar` / `resumes` buckets).

## Setup

1. Copy env:

```bash
cp .env.example .env
```

Fill `SUPABASE_URL` and `SUPABASE_ANON_KEY` (same values as the frontend). Do **not** put the DB password or `service_role` key in the frontend.

2. Install and run:

```bash
npm install
npm run dev
```

API: `http://localhost:5000`

Run the frontend separately (`cd frontend && npm run dev`). Set `NEXT_PUBLIC_API_URL=http://localhost:5000`.

## Test

```bash
curl http://localhost:5000/health
```

Logged-in routes need:

```text
Authorization: Bearer <supabase_access_token>
```

Get a token after login: open `http://localhost:3000/api/auth/token`

## Routes

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Public health check |
| GET | `/api/profiles/:id` | Public candidate profile (`candidates.id`) |
| POST | `/api/auth/sync` | Upsert `users` after login, return session profile |
| GET | `/api/me` | Session profile (role, onboarding, candidate/company) |
| POST | `/api/onboarding/candidate` | Candidate onboarding |
| POST | `/api/onboarding/company` | Company onboarding |
| GET/PUT | `/api/candidate/profile` | Candidate profile |
| GET | `/api/candidate/applications` | Applied jobs |
| GET | `/api/candidate/interviews` | Interview schedule |
| GET | `/api/candidate/assessments` | Coding tests |
| GET | `/api/candidate/offers` | Offers |
| PATCH | `/api/candidate/offers/:id` | Accept/reject `{ "accept": true }` |
| GET | `/api/candidate/notifications` | Inbox |
| PATCH | `/api/candidate/notifications/:id` | Mark read |
| GET | `/api/candidate/resume-score` | Latest AI score |
| GET | `/api/jobs` | Published jobs (`q`, `location`, `work_mode`, `employment_type`) |
| GET | `/api/jobs/:id` | Job detail |
| GET | `/api/jobs/:id/application` | Did I apply? |
| POST | `/api/jobs/:id/apply` | Apply `{ "cover_letter": "..." }` |
