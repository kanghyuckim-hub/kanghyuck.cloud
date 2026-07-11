import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { OAuth2Client } from "google-auth-library";
import { getDbPool } from "@/lib/db";
import { ALLOWED_LOGIN_EMAIL } from "@/lib/auth";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const oauthError = searchParams.get("error");
  const returnTo = searchParams.get("state") || "/";
  const safeReturnTo = returnTo.startsWith("/") ? returnTo : "/";

  if (oauthError) {
    return NextResponse.redirect(`${origin}/?authError=${oauthError}`);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${origin}/?authError=google_config_missing`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/?authError=missing_code`);
  }

  const redirectUri = `${origin}/api/auth/google/callback`;
  const oauthClient = new OAuth2Client({ clientId, clientSecret, redirectUri });

  try {
    const { tokens } = await oauthClient.getToken(code);
    if (!tokens.id_token) {
      throw new Error("No id_token returned from Google");
    }

    const ticket = await oauthClient.verifyIdToken({ idToken: tokens.id_token, audience: clientId });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email) {
      throw new Error("Invalid Google ID token payload");
    }

    if (payload.email !== ALLOWED_LOGIN_EMAIL) {
      return NextResponse.redirect(`${origin}/?authError=email_not_allowed`);
    }

    try {
      const pool = getDbPool();
      await pool.query(
        `insert into users (google_sub, email, email_verified, name, given_name, family_name, picture, locale, last_login_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8, now())
         on conflict (google_sub) do update set
           email = excluded.email,
           email_verified = excluded.email_verified,
           name = excluded.name,
           given_name = excluded.given_name,
           family_name = excluded.family_name,
           picture = excluded.picture,
           locale = excluded.locale,
           last_login_at = now()`,
        [
          payload.sub,
          payload.email,
          payload.email_verified ?? false,
          payload.name ?? null,
          payload.given_name ?? null,
          payload.family_name ?? null,
          payload.picture ?? null,
          payload.locale ?? null,
        ]
      );
    } catch (dbError) {
      console.error("Google OAuth callback: failed to persist user (continuing login):", dbError);
    }

    const cookieValue = Buffer.from(
      JSON.stringify({
        name: payload.name,
        email: payload.email,
        picture: payload.picture,
      })
    ).toString("base64");

    const response = NextResponse.redirect(`${origin}${safeReturnTo}`);
    const cookiesStore = await cookies();
    cookiesStore.set({
      name: "authUser",
      value: cookieValue,
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    return response;
  } catch (error) {
    console.error("Google OAuth callback error:", error);
    return NextResponse.redirect(`${origin}/?authError=oauth_failed`);
  }
}
