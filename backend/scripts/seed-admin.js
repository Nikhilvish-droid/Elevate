/**
 * Seed / promote a platform Admin.
 *
 * Usage (from backend/):
 *   node scripts/seed-admin.js admin@elevate.local "AdminPass123"
 *
 * Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in backend/.env
 * and supabase/admin-platform.sql already run (roles.name = 'admin').
 */
require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");
const ws = require("ws");

async function main() {
  const email = String(process.argv[2] || process.env.ADMIN_EMAIL || "")
    .trim()
    .toLowerCase();
  const password = String(process.argv[3] || process.env.ADMIN_PASSWORD || "");
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env");
  }
  if (!email || !password) {
    throw new Error("Usage: node scripts/seed-admin.js <email> <password>");
  }
  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }

  const admin = createClient(url, key, {
    realtime: { transport: ws },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: role, error: roleErr } = await admin
    .from("roles")
    .select("id")
    .eq("name", "admin")
    .maybeSingle();
  if (roleErr) throw new Error(roleErr.message);
  if (!role?.id) {
    throw new Error("Role 'admin' is missing. Run supabase/admin-platform.sql first.");
  }

  let userId = null;
  const { data: listed } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const existingAuth = (listed?.users || []).find(
    (u) => String(u.email || "").toLowerCase() === email,
  );

  if (existingAuth) {
    userId = existingAuth.id;
    await admin.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
      ban_duration: "none",
    });
    console.log("Updated existing auth user", email);
  } else {
    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: "Platform Admin" },
    });
    if (error) throw new Error(error.message);
    userId = created.user.id;
    console.log("Created auth user", email);
  }

  const { error: upsertErr } = await admin.from("users").upsert(
    {
      id: userId,
      email,
      full_name: "Platform Admin",
      status: "active",
    },
    { onConflict: "id" },
  );
  if (upsertErr && !/column .*status/i.test(upsertErr.message || "")) {
    throw new Error(upsertErr.message);
  }
  if (upsertErr) {
    await admin.from("users").upsert(
      { id: userId, email, full_name: "Platform Admin" },
      { onConflict: "id" },
    );
  }

  const { error: linkErr } = await admin.from("user_roles").upsert(
    { user_id: userId, role_id: role.id },
    { onConflict: "user_id,role_id" },
  );
  if (linkErr) throw new Error(linkErr.message);

  console.log("Admin ready.");
  console.log("  email:", email);
  console.log("  login: http://localhost:3000/auth?tab=login");
  console.log("  home:  http://localhost:3000/admin");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
