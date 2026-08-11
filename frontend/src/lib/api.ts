import { authFetch } from "@/lib/auth/jwt";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

async function parse<T>(res: Response): Promise<T> {
  const data = (await res.json().catch(() => ({}))) as { error?: string } & T;
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data as T;
}

/** Browser: attaches the Supabase JWT automatically. */
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  return parse<T>(await authFetch(`${API_URL}${path}`, init));
}

/** Public routes that do not need a JWT. */
export async function apiPublic<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, init);
  return parse<T>(res);
}

/** Server routes (OAuth callback) that already have an access token. */
export async function apiWithToken<T>(
  token: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers as Record<string, string> | undefined),
    },
  });
  return parse<T>(res);
}
