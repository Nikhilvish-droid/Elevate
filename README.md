# Elevate

**Problem statement:** DevFusion 4.0 — *AI-Powered Recruitment & Applicant Tracking System (ATS)*

Elevate is a full hiring workspace for five roles on one shared data backbone: **Candidate**, **Recruiter**, **Hiring Manager**, **Interviewer**, and **Admin**. Companies post jobs, screen applicants, run interviews, and send offers. Candidates build a profile, apply, track status, and accept or reject offers.

---

## Brief description

Elevate replaces spreadsheet hiring with a single product:

- Candidates sign up (email/password or Google), complete a profile, upload a resume, browse jobs, apply, follow interviews in Inbox, and respond to offers.
- Recruiters post jobs, review AI match scores, shortlist or reject, schedule rounds (optional Google Meet), message candidates, and send CTC after the hiring manager approves.
- Hiring managers review shortlists and interviewer feedback, then approve or reject the hire.
- Interviewers see only assigned rounds, join the meeting, end it, and submit structured scores.
- Platform admins (seeded, not self-signup) manage users, companies, jobs, RBAC, settings, and audit logs.

Every hiring decision can open a pre-filled message (shortlist, next round, reject, offer). That message is saved on a shared thread, lands in the candidate **Inbox**, and is emailed via Resend when configured.

Application stages stay in sync for every role:

`Applied → Resume Screening → Shortlisted → Technical Interview → HR Interview → Offer → Hired | Rejected`

---

## Tech stack

| Layer | Stack |
|---|---|
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4 |
| **Backend** | Node.js, Express 5 |
| **Database & auth** | Supabase (PostgreSQL + Auth + Storage + Row Level Security) |
| **AI** | Groq API — resume vs job match score, strengths/gaps, interview question bank |
| **Email** | Resend (signup / password reset + optional hiring emails) |
| **Meetings** | Google Calendar API (optional auto Google Meet link) |
| **Resume parse** | `pdf-parse` (PDF), `mammoth` (DOCX) |
| **Deploy** | Docker Compose (`frontend` + `backend`). Supabase stays hosted. |

The Next.js app talks to the Express API with the Supabase JWT. File uploads (avatars, resumes) go to Supabase Storage from the frontend.

---

## Step-by-step: run locally

### Prerequisites

- Node.js 20+
- npm
- A [Supabase](https://supabase.com) project
- (Optional) Docker Desktop, if you prefer Compose instead of two terminals

### 1. Clone and install

```bash
git clone <your-repo-url>
cd Elevate

cd backend
npm install

cd ../frontend
npm install
```

### 2. Configure environment

**Backend** — copy `backend/.env.example` → `backend/.env`:

```env
PORT=5000
FRONTEND_ORIGIN=http://localhost:3000
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your_anon_public_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_secret
RESEND_API_KEY=
RESEND_FROM=Elevate <beth.t@example.com>
GROQ_API_KEY=
```

**Frontend** — copy `frontend/.env.example` → `frontend/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_public_key
NEXT_PUBLIC_API_URL=http://localhost:5000
```

Use the **same** Supabase URL and anon key on both sides. Never put `service_role` in the frontend.

### 3. Run Supabase SQL (in order)

In the Supabase SQL editor, run:

1. `supabase/company-join.sql`
2. `supabase/company-jobs.sql`
3. `supabase/applications.sql`
4. `supabase/offer-letters.sql`
5. `supabase/notifications.sql`
6. `supabase/application-messages.sql`
7. `supabase/interview-feedback.sql`
8. `supabase/ai-screening.sql`
9. `supabase/resumes-company-read.sql`
10. `supabase/candidate-profile-fields.sql`
11. `supabase/delete-account.sql`
12. `supabase/admin-platform.sql`

Also create Storage buckets `avatar` and `resumes` if they are not already there, and enable Google (and email) providers in Supabase Auth.

### 4. Start the app

Terminal 1 — API:

```bash
cd backend
npm run dev
```

Terminal 2 — web:

```bash
cd frontend
npm run dev
```

- Frontend: http://localhost:3000
- API health: http://localhost:5000/health

Sign up at `/auth`. After onboarding, you land on the dashboard for your role.

Optional platform admin (not self-signup):

```bash
cd backend
node scripts/seed-admin.js admin@elevate.local AdminPass123
```

Then log in at `/auth` → `/admin`.

### Optional: Google Meet auto-links

1. Google Cloud → enable Calendar API → OAuth client.
2. Redirect URI: `http://127.0.0.1:53682/oauth2callback`
3. Put `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `backend/.env`.
4. `cd backend && npm run google-meet-auth`
5. Paste `GOOGLE_REFRESH_TOKEN` into `.env` and restart the API.

### Optional: Docker

```bash
copy .env.example .env
```

Fill root `.env` (`NEXT_PUBLIC_SUPABASE_*`, `NEXT_PUBLIC_API_URL=http://localhost:5000`) and `backend/.env`, then:

```bash
docker compose up --build
```

Same URLs: http://localhost:3000 and http://localhost:5000/health.

If you change `NEXT_PUBLIC_*` values, rebuild (`docker compose up --build`) — they are baked in at build time.

---

## Features built

### Auth & foundation

- Email/password signup and login, Google OAuth, email verification and password reset (Resend)
- Role onboarding: candidate vs company (create company as founder, or request to join)
- JWT-protected Express API + Supabase RLS
- Dark / light theme, account delete

### Candidate

- Profile (education, experience, skills, certs, portfolio, GitHub, LinkedIn)
- Resume upload (PDF/DOCX)
- Job search and apply with cover / fit answers
- Application tracker with the shared stage names
- Inbox with unread orange dot (Home, nav, Profile)
- Interview schedule (upcoming vs past / ended)
- Offers: accept or reject CTC
- Public profile page (`/u/...`)

### Recruiter / founder

- Job create / edit / close / duplicate (salary, skills, work mode, deadline, description)
- Apps: job-first applicant list, AI match score, stage moves, shortlist / reject + message modal
- Shortlist, Interview, Email, Offers grouped by job
- Schedule / reschedule / cancel interviews; assign interviewer; optional Google Meet
- Schedule another round after a meeting is ended
- Shared candidate message thread + compose
- Offer / CTC after hiring-manager approval (founder can bypass)
- Company dashboard (funnel, monthly hiring, activity)
- Founder-only: team join requests, company profile

### Hiring manager

- Home: pending / approved-hired / rejected stay in sync after decisions
- Shortlist by job + candidate detail + AI screener (no question bank)
- Feedback by job → see all round scores → Approve / Reject hire with message modal
- Analytics dashboard (read-only)
- Cannot post jobs or change company settings

### Interviewer

- Assigned rounds only (not the full pipeline)
- Join meeting, **End meeting** → Past meetings
- Structured feedback: technical, communication, problem solving, teamwork, leadership, overall + comments
- Read-only message thread with CTC / salary lines masked
- Cannot send offers or see salary fields elsewhere

### Admin

- Seeded Admin role (no self-signup)
- Overview analytics, users, companies, jobs, audit log, RBAC matrix, platform settings
- Backend RBAC: non-admin tokens get **403** on `/api/admin/*`

### AI & messaging

- On apply: Groq screens resume vs JD → match %, strengths/gaps, interview questions, stage → Resume Screening
- Recruiter can re-run AI screen from Apps
- Hiring messages: Inbox always; Resend email if `RESEND_API_KEY` is set (mail failure does not block the hire action)
- Templates: shortlisted, round advance, rejected, approved for offer, offer CTC, interview invite
- Recruiter / HM notified in-app when a candidate accepts or declines an offer

---

## Live deployment

**Not deployed yet.** Add the public URL here after hosting (for example Vercel for the frontend + Render/Fly for the API, or a single VM with Docker Compose).

| | URL |
|---|---|
| Web app | _TBD — paste production frontend URL_ |
| API health | _TBD — paste `https://…/health`_ |

Until then, run locally (npm or Docker) as above. For a public host, set `FRONTEND_ORIGIN` and `NEXT_PUBLIC_API_URL` to your real HTTPS URLs. The browser must reach the API; `http://backend:5000` only works inside Docker.

---

## Team

| Name | Role |
|---|---|
| Nikhil Vishwakarma | Full-stack (API, hiring pipeline, interviews, messaging, Docker) |
| _Add teammate_ | _e.g. Frontend / Candidate portal_ |
| _Add teammate_ | _e.g. Recruiter UI / design_ |
| _Add teammate_ | _e.g. AI screening / assessments_ |

Replace the placeholder rows with every teammate before submission.

---

## Known bugs and limitations

Honest gaps vs the full DevFusion brief:

- **Coding assessments** — candidates can see assigned tests/scores. Recruiter test creator, in-browser IDE, timer auto-submit, and tab-switch detection are not built.
- **Kanban** — stages move with a selector and job-first lists, not a drag-and-drop board.
- **Offer PDF** — CTC, location, and joining date are stored and messaged; a downloadable branded PDF is not generated (`offer_pdf_url` is usually empty).
- **AI insight summary** — Groq match + question bank exist. A post-interview LLM summary for the hiring manager is not built (they read structured scores instead).
- **Resume auto-fill** — screening runs on apply. Full “upload once → auto-fill every profile field” parsing is incomplete.
- **Calendar reminders** — interview invite goes to Inbox (+ Resend / Meet if configured). No Google Calendar invite for the candidate unless Meet OAuth is set up.
- **Resend** — without `RESEND_API_KEY`, hiring mail stays in-app only. Signup/reset emails also need Resend + service role.
- **Admin 2FA / OTP** — not implemented.
- **Realtime** — Inbox unread uses polling, not WebSockets.
- **SQL / RLS** — several company writes need `SUPABASE_SERVICE_ROLE_KEY` and the SQL scripts above; skipping them causes RLS errors.
- **Google Meet** — optional; needs a one-time OAuth refresh token on the machine that hosts the API.
- **Docker** — Compose does not run Postgres; Supabase remains a hosted dependency.

---

## Project layout

```
Elevate/
├── frontend/          Next.js app
├── backend/           Express API
├── supabase/          SQL to run in Supabase
├── docker-compose.yml
└── README.md
```
