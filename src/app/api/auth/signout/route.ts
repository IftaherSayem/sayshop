import { NextRequest, NextResponse } from 'next/server'
import { destroySession, getSessionCookieOptions, SESSION_COOKIE_NAME } from '@/lib/auth'

// ───────────────────────────────────────────────────────────
// POST /api/auth/signout
// ───────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)

    // Destroy session in DB if token exists
    if (sessionCookie?.value) {
      await destroySession(sessionCookie.value)
    }

    // Clear cookie by setting maxAge to 0
    const cookieOpts = getSessionCookieOptions()
    const response = NextResponse.json({ message: 'Signed out successfully' })

    response.cookies.set(cookieOpts.name, '', {
      httpOnly: cookieOpts.httpOnly,
      secure: cookieOpts.secure,
      sameSite: cookieOpts.sameSite,
      path: cookieOpts.path,
      maxAge: 0,
    })

    return response
  } catch (err) {
    console.error('[signout] Unexpected error:', err)
    return NextResponse.json(
      { error: 'Failed to sign out' },
      { status: 500 }
    )
  }
}
