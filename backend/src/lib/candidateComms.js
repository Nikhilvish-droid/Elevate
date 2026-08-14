const { unwrap } = require("./helpers");
const { sendResendEmail } = require("./mail");

const TEMPLATES = {
  shortlisted: {
    subject: "You have been shortlisted · {{job}}",
    body: `Hi {{name}},

Good news — you have been shortlisted for {{job}} at {{company}}.

We will proceed to the next round shortly. Please watch your Elevate Inbox for interview details.

Thank you,
{{company}} hiring team`,
  },
  round_advance: {
    subject: "Selected for the next round · {{job}}",
    body: `Hi {{name}},

You have been selected after your {{round}} round for {{job}} at {{company}}.

We would like to move you to the next round. Check your Inbox for the schedule.

Thank you,
{{company}} hiring team`,
  },
  rejected: {
    subject: "Update on your application · {{job}}",
    body: `Hi {{name}},

Thank you for your interest in {{job}} at {{company}}.

Unfortunately, we will not be moving forward with your application at this time. We appreciate the time you spent with us.

We wish you the best.

{{company}} hiring team`,
  },
  approved: {
    subject: "Approved for offer · {{job}}",
    body: `Hi {{name}},

You have been approved for an offer for {{job}} at {{company}}.

Our recruiter will send compensation and joining details next. Please watch your Inbox and Offers tab.

Thank you,
{{company}} hiring team`,
  },
  offer_ctc: {
    subject: "Offer letter · {{job}}",
    body: `Hi {{name}},

Congratulations — here is your offer for {{job}} at {{company}}.

CTC: {{ctc}}
Location: {{location}}
Joining date: {{joining_date}}

Open Offers in your Elevate account to accept or reject this offer.

{{company}} hiring team`,
  },
  interview_invite: {
    subject: "Interview invite · {{job}}",
    body: `Hi {{name}},

You are invited to interview for {{job}} at {{company}}.

Please check your Elevate Inbox and Rounds tab for time and meeting link.

Thank you,
{{company}} hiring team`,
  },
  assessment_assigned: {
    subject: "Coding assessment assigned · {{job}}",
    body: `Hi {{name}},

You have been assigned a coding assessment for {{job}} at {{company}}.

Test: {{test}}
Duration: {{duration}} minutes

Open the Tests tab in Elevate to start when you are ready. The timer begins when you open the test.

Thank you,
{{company}} hiring team`,
  },
};

function fillTemplate(text, vars) {
  return String(text || "").replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const value = vars[key];
    return value == null || value === "" ? "—" : String(value);
  });
}

function messageTemplate(key, vars = {}) {
  const tpl = TEMPLATES[key] || TEMPLATES.shortlisted;
  return {
    subject: fillTemplate(tpl.subject, vars),
    body: fillTemplate(tpl.body, vars),
  };
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function sendCandidateInbox(db, { userId, subject, body, applicationId, type }) {
  if (!userId) {
    const err = new Error("Candidate account not found for messaging.");
    err.status = 400;
    throw err;
  }
  const { error } = await db.from("notifications").insert({
    user_id: userId,
    notification_type: type || "message",
    title: subject,
    message: body,
    entity_type: "application",
    entity_id: applicationId || null,
    is_read: false,
  });
  if (error) {
    const err = new Error(
      /row-level security/i.test(error.message || "")
        ? "Message is blocked by RLS. Run supabase/notifications.sql in the Supabase SQL editor, then try again."
        : error.message,
    );
    err.status = /row-level security/i.test(error.message || "") ? 403 : 400;
    throw err;
  }
}

async function loadMessageContext(db, applicationId) {
  const { data: app, error } = await db
    .from("applications")
    .select(
      "id, candidate_id, job_id, jobs(id, title, company_id, location, companies(name)), candidates(id, user_id, first_name, last_name, email)",
    )
    .eq("id", applicationId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!app) return null;
  const job = unwrap(app.jobs) || {};
  const cand = unwrap(app.candidates) || {};
  const name = [cand.first_name, cand.last_name].filter(Boolean).join(" ").trim();
  let email = cand.email || null;
  if (!email && cand.user_id) {
    const { data: user } = await db
      .from("users")
      .select("email")
      .eq("id", cand.user_id)
      .maybeSingle();
    email = user?.email || null;
  }
  return {
    app,
    job,
    cand,
    email,
    vars: {
      name: name || "there",
      job: job.title || "the role",
      company: unwrap(job.companies)?.name || "Company",
      location: job.location || "TBD",
      round: "interview",
      ctc: "as discussed",
      joining_date: "TBD",
    },
  };
}

async function sendCandidateMessage(db, {
  applicationId,
  companyId,
  sentBy,
  templateKey,
  subject,
  body,
  candidateUserId,
  candidateEmail,
}) {
  let messageId = null;
  const row = {
    application_id: applicationId,
    company_id: companyId,
    sent_by: sentBy || null,
    template_key: templateKey || null,
    subject,
    body,
    email_sent: false,
  };
  const inserted = await db
    .from("application_messages")
    .insert(row)
    .select("id")
    .maybeSingle();
  if (
    inserted.error &&
    !/application_messages|does not exist|schema cache|relation/i.test(
      inserted.error.message || "",
    )
  ) {
    const err = new Error(inserted.error.message);
    err.status = 400;
    throw err;
  }
  messageId = inserted.data?.id || null;

  await sendCandidateInbox(db, {
    userId: candidateUserId,
    subject,
    body,
    applicationId,
    type: templateKey === "offer_ctc" ? "offer" : "message",
  });

  let emailSent = false;
  if (process.env.RESEND_API_KEY && candidateEmail) {
    try {
      await sendResendEmail({
        to: candidateEmail,
        subject,
        text: body,
        html: `<pre style="font-family:inherit;white-space:pre-wrap">${escapeHtml(body)}</pre>`,
      });
      emailSent = true;
      if (messageId) {
        await db
          .from("application_messages")
          .update({ email_sent: true })
          .eq("id", messageId);
      }
    } catch {
      emailSent = false;
    }
  }

  return { inbox: true, email: emailSent, id: messageId };
}

module.exports = {
  TEMPLATES,
  fillTemplate,
  messageTemplate,
  sendCandidateInbox,
  sendCandidateMessage,
  loadMessageContext,
};
