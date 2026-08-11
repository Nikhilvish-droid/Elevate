# Resume Screener

Batch-rates resumes (PDF/DOCX) against a job description using Groq's LLM,
shortlists the top candidates, and generates 3 interview questions
(easy/medium/hard) for each shortlisted candidate.

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Create your `.env` file (copy `.env.example` and fill in your key):
   ```
   GROQ_API_KEY=your_groq_key_here
   SHORTLIST_COUNT=10
   DELAY_MS=2200
   ```
   Get a free Groq API key at https://console.groq.com/keys

3. Paste the job description into `job_description.txt`.

4. Drop all resumes (`.pdf` or `.docx`, under 10MB each) into the `resumes/` folder.

## Run

```
node main.js
```

## Output

Results land in the `output/` folder:

- **results.json** — every candidate, ranked by score, with strengths/gaps/summary
- **results.csv** — same data, quick to open in Excel/Google Sheets
- **shortlist_questions.json** — top N candidates with 3 tailored interview questions each

## Notes

- `SHORTLIST_COUNT` controls how many top-scored candidates get interview questions (default 10).
- `DELAY_MS` throttles requests to stay under Groq's free-tier rate limits. If you hit 429 errors,
  increase this value (e.g. to 3000-5000ms).
- Resume text is extracted locally (no OCR) — scanned/image-only PDFs won't parse well.
