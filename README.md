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

Company membership: run `supabase/company-join.sql` (re-run if company create hits RLS). Company job posting / dashboard reads: run `supabase/company-jobs.sql`. Candidate gender/pronouns/certs: run `supabase/candidate-profile-fields.sql`. Account delete: run `supabase/delete-account.sql`. Optional `SUPABASE_SERVICE_ROLE_KEY` in `backend/.env` also removes the Auth login.
