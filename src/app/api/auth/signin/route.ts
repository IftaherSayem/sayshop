import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  verifyPassword,
  createSession,
  destroySession,
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
} from '@/lib/auth'

// ───────────────────────────────────────────────────────────
// Brute-force protection: in-memory tracking
// ───────────────────────────────────────────────────────────

interface FailedAttempt {
  count: number
  firstAttemptAt: number
  lockedUntil: number | null
}

const MAX_FAILED_ATTEMPTS = 5
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000 // 15 minutes
const failedAttempts = new Map<string, FailedAttempt>()

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp.trim()
  return 'unknown'
}

function isRateLimited(email: string): { limited: boolean; retryAfterSeconds: number } {
  const record = failedAttempts.get(email)
  if (!record) return { limited: false, retryAfterSeconds: 0 }

  const now = Date.now()

  if (record.lockedUntil && record.lockedUntil > now) {
    const retryAfter = Math.ceil((record.lockedUntil - now) / 1000)
    return { limited: true, retryAfterSeconds: retryAfter }
  }

  if (now - record.firstAttemptAt > LOCKOUT_WINDOW_MS) {
    failedAttempts.delete(email)
    return { limited: false, retryAfterSeconds: 0 }
  }

  return { limited: false, retryAfterSeconds: 0 }
}

function recordFailedAttempt(email: string): void {
  const now = Date.now()
  const existing = failedAttempts.get(email)

  if (!existing || now - existing.firstAttemptAt > LOCKOUT_WINDOW_MS) {
    failedAttempts.set(email, {
      count: 1,
      firstAttemptAt: now,
      lockedUntil: null,
    })
  } else {
    existing.count += 1
    if (existing.count >= MAX_FAILED_ATTEMPTS) {
      existing.lockedUntil = now + LOCKOUT_WINDOW_MS
      console.warn(
        `[BRUTE FORCE] Account "${email}" locked for ${LOCKOUT_WINDOW_MS / 1000}s due to ${existing.count} failed attempts`
      )
    }
  }
}

function clearFailedAttempts(email: string): void {
  failedAttempts.delete(email)
}

// ───────────────────────────────────────────────────────────
// POST /api/auth/signin
// ───────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // ── Brute-force check ───────────────────────────────────
    const rateLimit = isRateLimited(email)
    if (rateLimit.limited) {
      return NextResponse.json(
        {
          error: `Too many failed login attempts. Please try again in ${rateLimit.retryAfterSeconds} seconds.`,
          retryAfter: rateLimit.retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            'Retry-After': rateLimit.retryAfterSeconds.toString(),
          },
        }
      )
    }

    const supabase = await createSupabaseServerClient()

    // ── Find user by email ──────────────────────────────────
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, password_hash, is_blocked, is_verified, deleted_at')
      .eq('email', email.toLowerCase())
      .maybeSingle()

    if (userError || !user || user.deleted_at !== null) {
      // Don't reveal whether the email exists
      recordFailedAttempt(email)
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    if (user.is_blocked) {
      recordFailedAttempt(email)
      return NextResponse.json(
        { error: 'This account has been blocked. Please contact support.' },
        { status: 403 }
      )
    }

    // ── Verify password ─────────────────────────────────────
    const isValid = await verifyPassword(password, user.password_hash)
    if (!isValid) {
      recordFailedAttempt(email)
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // ── Check email verification ────────────────────────────
    if (!user.is_verified) {
      return NextResponse.json(
        {
          error: 'Please verify your email first. A verification code was sent to your email.',
          requiresVerification: true,
          email: user.email,
        },
        { status: 403 }
      )
    }

    // Clear failed attempts on success
    clearFailedAttempts(email)

    // ── Update last_login ───────────────────────────────────
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id)

    // ── Destroy old session if cookie present ───────────────
    const oldSessionCookie = request.cookies.get(SESSION_COOKIE_NAME)
    if (oldSessionCookie?.value) {
      await destroySession(oldSessionCookie.value)
    }

    // ── Create new session ──────────────────────────────────
    const clientIp = getClientIp(request)
    const userAgent = request.headers.get('user-agent') || undefined
    const token = await createSession(user.id, clientIp, userAgent)

    // ── Fetch profile for name ──────────────────────────────
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, phone')
      .eq('user_id', user.id)
      .maybeSingle()

    // ── Fetch role name ─────────────────────────────────────
    const { data: roleData } = await supabase
      .from('roles')
      .select('name')
      .eq('id', user.role_id)
      .maybeSingle()

    const roleName = roleData?.name ?? 'customer'

    const userResponse = {
      id: user.id,
      email: user.email,
      name: profile?.full_name || user.email,
      role: roleName.toUpperCase(),
      phone: profile?.phone || null,
    }

    // ── Log admin login ─────────────────────────────────────
    if (roleName === 'admin') {
      console.log(
        `[ADMIN LOGIN] User "${user.email}" logged in from IP: ${clientIp}`
      )
    }

    // ── Set session cookie ──────────────────────────────────
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
    console.error('[signin] Unexpected error:', err)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
