function googleMeetConfigured() {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_REFRESH_TOKEN,
  );
}

async function getAccessToken() {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.access_token) {
    const err = new Error(
      body.error_description ||
        body.error ||
        "Could not refresh Google access token. Re-run node scripts/google-meet-auth.js",
    );
    err.status = 502;
    throw err;
  }
  return body.access_token;
}

function meetLinkFromEvent(event) {
  if (event?.hangoutLink) return String(event.hangoutLink);
  const entries = event?.conferenceData?.entryPoints || [];
  const video = entries.find((e) => e.entryPointType === "video" && e.uri);
  return video?.uri ? String(video.uri) : null;
}

function addMinutesIso(startIso, minutes) {
  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) {
    const err = new Error("Invalid interview date/time.");
    err.status = 400;
    throw err;
  }
  const duration = Number(minutes) > 0 ? Number(minutes) : 60;
  return {
    start,
    end: new Date(start.getTime() + duration * 60 * 1000),
  };
}

async function createGoogleMeet({
  summary,
  description,
  startIso,
  durationMinutes,
}) {
  if (!googleMeetConfigured()) {
    const err = new Error(
      "Google Meet is not configured. Add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN to backend/.env",
    );
    err.status = 503;
    throw err;
  }

  const accessToken = await getAccessToken();
  const calendarId = encodeURIComponent(
    process.env.GOOGLE_CALENDAR_ID || "primary",
  );
  const timezone = process.env.GOOGLE_CALENDAR_TIMEZONE || "Asia/Kolkata";
  const { start, end } = addMinutesIso(startIso, durationMinutes);

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?conferenceDataVersion=1&sendUpdates=none`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary,
        description: description || undefined,
        start: { dateTime: start.toISOString(), timeZone: timezone },
        end: { dateTime: end.toISOString(), timeZone: timezone },
        conferenceData: {
          createRequest: {
            requestId: `elevate-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
      }),
    },
  );

  const event = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(
      event.error?.message || "Google Calendar could not create a Meet link.",
    );
    err.status = 502;
    throw err;
  }

  const meetingLink = meetLinkFromEvent(event);
  if (!meetingLink) {
    const err = new Error(
      "Google created the calendar event but did not return a Meet link. Enable Google Meet on this account.",
    );
    err.status = 502;
    throw err;
  }

  return { meetingLink, eventId: event.id || null };
}

module.exports = { googleMeetConfigured, createGoogleMeet };
