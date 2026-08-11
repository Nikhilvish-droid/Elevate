const { unwrap } = require("./helpers");

async function loadCandidateRecord(supabase, candidateId) {
  const { data: cand, error } = await supabase
    .from("candidates")
    .select("*")
    .eq("id", candidateId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return cand;
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
      .select("id, institution_name, degree, field_of_study, start_date, end_date")
      .eq("candidate_id", candidateId),
    supabase
      .from("candidate_experience")
      .select(
        "id, company_name, job_title, is_current, start_date, end_date, location, description",
      )
      .eq("candidate_id", candidateId),
    supabase
      .from("candidate_certifications")
      .select("certification_name")
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
    certifications: certs || [],
    skills,
    resumes: resumes || [],
  };
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
  const cand = await loadCandidateRecord(supabase, candidateId);
  if (!cand) return null;
  const related = await loadRelated(supabase, candidateId);
  return {
    id: cand.id,
    first_name: cand.first_name,
    last_name: cand.last_name,
    profile_image_url: cand.profile_image_url,
    location: cand.location,
    portfolio_url: cand.portfolio_url,
    github_url: cand.github_url,
    linkedin_url: cand.linkedin_url,
    professional_summary: cand.professional_summary,
    total_experience_years: cand.total_experience_years,
    education: related.education,
    experience: related.experience,
    certifications: related.certifications,
    skills: related.skills,
  };
}

module.exports = { loadFullProfile, loadPublicProfile };
