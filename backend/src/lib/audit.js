async function writeAudit(admin, entry) {
  if (!admin) return;
  try {
    await admin.from("audit_logs").insert({
      actor_id: entry.actorId || null,
      actor_role: entry.actorRole || null,
      action: entry.action,
      resource_type: entry.resourceType || null,
      resource_id: entry.resourceId != null ? String(entry.resourceId) : null,
      ip_address: entry.ipAddress || null,
      user_agent: entry.userAgent || null,
      metadata: entry.metadata || null,
    });
  } catch (err) {
    console.warn("audit log skipped:", err.message);
  }
}

function requestMeta(req) {
  const forwarded = req.headers["x-forwarded-for"];
  const ip =
    (Array.isArray(forwarded) ? forwarded[0] : String(forwarded || ""))
      .split(",")[0]
      .trim() ||
    req.ip ||
    null;
  return {
    ipAddress: ip,
    userAgent: req.headers["user-agent"] || null,
  };
}

module.exports = { writeAudit, requestMeta };
