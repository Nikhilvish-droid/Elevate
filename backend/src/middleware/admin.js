const { fail } = require("../lib/helpers");
const { supabaseAdmin } = require("../supabase");
const { roleNamesFor } = require("../lib/users");

async function requireAdmin(req, res, next) {
  try {
    const names = await roleNamesFor(req.supabase, req.user.id);
    if (!names.includes("admin")) {
      return fail(
        res,
        403,
        "Admin only. This API is blocked for your role.",
      );
    }
    const admin = supabaseAdmin();
    if (!admin) {
      return fail(
        res,
        503,
        "Admin APIs need SUPABASE_SERVICE_ROLE_KEY in backend/.env.",
      );
    }
    req.adminDb = admin;
    req.actorRoles = names;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { requireAdmin };
