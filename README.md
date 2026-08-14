# Elevate

**Problem statement:** DevFusion 4.0 — AI-Powered Recruitment & Applicant Tracking System (ATS)

---

## Brief description

Elevate is a hiring platform where companies and candidates work in one system instead of spreadsheets and email threads.

Candidates create a profile, upload a resume, apply to jobs, track application status, receive interview and offer messages in Inbox, and accept or reject offers.

Companies run hiring with five roles: **Recruiter** (jobs, screening, interviews, CTC), **Hiring Manager** (shortlist review, approve/reject hire), **Interviewer** (assigned rounds + feedback), **Founder** (company + team), and **Admin** (platform control).

Every application moves through the same stages:

`Applied → Resume Screening → Shortlisted → Technical Interview → HR Interview → Offer → Hired / Rejected`

---

## Tech stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| **Backend** | Node.js, Express 5 |
| **Database & auth** | Supabase (PostgreSQL, Auth, Storage, RLS) |
| **AI** | Groq API (resume–job match score, strengths/gaps, interview questions) |
| **Email** | Resend (signup / reset + optional hiring emails) |
| **Meetings** | Google Calendar API (optional Google Meet links) |
| **Resume parse** | pdf-parse (PDF), mammoth (DOCX) |

---

## Run locally

**Need:** Node.js 20+, npm, and a [Supabase](https://supabase.com) project.

### 1. Install

```bash
git clone https://github.com/Nikhilvish-droid/Elevate.git
cd Elevate

cd backend && npm install
cd ../frontend && npm install
```

### 2. Environment

Copy `backend/.env.example` → `backend/.env` and fill:

```env
PORT=5000
FRONTEND_ORIGIN=http://localhost:3000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GROQ_API_KEY=your_groq_key
RESEND_API_KEY=
RESEND_FROM=Elevate <beth.t@example.com>
```

Copy `frontend/.env.example` → `frontend/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_API_URL=http://localhost:5000
```

Use the same Supabase URL and anon key on both sides. Never put `service_role` in the frontend.

### 3. Database

In the Supabase SQL editor, run the scripts in `supabase/` in this order:

1. `company-join.sql`
2. `company-jobs.sql`
3. `applications.sql`
4. `offer-letters.sql`
5. `notifications.sql`
6. `application-messages.sql`
7. `interview-feedback.sql`
8. `ai-screening.sql`
9. `resumes-company-read.sql`
10. `candidate-profile-fields.sql`
11. `delete-account.sql`
12. `admin-platform.sql`
13. `assessment-jsonb-fallback.sql` (adds JSONB columns on existing assessment tables)

If the assessment tables do not exist yet and your SQL role can CREATE, run `coding-assessments.sql` instead of step 13.

Create Storage buckets `avatar` and `resumes`. Enable Email and Google in Supabase Auth.

### 4. Start

Terminal 1:

```bash
cd backend && npm run dev
```

Terminal 2:

```bash
cd frontend && npm run dev
```

- Frontend: http://localhost:3000  
- Backend: http://localhost:5000/health  

Sign up at `/auth`, finish onboarding, then use the dashboard for your role.

Optional admin (not self-signup):

```bash
cd backend
node scripts/seed-admin.js admin@elevate.local AdminPass123
```

---

## Features built

**Auth**
- Email/password and Google login, email verification, password reset
- Candidate or company onboarding (create a company or request to join)
- Dark/light theme, delete account

**Candidate**
- Profile (education, experience, skills, certifications, GitHub, LinkedIn)
- Resume upload (PDF/DOCX)
- Job search and apply
- Application tracker with the shared stages
- Inbox (unread orange dot)
- Interview schedule (upcoming and past)
- Coding assessments (timer, autosave, tab-switch proctoring)
- Accept or reject offer / CTC
- Public profile page

**Recruiter / founder**
- Post, edit, close, and duplicate jobs
- Applicants by job, AI match score, shortlist / reject with message modal
- Schedule / reschedule / cancel interviews, assign interviewer, optional Google Meet
- Schedule another round after a meeting is ended
- Shared candidate message thread
- Assign coding tests after shortlist; review scores on the candidate brief
- Send CTC after hiring-manager approval (founder can bypass)
- Hiring dashboard (funnel, monthly hiring)
- Founder: team join requests and company profile

**Hiring manager**
- Home: pending, approved/hired, rejected
- Shortlist by job + candidate detail + AI screener
- Compare interviewer feedback, then approve or reject hire (with message)
- Analytics (read-only)
- Cannot post jobs or change company settings

**Interviewer**
- Assigned rounds only
- Join meeting, end meeting → past meetings
- Structured scores + comments
- Read-only message thread (CTC hidden)
- Cannot see salary fields or send offers

**Admin**
- Seeded admin (no self-signup)
- Users, companies, jobs, audit log, RBAC, settings
- Non-admin tokens get 403 on `/api/admin/*`

**AI & messaging**
- On apply: Groq match %, strengths/gaps, interview questions → Resume Screening
- Recruiter can re-run AI screen
- Hiring messages: Inbox always; Resend email if configured
- Templates: shortlisted, next round, rejected, approved, offer CTC, interview invite

---

existing user email and password

admin-admintest@elevate.com / adminpass9890263550
candidate- candidate3@gmail.com / 123456789
company- comapnyprofile@gmail.com/ @Company123
recruiter of another company - recruiter1@gmail.com / 123456789
interviewer - interviewer1@gmail.com / 123456789
hiringmanager - hiringmanager1@gmail.com / 123456789

## Live deployment

| | URL |
|---|---|
| **Frontend** | https://elevatexyz.vercel.app |
| **Backend** | https://elevate-d8hy.onrender.com/health |

---

## Team

| Name | Role |
|---|---|
| Nikhil Vishwakarma | Full-stack (backend, hiring pipeline, deployment) |
| Priyanshu Upadhyay | Frontend (candidate & company UI) |
| Aniket Tiwari | Frontend (auth, onboarding, UI) |

---

## Known bugs, limitations, and future work

What we have **not** finished yet and plan to build next:

- **Coding assessments (bonus)** — recruiter Tests tab, assign, candidate take-test (Monaco/timer/tab-switch), Piston + MCQ scoring. Still open: AI question generation, plagiarism jobs, live dash, Swagger
- **Drag-and-drop Kanban** — stages change with a selector and job-first lists, not a drag board
- **Offer PDF** — CTC, joining date, and location are stored and messaged; branded PDF download is not generated
- **AI hire summary** — match score + question bank exist; a post-interview LLM summary for the hiring manager is not built
- **Full resume auto-fill** — screening runs on apply; upload-once auto-fill of every profile field is incomplete
- **Calendar reminders** — candidate gets Inbox (+ email/Meet if configured); Google Calendar invite for the candidate is not automatic
- **Admin 2FA / OTP** — not implemented
- **Realtime inbox** — unread badge uses polling, not WebSockets
- **Resend** — without `RESEND_API_KEY`, hiring mail is in-app only
- **Google Meet** — optional; needs OAuth refresh token on the API host
