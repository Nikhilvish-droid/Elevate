const { supabaseForToken } = require("../supabase");

async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({
      error: "Missing JWT. Send Authorization: Bearer <access_token>",
    });
  }

  try {
    const supabase = supabaseForToken(token);
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: "Invalid or expired JWT" });
    }

    req.token = token;
    req.user = user;
    req.supabase = supabase;
    next();
  } catch (err) {
    return res.status(401).json({ error: err.message || "Auth failed" });
  }
}

module.exports = { requireAuth };
