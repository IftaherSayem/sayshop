import { NextRequest, NextResponse } from 'next/server'
import { validateSession, SESSION_COOKIE_NAME } from '@/lib/auth'

// ───────────────────────────────────────────────────────────
// GET /api/auth/me
// ───────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)

    if (!sessionCookie?.value) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const sessionUser = await validateSession(sessionCookie.value)

    if (!sessionUser) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      user: {
        id: sessionUser.id,
        email: sessionUser.email,
        name: sessionUser.profile?.fullName || sessionUser.email,
        role: sessionUser.roleName.toUpperCase(),
        phone: sessionUser.profile?.phone || null,
        avatar: sessionUser.profile?.avatar || null,
      },
    })
  } catch (err) {
    console.error('[me] Unexpected error:', err)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}
