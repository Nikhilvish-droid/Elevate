# How to get a public Elevate link (Docker)

You do **not** need to understand Docker internals. Follow one path:

| Goal | Time | Link lasts? |
|---|---|---|
| **A. Quick demo** (Cloudflare tunnel) | ~15 min | Until you close the terminal |
| **B. Submission / judges** (Render) | ~30 min | Stays up (free tier may sleep) |

Postgres/Auth stay on **Supabase**. Docker only runs the website + API.

---

## Before either path

### 1. Install Docker Desktop (Windows)

1. Download: https://www.docker.com/products/docker-desktop/
2. Install, restart the PC if asked.
3. Open **Docker Desktop** and wait until it says **Engine running**.
4. In PowerShell:

```powershell
docker --version
docker compose version
```

Both should print a version. If not, Docker Desktop is not running yet.

### 2. Fill env files

In the project folder (`Elevate`):

**A. Backend secrets**

```powershell
copy backend\.env.example backend\.env
```

Edit `backend\.env` in Notepad. You must set:

```env
PORT=5000
FRONTEND_ORIGIN=http://localhost:3000
SUPABASE_URL=https://YOUR-PROJECT.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GROQ_API_KEY=your_groq_key
```

(Optional) `RESEND_API_KEY` / `RESEND_FROM` for real emails.

**B. Root file for Docker build**

```powershell
copy .env.example .env
```

Edit `.env` — same Supabase URL + anon key as backend:

```env
FRONTEND_ORIGIN=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

**C. SQL** — if you have not already, run the scripts in `supabase/` in the Supabase SQL editor (see root `README.md`).

### 3. Prove it works on your PC

In PowerShell, from the `Elevate` folder:

```powershell
docker compose up --build
```

First build can take 5–10 minutes. When it settles, open:

- http://localhost:3000

If the landing page loads, Docker is working. Keep this terminal open for Path A.

Stop later with `Ctrl+C`, then `docker compose down`.

---

## Path A — Quick public link (Cloudflare tunnel)

Use this so a friend / teammate can open Elevate **right now**. The URL dies when you close the tunnel.

### 1. Install cloudflared

```powershell
winget install Cloudflare.cloudflared
```

Close and reopen PowerShell after install.

### 2. Start Docker (if not already running)

```powershell
cd "C:\Users\vishw\Desktop\nikhil things\Elevate"
docker compose up
```

### 3. Open a **second** PowerShell window

```powershell
cloudflared tunnel --url http://localhost:3000
```

You will see a line like:

```text
https://random-words-1234.trycloudflare.com
```

**That is your live link.** Anyone on the internet can open it while this window stays open.

### 4. Allow login on that URL (important)

In [Supabase Dashboard](https://supabase.com/dashboard) → your project → **Authentication** → **URL Configuration**:

1. **Site URL** = your `https://….trycloudflare.com`
2. **Redirect URLs** add:
   - `https://….trycloudflare.com/**`
   - `https://….trycloudflare.com/auth/callback`

Save. Without this, Google / email login will bounce back to localhost.

Optional: in `backend\.env` set `FRONTEND_ORIGIN=https://….trycloudflare.com`, then restart:

```powershell
docker compose up
```

(The tunnel URL changes every time you restart cloudflared, so you must update Supabase again.)

---

## Path B — Lasting link on Render (best for README / judges)

Render hosts your Docker images and gives a stable `https://….onrender.com` URL.

### 1. Put the code on GitHub

1. Create a repo on GitHub (public is fine for a hackathon).
2. From the Elevate folder:

```powershell
git add .
git commit -m "Deploy Elevate with Docker"
git branch -M main
git remote add origin https://github.com/YOUR_USER/YOUR_REPO.git
git push -u origin main
```

(Skip `remote add` if origin already exists; just `git push`.)

### 2. Create a Render account

Go to https://render.com → Sign up with GitHub → authorize the repo.

### 3. Deploy the **API** first

1. Dashboard → **New** → **Web Service**
2. Connect your Elevate repo
3. Settings:
   - **Name:** `elevate-api`
   - **Root directory:** `backend`
   - **Runtime:** Docker
   - **Dockerfile path:** `Dockerfile`
   - **Instance:** Free
4. Environment variables (same as `backend/.env`):

| Key | Value |
|---|---|
| `PORT` | `5000` |
| `FRONTEND_ORIGIN` | `https://elevate-web.onrender.com` (you will fix this after step 4) |
| `SUPABASE_URL` | your Supabase URL |
| `SUPABASE_ANON_KEY` | anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | service role |
| `GROQ_API_KEY` | Groq key |
| `RESEND_API_KEY` | optional |
| `RESEND_FROM` | optional |

5. Create Web Service. Wait until it is **Live**.
6. Copy the URL, e.g. `https://elevate-api-xxxx.onrender.com`
7. Open `https://elevate-api-xxxx.onrender.com/health` — you should see `{ "ok": true, ... }`.

### 4. Deploy the **website**

1. **New** → **Web Service** again (same repo)
2. Settings:
   - **Name:** `elevate-web`
   - **Root directory:** `frontend`
   - **Runtime:** Docker
   - **Dockerfile path:** `Dockerfile`
   - **Instance:** Free
3. **Docker build args** (Render → Environment → “Docker Build Args” / or add as build-time env):

| Key | Value |
|---|---|
| `API_INTERNAL_URL` | `https://elevate-api-xxxx.onrender.com` (the API URL from step 3) |
| `NEXT_PUBLIC_API_URL` | *(leave empty)* |
| `NEXT_PUBLIC_SUPABASE_URL` | same as backend |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | same anon key |

4. Create. Wait until **Live**.
5. Copy the web URL, e.g. `https://elevate-web-xxxx.onrender.com`

**This web URL is what you paste in the README as the live deployment link.**

### 5. Wire CORS + Auth

1. On **elevate-api** → Environment → set  
   `FRONTEND_ORIGIN=https://elevate-web-xxxx.onrender.com`  
   → Save (it redeploys).
2. Supabase → Authentication → URL Configuration:
   - Site URL = `https://elevate-web-xxxx.onrender.com`
   - Redirect URLs add `https://elevate-web-xxxx.onrender.com/**` and `…/auth/callback`
3. If you use Google login: Google Cloud Console → OAuth client → Authorized JavaScript origins + redirect URIs for that Render URL (and keep the Supabase callback `https://YOUR-PROJECT.supabase.co/auth/v1/callback`).

### 6. Free-tier note

Render free services **spin down after ~15 minutes idle**. The first visit after that can take 30–60 seconds. That is normal. For a demo, open the site once before judges arrive.

---

## What to put in README.md

```md
## Live deployment

- Web app: https://elevate-web-xxxx.onrender.com
- API health: https://elevate-api-xxxx.onrender.com/health
```

---

## Common problems

| What you see | Fix |
|---|---|
| `docker compose` not found | Start Docker Desktop; use `docker compose` (space), not `docker-compose` |
| Build fails on missing Supabase env | Root `.env` must have `NEXT_PUBLIC_SUPABASE_URL` and `_ANON_KEY` |
| Site loads but login fails | Add the public URL to Supabase redirect URLs |
| API `/health` works, site cannot save data | `SUPABASE_SERVICE_ROLE_KEY` missing, or SQL scripts not run |
| Render 404 on frontend | Root directory must be `frontend`, Dockerfile path `Dockerfile` |
| Tunnel works for you, not for friends | Your PC must stay on; both `docker compose` and `cloudflared` windows must stay open |
