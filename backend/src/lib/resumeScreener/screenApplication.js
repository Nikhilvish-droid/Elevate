const { supabaseAdmin } = require("../../supabase");
const { unwrap } = require("../helpers");
const { rateResume, generateQuestions } = require("./llm");
const { parseResumeBuffer } = require("./parseResume");

function resumeStoragePath(fileUrl) {
  if (!fileUrl) return null;
  let raw = String(fileUrl).trim();
  if (!raw) return null;

  // Full Supabase storage URLs → object path inside the resumes bucket
  if (raw.startsWith("http")) {
    const match = raw.match(
      /\/object\/(?:sign|public|authenticated)\/resumes\/([^?]+)/i,
    );
    if (match) raw = decodeURIComponent(match[1]);
    else {
      // Generic /resumes/<path> in a URL
      const alt = raw.match(/\/resumes\/([^?]+)/i);
      if (alt) raw = decodeURIComponent(alt[1]);
      else return null;
    }
  }

  raw = raw.replace(/^\/+/, "");
  // DB sometimes stores "resumes/user/file.pdf" even though bucket is already "resumes"
  if (raw.toLowerCase().startsWith("resumes/")) {
    raw = raw.slice("resumes/".length);
  }
  return raw || null;
}

function pathCandidates(fileUrl) {
  const primary = resumeStoragePath(fileUrl);
  if (!primary) return [];
  const set = new Set([primary]);
  // Common variants
  set.add(primary.replace(/^\/+/, ""));
  if (!primary.toLowerCase().startsWith("resumes/")) {
    set.add(`resumes/${primary}`);
  }
  try {
    set.add(decodeURIComponent(primary));
  } catch {
    /* ignore */
  }
  return [...set].filter(Boolean);
}

async function tryDownload(client, path) {
  const { data, error } = await client.storage.from("resumes").download(path);
  if (!error && data) return { data, path };
  return { data: null, error, path };
}

async function trySignedFetch(client, path) {
  const { data: signed, error } = await client.storage
    .from("resumes")
    .createSignedUrl(path, 60);
  if (error || !signed?.signedUrl) return null;
  const res = await fetch(signed.signedUrl);
  if (!res.ok) return null;
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}

async function downloadResumeBuffer(supabase, fileUrl) {
  const candidates = pathCandidates(fileUrl);
  if (!candidates.length) {
    throw new Error(
      `Resume file path is missing or unreadable (stored value: ${String(fileUrl || "").slice(0, 120)}).`,
    );
  }

  const admin = supabaseAdmin();
  const clients = admin ? [admin, supabase] : [supabase];

  let lastError = null;
  for (const path of candidates) {
    for (const client of clients) {
      const result = await tryDownload(client, path);
      if (result.data) {
        const arrayBuffer = await result.data.arrayBuffer();
        return Buffer.from(arrayBuffer);
      }
      lastError = result.error;

      // Fallback: signed URL + HTTP (works when download API is flaky)
      if (admin) {
        try {
          const buf = await trySignedFetch(admin, path);
          if (buf?.length) return buf;
        } catch (err) {
          lastError = err;
        }
      }
    }
  }

  const msg = lastError?.message || "Could not download resume from storage.";
  if (!admin) {
    throw new Error(
      `${msg} Add SUPABASE_SERVICE_ROLE_KEY to backend/.env (Supabase → Project Settings → API → service_role), then restart the backend.`,
    );
  }

  throw new Error(
    `${msg} Checked path(s): ${candidates.join(" | ")}. ` +
      "The file may have been deleted from the resumes bucket, or the DB path is wrong. " +
      "Ask the candidate to re-upload a PDF/DOCX on their profile, then Run AI screen again.",
  );
}

async function loadResumeRow(supabase, { resumeId, candidateId }) {
  const admin = supabaseAdmin();
  const clients = admin ? [admin, supabase] : [supabase];

  for (const client of clients) {
    if (resumeId) {
      const { data } = await client
        .from("resumes")
        .select("id, file_url, file_name, file_type, candidate_id")
        .eq("id", resumeId)
        .maybeSingle();
      if (data?.file_url) return data;
    }

    if (candidateId) {
      const { data: primary } = await client
        .from("resumes")
        .select("id, file_url, file_name, file_type, candidate_id")
        .eq("candidate_id", candidateId)
        .eq("is_primary", true)
        .maybeSingle();
      if (primary?.file_url) return primary;

      const { data: latest } = await client
        .from("resumes")
        .select("id, file_url, file_name, file_type, candidate_id")
        .eq("candidate_id", candidateId)
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (latest?.file_url) return latest;
    }
  }

  return null;
}

/**
 * Screen an application: parse resume, rate vs JD, generate questions, persist.
 * Does not auto shortlist/reject — recruiter decides.
 */
async function screenApplication(supabase, applicationId, { generateQs = true } = {}) {
  if (!process.env.GROQ_API_KEY) {
    const err = new Error("GROQ_API_KEY is not configured on the backend.");
    err.status = 503;
    throw err;
  }

  const admin = supabaseAdmin();
  const readClient = admin || supabase;

  let { data: app, error: appErr } = await readClient
    .from("applications")
    .select(
      "id, status, resume_id, candidate_id, job_id, cover_letter, how_you_fit, why_role, jobs(id, title, description)",
    )
    .eq("id", applicationId)
    .maybeSingle();

  if (appErr && /how_you_fit|why_role/i.test(appErr.message || "")) {
    ({ data: app, error: appErr } = await readClient
      .from("applications")
      .select(
        "id, status, resume_id, candidate_id, job_id, cover_letter, jobs(id, title, description)",
      )
      .eq("id", applicationId)
      .maybeSingle());
  }

  if (appErr || !app) {
    ({ data: app, error: appErr } = await supabase
      .from("applications")
      .select(
        "id, status, resume_id, candidate_id, job_id, cover_letter, jobs(id, title, description)",
      )
      .eq("id", applicationId)
      .maybeSingle());
  }
  if (appErr) throw new Error(appErr.message);
  if (!app) {
    const err = new Error("Application not found.");
    err.status = 404;
    throw err;
  }

  const resume = await loadResumeRow(supabase, {
    resumeId: app.resume_id,
    candidateId: app.candidate_id,
  });

  if (!resume?.file_url) {
    const err = new Error(
      !admin
        ? "Could not read the resume row. Add SUPABASE_SERVICE_ROLE_KEY to backend/.env, restart the API, then try again."
        : "This application has no resume file on record. Ask the candidate to re-upload a PDF/DOCX on Profile, then try again.",
    );
    err.status = 400;
    throw err;
  }

  const job = unwrap(app.jobs) || {};
  const jobDescription =
    String(job.description || "").trim() || String(job.title || "Role");

  const buffer = await downloadResumeBuffer(supabase, resume.file_url);
  const resumeText = await parseResumeBuffer(
    buffer,
    resume.file_name || resume.file_type || "",
  );
  if (!resumeText || resumeText.length < 40) {
    const err = new Error(
      "Resume text could not be extracted (use a text PDF or DOCX, not a scan).",
    );
    err.status = 400;
    throw err;
  }

  function parseCoverParts(cover) {
    const text = String(cover || "");
    const fitMatch = text.match(
      /How I fit this role:\s*([\s\S]*?)(?:\n\s*Why I want this role:|$)/i,
    );
    const whyMatch = text.match(/Why I want this role:\s*([\s\S]*)$/i);
    return {
      fit: fitMatch?.[1]?.trim() || null,
      why: whyMatch?.[1]?.trim() || null,
    };
  }

  const coverParts = parseCoverParts(app.cover_letter);
  const howYouFit = String(app.how_you_fit || coverParts.fit || "").trim();
  const whyRole = String(app.why_role || coverParts.why || "").trim();

  const rating = await rateResume(resumeText, jobDescription, {
    howYouFit,
    whyRole,
  });
  let questions = null;
  if (generateQs) {
    try {
      questions = await generateQuestions(resumeText, jobDescription);
    } catch (err) {
      console.warn("Question generation failed:", err.message);
    }
  }

  const matchScore = Math.max(
    0,
    Math.min(100, Number(rating.match_percentage) || 0),
  );

  const ai_screening = {
    candidate_name: rating.candidate_name || null,
    match_percentage: matchScore,
    resume_score: rating.resume_score ?? null,
    fit_score: rating.fit_score ?? null,
    why_score: rating.why_score ?? null,
    weights: rating.weights || null,
    strong_skills: rating.strong_skills || [],
    missing_skills: rating.missing_skills || [],
    weak_areas: rating.weak_areas || [],
    summary: rating.summary || null,
    recommendation: rating.recommendation || null,
    verdict: rating.verdict || null,
    questions: questions || null,
    screened_at: new Date().toISOString(),
  };

  const patch = {
    match_score: matchScore,
    status: "resume_screening",
    ai_screening,
  };

  const writeClient = admin || supabase;
  let { data, error } = await writeClient
    .from("applications")
    .update(patch)
    .eq("id", applicationId)
    .select("id, status, match_score, ai_screening")
    .single();

  if (error && /ai_screening/i.test(error.message || "")) {
    ({ data, error } = await writeClient
      .from("applications")
      .update({
        match_score: matchScore,
        status: "resume_screening",
      })
      .eq("id", applicationId)
      .select("id, status, match_score")
      .single());
    if (!error && data) {
      data.ai_screening = ai_screening;
    }
  }

  if (error && /row-level security/i.test(error.message || "") && !admin) {
    const err = new Error(
      "Could not save AI screening (RLS). Add SUPABASE_SERVICE_ROLE_KEY to backend/.env and restart.",
    );
    err.status = 403;
    throw err;
  }

  if (error) throw new Error(error.message);
  return data;
}

function screenApplicationInBackground(supabase, applicationId) {
  if (!applicationId || !process.env.GROQ_API_KEY) return;
  setImmediate(() => {
    screenApplication(supabase, applicationId).catch((err) => {
      console.warn(
        `AI screen failed for application ${applicationId}:`,
        err.message,
      );
    });
  });
}

module.exports = {
  screenApplication,
  screenApplicationInBackground,
  downloadResumeBuffer,
  resumeStoragePath,
  loadResumeRow,
};
