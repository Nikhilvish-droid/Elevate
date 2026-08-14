const { unwrap } = require("./helpers");
const { supabaseAdmin } = require("../supabase");

async function loadCandidateRecord(supabase, candidateId) {
  const { data: cand, error } = await supabase
    .from("candidates")
    .select("*")
    .eq("id", candidateId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return cand;
}

function certificateStoragePath(fileUrl) {
  if (!fileUrl) return null;
  if (!fileUrl.startsWith("http")) return fileUrl;
  const match = fileUrl.match(
    /\/object\/(?:sign|public)\/certificates\/([^?]+)/,
  );
  return match ? decodeURIComponent(match[1]) : null;
}

async function signCertificateUrls(supabase, certs) {
  const admin = supabaseAdmin();
  const client = admin || supabase;
  return Promise.all(
    (certs || []).map(async (row) => {
      const path = certificateStoragePath(row.file_url || row.credential_url);
      if (!path) {
        return {
          ...row,
          storage_path: row.file_url || null,
        };
      }
      const { data } = await client.storage
        .from("certificates")
        .createSignedUrl(path, 60 * 60);
      return {
        ...row,
        storage_path: path,
        file_url: data?.signedUrl || row.file_url,
        file_name: row.file_name || path.split("/").pop(),
      };
    }),
  );
}

async function loadRelated(supabase, candidateId) {
  const [
    { data: education },
    { data: experience },
    { data: certs },
    { data: skillRows },
    { data: resumes },
  ] = await Promise.all([
    supabase
      .from("candidate_education")
      .select("id, institution_name, degree, field_of_study, start_date, end_date, grade")
      .eq("candidate_id", candidateId),
    supabase
      .from("candidate_experience")
      .select(
        "id, company_name, job_title, employment_type, is_current, start_date, end_date, location, description",
      )
      .eq("candidate_id", candidateId),
    supabase
      .from("candidate_certifications")
      .select(
        "id, certification_name, issuing_organization, file_url, file_name, credential_url",
      )
      .eq("candidate_id", candidateId),
    supabase
      .from("candidate_skills")
      .select("skills(name, category)")
      .eq("candidate_id", candidateId),
    supabase
      .from("resumes")
      .select("id, file_name, file_url, is_primary, file_type")
      .eq("candidate_id", candidateId)
      .order("uploaded_at", { ascending: false }),
  ]);

  const skills = (skillRows || [])
    .map((r) => {
      const s = unwrap(r.skills);
      return s?.name ? { name: s.name, category: s.category || null } : null;
    })
    .filter(Boolean);

  return {
    education: education || [],
    experience: experience || [],
    certifications: await signCertificateUrls(supabase, certs || []),
    skills,
    resumes: await signResumeUrls(supabase, resumes || []),
  };
}

function resumeStoragePath(fileUrl) {
  if (!fileUrl) return null;
  let raw = String(fileUrl).trim();
  if (!raw) return null;
  if (raw.startsWith("http")) {
    const match = raw.match(
      /\/object\/(?:sign|public|authenticated)\/resumes\/([^?]+)/i,
    );
    if (match) raw = decodeURIComponent(match[1]);
    else {
      const alt = raw.match(/\/resumes\/([^?]+)/i);
      if (alt) raw = decodeURIComponent(alt[1]);
      else return null;
    }
  }
  raw = raw.replace(/^\/+/, "");
  if (raw.toLowerCase().startsWith("resumes/")) {
    raw = raw.slice("resumes/".length);
  }
  return raw || null;
}

async function signResumeUrls(supabase, resumes) {
  const admin = supabaseAdmin();
  const client = admin || supabase;
  return Promise.all(
    (resumes || []).map(async (row) => {
      const path = resumeStoragePath(row.file_url);
      if (!path) return row;
      const { data } = await client.storage
        .from("resumes")
        .createSignedUrl(path, 60 * 60);
      return data?.signedUrl ? { ...row, file_url: data.signedUrl } : row;
    }),
  );
}

async function loadFullProfile(supabase, user, candidateId) {
  const cand = await loadCandidateRecord(supabase, candidateId);
  if (!cand) throw new Error("Candidate not found");
  const related = await loadRelated(supabase, candidateId);
  return {
    ...cand,
    email: cand.email || user?.email,
    ...related,
  };
}

async function loadPublicProfile(supabase, candidateId) {
  // Public share + company "View profile" links use this. Related tables
  // (education / resumes / certs) are often restricted by candidate-only RLS
  // under the anon client — prefer service role so the full dossier shows.
  const admin = supabaseAdmin();
  const db = admin || supabase;
  const cand = await loadCandidateRecord(db, candidateId);
  if (!cand) return null;
  const related = await loadRelated(db, candidateId);
  return {
    id: cand.id,
    first_name: cand.first_name,
    last_name: cand.last_name,
    profile_image_url: cand.profile_image_url,
    location: cand.location,
    gender_identity: cand.gender_identity ?? null,
    pronouns: cand.pronouns ?? null,
    show_pronouns_on_profile: cand.show_pronouns_on_profile ?? false,
    portfolio_url: cand.portfolio_url,
    github_url: cand.github_url,
    linkedin_url: cand.linkedin_url,
    professional_summary: cand.professional_summary,
    total_experience_years: cand.total_experience_years,
    education: related.education,
    experience: related.experience,
    certifications: related.certifications,
    skills: related.skills,
    resumes: related.resumes || [],
  };
}

module.exports = { loadFullProfile, loadPublicProfile, signResumeUrls, resumeStoragePath };
