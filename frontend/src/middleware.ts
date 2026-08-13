import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** If auth returns to /?code=..., send it to the callback route. */
export function middleware(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code) return NextResponse.next();
  if (request.nextUrl.pathname !== "/") return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = "/auth/callback";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/"],
};
