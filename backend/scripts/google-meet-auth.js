/**
 * One-time Google OAuth to get a refresh token for auto Meet links.
 *
 * Usage (from backend/):
 *   1. Put GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET in .env
 *   2. node scripts/google-meet-auth.js
 *   3. Sign in with the Google account that should host interviews
 *   4. Paste GOOGLE_REFRESH_TOKEN into backend/.env
 *
 * In Google Cloud Console, create an OAuth client (Desktop or Web) and add:
 *   http://127.0.0.1:53682/oauth2callback
 * Enable the Google Calendar API on that project.
 */
require("dotenv").config();
const http = require("http");
const { exec } = require("child_process");

const PORT = 53682;
const REDIRECT_URI = `http://127.0.0.1:${PORT}/oauth2callback`;
const SCOPE = "https://www.googleapis.com/auth/calendar.events";

function openBrowser(url) {
  const cmd =
    process.platform === "win32"
      ? `start "" "${url}"`
      : process.platform === "darwin"
        ? `open "${url}"`
        : `xdg-open "${url}"`;
  exec(cmd, () => {});
}

async function exchangeCode(code) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      body.error_description || body.error || "Token exchange failed.",
    );
  }
  return body;
}

async function main() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in backend/.env first.",
    );
  }

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", SCOPE);
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url || "/", `http://127.0.0.1:${PORT}`);
      if (url.pathname !== "/oauth2callback") {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      const errParam = url.searchParams.get("error");
      if (errParam) throw new Error(errParam);
      const code = url.searchParams.get("code");
      if (!code) throw new Error("Missing OAuth code.");

      const tokens = await exchangeCode(code);
      res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
      res.end(
        tokens.refresh_token
          ? "Google Meet connected. You can close this tab and return to the terminal."
          : "Google signed in, but no refresh_token was returned. Revoke access and run the script again with prompt=consent.",
      );

      console.log("\nAdd this to backend/.env:\n");
      if (tokens.refresh_token) {
        console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}\n`);
      } else {
        console.log(
          "No refresh_token. In Google Account → Security → Third-party access, remove this app and retry.\n",
        );
      }
    } catch (err) {
      res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
      res.end(err instanceof Error ? err.message : "OAuth failed");
      console.error(err instanceof Error ? err.message : err);
    } finally {
      server.close();
    }
  });

  await new Promise((resolve, reject) => {
    server.listen(PORT, "127.0.0.1", resolve);
    server.on("error", reject);
  });

  console.log("Open this URL if the browser does not launch:\n");
  console.log(`${authUrl.toString()}\n`);
  openBrowser(authUrl.toString());
  console.log(`Waiting for Google OAuth on ${REDIRECT_URI} …`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
