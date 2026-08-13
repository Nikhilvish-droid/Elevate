const { unwrap } = require("./helpers");
const { roundToAppStatus } = require("./applicationStages");

const INTERVIEW_SELECT =
  "id, interview_type, scheduled_at, duration_minutes, meeting_link, location, status, interviewer_id, application_id, applications(id, job_id, status, candidate_id, candidates(first_name, last_name, user_id), jobs(id, title, company_id, companies(name)))";

async function applicationIdsForCompany(supabase, companyId) {
  const { data: jobs, error: jobErr } = await supabase
    .from("jobs")
    .select("id")
    .eq("company_id", companyId);
  if (jobErr) throw new Error(jobErr.message);
  const jobIds = (jobs || []).map((job) => job.id);
  if (!jobIds.length) return [];
  const { data: apps, error: appErr } = await supabase
    .from("applications")
    .select("id")
    .in("job_id", jobIds);
  if (appErr) throw new Error(appErr.message);
  return (apps || []).map((app) => app.id);
}

async function interviewerNames(supabase, rows) {
  const ids = [
    ...new Set((rows || []).map((row) => row.interviewer_id).filter(Boolean)),
  ];
  if (!ids.length) return {};
  const { data, error } = await supabase
    .from("users")
    .select("id, full_name")
    .in("id", ids);
  if (error) return {};
  const map = {};
  for (const user of data || []) map[user.id] = user.full_name || null;
  return map;
}

function mapInterviewRow(row, interviewerNameById = {}) {
  const app = unwrap(row.applications) || {};
  const cand = unwrap(app.candidates) || {};
  const job = unwrap(app.jobs) || {};
  const name = [cand.first_name, cand.last_name].filter(Boolean).join(" ").trim();
  return {
    id: row.id,
    application_id: row.application_id,
    job_id: job.id || app.job_id || null,
    job_title: job.title || "Role",
    company_name: unwrap(job.companies)?.name || null,
    interview_type: row.interview_type,
    scheduled_at: row.scheduled_at,
    duration_minutes: row.duration_minutes,
    meeting_link: row.meeting_link,
    location: row.location,
    status: row.status,
    interviewer_id: row.interviewer_id || null,
    interviewer_name: interviewerNameById[row.interviewer_id] || null,
    candidate_name: name || "Candidate",
    candidate_user_id: cand.user_id || null,
  };
}

async function listCompanyInterviews(supabase, companyId) {
  const appIds = await applicationIdsForCompany(supabase, companyId);
  if (!appIds.length) return [];
  const { data, error } = await supabase
    .from("interviews")
    .select(INTERVIEW_SELECT)
    .in("application_id", appIds)
    .order("scheduled_at", { ascending: true });
  if (error) throw new Error(error.message);
  const names = await interviewerNames(supabase, data || []);
  return (data || []).map((row) => mapInterviewRow(row, names));
}

async function getCompanyInterviewRow(supabase, companyId, interviewId) {
  const { data, error } = await supabase
    .from("interviews")
    .select(INTERVIEW_SELECT)
    .eq("id", interviewId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const job = unwrap(unwrap(data.applications)?.jobs);
  if (!job || job.company_id !== companyId) return null;
  const names = await interviewerNames(supabase, [data]);
  return { row: data, mapped: mapInterviewRow(data, names) };
}

async function syncApplicationStageFromInterviews(supabase, applicationId) {
  const { data, error } = await supabase
    .from("interviews")
    .select("id, status, interview_type, scheduled_at")
    .eq("application_id", applicationId)
    .order("scheduled_at", { ascending: false });
  if (error) throw new Error(error.message);
  const list = data || [];
  const scheduled = list.filter(
    (row) => String(row.status || "").toLowerCase() === "scheduled",
  );
  if (scheduled[0]) {
    await supabase
      .from("applications")
      .update({ status: roundToAppStatus(scheduled[0].interview_type) })
      .eq("id", applicationId);
    return;
  }
  const completed = list.filter((row) =>
    ["completed", "ended", "done"].includes(
      String(row.status || "").toLowerCase(),
    ),
  );
  if (completed[0]) {
    await supabase
      .from("applications")
      .update({ status: roundToAppStatus(completed[0].interview_type) })
      .eq("id", applicationId);
    return;
  }
  await supabase
    .from("applications")
    .update({ status: "shortlisted" })
    .eq("id", applicationId);
}

async function notifyInterview(supabase, { userId, title, lines, interviewId }) {
  if (!userId) return;
  await supabase.from("notifications").insert({
    user_id: userId,
    notification_type: "interview",
    title,
    message: (lines || []).filter(Boolean).join("\n"),
    entity_type: "interview",
    entity_id: interviewId,
  });
}

module.exports = {
  listCompanyInterviews,
  getCompanyInterviewRow,
  syncApplicationStageFromInterviews,
  notifyInterview,
};
