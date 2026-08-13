const Groq = require("groq-sdk");

const MODEL = "llama-3.3-70b-versatile";

const SCORE_WEIGHTS = {
  resume: 0.9,
  fit: 0.05,
  why: 0.05,
};

/** Related spellings count as the same skill. */
const SKILL_ALIASES = [
  ["sql", "mysql", "postgresql", "postgres", "sqlite", "mssql", "sql server", "tsql", "pl/sql"],
  ["power bi", "powerbi", "power-bi", "ms power bi", "microsoft power bi"],
  ["python", "py"],
  ["javascript", "js", "ecmascript"],
  ["typescript", "ts"],
  ["node.js", "nodejs", "node"],
  ["react", "reactjs", "react.js"],
  ["excel", "microsoft excel", "ms excel"],
  ["git", "github", "gitlab"],
  ["machine learning", "ml", "scikit-learn", "sklearn"],
  ["tensorflow", "tf"],
  ["mongodb", "mongo"],
  ["aws", "amazon web services"],
  ["azure", "microsoft azure"],
  ["pandas"],
  ["numpy"],
  ["matplotlib"],
  ["seaborn"],
  ["flask"],
  ["docker"],
];

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[_/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function aliasGroup(skill) {
  const n = normalizeText(skill);
  if (!n) return [n];
  const group = SKILL_ALIASES.find((g) =>
    g.some(
      (a) =>
        n === a ||
        (a.length >= 3 &&
          n.length >= 3 &&
          (n.includes(a) || a.includes(n))),
    ),
  );
  return group ? [...new Set([n, ...group])] : [n];
}

function textHasSkill(haystack, skill) {
  const text = normalizeText(haystack);
  if (!text || !skill) return false;
  return aliasGroup(skill).some((alias) => {
    if (!alias) return false;
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(?:^|[^a-z0-9])${escaped}(?:[^a-z0-9]|$)`, "i").test(text);
  });
}

function uniqueSkills(list) {
  const seen = new Set();
  const out = [];
  for (const item of list || []) {
    const label = String(item || "").trim();
    if (!label) continue;
    const key = normalizeText(label);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(label);
  }
  return out;
}

function reconcileSkills(resumeText, jobDescription, rating) {
  const strong = [];
  const missing = [];

  for (const skill of uniqueSkills(rating.strong_skills)) {
    if (textHasSkill(resumeText, skill)) strong.push(skill);
    else if (textHasSkill(jobDescription, skill) && !textHasSkill(resumeText, skill)) {
      missing.push(skill);
    } else if (textHasSkill(resumeText, skill)) {
      strong.push(skill);
    }
  }

  for (const skill of uniqueSkills(rating.missing_skills)) {
    if (textHasSkill(resumeText, skill)) {
      if (!strong.some((s) => normalizeText(s) === normalizeText(skill))) {
        strong.push(skill);
      }
      continue;
    }
    if (!missing.some((s) => normalizeText(s) === normalizeText(skill))) {
      missing.push(skill);
    }
  }

  const weak = uniqueSkills(rating.weak_areas).filter((area) => {
    const n = normalizeText(area);
    return !missing.some((s) => n.includes(normalizeText(s))) &&
      !strong.some((s) => n === normalizeText(s));
  });

  return {
    strong_skills: strong,
    missing_skills: missing,
    weak_areas: weak,
  };
}

function clampScore(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function blendScores({ resumeScore, fitScore, whyScore, hasFit, hasWhy }) {
  let wResume = SCORE_WEIGHTS.resume;
  let wFit = hasFit ? SCORE_WEIGHTS.fit : 0;
  let wWhy = hasWhy ? SCORE_WEIGHTS.why : 0;
  const total = wResume + wFit + wWhy || 1;
  wResume /= total;
  wFit /= total;
  wWhy /= total;

  const overall = Math.round(
    wResume * resumeScore + wFit * fitScore + wWhy * whyScore,
  );

  return {
    match_percentage: clampScore(overall),
    resume_score: resumeScore,
    fit_score: hasFit ? fitScore : null,
    why_score: hasWhy ? whyScore : null,
    weights: {
      resume: Math.round(wResume * 100),
      fit: Math.round(wFit * 100),
      why: Math.round(wWhy * 100),
    },
  };
}

function getClient() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    const err = new Error("GROQ_API_KEY is not configured on the backend.");
    err.status = 503;
    throw err;
  }
  return new Groq({ apiKey });
}

function cleanJson(raw) {
  return String(raw || "")
    .replace(/```json|```/g, "")
    .trim();
}

async function rateResume(resumeText, jobDescription, extras = {}) {
  const groq = getClient();
  const howYouFit = String(extras.howYouFit || "").trim();
  const whyRole = String(extras.whyRole || "").trim();
  const hasFit = howYouFit.length >= 20;
  const hasWhy = whyRole.length >= 20;

  const prompt = `You are an expert technical recruiter. Read the FULL resume carefully (skills, coursework, databases, tools, project tech stacks). Then score the candidate.

JOB DESCRIPTION:
${jobDescription}

RESUME:
${resumeText}

HOW THEY FIT THIS ROLE:
${hasFit ? howYouFit : "(not provided)"}

WHY THEY WANT THIS ROLE:
${hasWhy ? whyRole : "(not provided)"}

Respond ONLY with valid JSON, no markdown, no backticks:
{
  "candidate_name": "extracted name or Unknown",
  "resume_score": <integer 0-100>,
  "fit_score": <integer 0-100>,
  "why_score": <integer 0-100>,
  "strong_skills": ["skill on the resume that matches the JD"],
  "missing_skills": ["JD-required skill truly absent from the resume"],
  "weak_areas": ["experience/seniority/project-depth gap, not a skill already listed"],
  "summary": "4-6 sentence hiring-manager brief: who they are, education/expertise, key projects, skills they have, and what they lack. A manager should not need to open the resume.",
  "recommendation": "one short sentence",
  "verdict": "shortlist" or "reject"
}

Skill matching rules (critical):
- Treat close variants as the SAME skill. Examples: Power BI = PowerBI = power bi; SQL = MySQL = PostgreSQL = SQLite = SQL Server; JS = JavaScript; ML = Machine Learning; GitHub implies Git.
- If a skill appears anywhere on the resume (skills list, coursework, databases, libraries, OR a project tech stack), it is PRESENT. Put it in strong_skills if the JD needs it. NEVER put it in missing_skills.
- missing_skills only for JD requirements with no related mention anywhere on the resume.
- weak_areas = student/junior depth, no production/internship, unclear real-world use — not "missing SQL" if MySQL is listed.
- summary must name real projects and skills from THIS resume, then clearly state gaps.`;

  const completion = await groq.chat.completions.create({
    messages: [{ role: "user", content: prompt }],
    model: MODEL,
    temperature: 0.3,
  });

  const parsed = JSON.parse(cleanJson(completion.choices[0].message.content));
  const skills = reconcileSkills(resumeText, jobDescription, parsed);
  const resumeScore = clampScore(
    parsed.resume_score ?? parsed.match_percentage,
  );
  const fitScore = hasFit ? clampScore(parsed.fit_score) : 0;
  const whyScore = hasWhy ? clampScore(parsed.why_score) : 0;
  const blended = blendScores({
    resumeScore,
    fitScore,
    whyScore,
    hasFit,
    hasWhy,
  });

  return {
    ...parsed,
    ...blended,
    ...skills,
    summary: String(parsed.summary || "").trim() || null,
    verdict:
      blended.match_percentage >= 70
        ? "shortlist"
        : String(parsed.verdict || "reject").toLowerCase() === "shortlist"
          ? "shortlist"
          : "reject",
  };
}

async function generateQuestions(resumeText, jobDescription) {
  const groq = getClient();
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

module.exports = { rateResume, generateQuestions, SCORE_WEIGHTS };
