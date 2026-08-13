export type MessageKind =
  | "shortlisted"
  | "round_advance"
  | "rejected"
  | "approved"
  | "offer_ctc";

export type MessageVars = {
  name?: string;
  job?: string;
  company?: string;
  round?: string;
  ctc?: string;
  location?: string;
  joining_date?: string;
};

const TEMPLATES: Record<MessageKind, { subject: string; body: string }> = {
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
};

function fill(text: string, vars: MessageVars) {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key: keyof MessageVars) => {
    const value = vars[key];
    return value == null || value === "" ? "—" : String(value);
  });
}

export function draftCandidateMessage(kind: MessageKind, vars: MessageVars) {
  const tpl = TEMPLATES[kind];
  return {
    subject: fill(tpl.subject, vars),
    body: fill(tpl.body, vars),
  };
}

export function maskCtcInMessage(text: string) {
  return String(text || "")
    .replace(/CTC\s*:\s*.+/gi, "CTC: (hidden)")
    .replace(/₹[\d,.]+\s*L?/gi, "₹—");
}

export function formatCtcLabel(value: string | number | null | undefined) {
  if (value == null || value === "") return "as discussed";
  const n = Number(String(value).replace(/[^\d.]/g, ""));
  if (!Number.isFinite(n) || n <= 0) return String(value);
  if (n >= 100000) {
    const lakh = n / 100000;
    return `₹${lakh.toFixed(lakh % 1 === 0 ? 0 : 1)}L`;
  }
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}
