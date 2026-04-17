import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSession, getSessionCookieOptions, SESSION_COOKIE_NAME } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=Google_Callback_Failed", req.url));
  }

  const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
  const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/auth/callback/google`;

  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error("[Google OAuth] Missing credentials.");
    return NextResponse.redirect(new URL("/login?error=Server_Configuration_Error", req.url));
  }

  try {
    // 1. Exchange code for token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
        redirect_uri: REDIRECT_URI,
      }),
    });

    if (!tokenRes.ok) {
      console.error("[Google OAuth] Failed to exchange token.", await tokenRes.text());
      return NextResponse.redirect(new URL("/login?error=Google_Token_Error", req.url));
    }

    const { access_token } = await tokenRes.json();

    // 2. Fetch User info
    const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!userRes.ok) {
      console.error("[Google OAuth] Failed to fetch user info.", await userRes.text());
      return NextResponse.redirect(new URL("/login?error=Google_User_Info_Error", req.url));
    }

    const googleUser = await userRes.json();
    const { id: googleId, email, name, picture } = googleUser;

    const supabase = await createSupabaseServerClient();

    // 3. Check if user exists
    let { data: user } = await supabase
      .from('users')
      .select('id, email, is_blocked, role_id')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (user && user.is_blocked) {
      return NextResponse.redirect(new URL("/login?error=Account_Blocked", req.url));
    }

    if (!user) {
      // Create new user
      const { data: roleData } = await supabase.from('roles').select('id').eq('name', 'customer').single();
      
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          email: email.toLowerCase(),
          role_id: roleData?.id,
          is_verified: true, // Google verifies emails
          auth_provider: 'google',
          oauth_id: googleId
        })
        .select()
        .single();
        
      if (createError || !newUser) {
        console.error("[Google OAuth] Failed to create user:", createError);
        return NextResponse.redirect(new URL("/login?error=Database_Error", req.url));
      }
      user = newUser;

      // Create profile
      await supabase.from('profiles').insert({
        user_id: user!.id,
        full_name: name,
        avatar: picture
      });
    } else {
       // Update oauth tracking if they previously existed but are logging in with Google now
       await supabase.from('users').update({ oauth_id: googleId }).eq('id', user!.id);
    }

    // 4. Create Custom Session Token
    // We update last_login
    await supabase.from('users').update({ last_login: new Date().toISOString() }).eq('id', user!.id);

    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('x-real-ip') || 'unknown';
    const token = await createSession(user!.id, clientIp, req.headers.get('user-agent') || undefined);

    // 5. Construct cookie response
    const cookieOpts = getSessionCookieOptions();
    // Assuming standard login redirects to /
    const response = NextResponse.redirect(new URL("/", req.url));
    
    // Auth-page expects standard Next.js / store interactions. By setting the cookie,
    // the layout's generic authentication checking will hydrate the store.
    response.cookies.set(cookieOpts.name, token, {
      httpOnly: cookieOpts.httpOnly,
      secure: cookieOpts.secure,
      sameSite: cookieOpts.sameSite,
      path: cookieOpts.path,
      maxAge: cookieOpts.maxAge,
    });

    return response;

  } catch (err) {
    console.error("[Google OAuth Error]", err);
    return NextResponse.redirect(new URL("/login?error=Internal_Error", req.url));
  }
}
