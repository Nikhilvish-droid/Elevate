import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { homeFor, teamFromRoleName, type AppUser } from "@/lib/user";

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

  // Ensure public.users row exists after Google/email auth
  const name =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split("@")[0] ||
    "User";

  await supabase.from("users").upsert(
    {
      id: user.id,
      full_name: name,
      email: user.email!,
      last_login_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  const { data: roleRows } = await supabase
    .from("user_roles")
    .select("roles(name)")
    .eq("user_id", user.id);

  const roleNames =
    roleRows
      ?.map((r) => {
        const roles = r.roles as { name?: string } | { name?: string }[] | null;
        if (Array.isArray(roles)) return roles[0]?.name;
        return roles?.name;
      })
      .filter(Boolean) ?? [];

  if (roleNames.includes("candidate")) {
    return NextResponse.redirect(`${origin}/candidate`);
  }

  const team = teamFromRoleName(
    roleNames.find((n) =>
      ["recruiter", "hiring_manager", "interviewer"].includes(n as string),
    ) as string | undefined,
  );

  if (team) {
    const profile = {
      role: "company" as const,
      team_role: team,
    } satisfies Pick<AppUser, "role" | "team_role">;
    return NextResponse.redirect(`${origin}${homeFor(profile)}`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
