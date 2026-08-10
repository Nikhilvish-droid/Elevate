import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { homeFor, type Profile } from "@/lib/user";

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
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/auth?tab=login&error=auth`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_complete, role, team_role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.onboarding_complete && profile.role) {
    return NextResponse.redirect(
      `${origin}${homeFor(profile as Pick<Profile, "role" | "team_role">)}`,
    );
  }

  return NextResponse.redirect(`${origin}${next}`);
}
