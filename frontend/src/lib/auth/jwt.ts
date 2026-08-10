import { createClient } from "@/lib/supabase/client";

export type AuthTokens = {
  access_token: string;
  refresh_token: string;
  expires_at: number | null;
  token_type: string;
};

/** Supabase issues a JWT as `access_token` on login. */
export async function getAccessToken(): Promise<string | null> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) return null;
  return data.session.access_token;
}

export async function getAuthTokens(): Promise<AuthTokens | null> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) return null;

  return {
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_at: data.session.expires_at ?? null,
    token_type: data.session.token_type,
  };
}

/** Use for authenticated API calls: Authorization: Bearer <jwt> */
export async function authHeaders(
  extra?: HeadersInit,
): Promise<Record<string, string>> {
  const token = await getAccessToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(extra as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export async function authFetch(input: RequestInfo | URL, init?: RequestInit) {
  const headers = await authHeaders(init?.headers);
  return fetch(input, { ...init, headers });
}
