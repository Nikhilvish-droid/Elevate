# Elevate

ATS for companies and candidates.

## Run locally

Terminal 1 — API:

```bash
cd backend
npm install
npm run dev
```

Terminal 2 — web:

```bash
cd frontend
npm install
npm run dev
```

- Frontend: http://localhost:3000
- Backend: http://localhost:5000/health

## Supabase SQL (run in order)

1. `supabase/company-join.sql` — company membership / join requests (re-run if company create hits RLS)
2. `supabase/company-jobs.sql` — company job posting / dashboard reads
3. `supabase/applications.sql` — candidate apply / company applicants
4. `supabase/offer-letters.sql` — offers & interviews create
5. `supabase/notifications.sql` — inbox messages
6. `supabase/interview-feedback.sql` — interviewer assignment, feedback ratings, HM `approved_for_offer`
7. `supabase/ai-screening.sql` — `applications.ai_screening` JSON for Groq match + question bank
8. `supabase/resumes-company-read.sql` — company can read applicant resumes (or set `SUPABASE_SERVICE_ROLE_KEY`)
9. `supabase/candidate-profile-fields.sql` — gender/pronouns/certs
10. `supabase/delete-account.sql` — account delete

Optional `SUPABASE_SERVICE_ROLE_KEY` in `backend/.env` helps with Auth user delete, **AI resume download**, and apply RLS bypass.

## AI resume screening

Set `GROQ_API_KEY` in `backend/.env` (see `backend/.env.example`). After a candidate applies, Elevate screens the resume against the job description, sets stage to **Resume Screening**, writes `match_score`, and stores interview questions for recruiters / interviewers. Recruiters can **Re-run AI screen** from Apps.

Offline batch CLI remains in `resume-screener/` (`node main.js`) and is separate from the product API path.
