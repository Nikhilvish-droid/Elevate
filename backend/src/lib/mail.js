const { supabaseAdmin } = require("../supabase");

function frontendOrigin() {
  return (process.env.FRONTEND_ORIGIN || "http://localhost:3000").replace(
    /\/$/,
    "",
  );
}

function mailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

async function sendResendEmail({ to, subject, html, text }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    const err = new Error(
      "Email is not configured. Add RESEND_API_KEY to backend/.env",
    );
    err.status = 503;
    throw err;
  }

  const from =
    process.env.RESEND_FROM || "Elevate <beth.t@example.com>";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
      text,
    }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(
      body.message ||
        "Resend rejected the email. Use beth.t@example.com as RESEND_FROM (test) or a verified domain, and ensure the recipient is allowed.",
    );
    err.status = 502;
    throw err;
  }
  return body;
}

function requireAdmin() {
  const admin = supabaseAdmin();
  if (!admin) {
    const err = new Error(
      "Email links need SUPABASE_SERVICE_ROLE_KEY in backend/.env",
    );
    err.status = 503;
    throw err;
  }
  return admin;
}

async function generateActionLink({ type, email, password, redirectTo }) {
  const admin = requireAdmin();
  const options = redirectTo ? { redirectTo } : undefined;

  if (type === "signup") {
    const { data, error } = await admin.auth.admin.generateLink({
      type: "signup",
      email,
      password,
      options,
    });
    if (!error && data?.properties?.action_link) {
      return data.properties.action_link;
    }
    // User already created by client signUp — fall back to magic link.
    const magic = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options,
    });
    if (magic.error) {
      throw new Error(magic.error.message || error?.message || "Could not create link");
    }
    return magic.data.properties.action_link;
  }

  const { data, error } = await admin.auth.admin.generateLink({
    type,
    email,
    options,
  });
  if (error) throw new Error(error.message);
  const link = data?.properties?.action_link;
  if (!link) throw new Error("Supabase did not return an action link");
  return link;
}

async function sendConfirmationEmail({ email, password, redirectTo }) {
  const link = await generateActionLink({
    type: "signup",
    email,
    password,
    redirectTo:
      redirectTo || `${frontendOrigin()}/auth/callback?next=/onboarding`,
  });

  await sendResendEmail({
    to: email,
    subject: "Confirm your Elevate account",
    text: `Confirm your email by opening this link:\n\n${link}\n`,
    html: `
      <h2>Confirm your email</h2>
      <p>Welcome to Elevate. Click the button below to confirm your account.</p>
      <p><a href="${link}" style="display:inline-block;padding:12px 20px;background:#0d9488;color:#fff;text-decoration:none;border-radius:6px;font-weight:600">Confirm email</a></p>
      <p style="color:#666;font-size:13px">Or paste this URL into your browser:<br>${link}</p>
    `,
  });
}

async function sendRecoveryEmail({ email, redirectTo }) {
  const link = await generateActionLink({
    type: "recovery",
    email,
    redirectTo:
      redirectTo ||
      `${frontendOrigin()}/auth/callback?next=${encodeURIComponent("/auth/reset")}`,
  });

  await sendResendEmail({
    to: email,
    subject: "Reset your Elevate password",
    text: `Reset your password by opening this link:\n\n${link}\n`,
    html: `
      <h2>Reset your password</h2>
      <p>Click the button below to choose a new password.</p>
      <p><a href="${link}" style="display:inline-block;padding:12px 20px;background:#0d9488;color:#fff;text-decoration:none;border-radius:6px;font-weight:600">Reset password</a></p>
      <p style="color:#666;font-size:13px">Or paste this URL into your browser:<br>${link}</p>
      <p style="color:#666;font-size:13px">If you did not request this, you can ignore this email.</p>
    `,
  });
}

module.exports = {
  mailConfigured,
  sendConfirmationEmail,
  sendRecoveryEmail,
  frontendOrigin,
};
