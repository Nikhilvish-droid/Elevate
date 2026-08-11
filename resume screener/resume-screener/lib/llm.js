const Groq = require("groq-sdk");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const MODEL = "llama-3.3-70b-versatile";

function cleanJson(raw) {
    return raw.replace(/```json|```/g, "").trim();
}

async function rateResume(resumeText, jobDescription) {
    const prompt = `You are an expert technical recruiter performing AI Resume Matching. Compare this resume against the job description and generate a matching score.

JOB DESCRIPTION:
${jobDescription}

RESUME:
${resumeText}

Respond ONLY with valid JSON, no markdown formatting, no backticks, in this exact format:
{
  "candidate_name": "extracted name or Unknown",
  "match_percentage": <integer 0-100>,
  "strong_skills": ["skill the candidate has that matches the JD", "..."],
  "missing_skills": ["skill required by the JD that the candidate does not show", "..."],
  "weak_areas": ["area where the candidate partially matches but is underqualified or unclear", "..."],
  "recommendation": "one short sentence, e.g. 'Good fit for interview.' or 'Not a strong match for this role.'",
  "verdict": "shortlist" or "reject"
}

Rules:
- "match_percentage" should reflect overall fit as a percentage, weighted toward required skills/experience in the JD.
- "strong_skills" lists only skills that genuinely appear in both the resume and the JD's requirements.
- "missing_skills" lists only skills explicitly required or strongly implied by the JD that are absent from the resume.
- "weak_areas" covers things like insufficient years of experience, partial skill overlap, or unclear seniority — not missing skills already listed above.
- "verdict" should be "shortlist" only if match_percentage reflects a genuinely strong fit.`;

    const completion = await groq.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: MODEL,
        temperature: 0.3,
    });

    return JSON.parse(cleanJson(completion.choices[0].message.content));
}

async function generateQuestions(resumeText, jobDescription) {
    const prompt = `Based on this candidate's resume and the job description, generate exactly 5 EASY, 5 MEDIUM, and 5 HARD technical interview questions targeting their tech stack. Do not repeat questions across levels.

JOB DESCRIPTION:
${jobDescription}

RESUME:
${resumeText}

Respond ONLY with valid JSON, no markdown, in this exact format:
{
  "easy": ["question 1", "question 2", "question 3", "question 4", "question 5"],
  "medium": ["question 1", "question 2", "question 3", "question 4", "question 5"],
  "hard": ["question 1", "question 2", "question 3", "question 4", "question 5"]
}`;

    const completion = await groq.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: MODEL,
        temperature: 0.5,
    });

    return JSON.parse(cleanJson(completion.choices[0].message.content));
}

async function extractResumeInfo(resumeText) {
    const prompt = `You are an AI resume parser for an Applicant Tracking System. Extract the following fields from this resume text. Only use information that is actually present in the resume — do not guess or fabricate anything.

RESUME:
${resumeText}

Respond ONLY with valid JSON, no markdown formatting, no backticks, in this exact format:
{
  "name": "",
  "email": "",
  "phone": "",
  "skills": [],
  "education": [],
  "experience": [],
  "projects": [],
  "certifications": [],
  "languages": [],
  "total_experience": "",
  "missing": []
}

Rules:
- "name", "email", "phone", "total_experience" are strings. Leave as "" if not found.
- "skills", "education", "experience", "projects", "certifications", "languages" are arrays of strings (short descriptive entries). Leave as [] if not found.
- "total_experience" should be a short string like "3 years" or "6 months" — estimate it from experience entries if not explicitly stated, otherwise leave it "".
- "missing" must list the exact field names (from the keys above, e.g. "email", "certifications") for every field that ended up empty ("" or []).
- Do not include a field in "missing" if it was successfully filled in.`;

    const completion = await groq.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: MODEL,
        temperature: 0.2,
    });

    return JSON.parse(cleanJson(completion.choices[0].message.content));
}

module.exports = { rateResume, generateQuestions, extractResumeInfo };
