const express = require("express");
const { asyncHandler, fail } = require("../lib/helpers");
const {
  mailConfigured,
  sendConfirmationEmail,
  sendRecoveryEmail,
  frontendOrigin,
  frontendOrigins,
} = require("../lib/mail");

const router = express.Router();

const lastSentAt = new Map();
const COOLDOWN_MS = 60_000;

function normalizeEmail(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function assertEmail(email) {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    const err = new Error("A valid email is required.");
    err.status = 400;
    throw err;
  }
}

function assertCooldown(email) {
  const prev = lastSentAt.get(email) || 0;
  const wait = COOLDOWN_MS - (Date.now() - prev);
  if (wait > 0) {
    const err = new Error(
      `Please wait ${Math.ceil(wait / 1000)}s before requesting another email.`,
    );
    err.status = 429;
    throw err;
  }
}

function safeRedirect(pathOrUrl) {
  const allowed = new Set(frontendOrigins());
  const origin = frontendOrigin();
  if (!pathOrUrl) return null;
  if (pathOrUrl.startsWith("/")) return `${origin}${pathOrUrl}`;
  try {
    const u = new URL(pathOrUrl);
    if (allowed.has(u.origin)) return u.toString();
  } catch {
    /* ignore */
  }
  return null;
}

router.get(
  "/email-status",
  asyncHandler(async (_req, res) => {
    res.json({
      configured: mailConfigured(),
      from: process.env.RESEND_FROM || "Elevate <beth.t@example.com>",
    });
  }),
);

router.post(
  "/send-confirmation",
  asyncHandler(async (req, res) => {
    if (!mailConfigured()) {
      return fail(
        res,
        503,
        "Auth emails need RESEND_API_KEY and SUPABASE_SERVICE_ROLE_KEY in backend/.env (Supabase built-in mail only reaches team members).",
      );
    }

    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");
    assertEmail(email);
    if (password.length < 8) {
      return fail(res, 400, "Password is required to build the confirmation link.");
    }

    assertCooldown(`confirm:${email}`);

    const redirectTo =
      safeRedirect(req.body?.redirectTo) ||
      `${frontendOrigin()}/auth/callback?next=/onboarding`;

    try {
      await sendConfirmationEmail({ email, password, redirectTo });
      lastSentAt.set(`confirm:${email}`, Date.now());
      res.json({ ok: true });
    } catch (err) {
      return fail(res, err.status || 400, err.message || "Could not send email.");
    }
  }),
);

router.post(
  "/send-recovery",
  asyncHandler(async (req, res) => {
    if (!mailConfigured()) {
      return fail(
        res,
        503,
        "Auth emails need RESEND_API_KEY and SUPABASE_SERVICE_ROLE_KEY in backend/.env (Supabase built-in mail only reaches team members).",
      );
    }

    const email = normalizeEmail(req.body?.email);
    assertEmail(email);
    assertCooldown(`recovery:${email}`);

    const redirectTo =
      safeRedirect(req.body?.redirectTo) ||
      `${frontendOrigin()}/auth/callback?next=${encodeURIComponent("/auth/reset")}`;

    try {
      await sendRecoveryEmail({ email, redirectTo });
      lastSentAt.set(`recovery:${email}`, Date.now());
      res.json({ ok: true });
    } catch (err) {
      // Don't leak whether the account exists for recovery probes.
      if (/user not found|unable to find|not found/i.test(err.message || "")) {
        lastSentAt.set(`recovery:${email}`, Date.now());
        return res.json({ ok: true });
      }
      return fail(res, err.status || 400, err.message || "Could not send email.");
    }
  }),
);

module.exports = router;
