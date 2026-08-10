import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Returns the current session JWT (access_token) if logged in.
 * Used by the app to verify auth; protect dashboards with this session.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    access_token: session.access_token,
    expires_at: session.expires_at,
    token_type: session.token_type,
    user: {
      id: user.id,
      email: user.email,
    },
  });
}
