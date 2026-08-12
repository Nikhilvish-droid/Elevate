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

## AI resume screening

Set `GROQ_API_KEY` in `backend/.env` (see `backend/.env.example`). After a candidate applies, Elevate screens the resume against the job description, sets stage to **Resume Screening**, writes `match_score`, and stores interview questions for recruiters / interviewers. Recruiters can **Re-run AI screen** from Apps.

Offline batch CLI remains in `resume-screener/` (`node main.js`) and is separate from the product API path.
