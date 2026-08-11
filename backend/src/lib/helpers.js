function unwrap(rel) {
  if (!rel) return null;
  return Array.isArray(rel) ? rel[0] ?? null : rel;
}

function splitName(fullName) {
  const parts = String(fullName || "").trim().split(/\s+/);
  return {
    first_name: parts[0] || "User",
    last_name: parts.length > 1 ? parts.slice(1).join(" ") : null,
  };
}

function displayName(user, fallback = "User") {
  return (
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    fallback
  );
}

function teamFromRoleName(name) {
  if (name === "hiring_manager") return "manager";
  if (name === "interviewer") return "interviewer";
  if (name === "recruiter") return "recruiter";
  return null;
}

function roleNameForTeam(team) {
  if (team === "manager") return "hiring_manager";
  if (team === "interviewer") return "interviewer";
  return "recruiter";
}

function teamLabel(team) {
  if (team === "manager") return "Hiring manager";
  if (team === "interviewer") return "Interviewer";
  return "Recruiter";
}

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function fail(res, status, message) {
  return res.status(status).json({ error: message });
}

module.exports = {
  unwrap,
  splitName,
  displayName,
  teamFromRoleName,
  roleNameForTeam,
  teamLabel,
  asyncHandler,
  fail,
};
