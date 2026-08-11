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

Company membership (founder approval): run `supabase/company-join.sql` in the Supabase SQL editor (re-run it if company create hits an RLS error). Founders create the company profile. Recruiters, hiring managers, and interviewers search and request to join; they only see that company after the founder approves.
