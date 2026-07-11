import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ALLOWED_LOGIN_EMAIL } from "@/lib/auth";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const returnTo = searchParams.get("returnTo") || "/";
  const safeReturnTo = returnTo.startsWith("/") ? returnTo : "/";

  // Bypass: skip Google entirely and log in as the fixed test account, in every environment.
  const cookieValue = Buffer.from(
    JSON.stringify({ name: "테스트 계정", email: ALLOWED_LOGIN_EMAIL })
  ).toString("base64");
  const response = NextResponse.redirect(`${origin}${safeReturnTo}`);
  const cookieStore = await cookies();
  cookieStore.set({
    name: "authUser",
    value: cookieValue,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}
