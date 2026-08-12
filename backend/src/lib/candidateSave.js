function yearToDate(year) {
  const y = String(year || "").trim();
  if (!/^\d{4}$/.test(y)) return null;
  return `${y}-01-01`;
}

function formatGpa(gpa, gpaMax) {
  const a = String(gpa || "").trim();
  const b = String(gpaMax || "").trim();
  if (!a) return null;
  if (b) return `${a}/${b}`;
  return a;
}

function parseGpa(grade) {
  if (!grade) return { gpa: "", gpa_max: "" };
  const parts = String(grade).split("/");
  return {
    gpa: parts[0]?.trim() || "",
    gpa_max: parts[1]?.trim() || "",
  };
}

async function replaceEducation(supabase, candidateId, rows) {
  await supabase.from("candidate_education").delete().eq("candidate_id", candidateId);
  for (const edu of rows || []) {
    if (!edu.institution_name?.trim()) continue;
    const { error } = await supabase.from("candidate_education").insert({
      candidate_id: candidateId,
      institution_name: edu.institution_name.trim(),
      degree: edu.degree?.trim() || null,
      field_of_study: edu.field_of_study?.trim() || null,
      start_date: yearToDate(edu.start_year) || edu.start_date || null,
      end_date: yearToDate(edu.end_year) || edu.end_date || null,
      grade: formatGpa(edu.gpa, edu.gpa_max),
      description: edu.description?.trim() || null,
    });
    if (error) throw new Error(error.message);
  }
}

async function replaceExperience(supabase, candidateId, rows) {
  await supabase.from("candidate_experience").delete().eq("candidate_id", candidateId);
  for (const exp of rows || []) {
    if (!exp.company_name?.trim() || !exp.job_title?.trim()) continue;
    const { error } = await supabase.from("candidate_experience").insert({
      candidate_id: candidateId,
      company_name: exp.company_name.trim(),
      job_title: exp.job_title.trim(),
      employment_type: exp.employment_type || null,
      location: exp.location?.trim() || null,
      start_date: exp.start_date || new Date().toISOString().slice(0, 10),
      end_date: exp.is_current ? null : exp.end_date || null,
      is_current: Boolean(exp.is_current),
      description: exp.description?.trim() || null,
    });
    if (error) throw new Error(error.message);
  }
}

async function replaceCertifications(supabase, candidateId, rows) {
  await supabase
    .from("candidate_certifications")
    .delete()
    .eq("candidate_id", candidateId);
  for (const cert of rows || []) {
    if (!cert.certification_name?.trim()) continue;
    const { error } = await supabase.from("candidate_certifications").insert({
      candidate_id: candidateId,
      certification_name: cert.certification_name.trim(),
      issuing_organization: cert.issuing_organization?.trim() || null,
      file_url: cert.file_url || null,
      file_name: cert.file_name || null,
      credential_url: cert.credential_url || cert.file_url || null,
    });
    if (error) throw new Error(error.message);
  }
}

module.exports = {
  yearToDate,
  formatGpa,
  parseGpa,
  replaceEducation,
  replaceExperience,
  replaceCertifications,
};
