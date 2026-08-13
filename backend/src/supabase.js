const { createClient } = require("@supabase/supabase-js");
const ws = require("ws");

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name} in backend/.env`);
  return value;
}

/** Node < 22 has no native WebSocket; supabase-js 2.55+ requires an explicit transport. */
function clientOptions(extra = {}) {
  return {
    realtime: { transport: ws },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      ...extra.auth,
    },
    ...(extra.global ? { global: extra.global } : {}),
  };
}

/** Client scoped to the logged-in user's JWT so RLS still applies */
function supabaseForToken(accessToken) {
  return createClient(
    requireEnv("SUPABASE_URL"),
    requireEnv("SUPABASE_ANON_KEY"),
    clientOptions({
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    }),
  );
}

/** Unscoped anon client for public reads (RLS still applies) */
function supabaseAnon() {
  return createClient(
    requireEnv("SUPABASE_URL"),
    requireEnv("SUPABASE_ANON_KEY"),
    clientOptions(),
  );
}

/** Optional admin client — only used to remove auth.users after app wipe */
function supabaseAdmin() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return createClient(requireEnv("SUPABASE_URL"), key, clientOptions());
}

module.exports = { supabaseForToken, supabaseAnon, supabaseAdmin };
