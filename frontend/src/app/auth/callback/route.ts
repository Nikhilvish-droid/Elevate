import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { apiWithToken } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";
import { afterAuthPath, type AppUser } from "@/lib/user";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/onboarding";

  const supabase = await createClient();

  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  } else if (tokenHash && type) {
    await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    return NextResponse.redirect(`${origin}/auth?tab=login&confirmed=1`);
  }

  const destination = next.startsWith("/") ? next : "/onboarding";

  // Password recovery must land on the reset form, not a dashboard.
  if (destination === "/auth/reset" || destination.startsWith("/auth/reset?")) {
    return NextResponse.redirect(`${origin}${destination}`);
  }

  try {
    const profile = await apiWithToken<AppUser>(
      session.access_token,
      "/api/auth/sync",
      { method: "POST" },
    );
    return NextResponse.redirect(`${origin}${afterAuthPath(profile, destination)}`);
  } catch {
    return NextResponse.redirect(`${origin}${destination}`);
  }
}
