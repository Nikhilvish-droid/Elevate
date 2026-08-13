# Elevate backend (Express)

Auth stays on **Supabase**. This API verifies the user's **JWT**, then reads/writes Postgres with that user's client so **RLS still applies**.

The Next.js app should not query tables directly. Use this API for users, roles, onboarding, jobs, and candidate data. File uploads stay on the frontend (`avatar` / `resumes` buckets).

## Setup

1. Copy env:

```bash
cp .env.example .env
```

Fill `SUPABASE_URL` and `SUPABASE_ANON_KEY` (same values as the frontend). For signup / password-reset emails also set `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, and `RESEND_FROM` (see `.env.example`). Do **not** put the DB password or `service_role` key in the frontend.

Hiring messages (shortlist, next round, reject, offer) always land in the candidate **Inbox**. When `RESEND_API_KEY` / `RESEND_FROM` are set, a copy is also emailed. Mail failure never blocks the hiring action.

### Google Meet (optional)

When a recruiter schedules an interview and leaves the meeting link blank, the API can create a Google Calendar event with a Meet join URL.

1. In [Google Cloud Console](https://console.cloud.google.com/), create a project, enable **Google Calendar API**, and create an OAuth client (Desktop or Web).
2. Add redirect URI `http://127.0.0.1:53682/oauth2callback`.
3. Put `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `backend/.env`.
4. From `backend/`:

```bash
npm run google-meet-auth
```

5. Sign in with the Google account that should host interviews, then paste `GOOGLE_REFRESH_TOKEN` into `.env`. Restart the API.

Optional: `GOOGLE_CALENDAR_ID` (default `primary`), `GOOGLE_CALENDAR_TIMEZONE` (default `Asia/Kolkata`).

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
| GET | `/api/auth/email-status` | Whether Resend + service role are configured |
| POST | `/api/auth/send-confirmation` | Email signup confirmation link `{ email, password, redirectTo? }` |
| POST | `/api/auth/send-recovery` | Email password reset link `{ email, redirectTo? }` |
| GET/POST/PATCH | `/api/admin/*` | Platform Admin (403 unless `roles.name = admin`) |
| GET | `/api/profiles/:id` | Public candidate profile (`candidates.id`) |
| POST | `/api/auth/sync` | Upsert `users` after login, return session profile |
| GET | `/api/me` | Session profile (role, onboarding, candidate/company) |
| DELETE | `/api/me` | Delete account `{ "confirm": "DELETE" }` |
| POST | `/api/onboarding/candidate` | Candidate onboarding |
| POST | `/api/onboarding/company` | Founder: create company + founder membership |
| GET | `/api/companies?q=` | Search companies by name (min 2 chars) |
| POST | `/api/company-requests` | Request to join `{ company_id, requested_role }` |
| GET | `/api/company-requests/mine` | Current user's join requests |
| PATCH | `/api/company-requests/:id` | Founder `{ "action": "approve" }` or `{ "action": "reject" }` |
| GET | `/api/company/members` | Members grouped by role + pending (founder) |
| GET | `/api/company/profile` | Company + member profile workspace |
| PATCH | `/api/company/profile` | Founder-only company profile update |
| PATCH | `/api/company/me` | Update own member profile |
| GET | `/api/company/jobs` | Company jobs (founder/recruiter) |
| POST | `/api/company/jobs` | Create job |
| GET | `/api/company/jobs/:id` | Job detail |
| PATCH | `/api/company/jobs/:id` | Edit job |
| POST | `/api/company/jobs/:id/close` | Close job |
| POST | `/api/company/jobs/:id/duplicate` | Duplicate job |
| DELETE | `/api/company/jobs/:id` | Delete job |
| GET | `/api/company/dashboard` | Hiring widgets + funnel + activity |
| GET | `/api/company/interviews/meet-status` | Whether Google Meet auto-create is configured |
| GET | `/api/company/interviews` | Company interview schedule |
| POST | `/api/company/interviews` | Schedule interview (`create_google_meet` optional) |
| PATCH | `/api/company/interviews/:id` | Reschedule interview |
| POST | `/api/company/interviews/:id/cancel` | Cancel interview |
| POST | `/api/company/interviews/:id/end` | Interviewer marks meeting done |
| GET | `/api/company/applications/:id/messages` | Shared candidate message thread |
| POST | `/api/company/messages` | Send candidate Inbox (+ Resend if configured) |
| GET | `/api/company/notifications` | Recruiter / HM in-app notifications |
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
