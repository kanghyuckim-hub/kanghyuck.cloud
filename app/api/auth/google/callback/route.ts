import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;
  // Preserve query string (code, state, etc.) and forward to existing callback handler
  return NextResponse.redirect(`${origin}/api/auth/callback${url.search}`);
}
