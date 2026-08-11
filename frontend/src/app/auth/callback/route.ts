import { NextResponse } from "next/server";
import { apiWithToken } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";
import { homeFor, type AppUser } from "@/lib/user";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/onboarding";

  if (!code) {
    return NextResponse.redirect(`${origin}/auth?tab=login&error=auth`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/auth?tab=login&error=auth`);
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    return NextResponse.redirect(`${origin}/auth?tab=login&error=auth`);
  }

  try {
    const profile = await apiWithToken<AppUser>(
      session.access_token,
      "/api/auth/sync",
      { method: "POST" },
    );

    if (profile.onboarding_complete) {
      return NextResponse.redirect(`${origin}${homeFor(profile)}`);
    }
  } catch {
    // Backend down or RLS — still land on onboarding with a valid session.
  }

  return NextResponse.redirect(`${origin}${next}`);
}
