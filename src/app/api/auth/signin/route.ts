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
      .select('id, email, password_hash, role_id, is_blocked, is_verified, deleted_at')
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

    // ── Check email verification (Original Signup Gate) ──────
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

    // ── Check if 2FA is enabled in profile settings ─────────
    const { data: profile } = await supabase
      .from('profiles')
      .select('address')
      .eq('user_id', user.id)
      .maybeSingle();

    const settings = (profile?.address as any)?.settings || {};
    const is2FAEnabled = settings.twoFactorEnabled === true;

    if (!is2FAEnabled) {
      console.log(`[signin] 2FA is disabled for ${user.email}. Logging in directly.`);
      
      const { createSession, getSessionCookieOptions } = await import('@/lib/auth');
      const token = await createSession(
        user.id,
        request.headers.get('x-forwarded-for') || undefined,
        request.headers.get('user-agent') || undefined
      );

      const response = NextResponse.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
        },
        requires2FA: false
      });

      const cookieOptions = getSessionCookieOptions();
      response.cookies.set(cookieOptions.name, token, {
        ...cookieOptions,
        sameSite: 'lax',
      });

      return response;
    }

    // ── 2FA is enabled, proceed with dispatching code ────────
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes

    await supabase
      .from('users')
      .update({
        verification_code: verificationCode,
        verification_code_expires_at: expiresAt,
      })
      .eq('id', user.id)

    // ── Dispatch Email via Resend ───────────────────────────
    if (process.env.RESEND_API_KEY) {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      
      console.log(`[Resend] Attempting to send login 2FA to: ${user.email.toLowerCase()}`);
      const { error: emailError } = await resend.emails.send({
        from: 'onboarding@resend.dev',
        to: user.email.toLowerCase(),
        subject: 'Your SayShop Login Authentication Code',
        html: `
          <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <div style="background-color: #2563EB; padding: 24px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px; font-weight: bold;">SayShop</h1>
            </div>
            <div style="padding: 32px; text-align: center; background-color: #ffffff;">
              <h2 style="color: #111827; font-size: 20px; font-weight: 600; margin-top: 0;">2FA Login Attempt</h2>
              <p style="color: #4B5563; font-size: 15px; line-height: 1.5; margin-bottom: 24px;">
                We detected a login attempt using your email. Please enter the following secure 6-digit code to securely complete your login. This code will expire in 10 minutes.
              </p>
              <div style="background-color: #F3F4F6; padding: 16px; border-radius: 12px; font-family: monospace; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #1D4ED8; margin-bottom: 24px;">
                ${verificationCode}
              </div>
              <p style="color: #9CA3AF; font-size: 13px; margin: 0;">
                If this wasn't you, your password may be compromised. Please consider changing it immediately.
              </p>
            </div>
          </div>
        `
      });

      if (emailError) {
        console.error('[signin] Send error detail:', JSON.stringify(emailError, null, 2));
        return NextResponse.json(
          { error: `2FA Email Failed: ${emailError.message || 'Unknown Reason'}` },
          { status: 500 }
        )
      } else {
        console.log(`[Resend] Successfully dispatched 2FA email to ${user.email}`);
      }
    } else {
      console.log(`[Development Leak] 2FA Code for ${user.email}: ${verificationCode}`);
    }

    // Return the signal to transition without disclosing the explicit code.
    return NextResponse.json({
      error: 'Please verify your identity. A verification code was sent to your email.',
      requiresVerification: true,
      email: user.email
    }, { status: 403 })

  } catch (err) {
    console.error('[signin] Unexpected error:', err)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
