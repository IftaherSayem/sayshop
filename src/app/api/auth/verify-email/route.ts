import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  createSession,
  getSessionCookieOptions,
} from '@/lib/auth'

// ───────────────────────────────────────────────────────────
// POST /api/auth/verify-email
// ───────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    if (!code || typeof code !== 'string') {
      return NextResponse.json(
        { error: 'Verification code is required' },
        { status: 400 }
      )
    }

    const supabase = await createSupabaseServerClient()

    // ── Find user by email ──────────────────────────────────
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, verification_code, verification_code_expires_at, role_id, is_blocked')
      .eq('email', email.toLowerCase())
      .is('deleted_at', null)
      .maybeSingle()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Invalid or expired verification code' },
        { status: 400 }
      )
    }

    // ── Verify code matches and hasn't expired ──────────────
    if (!user.verification_code || user.verification_code !== code) {
      return NextResponse.json(
        { error: 'Invalid or expired verification code' },
        { status: 400 }
      )
    }

    const now = new Date()
    if (
      !user.verification_code_expires_at ||
      new Date(user.verification_code_expires_at) <= now
    ) {
      return NextResponse.json(
        { error: 'Invalid or expired verification code' },
        { status: 400 }
      )
    }

    // ── Mark user as verified, clear verification fields ────
    const { error: updateError } = await supabase
      .from('users')
      .update({
        is_verified: true,
        verification_code: null,
        verification_code_expires_at: null,
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('[verify-email] Failed to verify email:', updateError)
      return NextResponse.json(
        { error: 'Failed to verify email. Please try again.' },
        { status: 500 }
      )
    }

    // ── Fetch profile for name ──────────────────────────────
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', user.id)
      .maybeSingle()

    // ── Fetch role name ─────────────────────────────────────
    const { data: roleData } = await supabase
      .from('roles')
      .select('name')
      .eq('id', user.role_id)
      .maybeSingle()

    const roleName = roleData?.name ?? 'customer'

    // ── Create session ──────────────────────────────────────
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0].trim()
      || request.headers.get('x-real-ip')?.trim()
      || 'unknown'
    const userAgent = request.headers.get('user-agent') || undefined

    const token = await createSession(user.id, clientIp, userAgent)

    // ── Build response with session cookie ──────────────────
    const userResponse = {
      id: user.id,
      email: user.email,
      name: profile?.full_name || user.email,
      role: roleName.toUpperCase(),
    }

    const cookieOpts = getSessionCookieOptions()
    const response = NextResponse.json({ user: userResponse })

    response.cookies.set(cookieOpts.name, token, {
      httpOnly: cookieOpts.httpOnly,
      secure: cookieOpts.secure,
      sameSite: cookieOpts.sameSite,
      path: cookieOpts.path,
      maxAge: cookieOpts.maxAge,
    })

    return response
  } catch (err) {
    console.error('[verify-email] Unexpected error:', err)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
