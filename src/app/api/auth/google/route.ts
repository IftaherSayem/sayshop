import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/auth/callback/google`;

  if (!CLIENT_ID) {
    return NextResponse.json({ error: "Missing GOOGLE_CLIENT_ID in environment variables" }, { status: 500 });
  }

  const scopes = [
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile"
  ].join(" ");

  // Generate Google OAuth URL
  const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  googleAuthUrl.searchParams.append("client_id", CLIENT_ID);
  googleAuthUrl.searchParams.append("redirect_uri", REDIRECT_URI);
  googleAuthUrl.searchParams.append("response_type", "code");
  googleAuthUrl.searchParams.append("scope", scopes);
  googleAuthUrl.searchParams.append("access_type", "offline");
  googleAuthUrl.searchParams.append("prompt", "consent");

  return NextResponse.redirect(googleAuthUrl.toString());
}
